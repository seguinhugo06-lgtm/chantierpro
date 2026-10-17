// Vérifications de la migration 096 : plus de taux de TVA par défaut sur les dépenses.
import { SOLO, ORG_PATRON } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const colonnes = (await q(`SELECT column_name, column_default FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'depenses' AND column_name IN ('montant_ht', 'taux_tva', 'montant_tva')`)).rows;
  verifier(colonnes.length === 3 && colonnes.every((c) => c.column_default === null),
    `096 : colonnes HT, taux et TVA présentes, sans valeur par défaut (${colonnes.map((c) => `${c.column_name}=${c.column_default}`).join(', ')})`);

  // Une dépense insérée sans taux n'en reçoit pas ; un taux de 0 reste 0
  const sansTaux = (await q(`INSERT INTO depenses (user_id, organization_id, description, montant)
    VALUES ($1, $2, 'Câble', 100) RETURNING id, taux_tva`, [SOLO, ORGA_SOLO])).rows[0];
  const zero = (await q(`INSERT INTO depenses (user_id, organization_id, description, montant, taux_tva)
    VALUES ($1, $2, 'Location', 50, 0) RETURNING id, taux_tva`, [SOLO, ORGA_SOLO])).rows[0];
  verifier(sansTaux.taux_tva === null, `096 : une dépense insérée sans taux n'en reçoit pas (${sansTaux.taux_tva})`);
  verifier(Number(zero.taux_tva) === 0, `096 : un taux de 0 % reste 0 (${zero.taux_tva})`);

  await q('DELETE FROM depenses WHERE id = ANY($1)', [[sansTaux.id, zero.id]]);

  // Par l'app (compte connecté) : l'organisation est remplie par le déclencheur de 079, le taux reste vide
  const app = (await en(SOLO, () => q(`INSERT INTO depenses (user_id, description, montant) VALUES ($1, 'Gaine', 30)
    RETURNING id, organization_id, taux_tva`, [SOLO]))).rows[0];
  verifier(app.organization_id === ORGA_SOLO && app.taux_tva === null,
    `096 : dépense saisie par l'app : organisation du compte, taux vide (${app.organization_id}, ${app.taux_tva})`);
  const declencheurs = (await q(`SELECT array_agg(tgname::text ORDER BY tgname) AS n FROM pg_trigger
    WHERE tgrelid = 'public.depenses'::regclass AND NOT tgisinternal`)).rows[0].n || [];
  verifier(['trg_renseigner_organisation', 'trg_verifier_organisation'].every((t) => declencheurs.includes(t)),
    `096 : les déclencheurs d'organisation (079, 084) restent sur les dépenses (${declencheurs.join(', ')})`);
  verifier(await refuse(() => en(SOLO, () => q(`INSERT INTO depenses (user_id, organization_id, description, montant)
    VALUES ($1, $2, 'Intrus', 1)`, [SOLO, ORG_PATRON]))), '096 : pas de dépense dans l\'organisation d\'un autre');
  const vues = (await commeAnonyme(() => q('SELECT count(*)::int AS n FROM depenses'))).rows[0].n;
  verifier(vues === 0, `096 : un visiteur ne lit aucune dépense (${vues})`);
  await q('DELETE FROM depenses WHERE id = $1', [app.id]);
}
