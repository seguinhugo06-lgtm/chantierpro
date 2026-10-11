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
 * mémos, dépenses et relances, puis écrit le jeu. Le catalogue, la fiche entreprise (sauf le scénario de
 * relances, envoi automatique coupé), l'équipe et l'abonnement restent tels quels. Un seul envoi : la base
 * l'exécute d'un bloc, tout ou rien.
 */
import { FIELD_MAPPINGS } from '../../src/hooks/useSupabaseSync.js';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../../src/components/settings/RelanceConfigTab.jsx';
import { construireJeu, uuidDe } from './jeuDemo.js';

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

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function valeur(table, colonne, v) {
  if (v === null || v === undefined) return 'NULL';
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
    return `INSERT INTO public.${table} (${colonnes.join(', ')}) VALUES (${colonnes.map((c) => valeur(table, c, l[c])).join(', ')});`;
  }).join('\n');
}

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

/** Le SQL complet : garde, remise à zéro de l'organisation démo, écriture du jeu. */
export function genererSql({ aujourdhui = new Date(), compte = COMPTE_DEMO } = {}) {
  const jeu = construireJeu({ aujourdhui, boite: compte.boite });
  const lignes = lignesDuJeu(jeu, compte);
  const org = q(compte.organizationId);
  const scenario = { enabled: true, autoSend: false, devisSteps: DEFAULT_DEVIS_STEPS, factureSteps: DEFAULT_FACTURE_STEPS };
  // Ordre d'effacement : ce qui pointe vers les pièces, puis les pièces, chantiers et clients
  const aEffacer = ['relance_executions', 'paiements', 'echanges', 'planning_events', 'memos', 'depenses', 'devis', 'chantiers', 'clients'];
  return [
    `-- Compte démo ${compte.email} : jeu de démonstration généré le ${aujourdhui.toISOString().slice(0, 10)} (scripts/demo/generer-sql.mjs)`,
    'DO $garde$ BEGIN',
    `  IF NOT EXISTS (SELECT 1 FROM auth.users u JOIN public.organization_members m ON m.user_id = u.id`,
    `                 WHERE u.id = ${q(compte.userId)} AND lower(u.email) = ${q(compte.email)}`,
    `                   AND m.organization_id = ${org} AND m.role = 'owner')`,
    `     OR NOT EXISTS (SELECT 1 FROM public.entreprise WHERE id = ${q(compte.entrepriseId)} AND organization_id = ${org}) THEN`,
    `    RAISE EXCEPTION 'Compte démo introuvable ou organisation inattendue : rien n''est écrit';`,
    '  END IF;',
    'END $garde$;',
    ...aEffacer.map((t) => `DELETE FROM public.${t} WHERE organization_id = ${org};`),
    `UPDATE public.entreprise SET relance_config = ${q(JSON.stringify(scenario))}::jsonb WHERE id = ${q(compte.entrepriseId)} AND organization_id = ${org};`,
    inserer('clients', lignes.clients),
    inserer('chantiers', lignes.chantiers),
    inserer('devis', lignes.devis),
    inserer('paiements', lignes.paiements),
    inserer('echanges', lignes.echanges),
    inserer('planning_events', lignes.planning_events),
    inserer('memos', lignes.memos),
    inserer('depenses', lignes.depenses),
    inserer('relance_executions', lignes.relance_executions),
  ].join('\n');
}
