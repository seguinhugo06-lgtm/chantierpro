#!/usr/bin/env node
/**
 * Le pont entre le dépôt et le Pilote d'Hugo (artefact claude.ai, base privée). Mode d'emploi : docs/pilote.md.
 * Le script n'a pas accès au Pilote : Claude lit et écrit avec l'outil ArtifactData, le script dérive
 * le contenu du dépôt (toujours de la même source) et résume ce qu'Hugo a écrit.
 *
 *   node scripts/pilote/preparer.mjs vider
 *       Vide audit-ui/pilote/lecture/ avant une nouvelle lecture (sinon un document supprimé y resterait).
 *   node scripts/pilote/preparer.mjs lire
 *       Résume ce que les lectures ArtifactData (out_dir audit-ui/pilote/lecture) ont rapporté : demandes
 *       nouvelles, réponses aux questions, actions qu'Hugo dit avoir faites, journal de terrain, focus.
 *   node scripts/pilote/preparer.mjs sync [--existants attentes/<id>:<v>,claude/etat:<v>,livraisons/<id>:<v>,…]
 *       Toutes les écritures de Claude en un envoi → audit-ui/pilote/ecritures.json (ArtifactData « batch ») :
 *       attentes (depuis « En attente côté Hugo » de docs/etat-production.md, SQL complet inclus), état de la
 *       production + prochaines tâches (claude/etat), fiches de livraison préparées et pas encore envoyées.
 *       --existants : documents déjà dans le Pilote, avec leur version (lue dans le résultat de « list »).
 *   node scripts/pilote/preparer.mjs livraison --de <sha> [--a <sha>] --titre "…" [--pour "…"]… [--preuve "…"]… [--afaire "…"]… [--demande <id>]…
 *       Fiche du journal des livraisons → audit-ui/pilote/livraisons/<id>.json (envoyée au prochain sync).
 *   (attentes et etat existent aussi seuls, pour inspecter ce que sync enverrait.)
 *
 * Collections (artefact https://claude.ai/artifact/Esz8pN474Q1FDsbHDyaB1Q), sous data/users/me/pilote/ :
 *   attentes/<id>     actions d'Hugo — Claude écrit, Hugo coche (faitParHugo / faitLe)
 *   livraisons/<id>   journal des livraisons — Claude
 *   claude/etat       état de la production et prochaines tâches — Claude
 *   demandes/<id>     ce qu'Hugo demande à Claude — Hugo écrit, Claude répond (statut / reponse / livraison)
 *   questions/<id>    décisions que Claude demande à Hugo — Claude écrit, Hugo répond (choix / commentaire)
 *   frictions/<id>    journal de terrain — Hugo
 * Le document principal data/users/me/pilote (étapes) est réécrit en entier par la page : ne jamais y
 * ajouter de champ ; on n'y met à jour que etapes.<id>.s / .n / .t, focus.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SORTIE = path.join(RACINE, 'audit-ui/pilote');
const COLL = 'data/users/me/pilote';
const git = (...a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim();
const [commande, ...reste] = process.argv.slice(2);
const options = {};
for (let i = 0; i < reste.length; i++) {
  if (!reste[i].startsWith('--')) continue;
  const cle = reste[i].slice(2);
  const val = reste[i + 1] && !reste[i + 1].startsWith('--') ? reste[++i] : 'oui';
  (options[cle] ||= []).push(val);
}
const opt = (k) => (options[k] || [])[0];
const ecrire = (fichier, donnees) => { fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(fichier, JSON.stringify(donnees, null, 1)); return fichier; };
const sansMarkdown = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\s+/g, ' ').trim();
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// --existants « attentes/x:1,claude/etat:3 » → { 'attentes/x': 1, 'claude/etat': 3 } ; « x:1 » seul vaut attentes/x.
function lireExistants() {
  return Object.fromEntries((opt('existants') || '').split(',').filter(Boolean).map((x) => {
    const i = x.lastIndexOf(':');
    const cle = x.slice(0, i).trim();
    return [cle.includes('/') ? cle : `attentes/${cle}`, Number(x.slice(i + 1))];
  }));
}

function ecrituresAttentes(existantsTous) {
  const md = fs.readFileSync(path.join(RACINE, 'docs/etat-production.md'), 'utf8');
  const section = md.split(/^## /m).find((s) => s.startsWith('En attente'));
  if (!section) throw new Error('Section « En attente côté Hugo » introuvable dans docs/etat-production.md');
  const blocCode = (section.match(/```(?:bash|sql)?\n([\s\S]*?)```/) || [])[1]?.trim() || '';
  const items = [];
  for (const ligne of section.split('\n')) {
    const m = ligne.match(/^(\d+)\.\s+(.*)$/);
    if (m) { items.push({ ordre: Number(m[1]), brut: m[2] }); continue; }
    if (items.length && /^\s{2,}\S/.test(ligne) && !ligne.trim().startsWith('```')) items[items.length - 1].brut += ' ' + ligne.trim();
  }
  const sql074 = () => {
    const f = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).find((x) => x.startsWith('074_'));
    const t = f ? fs.readFileSync(path.join(RACINE, 'supabase/migrations', f), 'utf8') : '';
    return (t.match(/--\s+(INSERT INTO public\.codes_testeurs[\s\S]*?;)/) || [])[1]?.replace(/\n--\s+/g, '\n') || '';
  };
  const maintenant = new Date().toISOString();
  const docs = items.map(({ ordre, brut }) => {
    const titreBrut = (brut.match(/^\*\*(.+?)\*\*/) || [])[1] || brut.split(/ — | : /)[0];
    const titre = sansMarkdown(titreBrut);
    const detail = sansMarkdown(brut.replace(/^\*\*(.+?)\*\*\s*—?\s*/, ''));
    const migration = titre.match(/Migration (\d{3})/);
    const categorie = migration ? 'migration' : /red[ée]ploy|d[ée]ploie/i.test(brut) ? 'deploiement'
      : /Supabase|Authentication/.test(brut) ? 'reglage' : /identit|fournir/i.test(brut) ? 'information' : /d[ée]cision/i.test(brut) ? 'decision' : 'action';
    let commandeTxt = '';
    if (migration) {
      const f = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).find((x) => x.startsWith(migration[1] + '_'));
      if (f) commandeTxt = fs.readFileSync(path.join(RACINE, 'supabase/migrations', f), 'utf8').trim();
    } else if (categorie === 'deploiement') commandeTxt = blocCode;
    else if (/code testeur/i.test(titre)) commandeTxt = sql074();
    return {
      id: migration ? `migration-${migration[1]}` : slug(titre),
      donnees: { ordre, titre, detail, categorie, urgent: /URGENT/i.test(brut), commande: commandeTxt, source: 'docs/etat-production.md', majLe: maintenant },
    };
  });

  const existants = Object.fromEntries(Object.entries(existantsTous).filter(([k]) => k.startsWith('attentes/')).map(([k, v]) => [k.slice(9), v]));
  const writes = [];
  const luDansPilote = (id) => { try { return JSON.parse(fs.readFileSync(path.join(SORTIE, 'lecture/data/users/me/pilote/attentes', `${id}.json`), 'utf8')); } catch { return null; } };
  const inchangee = (d) => { const lu = luDansPilote(d.id); return lu && ['ordre', 'titre', 'detail', 'categorie', 'urgent', 'commande'].every((k) => JSON.stringify(lu[k]) === JSON.stringify(d.donnees[k])); };
  for (const d of docs) {
    if (existants[d.id] && inchangee(d)) continue;
    if (existants[d.id]) {
      // Pas de faitParHugo ici : ne jamais écraser ce qu'Hugo a coché.
      writes.push({ op: 'update', collection: `${COLL}/attentes`, doc_id: d.id, if_version: existants[d.id], file_path: ecrire(path.join(SORTIE, 'attentes', `${d.id}.json`), d.donnees) });
    } else {
      writes.push({ op: 'set', collection: `${COLL}/attentes`, doc_id: d.id, file_path: ecrire(path.join(SORTIE, 'attentes', `${d.id}.json`), { ...d.donnees, faitParHugo: false, statutClaude: 'a-faire' }) });
    }
  }
  // Une attente qui a quitté docs/etat-production.md a été constatée faite par Claude.
  for (const [id, version] of Object.entries(existants)) {
    if (docs.some((d) => d.id === id)) continue;
    writes.push({ op: 'update', collection: `${COLL}/attentes`, doc_id: id, if_version: version, data: { statutClaude: 'verifie', verifieLe: maintenant } });
  }
  return { docs, writes };
}

