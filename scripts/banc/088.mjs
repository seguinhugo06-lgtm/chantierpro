// Vérifications de la migration 088 : alerte si les relances s'arrêtent.
// Le journal relance_cron_runs est rempli comme le fait send-scheduled-relances (une ligne par passage du cron,
// dry_run = false), puis l'état est lu à différentes heures (p_maintenant). pg_cron et pg_net n'existent pas au
// banc : la planification se constate en production (contrôle 3 de l'en-tête).

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const sante = async (maintenant) => (await q('SELECT * FROM relances_sante($1::timestamptz)', [maintenant])).rows[0];
  const passage = (quand, champs = {}) => q(`INSERT INTO relance_cron_runs (ran_at, dry_run, total_due, sent, failed, error)
    VALUES ($1::timestamptz, coalesce($2, false), 3, 0, coalesce($3, 0), $4)`, [quand, champs.dryRun ?? null, champs.failed ?? null, champs.error ?? null]);

  await q('DELETE FROM relance_cron_runs');
  const vide = await sante('2026-10-16T10:15:00Z');
  verifier(vide.alerte === true && /Aucune exécution/.test(vide.raison), `088 : journal vide → alerte (« ${vide.raison} »)`);

  // Le cron passe chaque jour à 8 h (UTC), le contrôle à 10 h 15
  await passage('2026-10-15T08:00:04Z');
  await passage('2026-10-16T08:00:05Z');
  const normal = await sante('2026-10-16T10:15:00Z');
  verifier(normal.alerte === false && normal.raison === null && new Date(normal.derniere).toISOString() === '2026-10-16T08:00:05.000Z',
    '088 : passage de ce matin réussi → pas d\'alerte');
  const manque = await sante('2026-10-17T10:15:00Z');
  verifier(manque.alerte === true && /depuis le 16\/10\/2026 à 10:00/.test(manque.raison) && /26 h/.test(manque.raison),
    `088 : passage du lendemain manquant → alerte le jour même à 10 h 15 (« ${manque.raison} »)`);

  // Un essai à la main (dry_run) ne remplace pas un vrai passage
  await passage('2026-10-17T09:00:00Z', { dryRun: true });
  verifier((await sante('2026-10-17T10:15:00Z')).alerte === true, '088 : un essai à blanc ne fait pas taire l\'alerte');

  await passage('2026-10-17T08:00:03Z', { error: 'Lecture entreprises: column devis.date_envoi does not exist' });
  const echec = await sante('2026-10-17T10:15:00Z');
  verifier(echec.alerte === true && /a échoué : Lecture entreprises/.test(echec.raison), `088 : dernier passage en erreur → alerte (« ${echec.raison} »)`);

  await passage('2026-10-18T08:00:03Z', { failed: 2 });
  const rates = await sante('2026-10-18T10:15:00Z');
  verifier(rates.alerte === true && /2 relance\(s\) n'ont pas pu être envoyées/.test(rates.raison), `088 : envois ratés → alerte (« ${rates.raison} »)`);

  await passage('2026-10-19T08:00:02Z');
  verifier((await sante('2026-10-19T10:15:00Z')).alerte === false, '088 : le passage suivant réussi → l\'alerte cesse');

  // Une alerte par période au plus, même si la fonction Edge est appelée en boucle
  const reserver = async () => (await q(`SELECT reserver_alerte('relances', 'essai') AS r`)).rows[0].r;
  const premiere = await reserver();
  const seconde = await reserver();
  verifier(premiere === true && seconde === false, '088 : reserver_alerte n\'accorde qu\'un envoi par période de 20 h');
  await q(`UPDATE alertes_exploitation SET envoyee_le = now() - interval '21 hours' WHERE sujet = 'relances'`);
  verifier(await reserver() === true, '088 : … et en accorde un nouveau passé ce délai si la panne dure');

  // Personne d'autre que le serveur
  verifier(await refuse(() => en('11111111-1111-4111-8111-111111111111', () => q('SELECT * FROM relances_sante()')))
    && await refuse(() => commeAnonyme(() => q('SELECT * FROM relances_sante()')))
    && await refuse(() => commeAnonyme(() => q(`SELECT reserver_alerte('relances', 'x')`)))
    && await refuse(() => en('11111111-1111-4111-8111-111111111111', () => q(`SELECT reserver_alerte('relances', 'x')`))),
  '088 : ni un artisan ni un visiteur ne lit l\'état ni ne réserve d\'alerte');
  let lues;
  try { lues = Number((await en('11111111-1111-4111-8111-111111111111', () => q('SELECT count(*) n FROM alertes_exploitation'))).rows[0].n); }
  catch { lues = 0; } // refus pur et simple : rien de lu non plus
  verifier(lues === 0, '088 : un artisan ne lit pas les alertes d\'exploitation');

  // Contrôle 4 de l'en-tête
  const droits = (await q(`SELECT has_function_privilege('authenticated', 'public.relances_sante(timestamptz)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.reserver_alerte(text, text, interval)', 'EXECUTE') AS r`)).rows[0].r;
  verifier(droits === false, '088 : contrôle 4 de l\'en-tête → f');

  await q('DELETE FROM relance_cron_runs');
  await q('DELETE FROM alertes_exploitation');
}
