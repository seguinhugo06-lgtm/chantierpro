// Vérifications de la migration 084 : un compte connecté n'écrit plus de ligne dans l'organisation d'un autre ;
// la fiche entreprise d'une organisation n'est modifiée ou supprimée que par son propriétaire ou un administrateur.
import { PATRON, SALARIE, SOLO } from './socle.mjs';

const ORGA_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, verifier }) {
  const essayer = async (fn) => { try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; } };
  // Policies de mise à jour de clients telles qu'en production le 10 oct. 2026 (le banc de 079 ne pose que insert/select)
  await q(`DROP POLICY IF EXISTS "Users can update own clients" ON clients`);
  await q(`CREATE POLICY "Users can update own clients" ON clients FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`);
  await q(`DROP POLICY IF EXISTS "Org members can update clients" ON clients`);
  await q(`CREATE POLICY "Org members can update clients" ON clients FOR UPDATE TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())))`);

  // Injection : le patron crée un client et une fiche entreprise dans l'organisation du solo
  const client = await essayer(() => en(PATRON, () => q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client injecté') RETURNING id`, [PATRON, ORGA_SOLO])));
  verifier(!client.ok && /Organisation interdite/.test(client.e), `084 : un compte ne crée pas de client dans l'organisation d'un autre (${client.e || 'autorisé'})`);
  const fiche = await essayer(() => en(PATRON, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban, is_default) VALUES ($1, $2, 'Fiche pirate', 'FR76-PIRATE', true)`, [PATRON, ORGA_SOLO])));
  verifier(!fiche.ok, `084 : ni de fiche entreprise (${fiche.e || 'autorisé'})`);
  const n = Number((await q(`SELECT count(*) AS n FROM clients WHERE nom = 'Client injecté'`)).rows[0].n) + Number((await q(`SELECT count(*) AS n FROM entreprise WHERE nom = 'Fiche pirate'`)).rows[0].n);
  verifier(n === 0, '084 : rien n\'a été écrit');

  // Déplacement : le patron déplace son propre client dans l'organisation du solo
  const sien = (await en(PATRON, () => q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Client du patron') RETURNING id`, [PATRON, ORGA_PATRON]))).rows[0].id;
  verifier(!!sien, '084 : un compte crée toujours un client dans SA organisation');
  const deplace = await essayer(() => en(PATRON, () => q(`UPDATE clients SET organization_id = $2 WHERE id = $1 RETURNING organization_id`, [sien, ORGA_SOLO])));
  verifier(!deplace.ok && /Organisation interdite/.test(deplace.e), `084 : ni ne le déplace dans l'organisation d'un autre (${deplace.e || 'autorisé'})`);
  const modif = await essayer(() => en(PATRON, () => q(`UPDATE clients SET nom = 'Client du patron (modifié)' WHERE id = $1 RETURNING id`, [sien])));
  verifier(modif.ok && modif.r.rows.length === 1, `084 : une modification qui ne touche pas l'organisation passe (${modif.e || modif.r.rows.length + ' ligne'})`);

  // Sans organisation : 079 la renseigne (le contrôle laisse passer, puis la ligne reçoit la sienne)
  const sansOrg = (await en(SOLO, () => q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Sans organisation') RETURNING organization_id`, [SOLO]))).rows[0];
  verifier(sansOrg.organization_id === ORGA_SOLO, `084 : une ligne sans organisation reçoit toujours celle de son auteur (${sansOrg.organization_id})`);

  // Le serveur (sans jeton) écrit où il faut
  const serveur = await essayer(() => q(`INSERT INTO clients (user_id, organization_id, nom) VALUES ($1, $2, 'Écrit par le serveur') RETURNING id`, [PATRON, ORGA_SOLO]));
  verifier(serveur.ok, `084 : le serveur n'est pas concerné (${serveur.e || 'ok'})`);

  // Fiche entreprise de l'organisation du patron : l'ouvrier ne change pas l'IBAN, le patron oui
  const entreprisePatron = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Patron SARL', 'FR76-PATRON') RETURNING id`, [PATRON, ORGA_PATRON])).rows[0].id;
  await essayer(() => en(SALARIE, () => q(`UPDATE entreprise SET iban = 'FR76-OUVRIER' WHERE id = $1`, [entreprisePatron])));
  const ibanApresOuvrier = (await q(`SELECT iban FROM entreprise WHERE id = $1`, [entreprisePatron])).rows[0].iban;
  verifier(ibanApresOuvrier === 'FR76-PATRON', `084 : un ouvrier ne change pas l'IBAN de l'entreprise (${ibanApresOuvrier})`);
  await essayer(() => en(SALARIE, () => q(`DELETE FROM entreprise WHERE id = $1`, [entreprisePatron])));
  verifier(Number((await q(`SELECT count(*) AS n FROM entreprise WHERE id = $1`, [entreprisePatron])).rows[0].n) === 1, '084 : ni ne supprime la fiche');
  await en(PATRON, () => q(`UPDATE entreprise SET iban = 'FR76-NOUVEAU' WHERE id = $1`, [entreprisePatron]));
  verifier((await q(`SELECT iban FROM entreprise WHERE id = $1`, [entreprisePatron])).rows[0].iban === 'FR76-NOUVEAU', '084 : le patron modifie toujours sa fiche');

  const ficheOuvrier = await essayer(() => en(SALARIE, () => q(`INSERT INTO entreprise (user_id, organization_id, nom, iban) VALUES ($1, $2, 'Fiche ouvrier', 'FR76-OUVRIER')`, [SALARIE, ORGA_PATRON])));
  verifier(!ficheOuvrier.ok, `084 : un ouvrier n'ajoute pas de fiche entreprise à l'organisation (${ficheOuvrier.e || 'autorisé'})`);

  const garde = Number((await q(`SELECT count(*) AS n FROM pg_trigger WHERE tgname = 'trg_garder_organisation'`)).rows[0].n);
  verifier(garde > 0, `084 : contrôle posé sur les tables présentes (${garde})`);

  await q(`DELETE FROM clients WHERE nom IN ('Client du patron (modifié)', 'Client du patron', 'Sans organisation', 'Écrit par le serveur')`);
  await q(`DELETE FROM entreprise WHERE id = $1`, [entreprisePatron]);
}
