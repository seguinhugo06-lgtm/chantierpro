// Vérifications de la migration 113 : attestations d'entretien. Numéro ENT par la base (série par organisation), contenu
// figé dès l'insertion, aucune suppression, lecture par l'organisation seulement, mesure de CO exigée pour une chaudière,
// client et attestation remplacée de la même organisation, et le lien de désinscription (fonction de 104) qui reconnaît
// le jeton d'un entretien, sans nouvelle fonction publique.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/113_attestations_d_entretien.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  // Les vérifications de 104 rejouent 104, qui remet l'ancienne fonction de désinscription : rejouer 113 d'abord
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const ent = (n) => `ENT-${an}-${String(n).padStart(5, '0')}`;
  const appareil = '11300000-0000-4000-8000-000000000001';

  const clientSolo = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client entretien 113') RETURNING id`,
    [SOLO, ORG_SOLO])).rows[0].id;
  const clientPatron = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client patron 113') RETURNING id`,
    [PATRON, ORG_PATRON])).rows[0].id;

  const creer = async (o = {}) => (await en(o.par || SOLO, () => q(
    `INSERT INTO entretiens (user_id, organization_id, numero, client_id, appareil_ref, categorie, realise_le, intervenant_nom, client_nom,
       client_adresse, adresse_installation, local, appareils, appareils_mesure, co_ppm, prochain_avant, prix_ht, remplace_id)
     VALUES ($1, $2, $3, $4, $5, $6, now(), 'Intervenant 113', 'Client 113', '1 rue de l''Exemple', '1 rue de l''Exemple', 'Cuisine',
       $7::jsonb, 'Analyseur Exemple', $8, $9::date, 120, $10)
     RETURNING id, numero, organization_id, jeton_rappel`,
    [o.par || SOLO, o.org === undefined ? ORG_SOLO : o.org, o.numero ?? null, o.client === undefined ? clientSolo : o.client, appareil,
      o.categorie || 'chaudiere', o.appareils || '[{"marque":"M","modele":"X","energie":"gaz"}]', o.co === undefined ? 3 : o.co,
      o.prochain || `${an + 1}-11-01`, o.remplace ?? null]))).rows[0];

  // 1. Numéro attribué par la base, une série par organisation
  const a = await creer({ numero: `ENT-${an}-00042` });
  const b = await creer({ numero: 'n’importe quoi', categorie: 'poele', co: null });
  const p = await creer({ par: PATRON, org: ORG_PATRON, client: clientPatron });
  verifier(a.numero === ent(1) && b.numero === ent(2) && p.numero === ent(1),
    `113 : numéros ENT attribués par la base, à la suite, une série par organisation (${a.numero}, ${b.numero}, ${p.numero})`);

  // 2. Lecture : l'organisation seulement ; un visiteur rien ; pas d'écriture dans l'organisation d'un autre
  const vusParPatron = (await en(PATRON, () => q(`SELECT count(*)::int AS n FROM entretiens WHERE id = ANY($1)`, [[a.id, b.id]]))).rows[0].n;
  const vusParSalarie = (await en(SALARIE, () => q(`SELECT count(*)::int AS n FROM entretiens WHERE id = $1`, [p.id]))).rows[0].n;
  const vusParVisiteur = (await commeAnonyme(() => q(`SELECT count(*)::int AS n FROM entretiens`)).catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n;
  const ailleurs = await refus(() => creer({ org: ORG_PATRON }));
  verifier(vusParPatron === 0 && vusParSalarie === 1 && vusParVisiteur === 0 && !!ailleurs,
    `113 : lecture par l'organisation seulement, rien pour un visiteur, pas d'attestation chez un autre (${vusParPatron}/${vusParSalarie}/${vusParVisiteur})`);

  // 3. Contenu figé ; le suivi du rappel et l'annulation (motivée, une fois) passent ; aucune suppression
  const reecrit = await refus(() => en(SOLO, () => q(
    `UPDATE entretiens SET numero = 'ENT-1999-00001', co_ppm = 80, client_nom = 'Autre', prix_ht = 1, rappel_canal = 'sms', rappel_fait_le = now() WHERE id = $1`, [a.id])));
  const apres = (await q(`SELECT numero, co_ppm, client_nom, prix_ht, rappel_canal FROM entretiens WHERE id = $1`, [a.id])).rows[0];
  verifier(reecrit === false && apres.numero === ent(1) && Number(apres.co_ppm) === 3 && apres.client_nom === 'Client 113'
    && Number(apres.prix_ht) === 120 && apres.rappel_canal === 'sms',
    `113 : le contenu ne change plus, le suivi du rappel s'enregistre (${apres.numero}, CO ${apres.co_ppm}, ${apres.rappel_canal})`);
  const sansMotif = await refus(() => en(SOLO, () => q(`UPDATE entretiens SET annulee_le = now() WHERE id = $1`, [b.id])));
  await en(SOLO, () => q(`UPDATE entretiens SET annulee_le = '2001-01-01', annulation_motif = 'Erreur de saisie' WHERE id = $1`, [b.id]));
  await en(SOLO, () => q(`UPDATE entretiens SET annulee_le = NULL, annulation_motif = NULL WHERE id = $1`, [b.id]));
  const annulee = (await q(`SELECT annulee_le > now() - interval '1 hour' AS recente, annulation_motif FROM entretiens WHERE id = $1`, [b.id])).rows[0];
  await en(SOLO, () => q(`DELETE FROM entretiens WHERE id = $1`, [a.id])).catch(() => {});
  const toujours = (await q(`SELECT count(*)::int AS n FROM entretiens WHERE id = $1`, [a.id])).rows[0].n;
  verifier(!!sansMotif && annulee.recente === true && annulee.annulation_motif === 'Erreur de saisie' && toujours === 1,
    `113 : annulation motivée, datée par la base, définitive ; aucune suppression (${annulee.annulation_motif}, ${toujours})`);

  // 4. Annexe 5 : une chaudière sans mesure de CO est refusée ; un poêle n'en a pas besoin ; date conseillée après la visite
  const sansCO = await refus(() => creer({ co: null }));
  const prochainAvant = await refus(() => creer({ categorie: 'poele', co: null, prochain: '2001-01-01' }));
  const sansAppareil = await refus(() => creer({ appareils: '[]' }));
  const categorieInconnue = await refus(() => creer({ categorie: 'ramonage' }));
  verifier(!!sansCO && !!prochainAvant && !!sansAppareil && !!categorieInconnue,
    '113 : CO exigé pour une chaudière, date conseillée après la visite, au moins un appareil, catégorie connue');

  // 5. Client, facture et attestation remplacée : de la même organisation ; on ne remplace qu'une annulée, une fois
  const clientEtranger = await refus(() => creer({ client: clientPatron }));
  const vivante = await refus(() => creer({ remplace: a.id }));
  const premier = await refus(() => creer({ remplace: b.id }));
  const second = await refus(() => creer({ remplace: b.id }));
  const facturePatron = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc)
    VALUES ($1, $2, 'TEST-113-F', 'facture', 'totale', 'brouillon', 100) RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const factureEtrangere = await refus(() => en(SOLO, () => q(`UPDATE entretiens SET facture_id = $2 WHERE id = $1`, [a.id, facturePatron])));
  verifier(/Client inconnu/.test(clientEtranger || '') && !!vivante && premier === false && !!second && !!factureEtrangere,
    `113 : client et facture de l'organisation, seule une annulée se remplace, une fois (${clientEtranger ? 'client refusé' : 'client accepté'})`);

  // 6. Le lien de désinscription : le jeton d'un entretien pose le refus de ce client ; aucune nouvelle fonction publique
  const inconnu = await commeAnonyme(() => q(`SELECT refuser_rappels_ramonage($1) AS ok`, ['11300000-0000-4000-8000-0000000000ff']));
  const connu = await commeAnonyme(() => q(`SELECT refuser_rappels_ramonage($1) AS ok`, [a.jeton_rappel]));
  await q(`SELECT refuser_rappels_ramonage($1)`, [a.jeton_rappel]);
  const refuse = (await q(`SELECT rappels_refuses_le FROM clients WHERE id = $1`, [clientSolo])).rows[0].rappels_refuses_le;
  const intact = (await q(`SELECT rappels_refuses_le FROM clients WHERE id = $1`, [clientPatron])).rows[0].rappels_refuses_le;
  verifier(inconnu.rows[0].ok === false && connu.rows[0].ok === true && refuse !== null && intact === null,
    `113 : le lien d'un rappel d'entretien enregistre le refus de ce client seulement (${inconnu.rows[0].ok}/${connu.rows[0].ok})`);
  const ouvertes = (await q(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE') AND p.proname LIKE '%entretien%'`)).rows;
  const internes = (await q(`SELECT has_function_privilege('authenticated', 'public.sceller_entretien()', 'execute') AS x`)).rows[0].x;
  verifier(ouvertes.length === 0 && internes === false, '113 : aucune fonction d\'entretien ouverte aux visiteurs ni aux comptes');

  // 6 bis. La fonction remplacée reconnaît toujours le jeton d'un ramonage (relecture gardien-securite, m2 a)
  const clientR = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client ramonage 113') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const ram = (await en(SOLO, () => q(`INSERT INTO ramonages (user_id, organization_id, client_id, appareil_ref, realise_le, intervenant_nom, client_nom,
      qualite_client, adresse_intervention, appareil_type, combustible, conduit, methode, vacuite, prochain_avant)
    VALUES ($1, $2, $3, $4, now(), 'I', 'C', 'proprietaire', 'A', 'insert', 'bois', 'maconne', 'mecanique_manuelle', 'assuree', '2099-01-01')
    RETURNING jeton_rappel`, [SOLO, ORG_SOLO, clientR, appareil]))).rows[0];
  const viaRamonage = await commeAnonyme(() => q(`SELECT refuser_rappels_ramonage($1) AS ok`, [ram.jeton_rappel]));
  verifier(viaRamonage.rows[0].ok === true, '113 : le lien d\'un rappel de ramonage marche toujours');

  // 6 ter. Le jeton, l'auteur et l'organisation ne se réécrivent pas ; un rappel envoyé par le serveur ne s'efface pas
  // par une ligne relue avant l'envoi (m1)
  await q(`UPDATE entretiens SET rappel_fait_le = now(), rappel_canal = 'email_auto' WHERE id = $1`, [p.id]);
  await en(PATRON, () => q(`UPDATE entretiens SET jeton_rappel = $2, user_id = $3, rappel_fait_le = NULL, rappel_canal = NULL WHERE id = $1`,
    [p.id, '11300000-0000-4000-8000-0000000000ee', SOLO]));
  const garde = (await q(`SELECT jeton_rappel, user_id, rappel_canal, rappel_fait_le FROM entretiens WHERE id = $1`, [p.id])).rows[0];
  verifier(garde.jeton_rappel === p.jeton_rappel && garde.user_id === PATRON && garde.rappel_canal === 'email_auto' && garde.rappel_fait_le !== null,
    `113 : jeton et auteur figés ; un rappel automatique envoyé reste noté (${garde.rappel_canal})`);
  // Un SMS noté par l'artisan s'annule toujours (« Annuler »)
  await en(SOLO, () => q(`UPDATE entretiens SET rappel_fait_le = NULL, rappel_canal = NULL WHERE id = $1`, [a.id]));
  const annule = (await q(`SELECT rappel_canal FROM entretiens WHERE id = $1`, [a.id])).rows[0].rappel_canal;
  verifier(annule === null, '113 : un rappel noté à la main (SMS) s\'annule');

  // 6 quater. Un départ de l'équipe rend ses attestations au propriétaire (105), malgré le gel
  const rendue = (await q(`SELECT count(*)::int AS n FROM tables_rendues_au_depart() t WHERE t = 'entretiens'`)).rows[0].n;
  verifier(rendue === 1, '113 : les attestations d\'entretien sont rendues au propriétaire au départ d\'un membre (105)');

  // 7. Le client supprimé : le lien se vide, l'attestation reste ; le serveur n'est pas concerné par le gel
  const clientTemp = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client supprimé 113') RETURNING id`,
    [SOLO, ORG_SOLO])).rows[0].id;
  const t = await creer({ client: clientTemp });
  await q(`DELETE FROM clients WHERE id = $1`, [clientTemp]);
  await q(`UPDATE entretiens SET rappel_canal = 'email_auto' WHERE id = $1`, [t.id]);
  const reste = (await q(`SELECT client_id, client_nom, rappel_canal FROM entretiens WHERE id = $1`, [t.id])).rows[0];
  verifier(reste.client_id === null && reste.client_nom === 'Client 113' && reste.rappel_canal === 'email_auto',
    '113 : la fiche client supprimée laisse l\'attestation ; le serveur écrit le suivi du rappel');

  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `113 : la migration se rejoue sans erreur (${rejeu})`);

  await q(`DELETE FROM entretiens WHERE user_id = ANY($1)`, [[SOLO, PATRON]]);
  await q('DELETE FROM devis WHERE id = $1', [facturePatron]);
  await q('DELETE FROM ramonages WHERE client_id = $1', [clientR]);
  await q('DELETE FROM clients WHERE id = ANY($1)', [[clientSolo, clientPatron, clientR]]);
}
