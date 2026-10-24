// Vérifications de la migration 105 : un membre qui quitte l'équipe ne garde rien de l'entreprise. Ce qu'il a créé dans
// l'organisation (fiche entreprise, pièces, clients) passe au propriétaire, avec le journal et les exclusions de
// relance qui portent sur ses pièces ; ses factures montrent toujours la fiche de l'entreprise ; un faux « déjà
// relancé » écrit par un ouvrier sur une facture du patron ne lui est pas donné ; la fiche d'une organisation ne se lit
// qu'en membre, ne se modifie qu'en gérant, et ne change ni d'organisation ni d'auteur depuis l'app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/105_un_membre_qui_part_ne_garde_rien_de_l_equipe.sql');

const ADMIN = '10500000-0000-4000-8000-000000000001';      // administrateur auteur de la fiche, puis retiré
const ADJOINT = '10500000-0000-4000-8000-000000000002';    // administrateur qui retire ADMIN, puis est rétrogradé
const ANCIEN = '10500000-0000-4000-8000-000000000003';     // auteur de lignes glissées dans l'organisation sans en être membre
const PARTANT = '10500000-0000-4000-8000-000000000004';    // administrateur auteur d'une fiche qui supprime son compte
const OUVRIER = '10500000-0000-4000-8000-000000000005';    // ouvrier qui écrit un faux journal, puis est retiré
const ORG_ADMIN = '10500000-0000-4000-8000-0000000000a1';  // organisation personnelle de l'administrateur
const ORG_JETABLE = '10500000-0000-4000-8000-0000000000a2';

