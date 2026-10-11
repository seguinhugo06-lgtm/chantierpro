/**
 * Génère le SQL qui (re)remplit le compte démo (contact@mallettico.fr) avec le jeu de scripts/demo/jeuDemo.js.
 *
 *   npx vite-node scripts/demo/ecrire-sql.mjs [--sortie audit-ui/demo/compte-demo.sql]
 *
 * Les objets passent par FIELD_MAPPINGS (useSupabaseSync.js) : mêmes colonnes et mêmes formats que ce que
 * l'app écrit (lignes et sections en texte JSON dans une colonne jsonb, comme supabase-js les envoie).
 *
 * Le SQL ne touche qu'à l'organisation du compte démo : il vérifie d'abord que cette organisation appartient
 * bien à contact@mallettico.fr, efface ses clients, chantiers, pièces, paiements, échanges, rendez-vous,
 * mémos, dépenses et relances, puis écrit le jeu. Sur la fiche entreprise : l'identité fictive (IDENTITE_DEMO,
 * marquée « données fictives ») et le scénario de relances (envoi automatique coupé) ; ses autres réglages, le
 * catalogue, l'équipe et l'abonnement restent tels quels. Un seul bloc : tout ou rien.
 */
import { FIELD_MAPPINGS } from '../../src/hooks/useSupabaseSync.js';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../../src/components/settings/RelanceConfigTab.jsx';
import { construireJeu, uuidDe } from './jeuDemo.js';
import { createHash } from 'node:crypto';
import { SIGNATURE_DEMO } from './signatureDemo.js';

// Compte démo (décision d'Hugo du 11 oct. 2026)
export const COMPTE_DEMO = {
  email: 'contact@mallettico.fr',
  userId: '717cf91a-30d9-409a-aea5-c46126b89217',
  organizationId: '61eae9f6-d2f2-4ba6-9b46-87bd64b8e96f',
  entrepriseId: 'b1856a78-681d-43d1-b20d-c7a6b3da1a48',
  boite: 'seguin.hugo06@gmail.com',
};

// Colonnes jsonb : `texte` = un texte JSON stocké comme chaîne jsonb (ce que fait l'app pour lignes et sections)
const JSONB = {
  devis: { lignes: 'texte', sections: 'texte', tva_details: 'texte' },
  chantiers: { taches: 'objet', photos: 'objet', documents: 'objet', messages: 'objet', situations_data: 'texte' },
  relance_executions: { metadata: 'objet' },
};

// Chaîne SQL ; une longue chaîne est coupée en morceaux sur des lignes successives, reliés par || : le script
// reste lisible et transmissible ligne à ligne.
const MORCEAU = 900;
const q = (s) => {
  const texte = String(s);
  const morceaux = [];
  for (let i = 0; i < texte.length; i += MORCEAU) morceaux.push(texte.slice(i, i + MORCEAU));
  // Un saut de ligne s'écrit chr(10) : dans le littéral, l'indentation du bloc entrerait dans le texte
  // (constaté le 11 oct. 2026 : « 1 rue de l’Exemple⏎␣␣33000 Bordeaux »)
  const litteral = (m) => m.split('\n').map((x) => `'${x.replace(/'/g, "''")}'`).join(' || chr(10) || ');
  const parties = (morceaux.length ? morceaux : ['']).map(litteral);
  return parties.length === 1 && !texte.includes('\n') ? parties[0] : `(${parties.join(' ||\n')})`;
};

function valeur(table, colonne, v) {
  if (v === null || v === undefined) return 'NULL';
  // L'image de signature (7 Ko) est déclarée une fois dans le bloc (v_sig) au lieu d'être répétée
  if (v === SIGNATURE_DEMO) return 'v_sig';
  const genre = JSONB[table]?.[colonne];
  if (genre === 'texte') return `to_jsonb(${q(typeof v === 'string' ? v : JSON.stringify(v))}::text)`;
  if (genre === 'objet') return `${q(JSON.stringify(v))}::jsonb`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return q(JSON.stringify(v));
  return q(v);
}

function inserer(table, lignes) {
  return lignes.map((l) => {
    const colonnes = Object.keys(l).filter((k) => l[k] !== undefined);
    return `INSERT INTO public.${table} (${colonnes.join(', ')}) VALUES (\n${colonnes.map((c) => valeur(table, c, l[c])).join(',\n')}\n);`;
  }).join('\n');
}