function attentes() {
  const { docs, writes } = ecrituresAttentes(lireExistants());
  ecrire(path.join(SORTIE, 'ecritures-attentes.json'), { writes });
  console.log(`${docs.length} attente(s) dans docs/etat-production.md :`);
  docs.forEach((d) => console.log(`  ${d.donnees.ordre}. ${d.id}${d.donnees.urgent ? ' [urgent]' : ''} — ${d.donnees.titre}${d.donnees.commande ? ` (commande : ${d.donnees.commande.split('\n').length} ligne(s))` : ''}`));
  console.log(`\n${writes.length} écriture(s) → audit-ui/pilote/ecritures-attentes.json.`);
}

function etat() {
  const sha = git('rev-parse', 'origin/main');
  const court = sha.slice(0, 7);
  const [date, sujet] = git('log', '-1', '--format=%cI%x09%s', sha).split('\t');
  let verdict = 'inconnu';
  try {
    const statut = JSON.parse(execFileSync('gh', ['api', `repos/seguinhugo06-lgtm/chantierpro/commits/${sha}/status`], { encoding: 'utf8' }));
    const runs = JSON.parse(execFileSync('gh', ['run', 'list', '--repo', 'seguinhugo06-lgtm/chantierpro', '--commit', sha, '--workflow', 'verifications.yml', '--json', 'status,conclusion'], { encoding: 'utf8' }));
    const vercelOk = statut.statuses.length >= 2 && statut.state === 'success';
    const ciOk = runs[0]?.conclusion === 'success';
    verdict = vercelOk && ciOk ? 'vert' : statut.state === 'pending' || runs[0]?.status !== 'completed' ? 'en cours' : 'à examiner';
  } catch { /* gh indisponible : verdict inconnu */ }
  let verification = null;
  try {
    const v = JSON.parse(fs.readFileSync(path.join(RACINE, 'audit-ui/derniere-verification.json'), 'utf8'));
    verification = { niveau: v.niveau, reussi: v.reussi, date: v.date, commit: v.head?.slice(0, 7),
      detail: v.resultats.map((r) => `${r.etape}${r.detail ? ` (${r.detail})` : ''}`).join(', ') };
  } catch { /* aucune vérification sur ce poste */ }
  const feuille = fs.readFileSync(path.join(RACINE, 'docs/feuille-de-route.md'), 'utf8');
  const section = feuille.split(/^## /m).find((s) => s.startsWith('Prochaines tâches')) || '';
  // Format fixe des entrées : **titre** — contexte. Critère : … Vérification : … Taille ….
  const prochainesTaches = section.split('\n').map((l) => l.match(/^\d+\.\s+\*\*(.+?)\*\*(.*)$/)).filter(Boolean).map((m) => {
    const suite = sansMarkdown(m[2]);
    const champ = (nom, avant) => (suite.match(new RegExp(`${nom} : (.*?)\\.?(?: ${avant}|$)`)) || [])[1] || '';
    return {
      titre: sansMarkdown(m[1]),
      contexte: (suite.match(/^—\s*(.*?)\s*(?:Critère :|$)/) || [])[1]?.replace(/\.$/, '') || '',
      critere: champ('Critère', '(?:Vérification|Taille)'),
      verification: champ('Vérification', 'Taille'),
      taille: (suite.match(/Taille ([^.]+)\.?$/) || [])[1] || '',
    };
  });
  const donnees = {
    majLe: new Date().toISOString(),
    production: { commit: court, date, verdict, resume: sujet },
    verification,
    prochainesTaches,
  };
  const f = ecrire(path.join(SORTIE, 'etat.json'), donnees);
  console.log(`claude/etat : production ${court} (${verdict}), ${prochainesTaches.length} prochaine(s) tâche(s) → ${path.relative(RACINE, f)}`);
  if (verdict !== 'vert') console.log(`⚠ Verdict « ${verdict} » : le Pilote l'affichera tel quel. Attendre npm run statut si une livraison est en cours.`);
  return f;
}

function sync() {
  const existants = lireExistants();
  const { docs, writes } = ecrituresAttentes(existants);
  const fEtat = etat();
  const vEtat = existants['claude/etat'];
  writes.push({ op: 'set', collection: `${COLL}/claude`, doc_id: 'etat', file_path: fEtat, ...(vEtat ? { if_version: vEtat } : {}) });
  const dossierLiv = path.join(SORTIE, 'livraisons');
  const livraisons = fs.existsSync(dossierLiv) ? fs.readdirSync(dossierLiv).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  const nouvelles = livraisons.filter((id) => !existants[`livraisons/${id}`]);
  for (const id of nouvelles) writes.push({ op: 'set', collection: `${COLL}/livraisons`, doc_id: id, file_path: path.join(dossierLiv, `${id}.json`) });
  ecrire(path.join(SORTIE, 'ecritures.json'), { writes });
  if (!existants['claude/etat']) console.log('⚠ claude/etat sans version : si le document existe déjà, le batch sera refusé — lire sa version (« get ») et la passer dans --existants.');
  console.log(`\n${writes.length} écriture(s) → audit-ui/pilote/ecritures.json : ${writes.filter((w) => w.collection.endsWith('/attentes')).length} attente(s) à écrire sur ${docs.length}, état, ${nouvelles.length} livraison(s) (${nouvelles.join(', ') || 'aucune'}).`);
  console.log('Envoyer avec ArtifactData « batch » (writes = le tableau du fichier), puis relire une fois pour constater.');
}

// Résumé de ce qu'Hugo a écrit, à partir des fichiers d'une lecture ArtifactData (out_dir audit-ui/pilote/lecture).
function lire() {
  const base = path.join(SORTIE, 'lecture/data/users/me');
  const json = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const collection = (nom) => {
    const d = path.join(base, 'pilote', nom);
    return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ id: f.slice(0, -5), ...json(path.join(d, f)) })) : null;
  };
  const jour = (iso) => (iso ? String(iso).slice(0, 10) : '?');
  const l = ['# Pilote — ce qu’Hugo a écrit', ''];
  const manquantes = [];

  const demandes = collection('demandes');
  if (!demandes) manquantes.push('demandes');
  else {
    const ouvertes = demandes.filter((d) => !['faite', 'refusee', 'planifiee'].includes(d.statut)).sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)));
    l.push(`## Demandes à traiter (${ouvertes.length})`);
    ouvertes.forEach((d) => l.push(`- [${d.id}] ${d.statut || 'nouvelle'} · ${jour(d.creeLe)}${d.urgent ? ' · URGENT' : ''} — ${String(d.texte || '').replace(/\s+/g, ' ')}${d.reponse ? `\n    (réponse déjà donnée : ${d.reponse})` : ''}${d.complement ? `\n    PRÉCISION D'HUGO (${jour(d.completeLe)}) : ${d.complement}` : ''}`));
    l.push('');
  }
  const questions = collection('questions');
  if (!questions) manquantes.push('questions');
  else {
    const repondues = questions.filter((q) => q.choix && q.statut !== 'traitee');
    const enAttente = questions.filter((q) => !q.choix && q.statut !== 'traitee');
    l.push(`## Questions répondues par Hugo, à appliquer (${repondues.length})`);
    repondues.forEach((q) => l.push(`- [${q.id}] ${q.question} → choix « ${(q.options || []).find((o) => o.id === q.choix)?.libelle || q.choix} »${q.commentaire ? ` — « ${q.commentaire} »` : ''} (${jour(q.reponduLe)})`));
    l.push(`Questions encore sans réponse : ${enAttente.length}${enAttente.length ? ` (${enAttente.map((q) => q.id).join(', ')})` : ''}`, '');
  }
  const att = collection('attentes');
  if (!att) manquantes.push('attentes');
  else {
    const faites = att.filter((a) => a.faitParHugo && a.statutClaude !== 'verifie');
    l.push(`## Actions qu’Hugo dit avoir faites, à constater (${faites.length})`);
    faites.forEach((a) => l.push(`- [${a.id}] ${a.titre} (coché le ${jour(a.faitLe)}) → contrôler l’effet, puis retirer de « En attente » dans docs/etat-production.md`));
    l.push(`Encore à faire par Hugo : ${att.filter((a) => !a.faitParHugo && a.statutClaude !== 'verifie').map((a) => a.id).join(', ') || 'rien'}`, '');
  }
  const frictions = collection('frictions');
  if (!frictions) manquantes.push('frictions');
  else {
    const ouvertes = frictions.filter((f) => !f.ok);
    const ordre = { bloquant: 0, genant: 1, detail: 2 };
    l.push(`## Journal de terrain : ${ouvertes.length} irritant(s) ouvert(s)`);
    ouvertes.sort((a, b) => (ordre[a.grav] ?? 3) - (ordre[b.grav] ?? 3)).slice(0, 15).forEach((f) => l.push(`- [${f.grav}] ${f.zone} — ${String(f.txt || '').replace(/\s+/g, ' ')} (${jour(f.date)})`));
    l.push('');
  }
  const principal = json(path.join(base, 'pilote.json'));
  if (!principal) manquantes.push('document principal pilote');
  else {
    const etapes = principal.etapes || {};
    l.push(`## Étapes : focus = ${(principal.focus || []).join(', ') || 'aucun'}`);
    l.push(`En cours : ${Object.entries(etapes).filter(([, v]) => v.s === 'doing').map(([k]) => k).join(', ') || 'aucune'}`);
    l.push(`En attente : ${Object.entries(etapes).filter(([, v]) => v.s === 'wait').map(([k]) => k).join(', ') || 'aucune'}`);
  }
  if (manquantes.length) l.push('', `⚠ Non lu (lancer ArtifactData « list » avec out_dir audit-ui/pilote/lecture) : ${manquantes.join(', ')}. Une collection vide n'a pas de dossier : c'est normal si elle n'a jamais servi.`);
  console.log(l.join('\n'));
}

