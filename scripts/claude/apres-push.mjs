#!/usr/bin/env node
/**
 * Hook PostToolUse (Bash) : après un push réussi sur main, rappelle à Claude la fin de la livraison —
 * verdict de production, puis consignation (docs/etat-production.md et Pilote d'Hugo). Sans ce rappel,
 * le Pilote se désynchronise dès qu'une session oublie l'étape.
 */
let entree = '';
for await (const morceau of process.stdin) entree += morceau;
let donnees;
try { donnees = JSON.parse(entree); } catch { process.exit(0); }
const commande = donnees?.tool_input?.command || '';
if (!/\bgit\s+push\b/.test(commande) || !/(?:^|[\s:])(?:refs\/heads\/)?main(?:\s|$)/.test(commande)) process.exit(0);
const r = donnees?.tool_response || {};
const sortie = `${r.stdout || ''}\n${r.stderr || ''}`;
const plage = sortie.match(/([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})\s+\S+\s+->\s+main/);
if (!plage || /\[rejected\]|error:/i.test(sortie)) process.exit(0);
const [, avant, apres] = plage;
const texte = [
  `Livraison poussée sur main (${avant}..${apres}). Fin de livraison obligatoire, dans l'ordre :`,
  `1. npm run statut -- ${apres} → verdict Vercel ×2 + CI. Rouge : diagnostiquer et corriger tout de suite.`,
  `2. docs/etat-production.md : commit en production, ce qu'Hugo doit appliquer (commit docs: si besoin).`,
  `3. Pilote : node scripts/pilote/preparer.mjs livraison --de ${avant} --titre "…" --pour "…" --preuve "…" [--afaire "…"] [--demande <id>], puis la procédure « sync » de docs/pilote.md (une lecture des versions, un batch, une relecture).`,
].join('\n');
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: texte } }));
