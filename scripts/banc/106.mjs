// Vérifications de la migration 106 : les pages publiques (paiement, signature) montrent la fiche de l'entreprise de la
// pièce, pas la fiche personnelle de son auteur ; la page de paiement déduit les avoirs de l'organisation et ouvre le
// paiement par carte sur le compte Stripe du propriétaire ; une pièce dont l'auteur n'est pas membre de l'organisation
// qu'elle porte garde l'ancien comportement (son compte seulement) ; rien ne change pour un artisan seul.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/106_pages_publiques_par_l_organisation_de_la_piece.sql');

const ANCIEN = '10600000-0000-4000-8000-000000000003';     // auteur d'une pièce glissée dans l'organisation sans en être membre
const ORG_PERSO = '10600000-0000-4000-8000-0000000000a1';  // organisation personnelle du salarié

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  // Les vérifications de 085 et 098 rejouent leur migration, qui réécrit la page de paiement : la remettre à jour
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '106 : migration rejouée sans erreur');
  const paiement = (jeton) => commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {});
  const signature = (jeton) => commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});
  const commeServeur = async (jeton) => {
    await db.exec('BEGIN');
    try {
      await q(`SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
      return (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {};
    } finally { await db.exec('ROLLBACK'); }
  };
  let n = 0;
  const facture = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token)
     VALUES ($1, $2, $3, $4, 'facture', 'totale', 'envoye', $5, $6) RETURNING id`,
    [o.user, o.org, o.entreprise ?? null, `FAC-106-${++n}`, o.total ?? 500, o.jeton])).rows[0].id;
  const devisSigne = async (o) => (await q(
    `INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
     VALUES ($1, $2, $3, $4, 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days') RETURNING signature_token`,
    [o.user, o.org, o.entreprise ?? null, `DEV-106-${++n}`])).rows[0].signature_token;

  // L'entreprise du patron (sa fiche, son Stripe) ; le salarié a aussi son entreprise personnelle, sa fiche « par
  // défaut » (autre société, autre IBAN) et son propre Stripe
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'ancien@106.fr')`, [ANCIEN]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Perso salarié', 'perso-salarie-106', $2)`, [ORG_PERSO, SALARIE]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', now() + interval '1 day')`, [ORG_PERSO, SALARIE]);
  const ficheEntreprise = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban, is_default) VALUES ($1, $2, 'Patron SARL 106', 'FR76-PATRON', true) RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const ficheSeconde = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Patron Dépannage 106', 'FR76-DEPANNAGE') RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const fichePerso = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban, is_default) VALUES ($1, $2, 'Perso salarié 106', 'FR76-PERSO', true) RETURNING id`, [SALARIE, ORG_PERSO])).rows[0].id;
  await q(`INSERT INTO entreprise (user_id, nom, iban) VALUES ($1, 'Fiche de l''ancien 106', 'FR76-ANCIEN')`, [ANCIEN]);
  // La configuration Stripe du patron posée par 076 est rétablie au ménage (072 la vérifie à la fin)
  const stripePatron = (await q(`SELECT to_jsonb(s) AS l FROM stripe_config s WHERE user_id = $1`, [PATRON])).rows[0]?.l;
  await q(`INSERT INTO stripe_config (user_id, organization_id, stripe_enabled, commission_model) VALUES ($1, $2, true, 'client'), ($3, $4, true, 'artisan')
    ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, stripe_enabled = EXCLUDED.stripe_enabled,
      commission_model = EXCLUDED.commission_model`, [PATRON, ORG_PATRON, SALARIE, ORG_PERSO]);

  // ── Page de paiement d'une facture faite par le salarié pour l'entreprise ──
  const fac = await facture({ user: SALARIE, org: ORG_PATRON, jeton: 'pay-106-salarie' });
  const avant = await paiement('pay-106-salarie');
  verifier(avant.entreprise?.nom === 'Patron SARL 106' && avant.entreprise?.iban === 'FR76-PATRON',
    `106 : la facture d'un salarié montre la fiche de l'entreprise, pas la sienne (${avant.entreprise?.nom}, ${avant.entreprise?.iban})`);
  const designePerso = await facture({ user: SALARIE, org: ORG_PATRON, entreprise: fichePerso, jeton: 'pay-106-designe-perso' });
  verifier((await paiement('pay-106-designe-perso')).entreprise?.nom === 'Patron SARL 106',
    `106 : même si elle désigne la fiche personnelle du salarié (${designePerso ? 'désignée' : ''})`);
  await facture({ user: SALARIE, org: ORG_PATRON, entreprise: ficheSeconde, jeton: 'pay-106-seconde' });
  verifier((await paiement('pay-106-seconde')).entreprise?.nom === 'Patron Dépannage 106', '106 : la fiche de l\'entreprise que la facture désigne, parmi plusieurs');

  // L'avoir fait par le patron sur la facture du salarié est déduit (avant : le client payait trop)
  await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, avoir_source_id)
    VALUES ($1, $2, 'AV-106-1', 'facture', 'avoir', 'envoye', -200, $3)`, [PATRON, ORG_PATRON, fac]);
  const apresAvoir = await paiement('pay-106-salarie');
  verifier(Number(apresAvoir.facture?.montant_credite) === 200 && Number(apresAvoir.facture?.reste_du) === 300,
    `106 : l'avoir du patron sur la facture du salarié est déduit (crédité ${apresAvoir.facture?.montant_credite}, reste ${apresAvoir.facture?.reste_du})`);

  // Ni un avoir d'une autre organisation sur cette facture, ni un avoir brouillon de l'entreprise
  await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, avoir_source_id) VALUES
    ($1, $2, 'AV-106-2', 'facture', 'avoir', 'envoye', -150, $5), ($3, $4, 'AV-106-3', 'facture', 'avoir', 'brouillon', -100, $5)`,
  [SOLO, ORG_SOLO, PATRON, ORG_PATRON, fac]);
  const apresAutres = await paiement('pay-106-salarie');
  verifier(Number(apresAutres.facture?.montant_credite) === 200,
    `106 : ni l'avoir d'une autre organisation, ni un avoir brouillon (crédité ${apresAutres.facture?.montant_credite})`);

  // Une fiche glissée dans l'organisation par un non-membre, même désignée par la facture, n'est pas montrée
  const glissee = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban, is_default) VALUES ($1, $2, 'Glissée 106', 'FR76-GLISSEE', true) RETURNING id`, [ANCIEN, ORG_PATRON])).rows[0].id;
  await facture({ user: SALARIE, org: ORG_PATRON, entreprise: glissee, jeton: 'pay-106-glissee' });
  const vueGlissee = await paiement('pay-106-glissee');
  verifier(vueGlissee.entreprise?.iban === 'FR76-PATRON', `106 : une fiche glissée par un non-membre n'est jamais montrée, même désignée (${vueGlissee.entreprise?.nom})`);
  await q(`DELETE FROM devis WHERE payment_token = 'pay-106-glissee'`);
  await q(`DELETE FROM entreprise WHERE id = $1`, [glissee]);

  // Une fiche archivée de l'entreprise passe après les autres (quand la facture n'en désigne aucune)
  await q(`UPDATE entreprise SET archived_at = now() WHERE id = $1`, [ficheEntreprise]);
  const vueArchivee = await paiement('pay-106-salarie');
  await q(`UPDATE entreprise SET archived_at = NULL WHERE id = $1`, [ficheEntreprise]);
  verifier(vueArchivee.entreprise?.nom && vueArchivee.entreprise?.nom !== 'Patron SARL 106' && vueArchivee.entreprise?.iban !== 'FR76-PERSO',
    `106 : une fiche archivée passe après une fiche active de l'entreprise (${vueArchivee.entreprise?.nom})`);

  // Paiement par carte : la configuration du patron (ouvert, modèle « client »), et le serveur seul reçoit le compte qui encaisse
  verifier(apresAvoir.stripe_enabled === true && apresAvoir.commission_model === 'client' && apresAvoir.facture?.beneficiaire_id == null,
    `106 : la page suit la configuration Stripe du patron, sans dire au visiteur qui encaisse (${apresAvoir.commission_model})`);
  const serveur = await commeServeur('pay-106-salarie');
  verifier(serveur.facture?.beneficiaire_id === PATRON && serveur.facture?.user_id === SALARIE,
    `106 : le serveur encaisse sur le compte du patron, pas du salarié (${serveur.facture?.beneficiaire_id})`);

  // Patron sans paiement en ligne : fermé, même si le salarié a branché le sien (pas de repli sur l'auteur)
  await q(`UPDATE stripe_config SET stripe_enabled = false WHERE user_id = $1`, [PATRON]);
  const sansStripe = await paiement('pay-106-salarie');
  await q(`UPDATE stripe_config SET stripe_enabled = true WHERE user_id = $1`, [PATRON]);
  verifier(sansStripe.stripe_enabled === false, '106 : patron sans paiement en ligne : fermé, même si le salarié a le sien');

  // La configuration Stripe du patron : ni lue, ni modifiée, ni effacée, ni remplacée par un membre (ouvrier)
  const vueOuvrier = await en(SALARIE, () => q(`SELECT user_id FROM stripe_config WHERE user_id = $1`, [PATRON]));
  const modifOuvrier = await en(SALARIE, () => q(`UPDATE stripe_config SET secret_key_vault_id = gen_random_uuid(), commission_model = 'artisan' WHERE user_id = $1 RETURNING user_id`, [PATRON]));
  const effaceOuvrier = await en(SALARIE, () => q(`DELETE FROM stripe_config WHERE user_id = $1 RETURNING user_id`, [PATRON]));
  verifier(vueOuvrier.rows.length === 0 && modifOuvrier.rows.length === 0 && effaceOuvrier.rows.length === 0,
    `106 : un ouvrier ne lit, ne modifie ni n'efface la configuration Stripe du patron (${vueOuvrier.rows.length}/${modifOuvrier.rows.length}/${effaceOuvrier.rows.length})`);
  const sauve = (await q(`SELECT to_jsonb(s) AS l FROM stripe_config s WHERE user_id = $1`, [PATRON])).rows[0].l;
  await q(`DELETE FROM stripe_config WHERE user_id = $1`, [PATRON]);
  let creeOuvrier = 'acceptée';
  try { await en(SALARIE, () => q(`INSERT INTO stripe_config (user_id, organization_id, stripe_enabled, secret_key_vault_id) VALUES ($1, $2, true, gen_random_uuid())`, [PATRON, ORG_PATRON])); }
  catch (e) { creeOuvrier = e.message; }
  await q(`DELETE FROM stripe_config WHERE user_id = $1`, [PATRON]);
  await q(`INSERT INTO stripe_config SELECT * FROM jsonb_populate_record(NULL::stripe_config, $1)`, [sauve]);
  verifier(creeOuvrier !== 'acceptée', `106 : ni ne la crée à sa place (${creeOuvrier})`);
  const modifPatron = await en(PATRON, () => q(`UPDATE stripe_config SET commission_model = 'client' WHERE user_id = $1 RETURNING user_id`, [PATRON]));
  verifier(modifPatron.rows.length === 1, '106 : le patron gère toujours la sienne');

  // ── Page de signature d'un devis fait par le salarié ──
  const jetonSig = await devisSigne({ user: SALARIE, org: ORG_PATRON });
  const sig = await signature(jetonSig);
  verifier(sig.entreprise?.nom === 'Patron SARL 106' && sig.entreprise?.iban === 'FR76-PATRON',
    `106 : la page de signature d'un devis du salarié montre la fiche de l'entreprise (avant : sa fiche « par défaut ») (${sig.entreprise?.nom})`);
  const sigDesigne = await signature(await devisSigne({ user: SALARIE, org: ORG_PATRON, entreprise: ficheSeconde }));
  verifier(sigDesigne.entreprise?.nom === 'Patron Dépannage 106', '106 : celle que le devis désigne, parmi celles de l\'entreprise');
  const sigPerso = await signature(await devisSigne({ user: SALARIE, org: ORG_PATRON, entreprise: fichePerso }));
  verifier(sigPerso.entreprise?.nom === 'Patron SARL 106', `106 : même si le devis désigne la fiche personnelle du salarié (${sigPerso.entreprise?.nom})`);

  // ── Une pièce de son organisation personnelle montre toujours sa fiche personnelle ──
  await facture({ user: SALARIE, org: ORG_PERSO, jeton: 'pay-106-perso' });
  const perso = await paiement('pay-106-perso');
  const persoServeur = await commeServeur('pay-106-perso');
  verifier(perso.entreprise?.nom === 'Perso salarié 106' && persoServeur.facture?.beneficiaire_id === SALARIE && perso.commission_model === 'artisan',
    `106 : dans sa propre entreprise, sa fiche et son Stripe (${perso.entreprise?.nom})`);

  // ── Une pièce glissée dans l'organisation par un compte qui n'en est pas membre (avant 084) : son compte seulement ──
  await q(`INSERT INTO devis (user_id, organization_id, numero, type, facture_type, statut, total_ttc, payment_token)
    VALUES ($1, $2, 'FAC-106-INJ', 'facture', 'totale', 'envoye', 500, 'pay-106-injectee')`, [ANCIEN, ORG_PATRON]);
  const inj = await paiement('pay-106-injectee');
  const injServeur = await commeServeur('pay-106-injectee');
  verifier(inj.entreprise?.nom === 'Fiche de l\'ancien 106' && inj.entreprise?.iban !== 'FR76-PATRON' && injServeur.facture?.beneficiaire_id === ANCIEN && inj.stripe_enabled === false,
    `106 : une pièce d'un non-membre ne montre ni la fiche ni le Stripe de l'entreprise (${inj.entreprise?.nom}, ${injServeur.facture?.beneficiaire_id === ANCIEN ? 'son compte' : 'autre'})`);
  const injSig = await signature((await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
    VALUES ($1, $2, 'DEV-106-INJ', 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days') RETURNING signature_token`, [ANCIEN, ORG_PATRON])).rows[0].signature_token);
  verifier(injSig.entreprise?.iban !== 'FR76-PATRON', `106 : ni sur la page de signature (${injSig.entreprise?.nom})`);

  // ── Rien ne change pour l'artisan seul ──
  const ficheSolo = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Solo 106', 'FR76-SOLO') RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  await facture({ user: SOLO, org: ORG_SOLO, entreprise: ficheSolo, jeton: 'pay-106-solo' });
  const solo = await paiement('pay-106-solo');
  const soloServeur = await commeServeur('pay-106-solo');
  verifier(solo.entreprise?.nom === 'Solo 106' && soloServeur.facture?.beneficiaire_id === SOLO, `106 : l'artisan seul garde sa fiche et son compte (${solo.entreprise?.nom})`);
  verifier((await signature(await devisSigne({ user: SOLO, org: ORG_SOLO }))).entreprise?.nom === 'Solo 106', '106 : comme sur la page de signature');

  // Ménage
  await q(`DELETE FROM devis WHERE numero LIKE 'AV-106-%'`);
  await q(`DELETE FROM devis WHERE numero LIKE 'FAC-106-%' OR numero LIKE 'DEV-106-%'`);
  await q(`DELETE FROM stripe_config WHERE user_id IN ($1, $2)`, [PATRON, SALARIE]);
  if (stripePatron) await q(`INSERT INTO stripe_config SELECT * FROM jsonb_populate_record(NULL::stripe_config, $1)`, [stripePatron]);
  await q(`DELETE FROM entreprise WHERE nom LIKE '%106'`);
  await q(`DELETE FROM organization_members WHERE organization_id = $1`, [ORG_PERSO]);
  await q(`DELETE FROM organizations WHERE id = $1`, [ORG_PERSO]);
  await q(`DELETE FROM auth.users WHERE id = $1`, [ANCIEN]);
}
