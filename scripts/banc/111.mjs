// Vérifications de la migration 111 : comptes rendus d'intervention et d'autocontrôle (électricité). Numéro attribué
// par la base, contenu figé dès l'insertion pour un compte connecté, aucune suppression, lecture par l'organisation
// seulement, chantier / client / facture / remplacé de la même organisation, annulation motivée et définitive, départ
// d'un membre (105) et suppression du compte d'un salarié.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/111_comptes_rendus_d_intervention_electricite.sql');

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  const refus = async (fn) => { try { await fn(); return false; } catch (e) { return String(e.message || e); } };
  const an = Number((await q(`SELECT extract(year FROM (now() AT TIME ZONE 'Europe/Paris'))::int AS a`)).rows[0].a);
  const cri = (n) => `CRI-${an}-${String(n).padStart(5, '0')}`;

  const clientSolo = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client 111') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const clientPatron = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client patron 111') RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const chantierSolo = (await q(`INSERT INTO chantiers (user_id, organization_id, client_id, nom) VALUES ($1, $2, $3, 'Chantier 111') RETURNING id`, [SOLO, ORG_SOLO, clientSolo])).rows[0].id;
  const chantierPatron = (await q(`INSERT INTO chantiers (user_id, organization_id, client_id, nom) VALUES ($1, $2, $3, 'Chantier patron 111') RETURNING id`, [PATRON, ORG_PATRON, clientPatron])).rows[0].id;

  const creer = async (o = {}) => (await en(o.par || SOLO, () => q(
    `INSERT INTO comptes_rendus_electricite (user_id, organization_id, numero, chantier_id, client_id, realise_le, intervenant_nom,
       client_nom, adresse_intervention, nature, travaux, mesures, prix_ht, facture_id, remplace_id)
     VALUES ($1, $2, $3, $4, $5, now(), 'Intervenant 111', 'Client 111', '1 rue de l''Exemple, 33000 Exempleville', $6,
       'Remplacement du tableau', '{"terre_ohms":"42"}', 450, $7, $8)
     RETURNING id, numero, organization_id`,
    [o.par || SOLO, o.org === undefined ? ORG_SOLO : o.org, o.numero ?? null, o.chantier === undefined ? chantierSolo : o.chantier,
      o.client === undefined ? clientSolo : o.client, o.nature || 'renovation_partielle', o.facture ?? null, o.remplace ?? null]))).rows[0];

  // 1. Numéro attribué par la base, à la suite, une série par organisation
  const a = await creer({ numero: `CRI-${an}-00042` });
  const b = await creer({ numero: 'n’importe quoi' });
  const p = await creer({ par: PATRON, org: ORG_PATRON, chantier: chantierPatron, client: clientPatron });
  verifier(a.numero === cri(1) && b.numero === cri(2) && p.numero === cri(1),
    `111 : numéros attribués par la base, à la suite, une série par organisation (${a.numero}, ${b.numero}, ${p.numero})`);
  const sansOrg = await creer({ org: null });
  verifier(sansOrg.organization_id === ORG_SOLO && sansOrg.numero === cri(3), `111 : sans organisation, la ligne prend celle de son auteur (${sansOrg.numero})`);

  // 2. Lecture : l'organisation seulement ; un visiteur rien
  const vusParPatron = await en(PATRON, () => q(`SELECT count(*)::int AS n FROM comptes_rendus_electricite WHERE id = ANY($1)`, [[a.id, b.id]]));
  const vusParSalarie = await en(SALARIE, () => q(`SELECT count(*)::int AS n FROM comptes_rendus_electricite WHERE id = $1`, [p.id]));
  const vusParVisiteur = await commeAnonyme(() => q(`SELECT count(*)::int AS n FROM comptes_rendus_electricite`)).catch(() => ({ rows: [{ n: 0 }] }));
  verifier(vusParPatron.rows[0].n === 0 && vusParSalarie.rows[0].n === 1 && vusParVisiteur.rows[0].n === 0,
    `111 : un autre compte ne voit rien, un membre voit, un visiteur rien (${vusParPatron.rows[0].n}/${vusParSalarie.rows[0].n}/${vusParVisiteur.rows[0].n})`);
  const visiteurEcrit = await refus(() => commeAnonyme(() => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux) VALUES ($1, now(), 'I', 'C', 'A', 'autre', 'T')`, [SOLO])));
  verifier(!!visiteurEcrit, `111 : un visiteur n'écrit pas (${visiteurEcrit})`);

  // 3. Rien chez un autre : organisation, chantier, client
  const orgAilleurs = await refus(() => creer({ org: ORG_PATRON }));
  const chantierAilleurs = await refus(() => creer({ chantier: chantierPatron }));
  const clientAilleurs = await refus(() => creer({ client: clientPatron }));
  verifier(!!orgAilleurs && /Chantier inconnu/.test(chantierAilleurs || '') && /Client inconnu/.test(clientAilleurs || ''),
    `111 : ni l'organisation, ni le chantier, ni le client d'un autre (${chantierAilleurs} / ${clientAilleurs})`);

  // 4. Contenu figé ; les valeurs interdites sont refusées
  const contenu = async (id) => (await q(`SELECT numero, nature, travaux, client_nom, mesures->>'terre_ohms' AS terre, prix_ht, user_id, chantier_id,
    annulee_le, annulation_motif FROM comptes_rendus_electricite WHERE id = $1`, [id])).rows[0];
  const avant = await contenu(a.id);
  const reecrit = await refus(() => en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET numero = 'CRI-1999-00001', nature = 'neuf', travaux = 'Autre',
    client_nom = 'Autre', mesures = '{"terre_ohms":"1"}', prix_ht = 1, user_id = $2, chantier_id = $3 WHERE id = $1`, [a.id, PATRON, chantierPatron])));
  const apres = await contenu(a.id);
  verifier(reecrit === false && JSON.stringify(apres) === JSON.stringify(avant),
    `111 : le contenu d'un compte rendu ne change plus (${reecrit} / ${apres.numero}, ${apres.nature}, ${apres.terre}, ${apres.chantier_id === chantierSolo})`);
  const natureInconnue = await refus(() => creer({ nature: 'conformite' }));
  const sansTravaux = await refus(() => en(SOLO, () => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux) VALUES ($1, now(), 'I', 'C', 'A', 'autre', '  ')`, [SOLO])));
  verifier(!!natureInconnue && !!sansTravaux, '111 : une nature hors liste et des travaux vides sont refusés');

  // 5. Annulation motivée, datée par la base, définitive ; aucune suppression
  const sansMotif = await refus(() => en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET annulee_le = now() WHERE id = $1`, [b.id])));
  await en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET annulee_le = '2000-01-01', annulation_motif = 'Erreur de saisie' WHERE id = $1`, [b.id]));
  await en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET annulee_le = NULL, annulation_motif = NULL WHERE id = $1`, [b.id]));
  const annule = await contenu(b.id);
  verifier(!!sansMotif && annule.annulee_le !== null && new Date(annule.annulee_le).getFullYear() >= 2026 && annule.annulation_motif === 'Erreur de saisie',
    `111 : une annulation est motivée, datée par la base et définitive (${annule.annulation_motif})`);
  await en(SOLO, () => q(`DELETE FROM comptes_rendus_electricite WHERE id = $1`, [a.id])).catch(() => {});
  verifier((await q(`SELECT count(*)::int AS n FROM comptes_rendus_electricite WHERE id = $1`, [a.id])).rows[0].n === 1, '111 : un compte rendu ne se supprime pas');

  // 6. « Annule et remplace » : une annulée de l'organisation, une fois
  const vivante = await refus(() => creer({ remplace: a.id }));
  const remplace = await refus(() => creer({ remplace: b.id }));
  const deuxFois = await refus(() => creer({ remplace: b.id }));
  verifier(!!vivante && remplace === false && !!deuxFois, `111 : seule une annulée se remplace, une fois (${vivante ? 'vivante refusée' : 'vivante acceptée'})`);

  // 7. Facture liée : une facture de l'organisation ; ni un devis, ni la facture d'un autre
  const doc = async (user, org, type) => (await q(
    `INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, $3, $4, 'totale', 'brouillon', 100) RETURNING id`,
    [user, org, `TEST-111-${type}-${Math.random().toString(36).slice(2, 8)}`, type])).rows[0].id;
  const factureSolo = await doc(SOLO, ORG_SOLO, 'facture');
  const devisSolo = await doc(SOLO, ORG_SOLO, 'devis');
  const facturePatron = await doc(PATRON, ORG_PATRON, 'facture');
  const lieDevis = await refus(() => en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET facture_id = $2 WHERE id = $1`, [a.id, devisSolo])));
  const lieEtrangere = await refus(() => en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET facture_id = $2 WHERE id = $1`, [a.id, facturePatron])));
  const creeeEtrangere = await refus(() => creer({ facture: facturePatron }));
  await en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET facture_id = $2 WHERE id = $1`, [a.id, factureSolo]));
  const liee = (await q(`SELECT facture_id FROM comptes_rendus_electricite WHERE id = $1`, [a.id])).rows[0].facture_id;
  verifier(!!lieDevis && !!lieEtrangere && !!creeeEtrangere && liee === factureSolo, '111 : la facture liée est une facture de l\'organisation');

  // 9. Fiche chantier supprimée : le lien se vide, le compte rendu reste
  const chTemp = (await q(`INSERT INTO chantiers (user_id, organization_id, nom) VALUES ($1, $2, 'Temp 111') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const t = await creer({ chantier: chTemp });
  await q('DELETE FROM chantiers WHERE id = $1', [chTemp]);
  const reste = (await q('SELECT chantier_id, travaux FROM comptes_rendus_electricite WHERE id = $1', [t.id])).rows[0];
  verifier(reste.chantier_id === null && reste.travaux === 'Remplacement du tableau', '111 : le chantier supprimé laisse le compte rendu');

  // 9 bis. Relecture gardien-securite (F1, F2) : un compte ne vide pas les liens ; la suppression d'une fiche par un
  //        compte connecté les vide quand même (action de la clé étrangère) ; updated_at posé par la base
  const remplacant = (await q(`SELECT id FROM comptes_rendus_electricite WHERE remplace_id = $1`, [b.id])).rows[0].id;
  await en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET remplace_id = NULL, client_id = NULL, chantier_id = NULL, updated_at = '2000-01-01' WHERE id = $1`, [remplacant]));
  const liens = (await q(`SELECT remplace_id, client_id, chantier_id, updated_at FROM comptes_rendus_electricite WHERE remplace_id = $1`, [b.id])).rows[0];
  verifier(liens?.remplace_id === b.id && liens.client_id === clientSolo && liens.chantier_id === chantierSolo && new Date(liens.updated_at).getFullYear() >= 2026,
    `111 : un compte ne vide ni le remplacé, ni le client, ni le chantier ; updated_at posé par la base (${JSON.stringify(liens)})`);
  const chTemp2 = (await q(`INSERT INTO chantiers (user_id, organization_id, nom) VALUES ($1, $2, 'Temp bis 111') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const t2 = await creer({ chantier: chTemp2 });
  const supChantier = await refus(() => en(SOLO, () => q('DELETE FROM chantiers WHERE id = $1', [chTemp2])));
  const vide = (await q('SELECT chantier_id FROM comptes_rendus_electricite WHERE id = $1', [t2.id])).rows[0].chantier_id;
  const chantierParti = (await q('SELECT count(*)::int AS n FROM chantiers WHERE id = $1', [chTemp2])).rows[0].n;
  verifier(supChantier === false && chantierParti === 0 && vide === null, `111 : un compte connecté supprime son chantier, le lien se vide (${supChantier || 'ok'}, ${chantierParti}, ${vide})`);
  const tropGros = await refus(() => en(SOLO, () => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux) VALUES ($1, now(), 'I', 'C', 'A', 'autre', repeat('x', 20001))`, [SOLO])));
  verifier(!!tropGros, '111 : la taille des textes est bornée (F3)');

  // 9 ter. Relecture locale du 4 nov. au soir : tous les champs bornés ; pas de colonne signature ; pas d'oracle
  //        d'appartenance (une organisation étrangère est refusée avant les contrôles) ; un « readonly » n'écrit pas
  const champTropGros = async (col, valeur) => refus(() => en(SOLO, () => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux, ${col}) VALUES ($1, now(), 'I', 'C', 'A', 'autre', 'T', $2)`, [SOLO, valeur])));
  // Un texte répétitif se compresse (pg_column_size mesure la taille stockée) : un contenu peu compressible
  const bruit = Array.from({ length: 4000 }, (_, i) => ((i * 2654435761) >>> 0).toString(36)).join('');
  const grosEmetteur = await champTropGros('emetteur', JSON.stringify({ nom: bruit }));
  const grosContact = await champTropGros('client_contact', 'x'.repeat(3001));
  // Le motif est vidé à l'insertion (sceller) : il se borne à l'annulation
  const aAnnuler = await creer();
  const grosMotif = await refus(() => en(SOLO, () => q(`UPDATE comptes_rendus_electricite SET annulee_le = now(), annulation_motif = repeat('x', 2001) WHERE id = $1`, [aAnnuler.id])));
  const grosNom = await refus(() => en(SOLO, () => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux) VALUES ($1, now(), 'I', repeat('x', 3001), 'A', 'autre', 'T')`, [SOLO])));
  const normal = await champTropGros('client_contact', '06 00 00 00 00 · client@example.fr');
  verifier(!!grosEmetteur && !!grosContact && !!grosMotif && !!grosNom && normal === false,
    `111 : émetteur, contact, noms, adresse et motif bornés ; une valeur normale passe (${[!!grosEmetteur, !!grosContact, !!grosMotif, !!grosNom].join('/')}, ${normal || 'ok'})`);
  const colSignature = (await q(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'comptes_rendus_electricite' AND column_name = 'signature'`)).rows[0].n;
  verifier(colSignature === 0, `111 : pas de colonne signature sans écran (${colSignature})`);
  const oracleInconnu = await refus(() => creer({ org: ORG_PATRON, chantier: chantierSolo, client: null }));
  const oracleSien = await refus(() => creer({ org: ORG_PATRON, chantier: chantierPatron, client: clientPatron }));
  verifier(/Organisation interdite/.test(oracleInconnu || '') && /Organisation interdite/.test(oracleSien || ''),
    `111 : une organisation étrangère donne le même refus, que l'identifiant lui appartienne ou non (${oracleInconnu} / ${oracleSien})`);
  const lecteur = '11100000-0000-4000-8000-0000000000ed';
  await q(`INSERT INTO auth.users VALUES ($1, 'ro111@x.fr')`, [lecteur]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'readonly')`, [ORG_PATRON, lecteur]);
  const roCree = await refus(() => creer({ par: lecteur, org: ORG_PATRON, chantier: chantierPatron, client: clientPatron }));
  // Sans organisation envoyée : renseigner_organisation la remplit AVANT le WITH CHECK (gardien-securite, 4 nov. au soir)
  const roNull = await refus(() => en(lecteur, () => q(`INSERT INTO comptes_rendus_electricite (user_id, realise_le, intervenant_nom, client_nom,
    adresse_intervention, nature, travaux) VALUES ($1, now(), 'I', 'C', 'A', 'autre', 'T')`, [lecteur])));
  verifier(!!roNull, `111 : un « readonly » sans organisation envoyée est refusé (organisation remplie avant le contrôle) (${roNull})`);
  const roVoit = (await en(lecteur, () => q('SELECT count(*)::int AS n FROM comptes_rendus_electricite WHERE id = $1', [p.id]))).rows[0].n;
  const roAnnule = await en(lecteur, () => q(`UPDATE comptes_rendus_electricite SET annulee_le = now(), annulation_motif = 'x' WHERE id = $1 RETURNING id`, [p.id]))
    .then((r) => r.rows.length, (e) => String(e.message || e));
  const pIntact = (await q('SELECT annulee_le FROM comptes_rendus_electricite WHERE id = $1', [p.id])).rows[0].annulee_le;
  verifier(!!roCree && roVoit === 1 && (roAnnule === 0 || typeof roAnnule === 'string') && pIntact === null,
    `111 : un membre « readonly » lit, mais ne crée ni n'annule (${roCree ? 'création refusée' : 'création acceptée'}, vu ${roVoit}, annulation ${roAnnule})`);
  // Contre-essai : un ouvrier de la même organisation crée bien
  const ouvrier = '11100000-0000-4000-8000-0000000000ec';
  await q(`INSERT INTO auth.users VALUES ($1, 'ouv111@x.fr')`, [ouvrier]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'ouvrier')`, [ORG_PATRON, ouvrier]);
  const ouvCree = await refus(() => creer({ par: ouvrier, org: ORG_PATRON, chantier: chantierPatron, client: clientPatron }));
  verifier(ouvCree === false, `111 : contre-essai, un ouvrier de l'organisation crée un compte rendu (${ouvCree || 'ok'})`);

  // 10. Départ d'un membre (105) : ses comptes rendus passent au propriétaire ; la table est découverte
  const decouverte = (await q(`SELECT count(*)::int AS n FROM public.tables_rendues_au_depart() t WHERE t = 'comptes_rendus_electricite'`)).rows[0].n;
  const ex = '11100000-0000-4000-8000-0000000000ee';
  await q(`INSERT INTO auth.users VALUES ($1, 'ex111@x.fr')`, [ex]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'ouvrier')`, [ORG_PATRON, ex]);
  const faite = await creer({ par: ex, org: ORG_PATRON, chantier: chantierPatron, client: clientPatron });
  await q('DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2', [ex, ORG_PATRON]);
  const auteur = (await q('SELECT user_id FROM comptes_rendus_electricite WHERE id = $1', [faite.id])).rows[0].user_id;
  const luParEx = await en(ex, () => q('SELECT count(*)::int AS n FROM comptes_rendus_electricite WHERE id = $1', [faite.id]));
  verifier(decouverte === 1 && auteur === PATRON && luParEx.rows[0].n === 0,
    `111 : un membre qui part ne garde pas ses comptes rendus, ils passent au propriétaire (${decouverte}, ${auteur === PATRON}, ${luParEx.rows[0].n})`);

  // 11. Suppression du compte d'un salarié : ses comptes rendus vont au gérant
  const sal = '11100000-0000-4000-8000-0000000000ef';
  await q(`INSERT INTO auth.users VALUES ($1, 'sal111@x.fr')`, [sal]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'ouvrier')`, [ORG_PATRON, sal]);
  const deSal = await creer({ par: sal, org: ORG_PATRON, chantier: chantierPatron, client: clientPatron });
  const sup = await refus(() => en(sal, () => q('SELECT supprimer_mon_compte() AS b')));
  const rendu = (await q('SELECT user_id FROM comptes_rendus_electricite WHERE id = $1', [deSal.id])).rows[0]?.user_id;
  verifier(sup === false && rendu === PATRON, `111 : la suppression du compte d'un salarié rend ses comptes rendus au gérant (${sup || rendu})`);

  const rejeu = await refus(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu === false, `111 : la migration se rejoue sans erreur (${rejeu})`);

  // 8. Après le rejeu (le banc réaccorde tous les droits après les migrations, comme Supabase) : droits de la migration
  const droits = (await q(`SELECT has_function_privilege('authenticated', 'public.sceller_compte_rendu()', 'execute')
      OR has_function_privilege('anon', 'public.sceller_compte_rendu()', 'execute') AS f,
      has_table_privilege('authenticated', 'public.comptes_rendus_electricite', 'DELETE') AS d,
      has_table_privilege('anon', 'public.comptes_rendus_electricite', 'SELECT') AS v`)).rows[0];
  verifier(droits.f === false && droits.d === false && droits.v === false, `111 : fonctions internes fermées, ni suppression ni lecture par un visiteur (${droits.f}/${droits.d}/${droits.v})`);


  // Ménage (en propriétaire)
  await q('DELETE FROM comptes_rendus_electricite WHERE user_id = ANY($1)', [[SOLO, PATRON, ex, ouvrier, lecteur]]);
  await q('DELETE FROM organization_members WHERE user_id = ANY($1)', [[ouvrier, lecteur]]);
  await q('DELETE FROM auth.users WHERE id = ANY($1)', [[ex, ouvrier, lecteur]]);
  await q('DELETE FROM devis WHERE id = ANY($1)', [[factureSolo, devisSolo, facturePatron]]);
  await q('DELETE FROM chantiers WHERE id = ANY($1)', [[chantierSolo, chantierPatron]]);
  await q('DELETE FROM clients WHERE id = ANY($1)', [[clientSolo, clientPatron]]);
}
