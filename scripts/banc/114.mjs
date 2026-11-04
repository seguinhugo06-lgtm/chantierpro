// Vérifications de la migration 114 : la page de paiement renvoie la forme juridique de l'entreprise (pour écrire les
// montants sans « TTC » en franchise en base de TVA), et rien d'autre ne change : un visiteur sans jeton valide n'obtient
// rien, le reste dû et la fiche de l'entreprise sont ceux de 106 ; les lignes vues par le visiteur n'ont plus de prix d'achat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/114_forme_juridique_sur_la_page_de_paiement.sql');

export async function verifier({ db, q, commeAnonyme, verifier }) {
  // Les vérifications de 085, 098 et 106 rejouent leur migration, qui réécrit la page de paiement : la remettre à jour
  let rejeu = true;
  try { await db.exec(fs.readFileSync(MIGRATION, 'utf8')); await db.exec(fs.readFileSync(MIGRATION, 'utf8')); } catch { rejeu = false; }
  verifier(rejeu, '114 : migration rejouée sans erreur');
  const paiement = (jeton) => commeAnonyme(async () => (await q('SELECT get_facture_for_payment($1) AS r', [jeton])).rows[0].r || {});

  const fiche = (await q(`INSERT INTO entreprise (user_id, organization_id, nom, forme_juridique, iban, is_default)
    VALUES ($1, $2, 'Élec 114', 'Micro-entreprise', 'FR76-114', true) RETURNING id`, [SOLO, ORG_SOLO])).rows[0].id;
  const lignes = JSON.stringify([
    { description: 'Tableau électrique', quantite: 1, prixUnitaire: 400, prixAchat: 180, prix_achat: 180 },
    { description: 'Main-d’œuvre', quantite: 2, prixUnitaire: 0 },
  ]);
  await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token, lignes)
    VALUES ($1, $2, $3, 'FAC-114-1', 'facture', 'totale', 'envoye', 400, 'pay-114-micro', $4::jsonb)`, [SOLO, ORG_SOLO, fiche, lignes]);
  // Contre-essai : la ligne stockée garde son prix d'achat (seul ce que voit le visiteur est filtré)
  const stocke = (await q(`SELECT lignes FROM devis WHERE numero = 'FAC-114-1'`)).rows[0].lignes;
  verifier(stocke?.[0]?.prixAchat === 180, `114 : contre-essai, la ligne enregistrée garde son prix d'achat (${stocke?.[0]?.prixAchat})`);

  const r = await paiement('pay-114-micro');
  verifier(r.entreprise?.forme_juridique === 'Micro-entreprise',
    `114 : la page de paiement renvoie la forme juridique de l'entreprise (${r.entreprise?.forme_juridique})`);
  verifier(r.entreprise?.nom === 'Élec 114' && Number(r.facture?.reste_du) === 400 && r.facture?.id == null && r.facture?.user_id == null,
    `114 : le reste est inchangé — fiche, reste dû, ni identifiant ni auteur pour un visiteur (${r.entreprise?.nom}, ${r.facture?.reste_du})`);

  const vues = r.facture?.lignes || [];
  verifier(vues.length === 2 && vues.every((l) => !('prixAchat' in l) && !('prix_achat' in l)),
    `114 : un visiteur ne lit pas le prix d'achat des lignes (${JSON.stringify(vues.map((l) => Object.keys(l)))})`);
  verifier(vues[0]?.description === 'Tableau électrique' && Number(vues[0]?.prixUnitaire) === 400 && vues[1]?.description === 'Main-d’œuvre',
    `114 : les lignes gardent leur ordre, leur désignation et leur prix de vente`);
  await q(`UPDATE devis SET lignes = NULL WHERE numero = 'FAC-114-1'`);
  verifier((await paiement('pay-114-micro')).facture?.lignes == null, '114 : une facture sans lignes renvoie toujours null');

  await q(`UPDATE entreprise SET forme_juridique = 'SARL' WHERE id = $1`, [fiche]);
  verifier((await paiement('pay-114-micro')).entreprise?.forme_juridique === 'SARL', '114 : contre-essai, une SARL est renvoyée telle quelle');

  const droits = (await q(`SELECT has_function_privilege('anon', 'public.get_facture_for_payment(text)', 'execute') AS anon,
    has_function_privilege('authenticated', 'public.get_facture_for_payment(text)', 'execute') AS connecte,
    p.prosecdef AS definer, array_to_string(p.proconfig, ',') AS config FROM pg_proc p WHERE p.proname = 'get_facture_for_payment'`)).rows[0];
  verifier(droits.anon && droits.connecte && droits.definer && /search_path=public, ?pg_temp/.test(droits.config || ''),
    `114 : droits et attributs inchangés après rejeu (visiteur ${droits.anon}, connecté ${droits.connecte}, ${droits.config})`);

  const inconnu = await paiement('pay-114-inconnu');
  verifier(!inconnu.entreprise && !inconnu.facture, '114 : un jeton inconnu ne renvoie ni facture ni entreprise');

  // Ménage
  await q(`DELETE FROM devis WHERE numero LIKE 'FAC-114-%'`);
  await q(`DELETE FROM entreprise WHERE id = $1`, [fiche]);
}
