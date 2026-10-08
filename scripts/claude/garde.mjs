#!/usr/bin/env node
/**
 * Hook PreToolUse (Bash) : garde-fous qui s'appliquent quoi qu'en dise le modèle.
 *
 * - Interdit : `supabase db push / reset`, push forcé, réécriture de main.
 * - Demande confirmation : `git reset --hard`, `git clean -f`.
 * - Livraison (`git push … main`) : refusée tant que HEAD n'a pas passé `npm run verifier`
 *   (niveau standard ou complet, arbre propre, résultat vert) — c'est la « définition de fini »
 *   rendue obligatoire, pour ne plus jamais livrer une panne verte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let entree = '';
for await (const morceau of process.stdin) entree += morceau;
let commande = '';
try { commande = JSON.parse(entree)?.tool_input?.command || ''; } catch { process.exit(0); }
const RACINE = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const decider = (decision, raison) => {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: raison } }));
  process.exit(0);
};

if (/\bsupabase\b[^|;&]*\bdb\s+(push|reset)\b/.test(commande)) {
  decider('deny', 'Interdit : les migrations s’appliquent à la main par Hugo dans l’éditeur SQL (voir docs/etat-production.md). Écrire la migration, la passer au banc, donner le SQL.');
}
if (/\bgit\s+push\b[^|;&]*(\s--force\b|\s-f\b|--force-with-lease|\+\S*main)/.test(commande)) {
  decider('deny', 'Interdit : pas de push forcé (main est la production).');
}
if (/\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f)/.test(commande)) {
  decider('ask', 'Commande destructive (travail non commité perdu) : confirmer.');
}
if (/\bgit\s+push\b[^|;&]*\bmain\b/.test(commande)) {
  let v = null;
  try { v = JSON.parse(fs.readFileSync(path.join(RACINE, 'audit-ui/derniere-verification.json'), 'utf8')); } catch { /* aucune vérification */ }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: RACINE, encoding: 'utf8' }).trim();
  const propre = execFileSync('git', ['status', '--porcelain'], { cwd: RACINE, encoding: 'utf8' }).trim() === '';
  const probleme = !v ? 'aucune vérification enregistrée'
    : !v.reussi ? 'la dernière vérification est ROUGE'
      : v.niveau === 'rapide' ? 'la dernière vérification est seulement « rapide »'
        : v.head !== head ? 'la dernière vérification porte sur un autre commit'
          : !v.propre ? 'la vérification a tourné avec des modifications non commitées'
            : !propre ? 'des modifications ne sont pas commitées'
              : null;
  if (probleme) {
    decider('deny', `Livraison refusée : ${probleme}. Lancer \`npm run verifier\` (ou \`-- --complet\` si l’affichage, les migrations ou un parcours critique ont changé) sur le commit à livrer, arbre propre, puis relivrer.`);
  }
}
process.exit(0);
