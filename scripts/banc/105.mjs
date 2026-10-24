// Vérifications de la migration 105 : un membre retiré de l'équipe (ou rétrogradé) ne garde pas la main sur la fiche
// entreprise de l'organisation qu'il a créée. La fiche, son journal de relances et ses exclusions passent au propriétaire
// de l'organisation ; la fiche d'une organisation ne se lit plus qu'en membre et ne se modifie plus qu'en gérant ; le
// patron, l'artisan seul et une fiche sans organisation ne voient aucun changement.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/105_fiche_entreprise_au_gerant_quand_son_auteur_quitte.sql');

const ADMIN = '10500000-0000-4000-8000-000000000001';      // administrateur qui crée la fiche, puis est retiré
const ADJOINT = '10500000-0000-4000-8000-000000000002';    // administrateur qui crée une fiche, puis est rétrogradé
const ANCIEN = '10500000-0000-4000-8000-000000000003';     // auteur d'une fiche, déjà hors de l'équipe (état antérieur)
const PARTANT = '10500000-0000-4000-8000-000000000004';    // administrateur auteur d'une fiche qui supprime son compte
const ORG_ADMIN ='10500000-0000-4000-8000-0000000000a1';  // organisation personnelle de l'administrateur
const ORG_JETABLE = '10500000-0000-4000-8000-0000000000a2';
const FACTURE = '10500000-0000-4000-8000-0000000000f1';