/**
 * Identité de l'entreprise de démonstration (Q-identite-demo, décision d'Hugo du 11 oct. 2026, sur
 * recommandation de juriste-btp) : clairement fictive et signalée comme telle, sans marque d'assureur réelle
 * ni numéro qui puisse appartenir à quelqu'un (SIRET à zéros, téléphone de la plage fiction ARCEP, e-mail sur
 * example.com, domaine réservé aux exemples). Le marqueur `donneesFictives` met le bandeau à l'écran et le
 * filigrane « EXEMPLE » sur les documents (src/lib/donneesFictives.js).
 */
export const IDENTITE_DEMO = {
  colonnes: {
    nom: 'Élec Exemple',
    forme_juridique: 'Micro-entreprise',
    siret: '00000000000000',
    code_ape: '4321A',
    // Comme les vraies fiches : code postal et ville dans l'adresse, colonnes vides (sinon la page de
    // paiement, qui les ajoute à l'adresse, les affichait deux fois)
    adresse: '1 rue de l’Exemple\n33000 Bordeaux',
    code_postal: '',
    ville: '',
    telephone: '06 39 98 00 00',
    email: 'elec-exemple@example.com',
    site_web: '',
    slogan: '',
    logo_url: '',
    logo_storage_path: '',
    tva_intra: '',
    rcs: '',
    rcs_ville: '',
    capital: '',
    iban: '',
    bic: '',
    decennale_assureur: 'Assureur décennal (exemple)',
    decennale_numero: 'EXEMPLE',
    decennale_validite: '2027-12-31',
    decennale_activites: 'Électricité générale (exemple)',
    rc_pro_assureur: 'Assureur RC professionnelle (exemple)',
    rc_pro_numero: 'EXEMPLE',
    rc_pro_validite: '2027-12-31',
    rc_pro_zone: 'France métropolitaine',
    assurance_decennale_compagnie: null,
    assurance_decennale_numero: null,
    assurance_rc_pro_compagnie: null,
    assurance_rc_pro_numero: null,
  },
  reglages: {
    nomEntrepreneur: 'Julien Exemple',
    donneesFictives: true,
    mediateur: 'Médiateur de la consommation (exemple)',
    mediateurContact: 'coordonnées fictives',
    decennaleAssureurAdresse: '',
    decennaleZone: 'France métropolitaine',
    rcsNumero: '',
    banque: '',
    titulaireBanque: '',
  },
};

/** Les lignes à écrire, table par table (exportée pour les tests). */
export function lignesDuJeu(jeu, compte = COMPTE_DEMO) {
  const base = { user_id: compte.userId, organization_id: compte.organizationId };
  const map = (table, objets, extra = () => ({})) => objets.map((o) => ({ ...FIELD_MAPPINGS[table].toSupabase(o), ...base, ...extra(o) }));

  // Création des clients : un peu avant leur première pièce
  const premiere = {};
  for (const d of jeu.devis) {
    if (!premiere[d.client_id] || d.date < premiere[d.client_id]) premiere[d.client_id] = d.date;
  }
  const veille = (jour) => (jour ? `${jour} 09:00:00` : null);

  return {
    clients: map('clients', jeu.clients, (c) => ({ created_at: veille(premiere[c.id]) })),
    chantiers: map('chantiers', jeu.chantiers, (c) => ({ entreprise_id: compte.entrepriseId, created_at: `${c.date_debut}T08:00:00Z` })),
    devis: map('devis', jeu.devis, (d) => ({
      entreprise_id: compte.entrepriseId,
      created_at: (d.date_envoi || `${d.date}T16:00:00.000Z`).replace('T', ' ').replace('Z', ''),
      // Signature à distance : colonnes écrites par sign_devis (absentes de FIELD_MAPPINGS)
      ...(d.signature_data ? { signature_data: d.signature_data, signataire_nom: d.signataire_nom, signature_cgv_accepted: true } : {}),
    })),
    paiements: map('paiements', jeu.paiements, (p) => ({ created_at: `${p.date}T17:30:00Z` })),
    echanges: map('echanges', jeu.echanges, (e) => ({ created_at: e.date })),
    planning_events: map('planning_events', jeu.planning),
    memos: map('memos', jeu.memos),
    depenses: map('depenses', jeu.depenses, (d) => ({ created_at: `${d.date}T18:00:00Z` })),
    relance_executions: relancesEnvoyees(jeu, base),
  };
}

/** Une relance déjà partie (2e acompte Lambert, en retard et payé en partie) : l'historique n'est pas vide. */
function relancesEnvoyees(jeu, base) {
  const facture = jeu.devis.find((d) => d.id === uuidDe('facture:fac-lambert-acompte-2'));
  if (!facture) return [];
  const etape = DEFAULT_FACTURE_STEPS[0];
  const envoyee = new Date(`${facture.date_echeance}T09:15:00`);
  envoyee.setDate(envoyee.getDate() + etape.delay);
  return [{
    id: uuidDe('relance:fac-lambert-acompte-2:1'),
    ...base,
    document_id: facture.id,
    document_type: 'facture',
    document_numero: facture.numero,
    client_id: facture.client_id,
    step_id: etape.id,
    step_name: etape.name,
    step_delay: etape.delay,
    sequence_type: 'facture',
    channel: 'email',
    status: 'sent',
    subject: `Relance : Facture ${facture.numero}`,
    triggered_by: 'manual',
    created_at: envoyee.toISOString(),
  }];
}

