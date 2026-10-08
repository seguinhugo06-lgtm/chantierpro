#!/usr/bin/env node
/**
 * Hook SessionStart : ce que Claude doit savoir AVANT de commencer (texte ajouté à son contexte).
 * Rapide (< 5 s) et sans rien modifier : retard sur main, travail en cours, dernière vérification,
 * état de la production (docs/etat-production.md), priorités.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (args, timeout = 3000) => {
  const r = spawnSync('git', args, { cwd: RACINE, encoding: 'utf8', timeout });
  return r.status === 0 ? r.stdout.trim() : '';
};

git(['fetch', '-q', 'origin', 'main'], 4000);
const branche = git(['branch', '--show-current']) || '(détachée)';
const [retard = '?', avance = '?'] = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD']).split(/\s+/);
const modifs = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
const head = git(['rev-parse', '--short', 'HEAD']);

const l = [`# Mallettico — état au démarrage (${new Date().toLocaleString('fr-FR')})`];
l.push(`Branche ${branche} @ ${head} · ${retard} commit(s) de retard sur origin/main · ${avance} en avance · ${modifs} fichier(s) modifié(s)`);
if (retard !== '0' && retard !== '?') {
  l.push(`⚠ RETARD SUR MAIN : mettre la branche à jour AVANT tout travail (outil sync_with_base_branch, sinon \`git merge --ff-only origin/main\`).`);
}

try {
  const v = JSON.parse(fs.readFileSync(path.join(RACINE, 'audit-ui/derniere-verification.json'), 'utf8'));
  const surHead = v.head?.startsWith(head) || git(['rev-parse', 'HEAD']) === v.head;
  l.push(`Dernière vérification : ${v.reussi ? 'verte' : 'ROUGE'} (niveau ${v.niveau}, ${new Date(v.date).toLocaleString('fr-FR')})${surHead ? ' sur ce commit' : ' sur un autre commit'}.`);
} catch { l.push('Dernière vérification : aucune sur ce poste (npm run verifier).'); }

try {
  const etat = fs.readFileSync(path.join(RACINE, 'docs/etat-production.md'), 'utf8');
  const section = etat.split(/^## /m).find((s) => s.startsWith('En attente'));
  if (section) {
    const items = section.split('\n').filter((x) => /^\s*[-*\d]/.test(x)).slice(0, 8);
    if (items.length) l.push('En attente côté Hugo (docs/etat-production.md) :', ...items);
  }
} catch { /* pas de fichier d'état : rien à signaler */ }

l.push('Pilote d’Hugo (docs/pilote.md) : il y écrit ses demandes, ses réponses aux questions, ce qu’il a fait et ses irritants de terrain — /debut le lit ; chaque livraison y est consignée (procédure « sync »).');
l.push('Rituels : /debut (orientation complète), /tache <quoi> (boucle complète), /verifier, /livrer, /pilote, /fin. Organisation : docs/organisation.md.');
console.log(l.join('\n'));
