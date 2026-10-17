// Vérifications de la migration 092 : un visiteur n'appelle plus que les fonctions des pages publiques.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON, SALARIE, SOLO, ORG_PATRON, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations/092_fonctions_fermees_aux_visiteurs.sql');

const PUBLIQUES = ['get_devis_for_signature', 'get_facture_for_payment', 'get_invitation_by_token', 'retracter_devis', 'sign_devis'];

// ai_suggestions et ses 11 policies telles qu'en production (relevé du 17 oct. 2026), avant 092
const SUGGESTIONS_PRODUCTION = `
  CREATE TABLE IF NOT EXISTS ai_suggestions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, organization_id UUID, type TEXT, title TEXT);
  ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Org admins can delete ai_suggestions" ON ai_suggestions FOR DELETE TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Users can delete own suggestions" ON ai_suggestions FOR DELETE TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Service role can insert suggestions" ON ai_suggestions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Users can create own suggestions" ON ai_suggestions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Org members can insert ai_suggestions" ON ai_suggestions FOR INSERT TO authenticated WITH CHECK (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Org members can view ai_suggestions" ON ai_suggestions FOR SELECT TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Users can view own suggestions" ON ai_suggestions FOR SELECT TO authenticated USING (user_id = auth.uid());
  CREATE POLICY "Users can view their own suggestions" ON ai_suggestions FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Org members can update ai_suggestions" ON ai_suggestions FOR UPDATE TO authenticated USING (organization_id = ANY (user_org_ids(auth.uid())));
  CREATE POLICY "Users can update own suggestions" ON ai_suggestions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  CREATE POLICY "Users can update their own suggestions" ON ai_suggestions FOR UPDATE USING (auth.uid() = user_id);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ai_suggestions TO anon, authenticated;
`;

