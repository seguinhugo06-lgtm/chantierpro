// Vérifications de la migration 095 : alerte si un accusé de rétractation attend depuis plus d'une heure.
import { SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const sante = async (maintenant) => (await q('SELECT * FROM accuses_sante($1::timestamptz)', [maintenant])).rows[0];
  const id = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, retractation_le, retractation_nom, retractation_email)
    VALUES ($1, $2, 'DEV-095', 'devis', 'annule', '2026-10-17T08:00:00Z', 'Léa', 'lea@exemple.fr') RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;

  const tropTot = await sante('2026-10-17T08:30:00Z');
  const enRetard = await sante('2026-10-17T09:30:00Z');
  const tropVieux = await sante('2026-10-25T09:30:00Z');
  verifier(tropTot.alerte === false && enRetard.alerte === true && Number(enRetard.nombre) === 1 && tropVieux.alerte === false,
    '095 : alerte une heure après la rétractation sans accusé, ni avant, ni au-delà de 7 jours');
  verifier(/1 rétractation\(s\).*le 17\/10\/2026 à 10:00.*D221-5/.test(enRetard.raison || ''), `095 : raison lisible, heure de Paris (« ${enRetard.raison} »)`);

  await q(`UPDATE devis SET retractation_accuse_le = '2026-10-17T08:01:00Z' WHERE id = $1`, [id]);
  verifier((await sante('2026-10-17T09:30:00Z')).alerte === false, '095 : plus d\'alerte une fois l\'accusé envoyé');

  verifier(await refuse(() => en(SOLO, () => q('SELECT * FROM accuses_sante()')))
    && await refuse(() => commeAnonyme(() => q('SELECT * FROM accuses_sante()'))),
  '095 : réservée au serveur (ni compte connecté, ni visiteur)');

  await q('DELETE FROM devis WHERE id = $1', [id]);
}
