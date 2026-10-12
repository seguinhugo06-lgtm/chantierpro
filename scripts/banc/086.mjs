// Vérifications de la migration 086 : rétractation des devis signés à distance (L221-21, L221-25, D221-5).
// Effets constatés comme le client (la page publique, rôle anon) et comme l'artisan (l'app, rôle authenticated).
import { PATRON, SOLO } from './socle.mjs';

const TRACE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const essayer = async (fn) => {
    try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; }
  };

  // ── Fin du délai (L221-18, L221-19) ────────────────────────────────────────
  const fin = async (d, informe = true) => (await q('SELECT public.fin_delai_retractation($1::date, $2)::text AS f', [d, informe])).rows[0].f;
  const cas = [
    ['2026-10-02', '2026-10-16', 'vendredi ordinaire'],
    ['2026-12-11', '2026-12-28', 'Noël un vendredi, puis le week-end'],
    ['2027-03-15', '2027-03-30', 'lundi de Pâques 2027'],
    ['2027-04-22', '2027-05-07', 'Ascension 2027'],
    ['2027-04-17', '2027-05-03', '1er mai un samedi'],
    ['2026-07-31', '2026-08-14', 'veille du 15 août'],
    ['2027-03-12', '2027-03-30', 'Vendredi saint (Alsace-Moselle), Pâques, lundi de Pâques'],
  ];
  for (const [conclusion, attendu, libelle] of cas) {
    const f = await fin(conclusion);
    verifier(f === attendu, `086 : fin du délai pour un contrat du ${conclusion} → ${f} (${libelle}, attendu ${attendu})`);
  }
  const prolonge = await fin('2026-10-02', false);
  verifier(prolonge === '2027-10-18', `086 : sans l'avis complet, douze mois de plus (L221-20) → ${prolonge} (attendu 2027-10-18, un lundi)`);

  // ── Données : un devis envoyé par lien à un particulier du solo, un autre à un professionnel ──
  await q(`INSERT INTO entreprise (user_id, organization_id, nom, is_default) VALUES ($1, $2, 'Élec 086', true)`, [SOLO, ORGA_SOLO]);
  const client = async (categorie, entreprise = null) => (await q(
    `INSERT INTO clients (user_id, organization_id, nom, prenom, email, categorie, entreprise) VALUES ($1, $2, 'Client086', 'Léa', 'lea@exemple.fr', $3, $4) RETURNING id`,
    [SOLO, ORGA_SOLO, categorie, entreprise])).rows[0].id;
  const particulier = await client('Particulier');
  const professionnel = await client('professionnel', 'SARL Pro');
  const syndic = await client('Syndic');
  const devisEnvoye = async (clientId, extra = {}) => {
    const id = (await q(
      `INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, date, validite_jours, total_ttc, travaux_urgents)
       VALUES ($1, $2, $3, 'DEV-086', 'devis', 'envoye', now()::date, 30, 900, $4) RETURNING id`,
      [SOLO, ORGA_SOLO, clientId, !!extra.urgent])).rows[0].id;
    return (await en(SOLO, () => q('SELECT generate_signature_token($1, 30) AS t', [id]))).rows[0].t;
  };
  const ligne = async (jeton) => (await q('SELECT * FROM devis WHERE signature_token = $1', [jeton])).rows[0];

  // ── Signature avec la demande expresse (L221-25) ────────────────────────────
  const jetonAvec = await devisEnvoye(particulier);
  const signe = (await q('SELECT sign_devis($1, $2, $3, NULL, $4, true, true) AS r', [jetonAvec, TRACE, 'Léa Client086', 'test'])).rows[0].r;
  const apresAvec = await ligne(jetonAvec);
  verifier(signe.success && apresAvec.execution_anticipee_le !== null && apresAvec.statut === 'signe' && apresAvec.avis_retractation === true,
    `086 : la demande expresse cochée à la signature est enregistrée avec sa date, et l'avis montré (${JSON.stringify(signe)})`);
  const jetonSans = await devisEnvoye(particulier);
  // Une page encore en cache appelle sign_devis par noms, sans le nouveau paramètre
  const ancienne = await essayer(() => commeAnonyme(() => q(
    'SELECT sign_devis(p_token => $1, p_signature_data => $2, p_signataire_nom => $3, p_ip => NULL, p_user_agent => $4) AS r',
    [jetonSans, TRACE, 'Léa Client086', 'ancienne page'])));
  verifier(ancienne.ok && ancienne.r.rows[0].r.success, `086 : l'appel de l'ancienne page (cinq paramètres nommés) signe toujours (${ancienne.e || 'ok'})`);
  await q('SELECT sign_devis($1, $2, $3, NULL, NULL, false, true) AS r', [jetonSans, TRACE, 'Léa Client086']);
  verifier((await ligne(jetonSans)).execution_anticipee_le === null, '086 : sans la case, aucune demande expresse');
  const versions = Number((await q(`SELECT count(*) AS n FROM pg_proc WHERE proname = 'sign_devis'`)).rows[0].n);
  verifier(versions === 1, `086 : une seule fonction sign_devis (${versions})`);

  // ── La page du client après la signature ────────────────────────────────────
  const page = async (jeton) => (await commeAnonyme(() => q('SELECT get_devis_for_signature($1) AS j', [jeton]))).rows[0].j;
  const lu = await page(jetonSans);
  const aujourdhui = (await q(`SELECT ((now() AT TIME ZONE 'Europe/Paris')::date)::text AS d`)).rows[0].d;
  const finAttendue = await fin(aujourdhui);
  verifier(lu?.devis?.already_signed && lu.devis.retractation?.ouverte === true && lu.devis.retractation.fin === finAttendue,
    `086 : signé en ligne par un particulier → « renoncer au contrat » ouvert jusqu'au ${lu?.devis?.retractation?.fin} (${finAttendue})`);
  verifier(lu.devis.numero === 'DEV-086' && lu.client?.email === 'lea@exemple.fr' && lu.entreprise?.nom === 'Élec 086' && !('iban' in (lu.entreprise || {})) && !('lignes' in lu.devis),
    '086 : la page reçoit de quoi préremplir la déclaration, et rien d\'autre (ni lignes ni IBAN)');
  // Une ancienne page (en cache) n'envoie pas l'avis : délai prolongé de douze mois, et le bouton reste ouvert
  const jetonAncien = await devisEnvoye(particulier);
  await q('SELECT sign_devis($1, $2, $3) AS r', [jetonAncien, TRACE, 'Léa Client086']);
  const luAncien = await page(jetonAncien);
  verifier(luAncien.devis.retractation?.fin === await fin(aujourdhui, false) && luAncien.devis.retractation.ouverte,
    `086 : signé sans l'avis complet → rétractation ouverte jusqu'au ${luAncien.devis.retractation?.fin} (L221-20)`);
  const jetonPro = await devisEnvoye(professionnel);
  await q('SELECT sign_devis($1, $2, $3) AS r', [jetonPro, TRACE, 'Gérant']);
  const luPro = await page(jetonPro);
  verifier(luPro?.devis?.already_signed && !luPro.devis.retractation, '086 : client professionnel → pas de rétractation en ligne');
  const jetonSyndic = await devisEnvoye(syndic);
  await q('SELECT sign_devis($1, $2, $3) AS r', [jetonSyndic, TRACE, 'Syndic']);
  verifier(!(await page(jetonSyndic))?.devis?.retractation, '086 : copropriété (catégorie « Syndic ») → pas un consommateur, pas de rétractation');
  const jetonUrgent = await devisEnvoye(particulier, { urgent: true });
  const luAvant = await page(jetonUrgent);
  verifier(luAvant?.devis?.travaux_urgents === true, '086 : la page de signature sait qu\'il s\'agit d\'une réparation urgente');
  await q('SELECT sign_devis($1, $2, $3, NULL, NULL, false, true) AS r', [jetonUrgent, TRACE, 'Léa Client086']);
  verifier((await page(jetonUrgent))?.devis?.retractation?.ouverte === true, '086 : réparation urgente → le reste des travaux garde le droit, rétractation en ligne ouverte');

  // ── Renoncer au contrat (D221-5) ────────────────────────────────────────────
  const retracter = (jeton, nom, email) => q('SELECT retracter_devis($1, $2, $3, $4) AS r', [jeton, nom, email, 'test']).then((x) => x.rows[0].r);
  const visiteur = await essayer(() => commeAnonyme(() => q('SELECT retracter_devis($1, $2, $3) AS r', [jetonSans, 'Léa Client086', 'lea@exemple.fr'])));
  verifier(visiteur.ok && visiteur.r.rows[0].r.success, `086 : un visiteur avec le lien peut renoncer au contrat (${visiteur.e || 'ok'})`);
  const mauvaisEmail = await retracter(jetonSans, 'Léa Client086', 'pas-une-adresse');
  verifier(!mauvaisEmail.success && /e-mail/.test(mauvaisEmail.error), '086 : adresse de l\'accusé invalide → refus, rien n\'est enregistré');
  const sansNom = await retracter(jetonSans, '  ', 'lea@exemple.fr');
  verifier(!sansNom.success, '086 : nom vide → refus');
  const recue = await retracter(jetonSans, 'Léa Client086', ' Lea@Exemple.fr ');
  const apres = await ligne(jetonSans);
  verifier(recue.success && apres.retractation_le !== null && apres.retractation_email === 'lea@exemple.fr' && apres.statut === 'annule',
    `086 : la rétractation est enregistrée (date, adresse de l'accusé) et le devis passe à « annulé » (${apres.statut})`);
  const deuxieme = await retracter(jetonSans, 'Quelqu\'un d\'autre', 'autre@exemple.fr');
  const apres2 = await ligne(jetonSans);
  verifier(deuxieme.success && deuxieme.deja && apres2.retractation_nom === 'Léa Client086' && apres2.retractation_email === 'lea@exemple.fr',
    '086 : une seconde déclaration ne remplace pas la première');
  const luApres = await page(jetonSans);
  verifier(luApres.devis.retractation.ouverte === false && luApres.devis.retractation.le, '086 : la page montre la rétractation reçue, plus le bouton');
  const pro = await retracter(jetonPro, 'Gérant', 'pro@exemple.fr');
  verifier(!pro.success && (await ligne(jetonPro)).retractation_le === null, '086 : un professionnel ne renonce pas en ligne');
  verifier(!(await retracter(jetonSyndic, 'Syndic', 'syndic@exemple.fr')).success, '086 : une copropriété ne renonce pas en ligne');

  // Délai expiré : signé il y a 20 jours
  const jetonVieux = await devisEnvoye(particulier);
  await q('SELECT sign_devis($1, $2, $3, NULL, NULL, false, true) AS r', [jetonVieux, TRACE, 'Léa Client086']);
  await q(`UPDATE devis SET signature_date = now() - interval '20 days', signature_expires_at = now() - interval '1 day' WHERE signature_token = $1`, [jetonVieux]);
  const jetonExpireLien = await devisEnvoye(particulier);
  await q('SELECT sign_devis($1, $2, $3, NULL, NULL, false, true) AS r', [jetonExpireLien, TRACE, 'Léa Client086']);
  await q(`UPDATE devis SET signature_expires_at = now() - interval '1 hour' WHERE signature_token = $1`, [jetonExpireLien]);
  verifier((await page(jetonExpireLien))?.devis?.retractation?.ouverte === true,
    '086 : le lien de signature a expiré (fin de validité de l\'offre) → la rétractation reste ouverte jusqu\'à la fin de son délai');
  const tard = await retracter(jetonVieux, 'Léa Client086', 'lea@exemple.fr');
  verifier(!tard.success && tard.expire && (await ligne(jetonVieux)).statut === 'signe', `086 : après le délai → refus (${tard.error})`);
  verifier((await page(jetonVieux)).devis.retractation.ouverte === false, '086 : après le délai, la page ne propose plus de renoncer');

  // Signé sur place : pas de fonctionnalité en ligne
  const surPlace = (await q(
    `INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, date, signature, signature_token, signature_expires_at)
     VALUES ($1, $2, $3, 'DEV-086', 'devis', 'accepte', now()::date, $4, gen_random_uuid(), now() + interval '5 days') RETURNING signature_token`,
    [SOLO, ORGA_SOLO, particulier, TRACE])).rows[0].signature_token;
  verifier(!(await retracter(surPlace, 'Léa Client086', 'lea@exemple.fr')).success, '086 : devis signé sur place → pas de rétractation par le lien');

  // ── L'app ne réécrit ni la rétractation ni la demande expresse d'un devis signé ──
  const idRetracte = apres.id;
  const effacer = await essayer(() => en(SOLO, () => q('UPDATE devis SET retractation_le = NULL WHERE id = $1', [idRetracte])));
  verifier(!effacer.ok && /ne se modifie pas/.test(effacer.e), `086 : l'artisan n'efface pas la rétractation de son client (${effacer.e || 'effacée'})`);
  const inventer = await essayer(() => en(SOLO, () => q('UPDATE devis SET execution_anticipee_le = now() WHERE id = $1', [apresAvec.id])));
  const inventer2 = await essayer(() => en(SOLO, () => q('UPDATE devis SET execution_anticipee_le = now() WHERE signature_token = $1', [jetonPro])));
  verifier(!inventer.ok && !inventer2.ok, '086 : l\'artisan ne pose ni ne change une demande expresse après la signature');
  const urgenceApres = await essayer(() => en(SOLO, () => q('UPDATE devis SET travaux_urgents = true WHERE signature_token = $1', [jetonAvec])));
  verifier(!urgenceApres.ok, `086 : l'artisan ne coche pas « réparation urgente » après la signature (${urgenceApres.e || 'cochée'})`);
  const memeValeur = await essayer(() => en(SOLO, () => q('UPDATE devis SET travaux_urgents = false, numero = $2 WHERE signature_token = $1 RETURNING id', [jetonAvec, 'DEV-086'])));
  verifier(memeValeur.ok && memeValeur.r.rows.length === 1, `086 : l'app réenregistre un devis signé sans changer ces champs (${memeValeur.e || 'ok'})`);
  const nouveau = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut) VALUES ($1, $2, $3, 'DEV-086', 'devis', 'envoye') RETURNING id`, [SOLO, ORGA_SOLO, particulier])).rows[0].id;
  const surPlaceAvec = await essayer(() => en(SOLO, () => q(`UPDATE devis SET signature = $2, statut = 'accepte', execution_anticipee_le = now() WHERE id = $1 RETURNING execution_anticipee_le`, [nouveau, TRACE])));
  verifier(surPlaceAvec.ok && surPlaceAvec.r.rows[0]?.execution_anticipee_le, `086 : signature sur place avec la demande expresse, enregistrées ensemble (${surPlaceAvec.e || 'ok'})`);
  const autre = await essayer(() => en(PATRON, () => q('UPDATE devis SET retractation_le = now() WHERE id = $1 RETURNING id', [nouveau])));
  verifier(!autre.ok || autre.r.rows.length === 0, '086 : un autre compte ne touche pas aux devis du solo');

  // ── Droits ───────────────────────────────────────────────────────────────────
  const droits = Object.fromEntries((await q(`SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
      array_to_string(p.proconfig, ',') AS cfg FROM pg_proc p
    WHERE p.proname IN ('retracter_devis', 'sign_devis', 'get_devis_for_signature')`)).rows.map((r) => [r.proname, r]));
  verifier(['retracter_devis', 'sign_devis', 'get_devis_for_signature'].every((f) => droits[f]?.anon && /search_path=public, pg_temp/.test(droits[f].cfg || '')),
    '086 : la page publique appelle ses trois fonctions, search_path fixé');

  // Ménage (d'autres vérifications comptent les lignes des comptes)
  await q(`DELETE FROM devis WHERE numero = 'DEV-086'`);
  await q(`DELETE FROM portal_access_logs WHERE client_id IN ($1, $2, $3)`, [particulier, professionnel, syndic]);
  await q(`DELETE FROM clients WHERE nom = 'Client086'`);
  await q(`DELETE FROM entreprise WHERE nom = 'Élec 086'`);
}