export async function verifier({ db, q, en, commeAnonyme, verifier }) {
  // Le lanceur réaccorde SELECT/INSERT/UPDATE/DELETE sur toutes les tables et vues après les migrations (droits par
  // défaut de Supabase sur les tables) : rejouer 092, comme en production où rien ne les réaccorde ensuite — après
  // avoir posé ai_suggestions telle qu'en production (ses policies appellent user_org_ids, absente du socle à ce stade)
  await db.exec(SUGGESTIONS_PRODUCTION);
  await db.exec(fs.readFileSync(MIGRATION, 'utf8'));
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const ouvertesAuxVisiteurs = async () => (await q(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE') ORDER BY 1`)).rows.map((r) => r.proname);

  // 1. Un visiteur : les seules fonctions des pages publiques
  const ouvertes = await ouvertesAuxVisiteurs();
  // Égalité exacte : une fonction publique recréée sans GRANT … TO anon (règle 6) casserait sa page
  verifier(ouvertes.join(',') === PUBLIQUES.join(','), `092 : un visiteur n'exécute que les cinq fonctions publiques, toutes (${ouvertes.join(', ')})`);
  verifier(await refuse(() => commeAnonyme(() => q('SELECT * FROM get_pending_reminders($1, 0)', [SOLO])))
    && await refuse(() => commeAnonyme(() => q('SELECT user_org_ids($1)', [PATRON])))
    && await refuse(() => commeAnonyme(() => q('SELECT get_user_org_id($1)', [PATRON])))
    && await refuse(() => commeAnonyme(() => q('SELECT get_user_plan($1)', [PATRON])))
    && await refuse(() => commeAnonyme(() => q('SELECT get_user_role($1, $2)', [PATRON, ORG_PATRON])))
    && await refuse(() => commeAnonyme(() => q('SELECT is_org_member($1, $2)', [PATRON, ORG_PATRON]))),
  '092 : un visiteur ne lit plus les devis, l\'organisation, le rôle ni le plan d\'un compte');
  // La page de signature reste ouverte (jeton inconnu : réponse d'erreur, pas de refus de droit)
  verifier(!(await refuse(() => commeAnonyme(() => q('SELECT get_devis_for_signature($1)', ['92000000-0000-4000-8000-000000000001'])))),
    '092 : la page de signature appelle toujours sa fonction');

  // 2. Identifiant libre sans appelant direct : le serveur seul
  verifier(await refuse(() => en(SOLO, () => q('SELECT * FROM get_pending_reminders($1, 0)', [PATRON])))
    && await refuse(() => en(SOLO, () => q('SELECT get_user_plan($1)', [PATRON])))
    && await refuse(() => en(SOLO, () => q('SELECT get_user_role($1, $2)', [PATRON, ORG_PATRON]))),
  '092 : un compte connecté ne lit plus le plan, le rôle ni les relances d\'un autre');
  verifier((await q('SELECT get_user_plan($1) AS p', [PATRON])).rows[0].p === 'equipe', '092 : le serveur lit toujours le plan d\'un compte');
  // Les fonctions SECURITY DEFINER qui s'en servent tournent en propriétaire : le plafond d'équipe (087) marche
  const peut = await en(PATRON, () => q('SELECT equipe_peut_inviter($1) AS ok', [ORG_PATRON]));
  verifier(typeof peut.rows[0].ok === 'boolean', '092 : le plafond d\'équipe lit toujours le plan du propriétaire');

  // 3. Organisation : la réponse du compte connecté seulement ; les policies marchent toujours
  const siennes = await en(SOLO, () => q('SELECT user_org_ids($1) AS a, user_org_ids($2) AS b, get_user_org_id($1) AS c, get_user_org_id($2) AS d', [SOLO, PATRON]));
  const r = siennes.rows[0];
  verifier(r.a.includes(ORG_SOLO) && r.b.length === 0 && r.c === ORG_SOLO && r.d === null,
    '092 : user_org_ids et get_user_org_id ne répondent que pour le compte connecté');
  verifier((await q('SELECT user_org_ids($1) AS a', [PATRON])).rows[0].a.includes(ORG_PATRON), '092 : le serveur garde la réponse complète');
  // Policies en user_org_ids(auth.uid()) (organization_members, comme les 121 de production)
  const coMembres = await en(SALARIE, () => q('SELECT user_id FROM organization_members WHERE organization_id = $1', [ORG_PATRON]));
  const etranger = await en(SOLO, () => q('SELECT user_id FROM organization_members WHERE organization_id = $1', [ORG_PATRON]));
  verifier(coMembres.rows.length >= 2 && etranger.rows.length === 0,
    `092 : un membre voit toujours son équipe (${coMembres.rows.length}), un autre compte non (${etranger.rows.length})`);

  // 4. Vue du stock : droits de l'appelant, fermée aux visiteurs
  const options = (await q(`SELECT coalesce(array_to_string(reloptions, ','), '') AS o FROM pg_class WHERE oid = 'public.v_stock_alerts'::regclass`)).rows[0].o;
  const visiteurRefuse = await refuse(() => commeAnonyme(() => q('SELECT * FROM v_stock_alerts')));
  verifier(/security_invoker=(true|on)/.test(options) && visiteurRefuse,
    `092 : v_stock_alerts lit avec les droits de l'appelant et n'est plus lisible par un visiteur (options « ${options} », visiteur refusé : ${visiteurRefuse})`);
  // Écritures par la vue (simple, donc modifiable) : plus rien pour un visiteur
  verifier(await refuse(() => commeAnonyme(() => q(`INSERT INTO v_stock_alerts (user_id, nom) VALUES ($1, 'Faux')`, [PATRON])))
    && await refuse(() => commeAnonyme(() => q(`UPDATE v_stock_alerts SET nom = 'Faux'`))),
  '092 : un visiteur n\'écrit plus dans le catalogue par la vue');
  // Droits de l'appelant (RLS du catalogue, posée par les vérifications de 079) : chacun ne voit que les siens
  const article = (await q(`INSERT INTO catalogue (user_id, organization_id, nom) VALUES ($1, $2, 'Disjoncteur 092') RETURNING id`, [PATRON, ORG_PATRON])).rows[0].id;
  const parPatron = await en(PATRON, () => q('SELECT id FROM v_stock_alerts WHERE id = $1', [article]));
  const parSolo = await en(SOLO, () => q('SELECT id FROM v_stock_alerts WHERE id = $1', [article]));
  const modifie = await en(SOLO, () => q(`UPDATE v_stock_alerts SET nom = 'Modifié' WHERE id = $1 RETURNING id`, [article]));
  const nom = (await q('SELECT nom FROM catalogue WHERE id = $1', [article])).rows[0].nom;
  verifier(parPatron.rows.length === 1 && parSolo.rows.length === 0 && modifie.rows.length === 0 && nom === 'Disjoncteur 092',
    '092 : par la vue, un compte voit ses articles mais ni ne lit ni ne modifie ceux d\'un autre');
  await q('DELETE FROM catalogue WHERE id = $1', [article]);

  // 7. Suggestions : plus d'insertion libre ; un compte crée toujours les siennes
  verifier(await refuse(() => commeAnonyme(() => q(`INSERT INTO ai_suggestions (user_id, type, title) VALUES ($1, 'stock_alert', 'Faux')`, [PATRON])))
    && await refuse(() => en(SOLO, () => q(`INSERT INTO ai_suggestions (user_id, type, title) VALUES ($1, 'stock_alert', 'Faux')`, [PATRON])))
    // un membre, dans sa propre organisation, au nom de son patron (policy « Org members can insert », corrigée)
    && await refuse(() => en(SALARIE, () => q(`INSERT INTO ai_suggestions (user_id, organization_id, type, title) VALUES ($1, $2, 'stock_alert', 'Faux')`, [PATRON, ORG_PATRON]))),
  '092 : ni un visiteur, ni un autre compte, ni un membre de l\'équipe ne glissent une suggestion au nom d\'un artisan');
  const sienne = await en(SOLO, () => q(`INSERT INTO ai_suggestions (user_id, type, title) VALUES ($1, 'stock_alert', 'Vraie') RETURNING id`, [SOLO]));
  verifier(sienne.rows.length === 1, '092 : un compte crée toujours ses propres suggestions');
  await q('DELETE FROM ai_suggestions WHERE id = $1', [sienne.rows[0].id]);

  // 5. search_path partout
  const sansChemin = (await q(`SELECT count(*) AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proconfig IS NULL`)).rows[0].n;
  verifier(Number(sansChemin) === 0, `092 : toutes les fonctions SECURITY DEFINER ont un search_path (${sansChemin} sans)`);

  // 6. Une fonction créée après 092 n'est pas exécutable par un visiteur, l'est par un compte connecté
  await q(`CREATE FUNCTION public.f092_nouvelle() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS 'SELECT 1'`);
  const droits = (await q(`SELECT has_function_privilege('anon', 'public.f092_nouvelle()', 'EXECUTE') AS anon,
    has_function_privilege('authenticated', 'public.f092_nouvelle()', 'EXECUTE') AS auth`)).rows[0];
  await q('DROP FUNCTION public.f092_nouvelle()');
  verifier(droits.anon === false && droits.auth === true, '092 : une fonction à venir n\'est plus ouverte aux visiteurs par défaut');
}