// Contrôle d'intégrité : les colonnes texte, nombres et dates écrites, par table. Le bloc en recalcule l'empreinte
// (md5) après écriture et la compare à celle calculée ici : une erreur de transmission du script (il fait plus de
// 100 Ko) le fait échouer sans rien écrire. Les colonnes jsonb sont lues comme texte brut (#>> '{}').
const EMPREINTE = {
  clients: ['nom', 'prenom', 'entreprise', 'email', 'telephone', 'adresse', 'categorie'],
  chantiers: ['client_id', 'nom', 'description', 'adresse', 'ville', 'code_postal', 'statut', 'date_debut', 'date_fin', 'budget_prevu', 'avancement'],
  devis: ['client_id', 'chantier_id', 'numero', 'type', 'statut', 'date', 'date_echeance', 'objet', 'conditions', 'client_nom', 'lignes', 'sections',
    'total_ht', 'total_ttc', 'montant_paye', 'date_paiement', 'devis_source_id', 'facture_type', 'signature', 'signature_data', 'signataire', 'signataire_nom'],
  paiements: ['devis_id', 'document_numero', 'montant', 'date', 'mode'],
  echanges: ['client_id', 'devis_id', 'type', 'contenu'],
  planning_events: ['title', 'date', 'type', 'location'],
  memos: ['text', 'priority', 'due_date'],
  depenses: ['chantier_id', 'description', 'montant', 'date', 'fournisseur'],
  relance_executions: ['document_id', 'document_numero', 'step_id', 'subject'],
};
const JSON_TEXTE = new Set(['lignes', 'sections']);
// Montants : numeric(10,2) ou (12,2) en production (« 5618.00 ») ; trim_scale les rend comme JavaScript (« 5618 »)
const MONTANTS = new Set(['budget_prevu', 'total_ht', 'total_ttc', 'montant_paye', 'montant']);

/** Empreinte attendue, calculée comme le fait le bloc (concat_ws ignore les valeurs nulles). */
export function empreinteAttendue(lignes) {
  const morceaux = [];
  for (const [table, colonnes] of Object.entries(EMPREINTE)) {
    for (const r of lignes[table] || []) {
      const valeurs = colonnes.map((c) => r[c]).filter((v) => v !== null && v !== undefined).map(String);
      morceaux.push([`${table}:${r.id}`, valeurs.join('§')]);
    }
  }
  morceaux.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return createHash('md5').update(morceaux.map((m) => m[1]).join('|'), 'utf8').digest('hex');
}

function sqlEmpreinte() {
  const selects = Object.entries(EMPREINTE).map(([table, colonnes]) => {
    const cols = colonnes.map((c) => (JSON_TEXTE.has(c) ? `${c} #>> '{}'` : MONTANTS.has(c) ? `trim_scale(${c})::text` : `${c}::text`)).join(', ');
    return `SELECT '${table}:' || id::text AS k, concat_ws('§', ${cols}) AS t FROM public.${table} WHERE organization_id = v_org`;
  });
  return `SELECT md5(string_agg(t, '|' ORDER BY k COLLATE "C")) FROM (\n  ${selects.join('\n  UNION ALL ')}\n) e`;
}

/**
 * Le SQL complet : UN bloc DO (tout ou rien, quelle que soit la façon dont il est envoyé), qui
 *   1. vérifie le compte et l'organisation ;
 *   2. refuse si une ligne d'une AUTRE organisation pointe vers les clients, chantiers ou pièces du compte démo
 *      (les clés étrangères ne vérifient pas l'organisation : un effacement en cascade ou une mise à NULL
 *      toucherait cette autre organisation ; liens relevés dans pg_constraint, relecture gardien-securite) ;
 *   3. efface le contenu de l'organisation démo, puis écrit le jeu.
 */
