// Vérifications de la migration 094 : search_path partout, fonctions de déclencheur non appelables en direct,
// déclencheurs toujours exécutés pour un compte connecté.
import { SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, verifier }) {
  const sansChemin = Number((await q(`SELECT count(*) AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proconfig IS NULL
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')`)).rows[0].n);
  verifier(sansChemin === 0, `094 : toutes les fonctions du schéma public ont un search_path (${sansChemin} sans)`);

  const declencheursOuverts = (await q(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype = 'trigger'::regtype
      AND (has_function_privilege('authenticated', p.oid, 'EXECUTE') OR has_function_privilege('anon', p.oid, 'EXECUTE'))`)).rows.map((r) => r.proname);
  verifier(declencheursOuverts.length === 0, `094 : aucune fonction de déclencheur appelable en direct (${declencheursOuverts.join(', ') || 'aucune'})`);

  // Le droit d'exécuter un déclencheur ne se vérifie qu'à sa création : il s'exécute toujours (079 : organisation renseignée)
  const client = await en(SOLO, () => q(`INSERT INTO clients (user_id, nom) VALUES ($1, 'Client 094') RETURNING id, organization_id`, [SOLO]));
  verifier(client.rows[0]?.organization_id === ORGA_SOLO, '094 : un déclencheur s\'exécute toujours pour un compte connecté');
  await q('DELETE FROM clients WHERE id = $1', [client.rows[0].id]);
}