function vider() {
  fs.rmSync(path.join(SORTIE, 'lecture'), { recursive: true, force: true });
  console.log('audit-ui/pilote/lecture vidé.');
}

function livraison() {
  const de = opt('de');
  const a = opt('a') || 'origin/main';
  if (!de || !opt('titre')) throw new Error('Usage : livraison --de <sha> [--a <sha>] --titre "…" [--pour "…"] [--preuve "…"] [--afaire "…"]');
  const sha = git('rev-parse', '--short', a);
  const commits = git('log', '--format=%h%x09%s', `${de}..${a}`).split('\n').filter(Boolean).map((l) => { const [s, msg] = l.split('\t'); return { sha: s, msg }; });
  // --date : pour consigner une livraison passée (par défaut : la date du dernier commit livré).
  const maintenant = new Date(opt('date') || git('log', '-1', '--format=%cI', a));
  const id = `${maintenant.toISOString().slice(0, 16).replace(/[-:T]/g, '')}-${sha}`;
  const donnees = {
    date: maintenant.toISOString(), titre: opt('titre'), commit: sha, commits,
    pourVous: options.pour || [], preuves: options.preuve || [], aFaire: options.afaire || [], demandes: options.demande || [], statut: 'en-production',
  };
  const f = ecrire(path.join(SORTIE, 'livraisons', `${id}.json`), donnees);
  console.log(`Livraison ${id} : ${commits.length} commit(s) → ${path.relative(RACINE, f)} (envoyée au prochain « sync »).`);
}

const COMMANDES = { vider, lire, sync, livraison, attentes, etat };
if (!COMMANDES[commande]) { console.error(`Usage : node scripts/pilote/preparer.mjs ${Object.keys(COMMANDES).join('|')} …  (voir docs/pilote.md)`); process.exit(1); }
try { COMMANDES[commande](); } catch (e) { console.error('ÉCHEC :', e.message); process.exit(1); }