export function genererSql({ aujourdhui = new Date(), compte = COMPTE_DEMO } = {}) {
  const jeu = construireJeu({ aujourdhui, boite: compte.boite });
  const lignes = lignesDuJeu(jeu, compte);
  const scenario = { enabled: true, autoSend: false, devisSteps: DEFAULT_DEVIS_STEPS, factureSteps: DEFAULT_FACTURE_STEPS };
  // Ordre d'effacement : ce qui pointe vers les pièces et chantiers, puis les pièces, chantiers et clients
  const aEffacer = ['relance_executions', 'paiements', 'echanges', 'planning_events', 'memos', 'depenses', 'pointages', 'devis', 'chantiers', 'clients'];
  const corps = [
    `IF NOT EXISTS (SELECT 1 FROM auth.users u JOIN public.organization_members m ON m.user_id = u.id`,
    `               WHERE u.id = ${q(compte.userId)} AND lower(u.email) = ${q(compte.email)}`,
    `                 AND m.organization_id = v_org AND m.role = 'owner')`,
    `   OR NOT EXISTS (SELECT 1 FROM public.entreprise WHERE id = ${q(compte.entrepriseId)} AND organization_id = v_org) THEN`,
    `  RAISE EXCEPTION 'Compte démo introuvable ou organisation inattendue : rien n''est écrit';`,
    'END IF;',
    'FOR r IN SELECT c.conrelid::regclass AS tbl, a.attname AS col, c.confrelid::regclass AS cible',
    '         FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]',
    "         WHERE c.contype = 'f' AND c.confrelid IN ('public.clients'::regclass, 'public.chantiers'::regclass, 'public.devis'::regclass)",
    'LOOP',
    "  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = r.tbl AND attname = 'organization_id' AND NOT attisdropped) THEN",
    "    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s x WHERE x.organization_id IS DISTINCT FROM $1 AND x.%I IN (SELECT id FROM %s WHERE organization_id = $1))', r.tbl, r.col, r.cible)",
    '      INTO v_croise USING v_org;',
    "    IF v_croise THEN RAISE EXCEPTION 'Une ligne de % (autre organisation) pointe vers % du compte démo : rien n''est écrit', r.tbl, r.cible; END IF;",
    '  END IF;',
    'END LOOP;',
    ...aEffacer.map((t) => `DELETE FROM public.${t} WHERE organization_id = v_org;`),
    `UPDATE public.entreprise SET relance_config = ${q(JSON.stringify(scenario))}::jsonb WHERE id = ${q(compte.entrepriseId)} AND organization_id = v_org;`,
    // Nom de l'organisation (visible dans l'équipe et le sélecteur) : celui de l'entreprise fictive
    `UPDATE public.organizations SET name = ${q(IDENTITE_DEMO.colonnes.nom)}, updated_at = now() WHERE id = v_org AND owner_id = ${q(compte.userId)};`,
    // Identité fictive et marqueur « données fictives » (les autres réglages de la fiche sont conservés)
    `UPDATE public.entreprise SET ${Object.entries(IDENTITE_DEMO.colonnes).map(([c, v]) => `${c} = ${v === null ? 'NULL' : q(v)}`).join(', ')},`,
    `  settings_json = jsonb_set(COALESCE(settings_json, '{}'::jsonb), '{reglages}', COALESCE(settings_json -> 'reglages', '{}'::jsonb) || ${q(JSON.stringify(IDENTITE_DEMO.reglages))}::jsonb)`,
    `  WHERE id = ${q(compte.entrepriseId)} AND organization_id = v_org;`,
    inserer('clients', lignes.clients),
    inserer('chantiers', lignes.chantiers),
    inserer('devis', lignes.devis),
    inserer('paiements', lignes.paiements),
    inserer('echanges', lignes.echanges),
    inserer('planning_events', lignes.planning_events),
    inserer('memos', lignes.memos),
    inserer('depenses', lignes.depenses),
    inserer('relance_executions', lignes.relance_executions),
    `SELECT md5_ecrit INTO v_empreinte FROM (${sqlEmpreinte()}) AS x(md5_ecrit);`,
    `IF v_empreinte IS DISTINCT FROM '${empreinteAttendue(lignes)}' THEN`,
    "  RAISE EXCEPTION 'Contrôle d''intégrité : le contenu écrit (%) ne correspond pas au jeu généré, rien n''est écrit', v_empreinte;",
    'END IF;',
  ].join('\n');
  return [
    `-- Compte démo ${compte.email} : jeu de démonstration généré le ${aujourdhui.toISOString().slice(0, 10)} (scripts/demo/generer-sql.mjs)`,
    'DO $demo$',
    'DECLARE',
    `  v_org uuid := ${q(compte.organizationId)};`,
    '  r record;',
    '  v_croise boolean;',
    '  v_empreinte text;',
    `  v_sig text := ${q(SIGNATURE_DEMO)};`,
    'BEGIN',
    corps.split('\n').map((l) => `  ${l}`).join('\n'),
    'END $demo$;',
  ].join('\n');
}
