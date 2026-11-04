// Vérifications de la migration 114 : la page de paiement renvoie la forme juridique de l'entreprise (pour écrire les
// montants sans « TTC » en franchise en base de TVA), et rien d'autre ne change : un visiteur sans jeton valide n'obtient
// rien, le reste dû et la fiche de l'entreprise sont ceux de 106 ; les lignes vues par le visiteur n'ont plus de prix
// d'achat, qu'elles soient enregistrées en tableau JSON ou en texte JSON (la forme qu'écrit l'app : JSON.stringify dans
// src/hooks/useSupabaseSync.js), et gardent la forme enregistrée ; ce qui ne peut pas être filtré ne sort pas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOLO, ORG_SOLO } from './socle.mjs';

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../supabase/migrations/114_forme_juridique_sur_la_page_de_paiement.sql');

// Le prix d'achat ne doit apparaître nulle part dans ce que lit le visiteur, ni en clé ni dans un texte JSON
const sansPrixAchat = (valeur) => !/prixAchat|prix_achat/.test(JSON.stringify(valeur ?? null));
const lireTexte = (valeur) => { try { return JSON.parse(valeur); } catch { return undefined; } };

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

  // ── Lignes enregistrées en tableau JSON ──
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

  const vues = Array.isArray(r.facture?.lignes) ? r.facture.lignes : [];
  verifier(vues.length === 2 && vues.every((l) => !('prixAchat' in l) && !('prix_achat' in l)) && sansPrixAchat(r),
    `114 : un visiteur ne lit pas le prix d'achat des lignes enregistrées en tableau (${JSON.stringify(vues.map((l) => Object.keys(l)))})`);
  verifier(vues[0]?.description === 'Tableau électrique' && Number(vues[0]?.prixUnitaire) === 400 && vues[1]?.description === 'Main-d’œuvre',
    `114 : les lignes gardent leur ordre, leur désignation et leur prix de vente`);

  // ── Lignes enregistrées en texte JSON, comme les écrit l'app : supabase-js envoie JSON.stringify(lignes), la colonne
  //    jsonb reçoit une chaîne (relue sous les deux formes : useSupabaseSync.js, DevisSignaturePage.jsx) ──
  await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, numero, type, facture_type, statut, total_ttc, payment_token, lignes)
    VALUES ($1, $2, $3, 'FAC-114-2', 'facture', 'totale', 'envoye', 400, 'pay-114-texte', to_jsonb($4::text))`, [SOLO, ORG_SOLO, fiche, lignes]);
  const texte = (await q(`SELECT jsonb_typeof(lignes) AS forme, (lignes #>> '{}')::jsonb AS lu FROM devis WHERE numero = 'FAC-114-2'`)).rows[0];
  verifier(texte.forme === 'string' && texte.lu?.[0]?.prixAchat === 180,
    `114 : contre-essai, la ligne enregistrée en texte JSON est une chaîne et garde son prix d'achat (${texte.forme}, ${texte.lu?.[0]?.prixAchat})`);
  const rt = await paiement('pay-114-texte');
  const vuesTexte = lireTexte(rt.facture?.lignes);
  verifier(typeof rt.facture?.lignes === 'string' && Array.isArray(vuesTexte),
    `114 : des lignes enregistrées en texte JSON ressortent en texte JSON, la forme enregistrée (${typeof rt.facture?.lignes})`);
  verifier(sansPrixAchat(rt) && vuesTexte?.length === 2 && vuesTexte.every((l) => !('prixAchat' in l) && !('prix_achat' in l)),
    `114 : un visiteur ne lit pas le prix d'achat des lignes enregistrées en texte JSON (${rt.facture?.lignes})`);
  verifier(vuesTexte?.[0]?.description === 'Tableau électrique' && Number(vuesTexte?.[0]?.prixUnitaire) === 400
      && vuesTexte?.[1]?.description === 'Main-d’œuvre' && Number(vuesTexte?.[1]?.quantite) === 2,
    `114 : les lignes en texte gardent leur ordre, leur désignation, leur quantité et leur prix de vente`);
  const relu = (await q(`SELECT lignes FROM devis WHERE numero = 'FAC-114-2'`)).rows[0].lignes;
  verifier(relu === lignes, `114 : la ligne enregistrée en texte n'est pas modifiée par la lecture du visiteur`);

  await q(`UPDATE devis SET lignes = NULL WHERE numero = 'FAC-114-1'`);
  verifier((await paiement('pay-114-micro')).facture?.lignes == null, '114 : une facture sans lignes renvoie toujours null');

  // Valeurs limites : la fonction ne plante jamais. Un tableau ressort en tableau, un texte en texte (filtré) ; ce qui
  // n'est ni un tableau ni le texte JSON d'un tableau (jamais écrit par l'app) ressort en tableau vide, dans la même forme.
  const TABLEAU = '$1::jsonb';
  const TEXTE = 'to_jsonb($1::text)';
  const cas = [
    ['tableau vide', TABLEAU, '[]', 'array', []],
    ['tableau mêlé', TABLEAU, '[1, "x", null, {"description": "A", "prixAchat": 5}]', 'array', [1, 'x', null, { description: 'A' }]],
    ['objet seul, prix au premier niveau', TABLEAU, '{"description": "A", "prixAchat": 5}', 'array', []],
    ['texte d’un tableau vide', TEXTE, '[]', 'string', []],
    ['texte d’un tableau mêlé', TEXTE, '[1, "x", null, {"description": "A", "prixAchat": 5, "prix_achat": 5}]', 'string', [1, 'x', null, { description: 'A' }]],
    ['texte illisible (JSON tronqué avec un prix)', TEXTE, '[{"description": "A", "prixAchat": 180', 'string', []],
    ['texte qui n’est pas du JSON', TEXTE, 'texte', 'string', []],
    ['texte vide', TEXTE, '', 'string', []],
    ['texte refusé par jsonb (\\u0000)', TEXTE, '[{"description": "\\u0000", "prixAchat": 5}]', 'string', []],
    ['texte d’un objet, prix au premier niveau', TEXTE, '{"prixAchat": 5}', 'string', []],
    ['texte d’un texte (encodé deux fois)', TEXTE, JSON.stringify(lignes), 'string', []],
  ];
  for (const [libelle, expression, valeur, forme, attendu] of cas) {
    await q(`UPDATE devis SET lignes = ${expression} WHERE numero = 'FAC-114-1'`, [valeur]);
    const enregistree = (await q(`SELECT jsonb_typeof(lignes) AS f FROM devis WHERE numero = 'FAC-114-1'`)).rows[0].f;
    let lu; try { lu = (await paiement('pay-114-micro')).facture?.lignes; } catch (e) { lu = `erreur : ${e.message}`; }
    const vu = forme === 'string' && typeof lu === 'string' ? lireTexte(lu) : lu;
    const bonneForme = forme === 'string' ? typeof lu === 'string' : Array.isArray(lu);
    verifier((expression === TEXTE ? enregistree === 'string' : enregistree !== 'string') && bonneForme
        && JSON.stringify(vu) === JSON.stringify(attendu) && sansPrixAchat(lu),
      `114 : lignes enregistrées en ${enregistree}, ${libelle} → ${JSON.stringify(lu)}`);
  }

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
