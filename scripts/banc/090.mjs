// Vérifications de la migration 090 : exemplaire signé envoyé au client (colonne devis.exemplaire_client_le).
// notify-signature la réserve par une mise à jour conditionnelle (un seul envoi), l'app l'écrit quand l'artisan
// envoie lui-même l'exemplaire.
import { SOLO } from './socle.mjs';

const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, verifier }) {
  const type = (await q(`SELECT data_type AS t FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devis' AND column_name = 'exemplaire_client_le'`)).rows[0]?.t;
  verifier(type === 'timestamp with time zone', `090 : contrôle de l'en-tête (${type})`);

  const id = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, signature_data, signature_date, signature_token)
    VALUES ($1, $2, 'DEV-090', 'devis', 'signe', 'data:image/png;base64,AA==', now(), gen_random_uuid()) RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;

  // Réservation par le serveur (notify-signature) : la première passe, la seconde ne touche rien
  const reserver = () => q(`UPDATE devis SET exemplaire_client_le = now() WHERE id = $1 AND exemplaire_client_le IS NULL RETURNING id`, [id]);
  const premiere = await reserver();
  const seconde = await reserver();
  verifier(premiere.rows.length === 1 && seconde.rows.length === 0, '090 : la réservation de l\'envoi ne passe qu\'une fois (pas de second exemplaire)');

  // L'artisan l'écrit quand il envoie lui-même l'exemplaire (signature sur place)
  await q('UPDATE devis SET exemplaire_client_le = NULL WHERE id = $1', [id]);
  const parArtisan = await en(SOLO, () => q(`UPDATE devis SET exemplaire_client_le = now() WHERE id = $1 RETURNING id`, [id]));
  verifier(parArtisan.rows.length === 1, '090 : l\'artisan enregistre l\'envoi de l\'exemplaire sur son devis');

  // Accord du client pour l'exemplaire par e-mail (L221-9) : avec la signature sur place, jamais après
  const refuse = async (fn) => { try { await fn(); return false; } catch { return true; } };
  const envoye = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut)
    VALUES ($1, $2, 'DEV-090', 'devis', 'envoye') RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;
  const autreDate = await en(SOLO, () => q(`UPDATE devis SET signature = 'data:image/png;base64,AA==', signature_date = now(),
    statut = 'accepte', exemplaire_email_accepte_le = now() - interval '3 days' WHERE id = $1`, [envoye])).then(() => false).catch(() => true);
  verifier(autreDate, '090 : un accord daté autrement que la signature est refusé');
  const avecSignature = await en(SOLO, () => q(`UPDATE devis SET signature = 'data:image/png;base64,AA==', signature_date = now(),
    statut = 'accepte', exemplaire_email_accepte_le = now() WHERE id = $1 RETURNING id`, [envoye]));
  verifier(avecSignature.rows.length === 1, '090 : l\'accord est enregistré dans la même écriture que la signature sur place');
  verifier(await refuse(() => en(SOLO, () => q('UPDATE devis SET exemplaire_email_accepte_le = NULL WHERE id = $1', [envoye])))
    && await refuse(() => en(SOLO, () => q('UPDATE devis SET exemplaire_email_accepte_le = now() + interval \'1 day\' WHERE id = $1', [envoye]))),
  '090 : … puis ne s\'efface ni ne se change (preuve de l\'accord)');
  const autre = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut)
    VALUES ($1, $2, 'DEV-090', 'devis', 'envoye') RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;
  verifier(await refuse(() => en(SOLO, () => q('UPDATE devis SET exemplaire_email_accepte_le = now() WHERE id = $1', [autre])))
    && await refuse(() => en(SOLO, () => q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, exemplaire_email_accepte_le)
         VALUES ($1, $2, 'DEV-090', 'devis', 'brouillon', now())`, [SOLO, ORGA_SOLO]))),
  '090 : pas d\'accord sans signature (ni sur un devis non signé, ni à la création)');

  // Lecture et écriture par un visiteur : régies par la RLS de devis (production), que le socle ne reproduit pas
  // pour cette table ; 090 n'y change rien.

  await q(`DELETE FROM devis WHERE numero = 'DEV-090'`);
}