export async function verifier({ db, q, en, commeAnonyme, compte, verifier }) {
  const essayer = async (fn) => { try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; } };
  const iban = async (id) => (await q(`SELECT iban FROM entreprise WHERE id = $1`, [id])).rows[0].iban;
  const auteur = async (table, id) => (await q(`SELECT user_id FROM ${table} WHERE id = $1`, [id])).rows[0]?.user_id;
  const paiement = (jeton) => commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {});
  const signature = (jeton) => commeAnonyme(async () => (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j || {});

  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'admin@105.fr'), ($2, 'adjoint@105.fr'), ($3, 'ancien@105.fr'), ($4, 'ouvrier@105.fr')`, [ADMIN, ADJOINT, ANCIEN, OUVRIER]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'admin'), ($1, $4, 'ouvrier')`, [ORG_PATRON, ADMIN, ADJOINT, OUVRIER]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Perso admin', 'perso-admin-105', $2)`, [ORG_ADMIN, ADMIN]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', now() + interval '1 day')`, [ORG_ADMIN, ADMIN]);

  // Le patron a déjà sa fiche ; l'administrateur crée celle de l'entreprise (084 l'y autorise), et a sa fiche personnelle
  const fichePatron = (await en(PATRON, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Patron perso 105', 'FR76-PATRON-PERSO') RETURNING id`, [PATRON, ORG_PATRON]))).rows[0].id;
  const fiche = (await en(ADMIN, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Patron SARL 105', 'FR76-PATRON') RETURNING id`, [ADMIN, ORG_PATRON]))).rows[0].id;
  const fichePerso = (await en(ADMIN, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Perso admin 105', 'FR76-ADMIN') RETURNING id`, [ADMIN, ORG_ADMIN]))).rows[0].id;

  // Ses pièces dans l'organisation : un client, un devis envoyé par lien, une facture envoyée, un brouillon
  const client = (await en(ADMIN, () => q(`INSERT INTO clients (user_id, organization_id, nom, prenom, email) VALUES ($1, $2, 'Client 105', 'Léa', 'lea@105.fr') RETURNING id`, [ADMIN, ORG_PATRON]))).rows[0].id;
  const devis = (await q(`INSERT INTO devis (user_id, organization_id, client_id, entreprise_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
    VALUES ($1, $2, $3, $4, 'DEV-105', 'devis', 'envoye', now()::date, 30, gen_random_uuid(), now() + interval '10 days') RETURNING id, signature_token`, [ADMIN, ORG_PATRON, client, fiche])).rows[0];
  const facture = (await q(`INSERT INTO devis (user_id, organization_id, client_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token)
    VALUES ($1, $2, $3, $4, 'FAC-105', 'facture', 'totale', 'envoye', 500, 'pay-105') RETURNING id`, [ADMIN, ORG_PATRON, client, fiche])).rows[0].id;
  const brouillon = (await en(ADMIN, () => q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, objet) VALUES ($1, $2, $3, 'DEV-105-B', 'devis', 'brouillon', 'Tableau électrique') RETURNING id`, [ADMIN, ORG_PATRON, client]))).rows[0].id;
  // Une facture du patron, et son client
  const clientPatron = (await q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client patron 105') RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const facturePatron = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, facture_type, statut, total_ttc) VALUES ($1, $2, $3, 'FAC-105-P', 'facture', 'totale', 'envoye', 800) RETURNING id`, [PATRON, ORG_PATRON, clientPatron])).rows[0].id;

  // Relances : le serveur journalise au nom de l'auteur de la fiche (send-scheduled-relances), l'administrateur exclut
  // son client ; l'ouvrier écrit un faux « déjà relancé » et une exclusion sur la facture et le client du patron
  await q(`INSERT INTO relance_executions (user_id, organization_id, document_id, step_id, status, subject) VALUES
    ($1, $2, $3, 'j+7', 'sent', 'Relance FAC-105'), ($1, $4, NULL, 'j+7', 'sent', 'Relance perso 105')`, [ADMIN, ORG_PATRON, facture, ORG_ADMIN]);
  await en(ADMIN, () => q(`INSERT INTO relance_executions (user_id, document_id, step_id, subject) VALUES ($1, $2, 'manual', 'Relance manuelle 105')`, [ADMIN, facture]));
  await q(`INSERT INTO relance_exclusions (user_id, organization_id, scope, document_id) VALUES ($1, $2, 'document', $3)`, [ADMIN, ORG_PATRON, facture]);
  await q(`INSERT INTO relance_exclusions (user_id, organization_id, scope, client_id) VALUES ($1, $2, 'client', $3)`, [ADMIN, ORG_PATRON, client]);
  // Une table où chacun n'a qu'une ligne (index unique sur user_id, comme usage_tracking) : le patron et
  // l'administrateur y ont chacun la leur, à l'organisation du patron
  await q(`CREATE TABLE compteur_105 (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, organization_id UUID, periode TEXT, UNIQUE (user_id, periode))`);
  await q(`INSERT INTO compteur_105 (user_id, organization_id, periode) VALUES ($1, $3, '2026-10'), ($2, $3, '2026-10')`, [PATRON, ADMIN, ORG_PATRON]);
  await en(OUVRIER, () => q(`INSERT INTO relance_executions (user_id, organization_id, document_id, step_id, status, subject) VALUES ($1, $2, $3, 'j+7', 'sent', 'Faux 105')`, [OUVRIER, ORG_PATRON, facturePatron]));
  await en(OUVRIER, () => q(`INSERT INTO relance_exclusions (user_id, organization_id, scope, client_id) VALUES ($1, $2, 'client', $3)`, [OUVRIER, ORG_PATRON, clientPatron]));

  const avant = await paiement('pay-105');
  verifier(avant.entreprise?.nom === 'Patron SARL 105', `105 : (préparation) la page de paiement de sa facture montre la fiche de l'entreprise (${avant.entreprise?.nom})`);

  // Encore gérant, il ne sort pas la fiche de l'organisation, ni ne la met au nom d'un autre ; il la modifie toujours
  const sortie = await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET organization_id = NULL WHERE id = $1`, [fiche])));
  const versPerso = await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET organization_id = $2 WHERE id = $1`, [fiche, ORG_ADMIN])));
  const complice = await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET user_id = $2 WHERE id = $1`, [fiche, OUVRIER])));
  const parPatron = await essayer(() => en(PATRON, () => q(`UPDATE entreprise SET user_id = $2 WHERE id = $1`, [fiche, ANCIEN])));
  const ficheLue = (await q(`SELECT organization_id, user_id FROM entreprise WHERE id = $1`, [fiche])).rows[0];
  verifier(!sortie.ok && !versPerso.ok && ficheLue.organization_id === ORG_PATRON,
    `105 : un gérant ne sort pas la fiche de l'organisation (${sortie.e || 'sortie autorisée'})`);
  verifier(!complice.ok && !parPatron.ok && ficheLue.user_id === ADMIN,
    `105 : ni ne change son auteur, même le patron (${complice.e || 'autorisé'} ; ${parPatron.e || 'autorisé'})`);
  const auNomDAutrui = await essayer(() => en(ADMIN, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Fiche complice 105', 'FR76-COMPLICE')`, [OUVRIER, ORG_PATRON])));
  verifier(!auNomDAutrui.ok, `105 : ni ne crée une fiche au nom d'un autre membre (${auNomDAutrui.e || 'autorisé'})`);
  await en(ADMIN, () => q(`UPDATE entreprise SET telephone = '0102030405' WHERE id = $1`, [fiche]));
  verifier((await q(`SELECT telephone FROM entreprise WHERE id = $1`, [fiche])).rows[0].telephone === '0102030405', '105 : en gérant, il modifie toujours la fiche');

  // Un autre administrateur le retire de l'équipe (écran Équipe)
  const retrait = await essayer(() => en(ADJOINT, () => q(`DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, ADMIN])));
  verifier(retrait.ok && retrait.r.rows.length === 1, `105 : un administrateur retire toujours un membre (${retrait.e || retrait.r.rows.length + ' ligne'})`);

  // Le membre retiré ne change plus l'IBAN, ne lit plus la fiche, ses pièces, ses clients, ni le journal des relances
  await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE', email = 'pirate@x.fr' WHERE id = $1`, [fiche])));
  verifier(await iban(fiche) === 'FR76-PATRON', `105 : un membre retiré ne change plus l'IBAN de la fiche qu'il a créée (${await iban(fiche)})`);
  verifier((await en(ADMIN, () => q(`SELECT id FROM entreprise WHERE id = $1`, [fiche]))).rows.length === 0, '105 : ni ne la lit');
  await essayer(() => en(ADMIN, () => q(`UPDATE devis SET objet = 'Modifié par l''ancien membre' WHERE id = $1`, [brouillon])));
  verifier((await q(`SELECT objet FROM devis WHERE id = $1`, [brouillon])).rows[0].objet === 'Tableau électrique', '105 : ni ne modifie le brouillon qu\'il avait fait');
  verifier((await en(ADMIN, () => q(`SELECT id FROM clients WHERE id = $1`, [client]))).rows.length === 0, '105 : ni ne lit son client de l\'entreprise');
  const journal = await en(ADMIN, () => q(`SELECT id FROM relance_executions WHERE document_id = $1`, [facture]));
  verifier(journal.rows.length === 0, `105 : ni le journal des relances de ses factures (${journal.rows.length} ligne)`);
  await essayer(() => en(ADMIN, () => q(`DELETE FROM relance_executions WHERE document_id = $1`, [facture])));
  verifier(await compte(`SELECT count(*) AS n FROM relance_executions WHERE document_id = '${facture}'`) === 2,
    '105 : ni ne l\'efface (une relance déjà envoyée repartirait)');

  // Tout est au patron ; ses factures montrent toujours la fiche de l'entreprise, pas sa fiche personnelle
  const auPatron = [await auteur('entreprise', fiche), await auteur('clients', client), await auteur('devis', devis.id), await auteur('devis', facture), await auteur('devis', brouillon)];
  verifier(auPatron.every((u) => u === PATRON), `105 : sa fiche, son client, ses devis et ses factures passent au patron (${auPatron.filter((u) => u !== PATRON).length} restant)`);
  const apres = await paiement('pay-105');
  verifier(apres.entreprise?.nom === 'Patron SARL 105', `105 : la page de paiement de sa facture montre la fiche de l'entreprise, pas la sienne (${apres.entreprise?.nom})`);
  const signe = await signature(devis.signature_token);
  verifier(signe.entreprise?.nom === 'Patron SARL 105', `105 : comme la page de signature de son devis (${signe.entreprise?.nom})`);
  verifier(await compte(`SELECT count(*) AS n FROM relance_executions WHERE document_id = '${facture}' AND user_id = '${PATRON}'`) === 2
    && await compte(`SELECT count(*) AS n FROM relance_exclusions WHERE document_id = '${facture}' AND user_id = '${PATRON}'`) === 1,
  '105 : le journal (relance manuelle comprise) et l\'exclusion de sa facture suivent ses pièces');
  verifier(await compte(`SELECT count(*) AS n FROM relance_exclusions WHERE client_id = '${client}' AND user_id = '${ADMIN}'`) === 1,
    '105 : pas son exclusion d\'un client entier (elle couperait les relances des factures du patron à ce client)');
  verifier(await compte(`SELECT count(*) AS n FROM compteur_105 WHERE user_id = '${ADMIN}'`) === 1,
    '105 : une table à une ligne par compte n\'empêche pas le retrait ; sa ligne lui reste');
  await en(PATRON, () => q(`UPDATE entreprise SET iban = 'FR76-NOUVEAU' WHERE id = $1`, [fiche]));
  verifier(await iban(fiche) === 'FR76-NOUVEAU', '105 : le patron modifie la fiche');
  verifier(await auteur('entreprise', fichePatron) === PATRON && (await en(PATRON, () => q(`SELECT id FROM entreprise WHERE id IN ($1, $2) AND user_id = $3`, [fichePatron, fiche, PATRON]))).rows.length === 2,
    '105 : le patron qui avait déjà sa fiche garde les deux');

  // Sa fiche personnelle et son journal personnel restent à lui
  verifier(await auteur('entreprise', fichePerso) === ADMIN, '105 : la fiche de sa propre organisation reste au membre retiré');
  await en(ADMIN, () => q(`UPDATE entreprise SET iban = 'FR76-ADMIN-2' WHERE id = $1`, [fichePerso]));
  verifier(await iban(fichePerso) === 'FR76-ADMIN-2', '105 : et il la modifie toujours');
  verifier((await en(ADMIN, () => q(`SELECT id FROM relance_executions WHERE subject = 'Relance perso 105'`))).rows.length === 1, '105 : comme son propre journal de relances');

  // Le patron retire l'ouvrier : son faux « déjà relancé » et son exclusion sur les pièces du patron ne lui sont pas donnés
  // (la relance automatique ne les lit donc pas)
  const depart = await essayer(() => en(PATRON, () => q(`DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, OUVRIER])));
  verifier(depart.ok && depart.r.rows.length === 1, `105 : le patron retire un ouvrier (${depart.e || 'ok'})`);
  const fauxAuPatron = await compte(`SELECT count(*) AS n FROM relance_executions WHERE document_id = '${facturePatron}' AND user_id = '${PATRON}'`)
    + await compte(`SELECT count(*) AS n FROM relance_exclusions WHERE client_id = '${clientPatron}' AND user_id = '${PATRON}'`);
  verifier(fauxAuPatron === 0, `105 : le faux journal d'un ouvrier sur les pièces du patron ne lui est pas donné (${fauxAuPatron} ligne)`);

  // Rétrogradé : un administrateur qui devient ouvrier garde ses pièces (il reste dans l'équipe), mais ne change plus
  // l'IBAN de la fiche qu'il a créée ; il la lit toujours
  const ficheAdjoint = (await en(ADJOINT, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Deuxième fiche 105', 'FR76-DEUX') RETURNING id`, [ADJOINT, ORG_PATRON]))).rows[0].id;
  const retro = await essayer(() => en(PATRON, () => q(`UPDATE organization_members SET role = 'ouvrier' WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, ADJOINT])));
  verifier(retro.ok && retro.r.rows.length === 1, `105 : le patron rétrograde toujours un administrateur (${retro.e || 'ok'})`);
  await essayer(() => en(ADJOINT, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE' WHERE id = $1`, [ficheAdjoint])));
  verifier(await iban(ficheAdjoint) === 'FR76-DEUX', `105 : un administrateur rétrogradé ne change plus l'IBAN de sa fiche (${await iban(ficheAdjoint)})`);
  verifier((await en(ADJOINT, () => q(`SELECT id FROM entreprise WHERE id = $1`, [ficheAdjoint]))).rows.length === 1
    && await auteur('entreprise', ficheAdjoint) === ADJOINT, '105 : en membre, il la lit toujours, et elle reste à son nom');

  // Défense en profondeur : des lignes dont l'auteur est déjà hors de l'équipe (état antérieur, écriture du serveur)
  const orpheline = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Orpheline 105', 'FR76-ORPH') RETURNING id`, [ANCIEN, ORG_PATRON])).rows[0].id;
  const devisOrphelin = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut) VALUES ($1, $2, 'DEV-105-O', 'devis', 'brouillon') RETURNING id`, [ANCIEN, ORG_PATRON])).rows[0].id;
  await essayer(() => en(ANCIEN, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE' WHERE id = $1`, [orpheline])));
  verifier(await iban(orpheline) === 'FR76-ORPH', '105 : un auteur hors de l\'équipe ne modifie pas la fiche (policy)');
  verifier((await en(ANCIEN, () => q(`SELECT id FROM entreprise WHERE id = $1`, [orpheline]))).rows.length === 0, '105 : ni ne la lit (policy)');
  // … et rejouer la migration ne les donne pas au patron : pas de rattrapage (une ligne glissée avant 084 par un compte
  // jamais membre serait devenue celle du patron)
  const rejeu = await essayer(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu.ok, `105 : migration rejouée sans erreur (${rejeu.e || 'ok'})`);
  verifier(await auteur('entreprise', orpheline) === ANCIEN && await auteur('devis', devisOrphelin) === ANCIEN,
    `105 : une ligne d'un compte jamais membre n'est pas donnée au patron (${await auteur('entreprise', orpheline)})`);

  // Les pièces suivent toujours le partant : une exclusion silencieuse (index unique ajouté un jour) se verrait ici
  const suivies = (await q(`SELECT array_agg(t ORDER BY t) AS l FROM public.tables_rendues_au_depart() t
    WHERE t IN ('clients', 'devis', 'entreprise', 'paiements', 'ramonages')`)).rows[0].l || [];
  verifier(suivies.length === 5, `105 : fiche, clients, devis, paiements et attestations suivent le partant (${suivies.join(', ')})`);

  // Droits : la réattribution n'est exécutable que par le serveur
  const droits = (await q(`SELECT has_function_privilege('anon', 'public.pieces_rendues_au_proprietaire(uuid, uuid)', 'execute') AS v,
    has_function_privilege('authenticated', 'public.pieces_rendues_au_proprietaire(uuid, uuid)', 'execute') AS c`)).rows[0];
  const appel = await essayer(() => en(PATRON, () => q(`SELECT public.pieces_rendues_au_proprietaire($1, $2)`, [ORG_SOLO, SOLO])));
  verifier(!droits.v && !droits.c && !appel.ok, `105 : un compte connecté n'appelle pas la réattribution (${appel.e || 'appel autorisé'})`);

  // Rien ne change pour l'artisan seul, ni pour une fiche sans organisation
  const ficheSolo = (await en(SOLO, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Solo 105', 'FR76-SOLO') RETURNING id`, [SOLO, ORG_SOLO]))).rows[0].id;
  await en(SOLO, () => q(`UPDATE entreprise SET iban = 'FR76-SOLO-2' WHERE id = $1`, [ficheSolo]));
  verifier(await iban(ficheSolo) === 'FR76-SOLO-2', '105 : l\'artisan seul modifie sa fiche');
  const sansOrg = (await q(`INSERT INTO entreprise (user_id, nom, iban) VALUES ($1, 'Sans organisation 105', 'FR76-NULL') RETURNING id`, [SOLO])).rows[0].id;
  await q(`UPDATE entreprise SET organization_id = NULL WHERE id = $1`, [sansOrg]);
  const vueSansOrg = await en(SOLO, () => q(`SELECT id FROM entreprise WHERE id = $1`, [sansOrg]));
  await en(SOLO, () => q(`UPDATE entreprise SET iban = 'FR76-NULL-2' WHERE id = $1`, [sansOrg]));
  verifier(vueSansOrg.rows.length === 1 && await iban(sansOrg) === 'FR76-NULL-2', '105 : une fiche sans organisation reste lue et modifiée par son auteur');
  const journalSolo = await essayer(() => en(SOLO, () => q(`INSERT INTO relance_executions (user_id, organization_id, step_id, subject) VALUES ($1, $2, 'manual', 'Solo 105') RETURNING id`, [SOLO, ORG_SOLO])));
  verifier(journalSolo.ok, `105 : l'artisan seul journalise toujours ses relances (${journalSolo.e || 'ok'})`);

  // Un administrateur auteur de la fiche supprime son compte (072) : la fiche reste à l'organisation, au patron
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'partant@105.fr')`, [PARTANT]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'admin')`, [ORG_PATRON, PARTANT]);
  const fichePartant = (await en(PARTANT, () => q(`INSERT INTO entreprise (user_id, organization_id, nom) VALUES ($1, $2, 'Fiche du partant 105') RETURNING id`, [PARTANT, ORG_PATRON]))).rows[0].id;
  const suppression = await essayer(() => en(PARTANT, () => q(`SELECT supprimer_mon_compte() AS b`)));
  const restante = await auteur('entreprise', fichePartant);
  verifier(suppression.ok && restante === PATRON, `105 : un administrateur supprime toujours son compte, la fiche reste au patron (${suppression.e || restante || 'fiche supprimée'})`);

  // Supprimer une organisation qui a des membres et une fiche n'est pas bloqué par la réattribution
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Jetable', 'jetable-105', $2)`, [ORG_JETABLE, ANCIEN]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner'), ($1, $3, 'admin')`, [ORG_JETABLE, ANCIEN, ADJOINT]);
  await q(`INSERT INTO entreprise (user_id, organization_id, nom) VALUES ($1, $2, 'Fiche jetable 105')`, [ADJOINT, ORG_JETABLE]);
  const supprimee = await essayer(() => q(`DELETE FROM organizations WHERE id = $1`, [ORG_JETABLE]));
  verifier(supprimee.ok && await compte(`SELECT count(*) AS n FROM entreprise WHERE nom = 'Fiche jetable 105'`) === 0,
    `105 : supprimer une organisation emporte toujours sa fiche (${supprimee.e || 'ok'})`);

  // Ménage : les vérifications suivantes repartent des données de base
  await q(`DELETE FROM relance_executions WHERE subject LIKE '%105' OR subject LIKE 'Relance FAC-105'`);
  await q(`DELETE FROM relance_exclusions WHERE client_id IN ($1, $2) OR document_id = $3`, [client, clientPatron, facture]);
  await q(`DROP TABLE compteur_105`);
  await q(`DELETE FROM devis WHERE numero IN ('DEV-105', 'FAC-105', 'DEV-105-B', 'FAC-105-P', 'DEV-105-O')`);
  await q(`DELETE FROM clients WHERE nom LIKE 'Client%105'`);
  await q(`DELETE FROM entreprise WHERE nom LIKE '%105'`);
  await q(`DELETE FROM organization_members WHERE user_id IN ($1, $2, $3, $4, $5)`, [ADMIN, ADJOINT, ANCIEN, PARTANT, OUVRIER]);
  await q(`DELETE FROM organizations WHERE id = $1`, [ORG_ADMIN]);
  await q(`DELETE FROM auth.users WHERE id IN ($1, $2, $3, $4, $5)`, [ADMIN, ADJOINT, ANCIEN, PARTANT, OUVRIER]);
}
