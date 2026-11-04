// Vérifications de la migration 107 : la page de paiement renvoie la forme juridique de l'entreprise (pour écrire les
// montants sans « TTC » en franchise en base de TVA), et rien d'autre ne change : un visiteur sans jeton valide n'obtient
// rien, le reste dû et la fiche de l'entreprise sont ceux de 106.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/107_forme_juridique_sur_la_page_de_paiement.sql');

export async function verifier({ db, q, commeAnonyme, verifier }) {
  // Les vérifications de 085, 098 et 106 rejouent leur migration, qui réécrit la page de paiement : la remettre à jour
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '107 : migration rejouée sans erreur');
  const paiement = (jeton) => commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {});

  const fiche = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, forme_juridique, iban, is_default)
    VALUES ($1, $2, 'Élec 107', 'Micro-entreprise', 'FR76-107', true) RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token)
    VALUES ($1, $2, $3, 'FAC-107-1', 'facture', 'totale', 'envoye', 400, 'pay-107-micro')`, [SOLO, ORG_SOLO, fiche]);

  const r = await paiement('pay-107-micro');
  verifier(r.entreprise?.forme_juridique === 'Micro-entreprise',
    `107 : la page de paiement renvoie la forme juridique de l'entreprise (${r.entreprise?.forme_juridique})`);
  verifier(r.entreprise?.nom === 'Élec 107' && Number(r.facture?.reste_du) === 400 && r.facture?.id == null && r.facture?.user_id == null,
    `107 : le reste est inchangé — fiche, reste dû, ni identifiant ni auteur pour un visiteur (${r.entreprise?.nom}, ${r.facture?.reste_du})`);

  await q(`UPDATE entreprise SET forme_juridique = 'SARL' WHERE id = $1`, [fiche]);
  verifier((await paiement('pay-107-micro')).entreprise?.forme_juridique === 'SARL', '107 : contre-essai, une SARL est renvoyée telle quelle');

  const droits = (await q(`SELECT has_function_privilege('anon', 'public.get_facture_for_payment(text)', 'execute') AS anon,
    has_function_privilege('authenticated', 'public.get_facture_for_payment(text)', 'execute') AS connecte,
    p.prosecdef AS definer, array_to_string(p.proconfig, ',') AS config FROM pg_proc p WHERE p.proname = 'get_facture_for_payment'`)).rows[0];
  verifier(droits.anon && droits.connecte && droits.definer && /search_path=public, ?pg_temp/.test(droits.config || ''),
    `107 : droits et attributs inchangés après rejeu (visiteur ${droits.anon}, connecté ${droits.connecte}, ${droits.config})`);

  const inconnu = await paiement('pay-107-inconnu');
  verifier(!inconnu.entreprise && !inconnu.facture, '107 : un jeton inconnu ne renvoie ni facture ni entreprise');

  // Ménage
  await q(`DELETE FROM devis WHERE numero LIKE 'FAC-107-%'`);
  await q(`DELETE FROM entreprise WHERE id = $1`, [fiche]);
}
