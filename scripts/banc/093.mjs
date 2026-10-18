// Vérifications de la migration 093 : une facture émise ne se supprime, ne se réécrit ni ne repasse en brouillon ;
// l'envoi et l'encaissement passent toujours (l'app réécrit toute la ligne : à l'identique, c'est accepté).
import { SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const document = async (type, statut, numero) => (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, date,
    total_ht, total_tva, total_ttc, montant_paye, objet) VALUES ($1, $2, $3, $4, $5, current_date, 100, 20, 120, 0, 'Prises')
    RETURNING id`, [SOLO, ORGA_SOLO, numero, type, statut])).rows[0].id;
  const parSolo = (sql, id) => en(SOLO, () => q(sql, [id]));

  // Facture émise : l'app l'envoie et l'encaisse en réécrivant toute la ligne avec les mêmes valeurs
  const emise = await document('facture', 'envoye', 'FAC-2026-09301');
  const encaisse = await parSolo(`UPDATE devis SET numero = numero, date = date, type = type, facture_type = facture_type,
    client_id = client_id, total_ht = total_ht, total_tva = total_tva, total_ttc = total_ttc, lignes = lignes,
    montant_paye = 50, objet = 'Prises de la cuisine' WHERE id = $1 RETURNING id`, emise);
  // Depuis 099, « payée » suppose des paiements qui soldent la facture (comme dans l'app : « Encaisser » d'abord)
  await en(SOLO, () => q('INSERT INTO paiements (user_id, devis_id, montant) VALUES ($1, $2, 120)', [SOLO, emise]));
  const soldee = await parSolo(`UPDATE devis SET montant_paye = 120, statut = 'payee' WHERE id = $1 RETURNING id`, emise);
  verifier(encaisse.rows.length === 1 && soldee.rows.length === 1,
    '093 : encaisser une facture émise (ligne réécrite à l\'identique, puis soldée) reste possible');

  // Ce qu'un compte connecté ne fait plus sur une facture émise
  verifier(await refuse(() => parSolo('DELETE FROM devis WHERE id = $1', emise)), '093 : une facture émise ne se supprime pas');
  verifier(await refuse(() => parSolo(`UPDATE devis SET statut = 'brouillon' WHERE id = $1`, emise)), '093 : une facture émise ne repasse pas en brouillon');
  verifier(await refuse(() => parSolo('UPDATE devis SET total_ttc = 1 WHERE id = $1', emise))
    && await refuse(() => parSolo('UPDATE devis SET total_ht = 1 WHERE id = $1', emise))
    && await refuse(() => parSolo('UPDATE devis SET total_tva = 0 WHERE id = $1', emise)),
  '093 : ses montants ne changent pas');
  verifier(await refuse(() => parSolo(`UPDATE devis SET numero = 'FAC-2026-09999' WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET date = current_date - 30 WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET type = 'devis' WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET facture_type = 'avoir' WHERE id = $1`, emise)),
  '093 : ni son numéro, ni sa date, ni sa nature');
  // Depuis 098, la valeur envoyée par l'app est ignorée (le montant encaissé suit les paiements) : ni baisse ni refus
  await parSolo('UPDATE devis SET montant_paye = 10 WHERE id = $1', emise).catch(() => null);
  verifier(Number((await q('SELECT montant_paye FROM devis WHERE id = $1', [emise])).rows[0].montant_paye) === 120,
    '093 : le montant encaissé ne se réécrit pas depuis l\'app');
  verifier(await refuse(() => parSolo(`UPDATE devis SET statut = 'annule' WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET statut = 'annulee' WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET statut = 'refuse' WHERE id = $1`, emise))
    && await refuse(() => parSolo(`UPDATE devis SET statut = NULL WHERE id = $1`, emise)),
  '093 : une facture émise ne sort pas du chiffre d\'affaires par son statut (annulée, refusée, vide)');
  const vue = await parSolo(`UPDATE devis SET statut = 'vu' WHERE id = $1 RETURNING id`, emise);
  const repayee = await parSolo(`UPDATE devis SET statut = 'payee' WHERE id = $1 RETURNING id`, emise);
  verifier(vue.rows.length === 1 && repayee.rows.length === 1, '093 : « vue » (affichage de l\'app réécrit à l\'encaissement) et « payée » restent permis');

  // Brouillon : libre tant qu'il n'a pas de numéro ; numéroté, il reste dans la séquence
  const brouillon = await document('facture', 'brouillon', null);
  const modifie = await parSolo('UPDATE devis SET total_ttc = 240, total_ht = 200, total_tva = 40 WHERE id = $1 RETURNING id', brouillon);
  const envoye = await parSolo(`UPDATE devis SET numero = 'FAC-2026-09302', statut = 'envoye' WHERE id = $1 RETURNING id`, brouillon);
  verifier(modifie.rows.length === 1 && envoye.rows.length === 1, '093 : un brouillon se modifie, puis s\'émet');
  const brouillonNumerote = await document('facture', 'brouillon', 'FAC-2026-09303');
  const sansNumero = await document('facture', 'brouillon', null);
  const supprime = await parSolo('DELETE FROM devis WHERE id = $1 RETURNING id', sansNumero);
  verifier(supprime.rows.length === 1 && await refuse(() => parSolo('DELETE FROM devis WHERE id = $1', brouillonNumerote)),
    '093 : un brouillon sans numéro se supprime, un brouillon numéroté non');
  // Le contournement (vider le numéro ou changer le type, puis supprimer) est fermé ; le reste du brouillon se corrige
  verifier(await refuse(() => parSolo(`UPDATE devis SET numero = NULL WHERE id = $1`, brouillonNumerote))
    && await refuse(() => parSolo(`UPDATE devis SET type = 'devis' WHERE id = $1`, brouillonNumerote)),
  '093 : un brouillon numéroté garde son numéro et reste une facture');
  const corrige = await parSolo(`UPDATE devis SET numero = numero, total_ttc = 360, total_ht = 300, total_tva = 60 WHERE id = $1 RETURNING id`, brouillonNumerote);
  verifier(corrige.rows.length === 1, '093 : un brouillon numéroté se corrige (montants, numéro réécrit à l\'identique)');
  // Un avoir encore brouillon s'annule (bouton « Annuler » de l'app)
  const avoirBrouillon = await document('facture', 'brouillon', 'AV-2026-09301');
  const avoirAnnule = await parSolo(`UPDATE devis SET statut = 'annule' WHERE id = $1 RETURNING id`, avoirBrouillon);
  verifier(avoirAnnule.rows.length === 1, '093 : un brouillon (avoir) s\'annule toujours');

  // Un devis n'est pas concerné ; le serveur non plus
  const devis = await document('devis', 'envoye', 'DEV-2026-09301');
  const devisModifie = await parSolo('UPDATE devis SET total_ttc = 240 WHERE id = $1 RETURNING id', devis);
  const parServeur = await q(`UPDATE devis SET total_ttc = 121, statut = 'brouillon' WHERE id = $1 RETURNING id`, [emise]);
  verifier(devisModifie.rows.length === 1 && parServeur.rows.length === 1, '093 : un devis et le serveur ne sont pas concernés');

  const tgtype = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_facture_emise'`)).rows[0]?.tgtype;
  const tgClient = (await q(`SELECT tgtype FROM pg_trigger WHERE tgrelid = 'public.clients'::regclass AND tgname = 'trg_garder_client_documents'`)).rows[0]?.tgtype;
  verifier(Number(tgtype) === 27 && Number(tgClient) === 11, `093 : contrôles de l'en-tête (tgtype ${tgtype}, ${tgClient})`);

  // Supprimer le client ne fait plus disparaître ses pièces (clé en cascade, comme en production)
  await q('ALTER TABLE devis DROP CONSTRAINT IF EXISTS devis_client_id_fkey');
  await q('ALTER TABLE devis ADD CONSTRAINT devis_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE');
  // Policy de suppression des clients telle qu'en production (absente du socle)
  await q(`CREATE POLICY "Org admins can delete clients" ON clients FOR DELETE TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())))`);
  const client = async (nom) => (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, $3) RETURNING id`, [SOLO, ORGA_SOLO, nom])).rows[0].id;
  const avecFacture = await client('Client facturé 093');
  const avecSigne = await client('Client signataire 093');
  const sansPiece = await client('Client sans pièce 093');
  const facture093 = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, total_ttc) VALUES ($1, $2, $3, 'FAC-2026-09304', 'facture', 'envoye', 50) RETURNING id`, [SOLO, ORGA_SOLO, avecFacture])).rows[0].id;
  const signe093 = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, signature, signature_date, signataire) VALUES ($1, $2, $3, 'DEV-2026-09302', 'devis', 'accepte', 'data:image/png;base64,AA==', now(), 'Léa') RETURNING id`, [SOLO, ORGA_SOLO, avecSigne])).rows[0].id;
  const brouillon093 = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut) VALUES ($1, $2, $3, 'DEV-2026-09303', 'devis', 'brouillon') RETURNING id`, [SOLO, ORGA_SOLO, sansPiece])).rows[0].id;
  const parSoloClient = (id) => en(SOLO, () => q('DELETE FROM clients WHERE id = $1 RETURNING id', [id]));
  verifier(await refuse(() => parSoloClient(avecFacture)) && await refuse(() => parSoloClient(avecSigne)),
    '093 : le client d\'une facture émise ou d\'un devis signé ne se supprime pas');
  const restent = Number((await q('SELECT count(*) AS n FROM devis WHERE id = ANY($1)', [[facture093, signe093]])).rows[0].n);
  const supprimeClient = await parSoloClient(sansPiece);
  const brouillonParti = Number((await q('SELECT count(*) AS n FROM devis WHERE id = $1', [brouillon093])).rows[0].n) === 0;
  verifier(restent === 2 && supprimeClient.rows.length === 1 && brouillonParti,
    '093 : leurs pièces restent ; un client sans pièce à conserver se supprime, avec ses brouillons');
  await q('DELETE FROM devis WHERE id = ANY($1)', [[facture093, signe093]]);
  await q('DELETE FROM clients WHERE id = ANY($1)', [[avecFacture, avecSigne]]);
  await q('DROP POLICY "Org admins can delete clients" ON clients');
  // Le socle reprend sa clé sans cascade (vérifications de 072, plus loin)
  await q('ALTER TABLE devis DROP CONSTRAINT devis_client_id_fkey');
  await q('ALTER TABLE devis ADD CONSTRAINT devis_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id)');

  await q('DELETE FROM paiements WHERE devis_id = $1', [emise]);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[emise, brouillon, brouillonNumerote, devis, avoirBrouillon]]);
}
