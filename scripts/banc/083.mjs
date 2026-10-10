// Vérifications de la migration 083 : page de signature complète et sûre (relectures juriste-btp et
// gardien-securite du 10 oct. 2026). Effets constatés en se faisant passer pour l'artisan, un collaborateur et
// un visiteur (la page publique de signature).
import { PATRON, SALARIE, SOLO } from './socle.mjs';

const TRACE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ORGA_PATRON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORGA_SOLO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

export async function verifier({ q, en, commeAnonyme, verifier }) {
  const jour = async (decalage) => (await q(`SELECT ((now() AT TIME ZONE 'Europe/Paris')::date + $1::int)::text AS j`, [decalage])).rows[0].j;
  const essayer = async (fn) => {
    try { return { ok: true, r: await fn() }; } catch (e) { return { ok: false, e: e.message }; }
  };

  // Entreprise du solo : micro-entreprise, nom de l'entrepreneur, médiateur, décennale ; une 2e fiche archivée
  await q(`INSERT INTO entreprise (user_id, organization_id, nom, forme_juridique, siret, decennale_assureur, decennale_numero, is_default, settings_json)
           VALUES ($1, $2, 'Élec du Sud', 'Micro-entreprise', '12345678900012', 'AXA', 'DEC-083', true,
                   '{"reglages": {"nomEntrepreneur": "Hugo Séguin", "mediateur": "CM2C", "decennaleZone": "France métropolitaine", "decennaleAssureurAdresse": "Paris", "banque": "secret"}, "autre": "ne sort pas"}')`, [SOLO, ORGA_SOLO]);
  await q(`INSERT INTO entreprise (user_id, organization_id, nom, archived_at) VALUES ($1, $2, 'Ancienne fiche', now())`, [SOLO, ORGA_SOLO]);
  const client = (await q(`INSERT INTO clients (user_id, organization_id, nom, prenom, categorie) VALUES ($1, $2, 'Martin', 'Paul', 'particulier') RETURNING id`, [SOLO, ORGA_SOLO])).rows[0].id;
  const chantier = (await q(`INSERT INTO chantiers (user_id, organization_id, client_id, nom, adresse, ville, code_postal) VALUES ($1, $2, $3, 'Rénovation', '3 rue des Lilas', 'Bordeaux', '33000') RETURNING id`, [SOLO, ORGA_SOLO, client])).rows[0].id;
  const nouveauDevis = async (statut, finValidite, extra = '') => (await q(
    `INSERT INTO devis (user_id, organization_id, client_id, chantier_id, numero, type, statut, date, date_validite, validite_jours, total_ttc, acompte_pct ${extra ? ', ' + extra.split('=')[0] : ''})
     VALUES ($1, $2, $3, $4, 'DEV-083', 'devis', $5, now()::date, $6::date, 45, 1200, 30 ${extra ? ', ' + extra.split('=')[1] : ''}) RETURNING id`,
    [SOLO, ORGA_SOLO, client, chantier, statut, finValidite])).rows[0].id;

  // ── generate_signature_token : droits ─────────────────────────────────────
  const valable = await nouveauDevis('envoye', await jour(10));
  const visiteur = await essayer(() => commeAnonyme(() => q('SELECT generate_signature_token($1, 30) AS t', [valable])));
  verifier(!visiteur.ok && /permission denied/i.test(visiteur.e), `083 : un visiteur ne crée plus de lien de signature (${visiteur.e || 'autorisé'})`);
  const auteur = await essayer(() => en(SOLO, () => q('SELECT generate_signature_token($1, 400) AS t', [valable])));
  verifier(auteur.ok && auteur.r.rows[0].t, `083 : l'auteur du devis crée le lien (${auteur.e || 'ok'})`);
  const expire = (await q(`SELECT signature_expires_at <= (((now() AT TIME ZONE 'Europe/Paris')::date + 11)::timestamp AT TIME ZONE 'Europe/Paris') AS borne,
                                  signature_expires_at > now() + interval '9 days' AS assez FROM devis WHERE id = $1`, [valable])).rows[0];
  verifier(expire.borne && expire.assez, '083 : le lien expire à minuit (Paris) le soir du dernier jour de validité, pas dans 400 jours');
  const etranger = await essayer(() => en(PATRON, () => q('SELECT generate_signature_token($1, 30)', [valable])));
  verifier(!etranger.ok && /non autorise/.test(etranger.e), `083 : un compte d'une autre organisation ne crée pas de lien (${etranger.e || 'autorisé'})`);

  // Collaborateurs de l'organisation du patron : un comptable oui, un ouvrier non
  const devisPatron = (await q(`INSERT INTO devis (user_id, organization_id, numero, type, statut, date) VALUES ($1, $2, 'DEV-083-P', 'devis', 'envoye', now()::date) RETURNING id`, [PATRON, ORGA_PATRON])).rows[0].id;
  const ouvrier = await essayer(() => en(SALARIE, () => q('SELECT generate_signature_token($1, 30)', [devisPatron])));
  verifier(!ouvrier.ok, `083 : un ouvrier de l'organisation ne crée pas de lien (${ouvrier.e || 'autorisé'})`);
  await q(`UPDATE organization_members SET role = 'comptable' WHERE organization_id = $1 AND user_id = $2`, [ORGA_PATRON, SALARIE]);
  const comptable = await essayer(() => en(SALARIE, () => q('SELECT generate_signature_token($1, 30) AS t', [devisPatron])));
  verifier(comptable.ok && comptable.r.rows[0].t, `083 : un comptable de l'organisation crée le lien d'un devis du patron (${comptable.e || 'ok'})`);
  await q(`UPDATE organization_members SET role = 'ouvrier' WHERE organization_id = $1 AND user_id = $2`, [ORGA_PATRON, SALARIE]);

  const devisExpire = await nouveauDevis('envoye', await jour(-1));
  const surExpire = await essayer(() => en(SOLO, () => q('SELECT generate_signature_token($1, 30)', [devisExpire])));
  verifier(!surExpire.ok && /expire/i.test(surExpire.e), `083 : pas de lien pour un devis expiré (${surExpire.e || 'autorisé'})`);

  // ── get_devis_for_signature : ce que voit le client ───────────────────────
  const jeton = auteur.r.rows[0].t;
  const lu = await commeAnonyme(() => q('SELECT get_devis_for_signature($1) AS j', [jeton]));
  const j = lu.rows[0].j || {};
  const ent = j.entreprise || {};
  verifier(ent.forme_juridique === 'Micro-entreprise' && ent.nomEntrepreneur === 'Hugo Séguin', `083 : forme juridique et nom de l'entrepreneur (EI) transmis (${ent.forme_juridique} / ${ent.nomEntrepreneur})`);
  verifier(ent.mediateur === 'CM2C' && ent.decennaleZone === 'France métropolitaine' && ent.decennaleAssureurAdresse === 'Paris' && ent.decennale_assureur === 'AXA',
    '083 : médiateur, assureur décennal, ses coordonnées et sa zone transmis');
  verifier(ent.nom === 'Élec du Sud', `083 : la fiche entreprise active par défaut, pas la fiche archivée (${ent.nom})`);
  verifier(ent.banque === undefined && ent.autre === undefined && ent.settings_json === undefined, '083 : rien d\'autre des réglages ne sort (banque, autres clés)');
  verifier(j.client?.categorie === 'particulier' && j.chantier?.adresse === '3 rue des Lilas', '083 : catégorie du client et lieu des travaux transmis');
  verifier(Number(j.devis?.validite) === 45 && Number(j.devis?.acompte_pct) === 30 && j.devis?.date_validite, '083 : validité et acompte du devis transmis');

  // Un faux tracé ou un nom vide sont refusés, sans rien écrire
  for (const [trace, nom, motif] of [
    ['javascript:alert(1)', 'Paul Martin', 'lien javascript:'],
    ['data:image/svg+xml;base64,PHN2Zz4=', 'Paul Martin', 'SVG'],
    [TRACE, '   ', 'nom vide'],
    [TRACE, 'x'.repeat(201), 'nom de 201 caractères'],
  ]) {
    const r = await commeAnonyme(() => q('SELECT sign_devis($1, $2, $3) AS r', [jeton, trace, nom]));
    verifier(r.rows[0].r.success === false, `083 : signature refusée (${motif})`);
  }

  // La vraie signature passe (le visiteur agit dans une transaction annulée : on relit dans la même)
  const signe = await commeAnonyme(async () => {
    const r = (await q('SELECT sign_devis($1, $2, $3, $4, $5) AS r', [jeton, TRACE, 'Paul Martin', '1.2.3.4', 'test'])).rows[0].r;
    const apres = (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j;
    const deuxieme = (await q('SELECT sign_devis($1, $2, $3) AS r', [jeton, TRACE, 'Autre personne'])).rows[0].r;
    return { r, apres, deuxieme };
  });
  verifier(signe.r.success === true, `083 : un tracé PNG et un nom valides signent le devis (${JSON.stringify(signe.r)})`);
  verifier(signe.apres?.devis?.already_signed === true && signe.deuxieme.success === false, '083 : une fois signé, le lien ne resigne pas');

  // Devis signé SUR PLACE (accepte + signature) : le lien encore valable ne le resigne pas
  await q(`UPDATE devis SET statut = 'accepte', signature = $2, signataire = 'Client sur place' WHERE id = $1`, [valable, TRACE]);
  const surPlace = await commeAnonyme(async () => ({
    lu: (await q('SELECT get_devis_for_signature($1) AS j', [jeton])).rows[0].j,
    signe: (await q('SELECT sign_devis($1, $2, $3) AS r', [jeton, TRACE, 'Conjoint'])).rows[0].r,
  }));
  verifier(surPlace.lu?.devis?.already_signed === true && surPlace.signe.success === false, '083 : un devis signé sur place ne se resigne pas par le lien');
  const resteSurPlace = (await q('SELECT signataire, signataire_nom FROM devis WHERE id = $1', [valable])).rows[0];
  verifier(resteSurPlace.signataire === 'Client sur place' && resteSurPlace.signataire_nom === null, '083 : la signature sur place reste intacte');

  // Devis expiré avec un ancien lien (30 jours) : la page dit « expiré », la signature est refusée
  const ancienJeton = 'dddddddd-dddd-4ddd-8ddd-dddddddd0083';
  await q(`UPDATE devis SET signature_token = $2, signature_expires_at = now() + interval '20 days' WHERE id = $1`, [devisExpire, ancienJeton]);
  const surAncien = await commeAnonyme(async () => ({
    lu: (await q('SELECT get_devis_for_signature($1) AS j', [ancienJeton])).rows[0].j,
    signe: (await q('SELECT sign_devis($1, $2, $3) AS r', [ancienJeton, TRACE, 'Paul Martin'])).rows[0].r,
  }));
  verifier(surAncien.lu?.devis?.expire === true && surAncien.signe.success === false, '083 : un devis expiré ne se signe plus, même avec un ancien lien encore ouvert');
  const statutExpire = (await q('SELECT statut, signature_data FROM devis WHERE id = $1', [devisExpire])).rows[0];
  verifier(statutExpire.statut === 'envoye' && statutExpire.signature_data === null, '083 : le devis expiré reste « envoyé », sans signature');

  const refuseOuValable = await nouveauDevis('envoye', await jour(10));

  // Devis refusé : « indisponible »
  const refuse = await nouveauDevis('refuse', await jour(10));
  await q(`UPDATE devis SET signature_token = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0083', signature_expires_at = now() + interval '5 days' WHERE id = $1`, [refuse]);
  const luRefuse = await commeAnonyme(() => q(`SELECT get_devis_for_signature('eeeeeeee-eeee-4eee-8eee-eeeeeeee0083') AS j`));
  verifier(luRefuse.rows[0].j?.devis?.indisponible === true, '083 : un devis refusé n\'est plus proposé à la signature');

  // Devis ancien sans date de fin enregistrée (cas des 32 devis de la production le 10 oct.) : date + durée
  const ancien = (await q(`INSERT INTO devis (user_id, organization_id, client_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
    VALUES ($1, $2, $3, 'DEV-083-A', 'devis', 'envoye', (now() AT TIME ZONE 'Europe/Paris')::date - 50, 30, 'ffffffff-ffff-4fff-8fff-ffffffff0083', now() + interval '5 days') RETURNING id`, [SOLO, ORGA_SOLO, client])).rows[0].id;
  const surAncienSansFin = await commeAnonyme(async () => ({
    lu: (await q(`SELECT get_devis_for_signature('ffffffff-ffff-4fff-8fff-ffffffff0083') AS j`)).rows[0].j,
    signe: (await q(`SELECT sign_devis('ffffffff-ffff-4fff-8fff-ffffffff0083', $1, 'Paul Martin') AS r`, [TRACE])).rows[0].r,
  }));
  verifier(surAncienSansFin.lu?.devis?.expire === true && surAncienSansFin.signe.success === false, '083 : un devis sans date de fin enregistrée expire à date + durée choisie');
  const surAncienLien = await essayer(() => en(SOLO, () => q('SELECT generate_signature_token($1, 30)', [ancien])));
  verifier(!surAncienLien.ok, '083 : pas de nouveau lien pour ce devis expiré');

  // Isolation entre comptes : un devis du patron qui « pointe » vers la fiche, le client et le chantier du solo
  const soloEntreprise = (await q(`SELECT id FROM entreprise WHERE user_id = $1 AND archived_at IS NULL`, [SOLO])).rows[0].id;
  await q(`UPDATE entreprise SET iban = 'FR76-IBAN-DU-SOLO' WHERE id = $1`, [soloEntreprise]);
  await q(`INSERT INTO devis (user_id, organization_id, entreprise_id, client_id, chantier_id, numero, type, statut, date, validite_jours, signature_token, signature_expires_at)
    VALUES ($1, $2, $3, $4, $5, 'DEV-083-X', 'devis', 'envoye', now()::date, 30, '99999999-9999-4999-8999-999999990083', now() + interval '5 days')`, [PATRON, ORGA_PATRON, soloEntreprise, client, chantier]);
  const vol = (await commeAnonyme(() => q(`SELECT get_devis_for_signature('99999999-9999-4999-8999-999999990083') AS j`))).rows[0].j || {};
  verifier(vol.entreprise?.iban !== 'FR76-IBAN-DU-SOLO' && vol.entreprise?.nom !== 'Élec du Sud', `083 : un devis ne lit pas la fiche (IBAN) d'un autre compte (${vol.entreprise?.nom})`);
  verifier(!vol.client?.nom && !vol.chantier, '083 : ni le client ni le chantier d\'un autre compte');

  // Fiche injectée par le patron dans l'organisation du solo (par défaut, très ancienne) : jamais servie au solo
  await q(`INSERT INTO entreprise (user_id, organization_id, nom, iban, is_default, created_at) VALUES ($1, $2, 'Fiche pirate', 'FR76-PIRATE', true, '2000-01-01')`, [PATRON, ORGA_SOLO]);
  const tokSolo = (await en(SOLO, () => q(`SELECT generate_signature_token($1, 30) AS t`, [refuseOuValable]))).rows[0].t;
  const injecte = (await commeAnonyme(() => q('SELECT get_devis_for_signature($1) AS j', [tokSolo]))).rows[0].j || {};
  verifier(injecte.entreprise?.nom === 'Élec du Sud' && injecte.entreprise?.iban !== 'FR76-PIRATE', `083 : une fiche injectée dans l'organisation n'est pas servie (${injecte.entreprise?.nom})`);
  await q(`DELETE FROM devis WHERE numero IN ('DEV-083-X', 'DEV-083-A')`);
  await q(`DELETE FROM entreprise WHERE nom = 'Fiche pirate'`);

  // Droits et search_path
  const droits = (await q(`SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS visiteur,
                                  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS connecte, array_to_string(p.proconfig, ',') AS cfg
                           FROM pg_proc p WHERE p.proname IN ('generate_signature_token', 'get_devis_for_signature', 'sign_devis') ORDER BY 1`)).rows;
  const d = Object.fromEntries(droits.map((x) => [x.proname, x]));
  verifier(!d.generate_signature_token.visiteur && d.generate_signature_token.connecte, '083 : generate_signature_token réservé aux comptes connectés');
  verifier(d.get_devis_for_signature.visiteur && d.sign_devis.visiteur, '083 : la page publique garde la lecture et la signature par jeton');
  verifier(droits.every((x) => /search_path=public, ?pg_temp/.test(x.cfg || '')), '083 : search_path fixé pour les trois fonctions');

  await q(`DELETE FROM portal_access_logs WHERE client_id = $1`, [client]);
  await q(`DELETE FROM devis WHERE id = ANY($1::uuid[])`, [[valable, devisExpire, devisPatron, refuse, refuseOuValable]]);
  await q(`DELETE FROM chantiers WHERE id = $1`, [chantier]);
  await q(`DELETE FROM clients WHERE id = $1`, [client]);
  await q(`DELETE FROM entreprise WHERE user_id = $1`, [SOLO]);
}
