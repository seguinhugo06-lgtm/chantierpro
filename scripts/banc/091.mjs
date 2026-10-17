// Vérifications de la migration 091 : signature sur place figée, journal des événements fermé aux clients.
import { SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const id = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut)
    VALUES ($1, $2, 'DEV-091', 'devis', 'envoye') RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;

  // La première signature sur place se pose normalement, avec la demande expresse et l'accord (090)
  const signee = await en(SOLO, () => q(`UPDATE devis SET signature = 'data:image/png;base64,AA==', signature_date = now(),
    signataire = 'Léa Client091', statut = 'accepte', execution_anticipee_le = now(), exemplaire_email_accepte_le = now()
    WHERE id = $1 RETURNING id`, [id]));
  verifier(signee.rows.length === 1, '091 : la signature sur place se pose (avec demande expresse et accord pour l\'e-mail)');

  // Ensuite : ni effacée, ni changée, ni redatée — donc plus de contournement de 086 / 090 en deux écritures
  verifier(await refuse(() => en(SOLO, () => q('UPDATE devis SET signature = NULL WHERE id = $1', [id])))
    && await refuse(() => en(SOLO, () => q(`UPDATE devis SET signature = 'data:image/png;base64,BB==' WHERE id = $1`, [id])))
    && await refuse(() => en(SOLO, () => q(`UPDATE devis SET signature_date = now() - interval '3 days' WHERE id = $1`, [id])))
    && await refuse(() => en(SOLO, () => q(`UPDATE devis SET signataire = 'Autre' WHERE id = $1`, [id]))),
  '091 : une signature sur place ne s\'efface, ne se remplace ni ne se redate plus');
  verifier(await refuse(() => en(SOLO, async () => {
    await q('UPDATE devis SET signature = NULL, signature_date = NULL WHERE id = $1', [id]);
    await q(`UPDATE devis SET signature = 'x', signature_date = now(), exemplaire_email_accepte_le = now() WHERE id = $1`, [id]);
  })), '091 : le contournement en deux écritures (effacer puis resigner) est fermé');

  // L'app réécrit la ligne entière avec les mêmes valeurs, et modifie le reste du devis : sans effet
  const memes = await en(SOLO, () => q(`UPDATE devis SET signature = signature, signature_date = signature_date, signataire = signataire,
    numero = 'DEV-091b' WHERE id = $1 RETURNING id`, [id]));
  verifier(memes.rows.length === 1, '091 : réécrire la même signature et modifier le reste du devis restent possibles');

  // Le serveur (rôle de service, propriétaire) n'est pas concerné
  verifier((await q(`UPDATE devis SET signataire = 'Correction par le serveur' WHERE id = $1 RETURNING id`, [id])).rows.length === 1,
    '091 : le serveur n\'est pas concerné');

  // Un devis signé ne se supprime plus (sinon : supprimer, puis réinsérer le même devis signé autrement)
  const nouveau = async (cols = '', vals = '') => (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut${cols})
    VALUES ($1, $2, 'DEV-091x', 'devis', 'envoye'${vals}) RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;
  const nonSigne = await nouveau();
  const parLien = await nouveau(', signature_data, signature_date', `, 'data:image/png;base64,CC==', now()`);
  const supprime = await en(SOLO, () => q('DELETE FROM devis WHERE id = $1 RETURNING id', [nonSigne]));
  verifier(supprime.rows.length === 1, '091 : un devis non signé se supprime toujours (témoin)');
  verifier(await refuse(() => en(SOLO, () => q('DELETE FROM devis WHERE id = $1', [id])))
    && await refuse(() => en(SOLO, () => q('DELETE FROM devis WHERE id = $1', [parLien]))),
  '091 : un devis signé, sur place ou par le lien, ne se supprime plus');
  // Un devis neuf déjà signé (signature hors ligne synchronisée plus tard) reste accepté : c'est un autre contrat
  const neufSigne = await en(SOLO, () => q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, signature, signature_date, signataire)
    VALUES ($1, $2, 'DEV-091y', 'devis', 'accepte', 'data:image/png;base64,DD==', now(), 'Léa') RETURNING id`, [SOLO, ORGA_SOLO]));
  verifier(neufSigne.rows.length === 1, '091 : un devis neuf déjà signé s\'enregistre');
  // Valeurs vides : '' et NULL confondues (l'app envoie NULL pour une valeur absente)
  await q(`UPDATE devis SET signataire = '' WHERE id = $1`, [neufSigne.rows[0].id]);
  const vide = await en(SOLO, () => q('UPDATE devis SET signataire = NULL, numero = \'DEV-091z\' WHERE id = $1 RETURNING id', [neufSigne.rows[0].id]));
  verifier(vide.rows.length === 1, '091 : un signataire vide remplacé par NULL n\'est pas un changement');
  const parServeur = await q('DELETE FROM devis WHERE id = ANY($1) RETURNING id', [[parLien, neufSigne.rows[0].id]]);
  verifier(parServeur.rows.length === 2, '091 : le serveur supprime un devis signé (suppression de compte)');

  // Journal des événements : plus d'insertion par un client ni par un visiteur
  // (lignes complètes : seul 091 peut les refuser, pas une colonne obligatoire manquante)
  verifier(await refuse(() => commeAnonyme(() => q(`INSERT INTO events_log (event_type, entity_type, entity_id, success) VALUES ('devis_exemplaire_client', 'devis', $1, true)`, [id])))
    && await refuse(() => en(SOLO, () => q(`INSERT INTO events_log (event_type, entity_type, entity_id, user_id, success) VALUES ('devis_retractation_accuse', 'devis', $1, $2, true)`, [id, SOLO]))),
  '091 : ni un visiteur ni un artisan n\'écrivent de fausse ligne dans events_log');
  // Une seule ligne par devis : la seconde notification de signature est refusée (réservation)
  const devisId = '91000000-0000-4000-8000-000000000001';
  await q(`INSERT INTO events_log (event_type, entity_type, entity_id, success) VALUES ('devis_signed_notified', 'devis', $1, true)`, [devisId]);
  verifier(await refuse(() => q(`INSERT INTO events_log (event_type, entity_type, entity_id, success) VALUES ('devis_signed_notified', 'devis', $1, true)`, [devisId]))
    && (await q(`INSERT INTO events_log (event_type, entity_type, entity_id, success) VALUES ('devis_vu', 'devis', $1, true), ('devis_vu', 'devis', $1, true) RETURNING id`, [devisId])).rows.length === 2
    && (await q(`INSERT INTO events_log (event_type, entity_type, entity_id, success) VALUES ('devis_exemplaire_client', 'devis', $1, true), ('devis_exemplaire_client', 'devis', $1, true) RETURNING id`, [devisId])).rows.length === 2,
  '091 : une seule notification de signature par devis (les autres événements, exemplaire compris, restent libres)');
  // Reprise d'une réservation restée « en cours » (fonction interrompue) : une seule des deux reprises gagne
  const devisId2 = '91000000-0000-4000-8000-000000000002';
  await q(`INSERT INTO events_log (event_type, entity_type, entity_id, success, triggered_at) VALUES ('devis_retractation_accuse_echec', 'devis', $1, false, now() - interval '5 minutes')`, [devisId2]);
  const reprendre = () => q(`UPDATE events_log SET triggered_at = now() WHERE event_type = 'devis_retractation_accuse_echec' AND entity_id = $1
    AND success = false AND triggered_at < now() - interval '2 minutes' RETURNING id`, [devisId2]);
  verifier((await reprendre()).rows.length === 1 && (await reprendre()).rows.length === 0,
    '091 : une réservation orpheline se reprend une fois');
  await q('DELETE FROM events_log WHERE entity_id = $1', [devisId2]);
  await q('DELETE FROM events_log WHERE entity_id = $1', [devisId]);
  const policies = (await q(`SELECT count(*) AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events_log' AND cmd = 'INSERT'`)).rows[0].n;
  const declencheur = (await q(`SELECT count(*) AS n FROM pg_trigger WHERE tgrelid = 'public.devis'::regclass AND tgname = 'trg_garder_signature_sur_place'`)).rows[0].n;
  verifier(Number(policies) === 0 && Number(declencheur) === 1, `091 : contrôles de l'en-tête (déclencheur ${declencheur}, policies INSERT ${policies})`);

  await q(`DELETE FROM devis WHERE id = $1`, [id]);
}
