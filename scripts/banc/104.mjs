// Vérifications de la migration 104 : attestations de ramonage. Numéro attribué par la base (série par organisation et
// par année), contenu figé dès l'insertion pour un compte connecté, aucune suppression, lecture par l'organisation
// seulement, facture liée de la même organisation, vacuité obligatoire, refus des rappels par le lien (visiteur), et la
// suppression du compte qui n'est pas bloquée par le gel.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/104_attestations_de_ramonage.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const ram = (n) => `RAM-${an}-${String(n).padStart(5, '0')}`;
  const appareil = '10400000-0000-4000-8000-000000000001';

  const clientSolo = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client ramonage 104') RETURNING id`,
    [SOLO, ORG_SOLO])).rows[0].id;
  const clientPatron = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client patron 104') RETURNING id`,
    [PATRON, ORG_PATRON])).rows[0].id;

  const champs = `user_id, organization_id, numero, client_id, appareil_ref, realise_le, intervenant_nom, client_nom, qualite_client,
    adresse_intervention, appareil_type, combustible, conduit, methode, vacuite, vacuite_precision, prochain_avant, prix_ht, facture_id`;
  const creer = async (o = {}) => (await en(o.par || SOLO, () => q(
    `INSERT INTO ramonages (${champs}) VALUES ($1, $2, $3, $4, $5, now(), 'Intervenant 104', 'Client 104', 'proprietaire',
       '1 rue de l''Exemple, 24200 Exempleville', $6, 'bois', 'maconne', $7, $8, $9, (now() + interval '1 year')::date, 100, $10)
     RETURNING id, numero, organization_id, jeton_rappel`,
    [o.par || SOLO, o.org === undefined ? ORG_SOLO : o.org, o.numero ?? null, o.client ?? clientSolo, o.appareil || appareil,
      o.type || 'cheminee_ouverte', o.methode || 'mecanique_rotative', o.vacuite || 'assuree', o.precision ?? null, o.facture ?? null]))).rows[0];

  // 1. Le numéro : attribué par la base, à la suite, quelle que soit la proposition ; une série par organisation
  const a = await creer({ numero: `RAM-${an}-00042` });
  const b = await creer({ numero: 'n’importe quoi' });
  const p = await creer({ par: PATRON, org: ORG_PATRON, client: clientPatron });
  verifier(a.numero === ram(1) && b.numero === ram(2) && p.numero === ram(1),
    `104 : numéros attribués par la base, à la suite, une série par organisation (${a.numero}, ${b.numero}, ${p.numero})`);
  const sansOrg = await creer({ org: null });
  verifier(sansOrg.organization_id === ORG_SOLO && sansOrg.numero === ram(3),
    `104 : sans organisation, la ligne prend celle de son auteur et continue sa série (${sansOrg.numero})`);

  // 2. Lecture : l'organisation seulement ; un visiteur rien
  const vusParPatron = await en(PATRON, () => q(`SELECT count(*)::int AS n FROM ramonages WHERE id = ANY($1)`, [[a.id, b.id]]));
  const vusParSalarie = await en(SALARIE, () => q(`SELECT count(*)::int AS n FROM ramonages WHERE id = $1`, [p.id]));
  const vusParVisiteur = await commeAnonyme(() => q(`SELECT count(*)::int AS n FROM ramonages`)).catch(() => ({ rows: [{ n: 0 }] }));
  verifier(vusParPatron.rows[0].n === 0 && vusParSalarie.rows[0].n === 1 && vusParVisiteur.rows[0].n === 0,
    `104 : un autre compte ne voit rien, un membre de l'organisation voit, un visiteur rien (${vusParPatron.rows[0].n}/${vusParSalarie.rows[0].n}/${vusParVisiteur.rows[0].n})`);
  const ailleurs = await refus(() => creer({ org: ORG_PATRON }));
  verifier(!!ailleurs, `104 : pas d'attestation dans l'organisation d'un autre (${ailleurs})`);

  // 3. Contenu figé dès l'insertion ; le suivi du rappel et l'annulation passent
  const contenu = async (id) => (await q(`SELECT numero, vacuite, client_nom, prochain_avant::text AS prochain, prix_ht, user_id,
    rappel_canal, rappel_fait_le, annulee_le, annulation_motif FROM ramonages WHERE id = $1`, [id])).rows[0];
  const avant = await contenu(a.id);
  const reecrit = await refus(() => en(SOLO, () => q(
    `UPDATE ramonages SET numero = 'RAM-1999-00001', vacuite = 'non_assuree', vacuite_precision = 'x', client_nom = 'Autre',
       prochain_avant = '2030-01-01', prix_ht = 1, user_id = $2, rappel_canal = 'sms', rappel_fait_le = now() WHERE id = $1`, [a.id, PATRON])));
  const apres = await contenu(a.id);
  verifier(reecrit === false && apres.numero === avant.numero && apres.vacuite === 'assuree' && apres.client_nom === avant.client_nom
    && apres.prochain === avant.prochain && Number(apres.prix_ht) === 100 && apres.user_id === SOLO
    && apres.rappel_canal === 'sms' && apres.rappel_fait_le !== null,
    `104 : le contenu d'une attestation ne change plus ; le suivi du rappel s'enregistre (${reecrit} / ${apres.numero}, ${apres.vacuite}, ${apres.rappel_canal})`);
  const sansMotif = await refus(() => en(SOLO, () => q(`UPDATE ramonages SET annulee_le = now() WHERE id = $1`, [b.id])));
  await en(SOLO, () => q(`UPDATE ramonages SET annulee_le = now(), annulation_motif = 'Erreur de saisie' WHERE id = $1`, [b.id]));
  await en(SOLO, () => q(`UPDATE ramonages SET annulee_le = NULL, annulation_motif = NULL WHERE id = $1`, [b.id]));
  const annulee = await contenu(b.id);
  verifier(!!sansMotif && annulee.annulee_le !== null && annulee.annulation_motif === 'Erreur de saisie',
    `104 : une annulation est motivée et définitive (${sansMotif ? 'sans motif : refus' : 'sans motif : accepté'} / ${annulee.annulation_motif})`);

  // 4. Aucune suppression par un compte
  await en(SOLO, () => q(`DELETE FROM ramonages WHERE id = $1`, [a.id])).catch(() => {});
  verifier((await q(`SELECT count(*)::int AS n FROM ramonages WHERE id = $1`, [a.id])).rows[0].n === 1,
    '104 : une attestation ne se supprime pas');

  // 5. Facture liée : une facture de la même organisation ; ni un devis, ni la facture d'un autre
  const doc = async (user, org, type) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, $3, $4, 'totale', 'brouillon', 100) RETURNING id`,
    [user, org, `TEST-104-${type}-${Math.random().toString(36).slice(2, 8)}`, type])).rows[0].id;
  const factureSolo = await doc(SOLO, ORG_SOLO, 'facture');
  const devisSolo = await doc(SOLO, ORG_SOLO, 'devis');
  const facturePatron = await doc(PATRON, ORG_PATRON, 'facture');
  const lieDevis = await refus(() => en(SOLO, () => q(`UPDATE ramonages SET facture_id = $2 WHERE id = $1`, [a.id, devisSolo])));
  const lieEtrangere = await refus(() => en(SOLO, () => q(`UPDATE ramonages SET facture_id = $2 WHERE id = $1`, [a.id, facturePatron])));
  const creeeEtrangere = await refus(() => creer({ facture: facturePatron }));
  await en(SOLO, () => q(`UPDATE ramonages SET facture_id = $2 WHERE id = $1`, [a.id, factureSolo]));
  const liee = (await q(`SELECT facture_id FROM ramonages WHERE id = $1`, [a.id])).rows[0].facture_id;
  verifier(!!lieDevis && !!lieEtrangere && !!creeeEtrangere && liee === factureSolo,
    `104 : la facture liée est une facture de l'organisation (${lieDevis ? 'devis refusé' : 'devis accepté'}, ${lieEtrangere ? 'étrangère refusée' : 'étrangère acceptée'}, ${creeeEtrangere ? 'à la création aussi' : 'acceptée à la création'})`);

  // 6. Vacuité obligatoire et précisée si elle n'est pas assurée ; méthode mécanique seulement
  const sansVacuite = await refus(() => creer({ vacuite: 'conforme' }));
  const nonAssureeSeule = await refus(() => creer({ vacuite: 'non_assuree' }));
  const chimique = await refus(() => creer({ methode: 'chimique' }));
  const nonAssureePrecisee = await creer({ vacuite: 'non_assuree', precision: 'Bouchon de suie au coude' });
  verifier(!!sansVacuite && !!nonAssureeSeule && !!chimique && nonAssureePrecisee.numero === ram(4),
    `104 : vacuité « assurée » ou « non assurée » (précisée), méthode mécanique seulement (${nonAssureePrecisee.numero})`);

  // 7. Le lien de désinscription : un visiteur pose le refus avec le jeton, rien d'autre ; jeton inconnu : false
  const inconnu = await commeAnonyme(() => q(`SELECT refuser_rappels_ramonage($1) AS ok`, ['10400000-0000-4000-8000-0000000000ff']));
  const connu = await commeAnonyme(() => q(`SELECT refuser_rappels_ramonage($1) AS ok`, [a.jeton_rappel]));
  // commeAnonyme annule sa transaction : le refus se rejoue ici en propriétaire de la fonction pour constater l'effet
  await q(`SELECT refuser_rappels_ramonage($1)`, [a.jeton_rappel]);
  const refuse = (await q(`SELECT rappels_refuses_le FROM clients WHERE id = $1`, [clientSolo])).rows[0].rappels_refuses_le;
  const intact = (await q(`SELECT rappels_refuses_le FROM clients WHERE id = $1`, [clientPatron])).rows[0].rappels_refuses_le;
  verifier(inconnu.rows[0].ok === false && connu.rows[0].ok === true && refuse !== null && intact === null,
    `104 : le lien de chaque rappel enregistre le refus de ce client seulement (${inconnu.rows[0].ok}/${connu.rows[0].ok})`);
  const internes = (await q(`SELECT has_function_privilege('anon', 'public.sceller_ramonage()', 'execute')
      OR has_function_privilege('anon', 'public.ramonage_facture_valide(uuid, uuid, uuid)', 'execute')
      OR has_function_privilege('authenticated', 'public.ramonage_facture_valide(uuid, uuid, uuid)', 'execute') AS ouvertes`)).rows[0].ouvertes;
  verifier(internes === false, '104 : ni un visiteur ni un compte n\'exécutent les fonctions internes');

  // 8. Le client supprimé : le lien se vide, l'attestation et sa copie restent
  const clientTemp = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client supprimé 104') RETURNING id`,
    [SOLO, ORG_SOLO])).rows[0].id;
  const t = await creer({ client: clientTemp });
  await q(`DELETE FROM clients WHERE id = $1`, [clientTemp]);
  const reste = (await q(`SELECT client_id, client_nom FROM ramonages WHERE id = $1`, [t.id])).rows[0];
  verifier(reste.client_id === null && reste.client_nom === 'Client 104', '104 : la fiche client supprimée laisse l\'attestation et sa copie');

  // 9. La suppression d'un compte n'est pas bloquée par le gel (cascade, chaîne « annule et remplace »)
  const compte = '10400000-0000-4000-8000-0000000000aa';
  const orgCompte = '10400000-0000-4000-8000-0000000000ab';
  await q(`INSERT INTO auth.users VALUES ($1, 'ramoneur104@x.fr')`, [compte]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Ramoneur 104', 'ramoneur-104', $2)`, [orgCompte, compte]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [orgCompte, compte]);
  const c = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client 104 bis') RETURNING id`, [compte, orgCompte])).rows[0].id;
  const premiere = await creer({ par: compte, org: orgCompte, client: c });
  await en(compte, () => q(`UPDATE ramonages SET annulee_le = now(), annulation_motif = 'Erreur' WHERE id = $1`, [premiere.id]));
  await en(compte, () => q(`INSERT INTO ramonages (user_id, organization_id, client_id, appareil_ref, realise_le, intervenant_nom, client_nom,
      qualite_client, adresse_intervention, appareil_type, combustible, conduit, methode, vacuite, prochain_avant, remplace_id)
    VALUES ($1, $2, $3, $4, now(), 'I', 'C', 'locataire', 'A', 'insert', 'bois', 'tube_chemise', 'mecanique_manuelle', 'assuree',
      (now() + interval '6 months')::date, $5)`, [compte, orgCompte, c, appareil, premiere.id]));
  // Comme supprimer_mon_compte (SECURITY DEFINER) : jeton de l'artisan (auth.uid() posé), rôle du propriétaire
  const suppression = await refus(() => en(compte, async () => {
    await q('SET LOCAL ROLE postgres');
    await q('DELETE FROM clients WHERE organization_id = $1', [orgCompte]);
    await q('DELETE FROM organization_members WHERE organization_id = $1', [orgCompte]);
    await q('DELETE FROM organizations WHERE id = $1', [orgCompte]);
    await q('DELETE FROM auth.users WHERE id = $1', [compte]);
  }));
  const restantes = (await q(`SELECT count(*)::int AS n FROM ramonages WHERE user_id = $1`, [compte])).rows[0].n;
  verifier(suppression === false && restantes === 0, `104 : la suppression du compte emporte ses attestations (${suppression || 'faite'}, ${restantes} restante(s))`);

  // 10. Le serveur (clé de service, cron) n'est pas concerné par le gel
  await q(`UPDATE ramonages SET rappel_canal = 'email_auto', observations = 'Note du serveur' WHERE id = $1`, [nonAssureePrecisee.id]);
  const serveur = (await q(`SELECT rappel_canal, observations FROM ramonages WHERE id = $1`, [nonAssureePrecisee.id])).rows[0];
  verifier(serveur.rappel_canal === 'email_auto' && serveur.observations === 'Note du serveur', '104 : le serveur n\'est pas concerné');

  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `104 : la migration se rejoue sans erreur (${rejeu})`);

  // Ménage (en propriétaire)
  await q(`DELETE FROM ramonages WHERE user_id = ANY($1)`, [[SOLO, PATRON]]);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[factureSolo, devisSolo, facturePatron]]);
  await q('DELETE FROM clients WHERE id = ANY($1)', [[clientSolo, clientPatron]]);
}