export async function verifier({ db, q, en, compte, verifier }) {
  const essayer = async (fn) => { try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; } };
  const iban = async (id) => (await q(`SELECT iban FROM entreprise WHERE id = $1`, [id])).rows[0].iban;
  const auteur = async (id) => (await q(`SELECT user_id FROM entreprise WHERE id = $1`, [id])).rows[0].user_id;

  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'admin@105.fr'), ($2, 'adjoint@105.fr'), ($3, 'ancien@105.fr')`, [ADMIN, ADJOINT, ANCIEN]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'admin')`, [ORG_PATRON, ADMIN, ADJOINT]);
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Perso admin', 'perso-admin-105', $2)`, [ORG_ADMIN, ADMIN]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', now() + interval '1 day')`, [ORG_ADMIN, ADMIN]);

  // L'administrateur crée la fiche de l'organisation du patron (084 l'y autorise) et sa fiche personnelle ; le serveur
  // journalise des relances et une exclusion à son nom, comme send-scheduled-relances (auteur de la fiche)
  const fiche = (await en(ADMIN, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Patron SARL 105', 'FR76-PATRON') RETURNING id`, [ADMIN, ORG_PATRON]))).rows[0].id;
  const fichePerso = (await en(ADMIN, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Perso admin 105', 'FR76-ADMIN') RETURNING id`, [ADMIN, ORG_ADMIN]))).rows[0].id;
  await q(`INSERT INTO relance_executions (user_id, organization_id, document_id, step_id, status, subject) VALUES
    ($1, $2, $4, 'j+7', 'sent', 'Relance patron 105'), ($1, $3, NULL, 'j+7', 'sent', 'Relance perso 105')`, [ADMIN, ORG_PATRON, ORG_ADMIN, FACTURE]);
  await q(`INSERT INTO relance_exclusions (user_id, organization_id, scope, document_id) VALUES ($1, $2, 'document', $3)`, [ADMIN, ORG_PATRON, FACTURE]);
  verifier(await compte(`SELECT count(*) AS n FROM relance_executions WHERE subject = 'Relance patron 105'`) === 1, '105 : (préparation) journal écrit au nom de l\'auteur de la fiche');

  // Encore gérant, il ne sort pas la fiche de l'organisation pour la garder après son départ (sans organisation, ou
  // dans son organisation personnelle) ; il la modifie toujours
  const sortie = await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET organization_id = NULL WHERE id = $1`, [fiche])));
  const versPerso = await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET organization_id = $2 WHERE id = $1`, [fiche, ORG_ADMIN])));
  const ou = (await q(`SELECT organization_id FROM entreprise WHERE id = $1`, [fiche])).rows[0].organization_id;
  verifier(!sortie.ok && !versPerso.ok && ou === ORG_PATRON, `105 : un gérant ne sort pas la fiche de l'organisation (${sortie.e || 'sortie autorisée'} ; ${versPerso.e || 'déplacement autorisé'})`);
  await en(ADMIN, () => q(`UPDATE entreprise SET telephone = '0102030405' WHERE id = $1`, [fiche]));
  verifier((await q(`SELECT telephone FROM entreprise WHERE id = $1`, [fiche])).rows[0].telephone === '0102030405', '105 : en gérant, il modifie toujours la fiche');

  // Le patron retire l'administrateur de l'équipe (écran Équipe)
  const retrait = await essayer(() => en(PATRON, () => q(`DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, ADMIN])));
  verifier(retrait.ok && retrait.r.rows.length === 1, `105 : le patron retire toujours un membre (${retrait.e || retrait.r.rows.length + ' ligne'})`);

  // Le membre retiré ne change plus l'IBAN, ne lit plus la fiche, ni le journal des relances de l'organisation
  await essayer(() => en(ADMIN, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE', email = 'pirate@x.fr' WHERE id = $1`, [fiche])));
  verifier(await iban(fiche) === 'FR76-PATRON', `105 : un membre retiré ne change plus l'IBAN de la fiche qu'il a créée (${await iban(fiche)})`);
  const lue = await en(ADMIN, () => q(`SELECT id FROM entreprise WHERE id = $1`, [fiche]));
  verifier(lue.rows.length === 0, `105 : ni ne la lit (${lue.rows.length} ligne)`);
  const journal = await en(ADMIN, () => q(`SELECT id FROM relance_executions WHERE organization_id = $1`, [ORG_PATRON]));
  verifier(journal.rows.length === 0, `105 : ni ne lit le journal des relances de l'organisation (${journal.rows.length} ligne)`);
  await essayer(() => en(ADMIN, () => q(`DELETE FROM relance_executions WHERE organization_id = $1`, [ORG_PATRON])));
  await essayer(() => en(ADMIN, () => q(`DELETE FROM relance_exclusions WHERE organization_id = $1`, [ORG_PATRON])));
  verifier(await compte(`SELECT count(*) AS n FROM relance_executions WHERE subject = 'Relance patron 105'`) === 1
    && await compte(`SELECT count(*) AS n FROM relance_exclusions WHERE organization_id = '${ORG_PATRON}'`) === 1,
  '105 : ni n\'efface le journal ou les exclusions (une relance déjà envoyée repartirait)');

  // La fiche, son journal et ses exclusions sont au patron : la relance automatique lit désormais ceux du patron, et ce
  // que le membre retiré écrit à son nom (sans organisation) ne compte plus pour elle
  verifier(await auteur(fiche) === PATRON, `105 : la fiche passe au propriétaire de l'organisation (${await auteur(fiche)})`);
  const auPatron = await en(PATRON, () => q(`SELECT id FROM relance_executions WHERE subject = 'Relance patron 105'`));
  verifier(auPatron.rows.length === 1, `105 : le patron retrouve le journal des relances de la fiche (${auPatron.rows.length} ligne)`);
  verifier(await compte(`SELECT count(*) AS n FROM relance_exclusions WHERE organization_id = '${ORG_PATRON}' AND user_id = '${PATRON}'`) === 1,
    '105 : et ses exclusions');
  const injecte = await essayer(() => en(ADMIN, () => q(`INSERT INTO relance_executions (user_id, document_id, step_id, status) VALUES ($1, $2, 'j+15', 'sent')`, [ADMIN, FACTURE])));
  const luParLaRelance = await compte(`SELECT count(*) AS n FROM relance_executions WHERE user_id = (SELECT user_id FROM entreprise WHERE id = '${fiche}') AND step_id = 'j+15'`);
  verifier(luParLaRelance === 0, `105 : un faux « déjà relancé » écrit par le membre retiré n'est plus lu pour la fiche (${injecte.ok ? 'écrit à son nom' : injecte.e}, ${luParLaRelance} lu)`);

  // Le patron garde la main ; la fiche personnelle du membre retiré et son journal restent à lui
  await en(PATRON, () => q(`UPDATE entreprise SET iban = 'FR76-NOUVEAU' WHERE id = $1`, [fiche]));
  verifier(await iban(fiche) === 'FR76-NOUVEAU', '105 : le patron modifie toujours la fiche');
  verifier(await auteur(fichePerso) === ADMIN, '105 : la fiche de sa propre organisation reste au membre retiré');
  await en(ADMIN, () => q(`UPDATE entreprise SET iban = 'FR76-ADMIN-2' WHERE id = $1`, [fichePerso]));
  verifier(await iban(fichePerso) === 'FR76-ADMIN-2', '105 : et il la modifie toujours');
  const journalPerso = await en(ADMIN, () => q(`SELECT id FROM relance_executions WHERE subject = 'Relance perso 105'`));
  verifier(journalPerso.rows.length === 1, '105 : comme son propre journal de relances');

  // Rétrogradé : un administrateur qui devient ouvrier ne garde pas la fiche qu'il a créée
  const ficheAdjoint = (await en(ADJOINT, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Deuxième fiche 105', 'FR76-DEUX') RETURNING id`, [ADJOINT, ORG_PATRON]))).rows[0].id;
  await q(`INSERT INTO relance_executions (user_id, organization_id, step_id, subject) VALUES ($1, $2, 'j+7', 'Relance adjoint 105')`, [ADJOINT, ORG_PATRON]);
  const promu = await essayer(() => en(PATRON, () => q(`UPDATE organization_members SET role = 'admin' WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, ADJOINT])));
  verifier(promu.ok && await auteur(ficheAdjoint) === ADJOINT, `105 : un changement de rôle qui reste gérant ne change rien (${promu.e || 'ok'})`);
  const retro = await essayer(() => en(PATRON, () => q(`UPDATE organization_members SET role = 'ouvrier' WHERE organization_id = $1 AND user_id = $2 RETURNING id`, [ORG_PATRON, ADJOINT])));
  verifier(retro.ok && retro.r.rows.length === 1, `105 : le patron rétrograde toujours un administrateur (${retro.e || 'ok'})`);
  await essayer(() => en(ADJOINT, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE' WHERE id = $1`, [ficheAdjoint])));
  verifier(await iban(ficheAdjoint) === 'FR76-DEUX', `105 : un administrateur rétrogradé ne change plus l'IBAN de sa fiche (${await iban(ficheAdjoint)})`);
  verifier(await auteur(ficheAdjoint) === PATRON
    && await compte(`SELECT count(*) AS n FROM relance_executions WHERE subject = 'Relance adjoint 105' AND user_id = '${PATRON}'`) === 1,
  '105 : sa fiche et son journal passent au patron');
  const vueOuvrier = await en(ADJOINT, () => q(`SELECT id FROM entreprise WHERE id = $1`, [ficheAdjoint]));
  verifier(vueOuvrier.rows.length === 1, '105 : en membre, il lit toujours la fiche (devis, factures)');

  // Défense en profondeur : une fiche dont l'auteur est hors de l'équipe (état laissé par le passé, écriture du
  // serveur) ne se lit ni ne se modifie plus par lui, même sans passer par le retrait
  const orpheline = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Orpheline 105', 'FR76-ORPH') RETURNING id`, [ANCIEN, ORG_PATRON])).rows[0].id;
  await essayer(() => en(ANCIEN, () => q(`UPDATE entreprise SET iban = 'FR76-PIRATE' WHERE id = $1`, [orpheline])));
  verifier(await iban(orpheline) === 'FR76-ORPH', '105 : un auteur hors de l\'équipe ne modifie pas la fiche (policy)');
  verifier((await en(ANCIEN, () => q(`SELECT id FROM entreprise WHERE id = $1`, [orpheline]))).rows.length === 0, '105 : ni ne la lit (policy)');
  // … et l'application de la migration la rend au patron (rattrapage, rejouable)
  const rejeu = await essayer(() => db.exec(fs.readFileSync(MIGRATION, 'utf8')));
  verifier(rejeu.ok, `105 : migration rejouée sans erreur (${rejeu.e || 'ok'})`);
  verifier(await auteur(orpheline) === PATRON, `105 : le rattrapage rend au patron une fiche dont l'auteur a quitté l'équipe (${await auteur(orpheline)})`);

  // Rien ne change pour l'artisan seul, ni pour une fiche sans organisation
  const ficheSolo = (await en(SOLO, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Solo 105', 'FR76-SOLO') RETURNING id`, [SOLO, ORG_SOLO]))).rows[0].id;
  await en(SOLO, () => q(`UPDATE entreprise SET iban = 'FR76-SOLO-2' WHERE id = $1`, [ficheSolo]));
  verifier(await iban(ficheSolo) === 'FR76-SOLO-2', '105 : l\'artisan seul modifie sa fiche');
  const sansOrg = (await q(`INSERT INTO entreprise (user_id, nom, iban) VALUES ($1, 'Sans organisation 105', 'FR76-NULL') RETURNING id`, [SOLO])).rows[0].id;
  await q(`UPDATE entreprise SET organization_id = NULL WHERE id = $1`, [sansOrg]);
  const vueSansOrg = await en(SOLO, () => q(`SELECT id FROM entreprise WHERE id = $1`, [sansOrg]));
  await en(SOLO, () => q(`UPDATE entreprise SET iban = 'FR76-NULL-2' WHERE id = $1`, [sansOrg]));
  verifier(vueSansOrg.rows.length === 1 && await iban(sansOrg) === 'FR76-NULL-2', '105 : une fiche sans organisation reste lue et modifiée par son auteur');
  const journalSolo = await essayer(() => en(SOLO, () => q(`INSERT INTO relance_executions (user_id, organization_id, step_id) VALUES ($1, $2, 'manual') RETURNING id`, [SOLO, ORG_SOLO])));
  verifier(journalSolo.ok, `105 : l'artisan seul journalise toujours ses relances (${journalSolo.e || 'ok'})`);

  // Un administrateur auteur de la fiche supprime son compte (072) : la fiche reste à l'organisation, au patron
  await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'partant@105.fr')`, [PARTANT]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'admin')`, [ORG_PATRON, PARTANT]);
  const fichePartant = (await en(PARTANT, () => q(`INSERT INTO entreprise (user_id, organization_id, nom) VALUES ($1, $2, 'Fiche du partant 105') RETURNING id`, [PARTANT, ORG_PATRON]))).rows[0].id;
  const suppression = await essayer(() => en(PARTANT, () => q(`SELECT supprimer_mon_compte() AS b`)));
  const restante = (await q(`SELECT user_id FROM entreprise WHERE id = $1`, [fichePartant])).rows[0];
  verifier(suppression.ok && restante?.user_id === PATRON, `105 : un administrateur supprime toujours son compte, la fiche reste au patron (${suppression.e || restante?.user_id || 'fiche supprimée'})`);

  // Supprimer une organisation qui a des membres et une fiche n'est pas bloqué par la réattribution
  await q(`INSERT INTO organizations (id, name, slug, owner_id) VALUES ($1, 'Jetable', 'jetable-105', $2)`, [ORG_JETABLE, ANCIEN]);
  await q(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner'), ($1, $3, 'admin')`, [ORG_JETABLE, ANCIEN, ADMIN]);
  await q(`INSERT INTO entreprise (user_id, organization_id, nom) VALUES ($1, $2, 'Fiche jetable 105')`, [ADMIN, ORG_JETABLE]);
  const supprimee = await essayer(() => q(`DELETE FROM organizations WHERE id = $1`, [ORG_JETABLE]));
  verifier(supprimee.ok && await compte(`SELECT count(*) AS n FROM entreprise WHERE nom = 'Fiche jetable 105'`) === 0,
    `105 : supprimer une organisation emporte toujours sa fiche (${supprimee.e || 'ok'})`);

  // Ménage : les vérifications suivantes repartent des données de base
  await q(`DELETE FROM relance_executions WHERE user_id IN ($1, $2, $3, $4) AND (subject LIKE '%105' OR step_id IN ('j+15', 'manual'))`, [ADMIN, ADJOINT, PATRON, SOLO]);
  await q(`DELETE FROM relance_exclusions WHERE document_id = $1`, [FACTURE]);
  await q(`DELETE FROM entreprise WHERE nom LIKE '%105'`);
  await q(`DELETE FROM organization_members WHERE user_id IN ($1, $2, $3, $4)`, [ADMIN, ADJOINT, ANCIEN, PARTANT]);
  await q(`DELETE FROM organizations WHERE id = $1`, [ORG_ADMIN]);
  await q(`DELETE FROM auth.users WHERE id IN ($1, $2, $3, $4)`, [ADMIN, ADJOINT, ANCIEN, PARTANT]);
}
