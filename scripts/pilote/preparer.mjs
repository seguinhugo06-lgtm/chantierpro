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
  const blocsCode = [...section.matchAll(/```(?:bash|sql)?\n([\s\S]*?)```/g)].map((x) => x[1].trim());
  const blocsControle = [...section.matchAll(/```js controle\n([\s\S]*?)```/g)].map((x) => x[1].trim());
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
    // controle : ce qu'Hugo exécute ou regarde APRÈS l'action, et dont il colle le résultat (« preuve ») dans le Pilote.
    // Claude ne marque une attente « vérifiée » qu'au vu de cette preuve : un « c'est fait » seul ne prouve rien.
    let controle = '';
    if (migration) {
      const f = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).find((x) => x.startsWith(migration[1] + '_'));
      if (f) {
        commandeTxt = fs.readFileSync(path.join(RACINE, 'supabase/migrations', f), 'utf8').trim();
        controle = verificationMigration(commandeTxt);
      }
    } else if (categorie === 'deploiement') {
      // Les commandes des fonctions nommées dans l'attente (`nom`), pas tout le bloc : sinon chaque
      // redéploiement affiche ceux des autres. Un bloc « ```js controle » qui nomme la fonction
      // s'ajoute au contrôle (constat du comportement, en plus de la date de déploiement).
      const fonctions = [...brut.matchAll(/`([a-z][a-z0-9-]+)`/g)].map((x) => x[1]);
      const deploiements = blocsCode.flatMap((b) => b.split('\n'))
        .filter((l) => fonctions.some((f) => new RegExp(`functions deploy ${f}(\\s|$)`).test(l)));
      commandeTxt = deploiements.length ? deploiements.join('\n') : blocCode;
      controle = 'npx supabase functions list --project-ref kofsbgxkrmryfetevetn\n-- collez les lignes des fonctions redéployées (colonne UPDATED_AT = aujourd’hui)';
      const constat = blocsControle.find((b) => fonctions.some((f) => b.includes(f)));
      if (constat) controle += `\n\n// Puis, connecté sur mallettico.fr : console du navigateur (F12 › Console), coller ce qui suit, Entrée.\n${constat}`;
    } else if (/code testeur/i.test(titre)) {
      commandeTxt = sql074();
      controle = 'SELECT plan, duree_mois, utilisations_max, utilisations, expire_le FROM public.codes_testeurs;  -- une ligne par code (ne collez pas le code lui-même)';
    } else if (categorie === 'reglage') controle = 'Collez la valeur affichée de « Site URL » et la liste « Redirect URLs ».';
    else if (categorie === 'information') controle = 'Écrivez ici l’information demandée (elle sera publiée : rien de secret).';
    return {
      id: migration ? `migration-${migration[1]}` : slug(titre),
      donnees: { ordre, titre, detail, categorie, urgent: /URGENT/i.test(brut), commande: commandeTxt, controle, source: 'docs/etat-production.md', majLe: maintenant },
    };
  });

  const existants = Object.fromEntries(Object.entries(existantsTous).filter(([k]) => k.startsWith('attentes/')).map(([k, v]) => [k.slice(9), v]));
  const writes = [];
  const luDansPilote = (id) => { try { return JSON.parse(fs.readFileSync(path.join(SORTIE, 'lecture/data/users/me/pilote/attentes', `${id}.json`), 'utf8')); } catch { return null; } };
  const inchangee = (d) => { const lu = luDansPilote(d.id); return lu && ['ordre', 'titre', 'detail', 'categorie', 'urgent', 'commande', 'controle'].every((k) => JSON.stringify(lu[k] ?? '') === JSON.stringify(d.donnees[k] ?? '')); };
  for (const d of docs) {
    const lu = luDansPilote(d.id);
    const sansDate = lu && !lu.creeLe; // attentes créées avant que la page n'affiche leur âge
    if (existants[d.id] && inchangee(d) && !sansDate) continue;
    if (existants[d.id]) {
      // Ni faitParHugo ni preuve ici : ne jamais écraser ce qu'Hugo a écrit. creeLe reste celui de la création.
      const donnees = sansDate ? { ...d.donnees, creeLe: lu.majLe || maintenant } : d.donnees;
      writes.push({ op: 'update', collection: `${COLL}/attentes`, doc_id: d.id, if_version: existants[d.id], file_path: ecrire(path.join(SORTIE, 'attentes', `${d.id}.json`), donnees) });
    } else {
      writes.push({ op: 'set', collection: `${COLL}/attentes`, doc_id: d.id, file_path: ecrire(path.join(SORTIE, 'attentes', `${d.id}.json`), { ...d.donnees, faitParHugo: false, preuve: '', statutClaude: 'a-faire', creeLe: maintenant }) });
    }
  }
  // Une attente qui a quitté docs/etat-production.md a été constatée faite par Claude.
  for (const [id, version] of Object.entries(existants)) {
    if (docs.some((d) => d.id === id)) continue;
    writes.push({ op: 'update', collection: `${COLL}/attentes`, doc_id: id, if_version: version, data: { statutClaude: 'verifie', verifieLe: maintenant } });
  }
  return { docs, writes };
}

// Le bloc « Vérification après application » en tête d'une migration, décommenté.
function verificationMigration(sql) {
  const lignes = sql.split('\n');
  const debut = lignes.findIndex((l) => /^--.*V[ée]rification apr[èe]s application/i.test(l));
  if (debut < 0) return '';
  const bloc = [];
  for (const l of lignes.slice(debut + 1)) {
    if (!l.startsWith('--') || /^--\s*[─=]{3,}/.test(l)) break;
    const t = l.replace(/^--\s{0,3}/, '');
    if (!t.trim() && bloc.length) break;
    if (t.trim()) bloc.push(t);
  }
  return bloc.join('\n');
}

// « Décisions attendues » de docs/decisions.md → questions posées à Hugo dans le Pilote. Format fixe :
//   ### Q-<id> · <titre>
//   Contexte : …            Option `<id>` : <libellé> — <conséquence>   (une ligne par option)
//   Recommandation : `<id>` — <pourquoi>    Irréversible : oui|non    Bloque : …    Décision : D-xx (si déjà numérotée)
function ecrituresQuestions(existantsTous) {
  const md = fs.readFileSync(path.join(RACINE, 'docs/decisions.md'), 'utf8');
  const section = md.split(/^## /m).find((s) => s.startsWith('Décisions attendues')) || '';
  const blocs = section.split(/^### /m).slice(1);
  const maintenant = new Date().toISOString();
  const champ = (b, nom) => (b.match(new RegExp(`^${nom} : (.*)$`, 'm')) || [])[1]?.trim() || '';
  const docs = blocs.map((b, i) => {
    const [tete] = b.split('\n');
    const m = tete.match(/^(Q-[a-z0-9-]+)\s*·\s*(.+)$/);
    if (!m) throw new Error(`docs/decisions.md : titre de question hors format « ### Q-<id> · <titre> » : ${tete}`);
    const options = [...b.matchAll(/^Option `([a-z0-9-]+)` : (.+?)(?: — (.+))?$/gm)].map((o) => ({ id: o[1], libelle: sansMarkdown(o[2]), consequence: sansMarkdown(o[3] || '') }));
    if (options.length < 2) throw new Error(`docs/decisions.md : ${m[1]} a moins de deux options`);
    const reco = champ(b, 'Recommandation').match(/^`([a-z0-9-]+)`\s*—?\s*(.*)$/) || [];
    return {
      id: m[1],
      donnees: {
        ordre: i + 1, question: sansMarkdown(m[2]), contexte: sansMarkdown(champ(b, 'Contexte')), options,
        recommandation: reco[1] || '', pourquoi: sansMarkdown(reco[2] || ''), irreversible: /^oui/i.test(champ(b, 'Irréversible')),
        bloque: sansMarkdown(champ(b, 'Bloque')), decision: champ(b, 'Décision'), source: 'docs/decisions.md', majLe: maintenant,
      },
    };
  });
  const existants = Object.fromEntries(Object.entries(existantsTous).filter(([k]) => k.startsWith('questions/')).map(([k, v]) => [k.slice(10), v]));
  const lu = (id) => { try { return JSON.parse(fs.readFileSync(path.join(SORTIE, 'lecture/data/users/me/pilote/questions', `${id}.json`), 'utf8')); } catch { return null; } };
  const cles = ['ordre', 'question', 'contexte', 'options', 'recommandation', 'pourquoi', 'irreversible', 'bloque', 'decision'];
  const writes = [];
  for (const d of docs) {
    const l = lu(d.id);
    if (existants[d.id] && l && cles.every((k) => JSON.stringify(l[k] ?? '') === JSON.stringify(d.donnees[k] ?? ''))) continue;
    const f = ecrire(path.join(SORTIE, 'questions', `${d.id}.json`), existants[d.id] ? d.donnees : { ...d.donnees, statut: 'ouverte', ouverteLe: maintenant });
    // Jamais choix / commentaire / reponduLe : c'est la réponse d'Hugo.
    writes.push(existants[d.id] ? { op: 'update', collection: `${COLL}/questions`, doc_id: d.id, if_version: existants[d.id], file_path: f } : { op: 'set', collection: `${COLL}/questions`, doc_id: d.id, file_path: f });
  }
  // Une question qui a quitté « Décisions attendues » est consignée : on retrouve son numéro dans le tableau (« (Q-id) »).
  for (const [id, version] of Object.entries(existants)) {
    if (docs.some((d) => d.id === id)) continue;
    const ligne = md.split('\n').find((x) => x.includes(`(${id})`) && /^\| D-\d+/.test(x));
    writes.push({ op: 'update', collection: `${COLL}/questions`, doc_id: id, if_version: version, data: { statut: 'traitee', consigneeLe: maintenant, decision: ligne ? ligne.match(/^\| (D-\d+)/)[1] : '' } });
  }
  return { docs, writes };
}

function questions() {
  const { docs, writes } = ecrituresQuestions(lireExistants());
  docs.forEach((d) => console.log(`  ${d.id} — ${d.donnees.question} (${d.donnees.options.length} options, reco ${d.donnees.recommandation || '—'})`));
  console.log(`${writes.length} écriture(s) de questions (envoyées par « sync »).`);
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
    // Titre au format « [id-stable] Titre » : l'id survit aux réordonnancements et sert de lien depuis le Pilote.
    const [, idTache = '', titre = sansMarkdown(m[1])] = sansMarkdown(m[1]).match(/^\[([a-z0-9-]+)\]\s*(.+)$/) || [];
    return {
      id: idTache,
      titre,
      contexte: (suite.match(/^—\s*(.*?)\s*(?:Critère :|$)/) || [])[1]?.replace(/\.$/, '') || '',
      critere: champ('Critère', '(?:Vérification|Taille)'),
      verification: champ('Vérification', 'Taille'),
      taille: (suite.match(/Taille ([^.]+)\.?$/) || [])[1] || '',
    };
  });
  // lectureBoite : quand Claude a lu pour la dernière fois ce qu'Hugo écrit (témoin affiché dans le Pilote).
  // --lecture le met à maintenant ; sinon on reprend la valeur lue dans le Pilote (sans quoi le set l'effacerait).
  let lectureBoite = null;
  try { lectureBoite = JSON.parse(fs.readFileSync(path.join(SORTIE, 'lecture/data/users/me/pilote/claude/etat.json'), 'utf8')).lectureBoite || null; } catch { /* jamais lu */ }
  if (opt('lecture')) lectureBoite = new Date().toISOString();
  const donnees = {
    majLe: new Date().toISOString(),
    genere: { commit: git('rev-parse', '--short', 'HEAD'), le: new Date().toISOString(), sources: ['docs/feuille-de-route.md', 'docs/etat-production.md', 'docs/decisions.md'] },
    lectureBoite,
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
  const q = ecrituresQuestions(existants);
  writes.push(...q.writes);
  const fEtat = etat();
  const vEtat = existants['claude/etat'];
  writes.push({ op: 'set', collection: `${COLL}/claude`, doc_id: 'etat', file_path: fEtat, ...(vEtat ? { if_version: vEtat } : {}) });
  const dossierLiv = path.join(SORTIE, 'livraisons');
  const livraisons = fs.existsSync(dossierLiv) ? fs.readdirSync(dossierLiv).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
  const nouvelles = livraisons.filter((id) => !existants[`livraisons/${id}`]);
  for (const id of nouvelles) writes.push({ op: 'set', collection: `${COLL}/livraisons`, doc_id: id, file_path: path.join(dossierLiv, `${id}.json`) });
  ecrire(path.join(SORTIE, 'ecritures.json'), { writes });
  if (!existants['claude/etat']) console.log('⚠ claude/etat sans version : si le document existe déjà, le batch sera refusé — lire sa version (« get ») et la passer dans --existants.');
  console.log(`\n${writes.length} écriture(s) → audit-ui/pilote/ecritures.json : ${writes.filter((w) => w.collection.endsWith('/attentes')).length} attente(s) à écrire sur ${docs.length}, ${q.writes.length} question(s) sur ${q.docs.length}, état${opt('lecture') ? ' (lecture de la boîte datée)' : ''}, ${nouvelles.length} livraison(s) (${nouvelles.join(', ') || 'aucune'}).`);
  console.log('Envoyer avec ArtifactData « batch » (writes = le tableau du fichier), puis relire une fois pour constater.');
}

// Résumé de ce qu'Hugo a écrit, à partir des fichiers d'une lecture ArtifactData (out_dir audit-ui/pilote/lecture).
function lire() {
  const base = path.join(SORTIE, opt('dossier') || 'lecture', 'data/users/me');
  const json = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const collection = (nom) => {
    const d = path.join(base, 'pilote', nom);
    return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ id: f.slice(0, -5), ...json(path.join(d, f)) })) : null;
  };
  const jour = (iso) => (iso ? String(iso).slice(0, 10) : '?');
  const l = ['# Pilote — ce qu’Hugo a écrit', ''];
  const manquantes = [];

  // Boîte : tout ce qu'Hugo note pour Claude (demande, friction de terrain, idée). Statuts : docs/pilote.md.
  const boite = collection('boite');
  if (!boite) manquantes.push('boite');
  else {
    const FINAUX = ['planifiee', 'existe', 'refusee', 'livree', 'close'];
    const relance = (b) => b.complement && String(b.completeLe) > String(b.traiteLe || '');
    const aTraiter = boite.filter((b) => !b.statut || b.statut === 'nouvelle' || (b.statut === 'question' && relance(b)) || (b.statut === 'a-constater' && b.constat === 'ko' && relance(b))).sort((a, b) => Number(!!b.bloquant) - Number(!!a.bloquant) || String(a.ecritLe).localeCompare(String(b.ecritLe)));
    const enCours = boite.filter((b) => ['acceptee', 'en-cours'].includes(b.statut));
    const aConstater = boite.filter((b) => b.statut === 'a-constater');
    l.push(`## Boîte : ${aTraiter.length} note(s) à traiter (chacune reçoit une réponse et un statut aujourd'hui)`);
    aTraiter.forEach((b) => l.push(`- [${b.id}] ${b.type || 'demande'}${b.bloquant ? ' · ÇA BLOQUE' : ''} · ${jour(b.ecritLe)} — ${String(b.texte || '').replace(/\s+/g, ' ')}${b.reponse ? `\n    (réponse précédente : ${b.reponse})` : ''}${b.complement ? `\n    ${b.constat === 'ko' ? 'ÇA NE MARCHE PAS, selon Hugo' : 'PRÉCISION D\'HUGO'} (${jour(b.completeLe)}) : ${b.complement}` : ''}`));
    if (enCours.length) l.push(`Acceptées, pas encore livrées : ${enCours.map((b) => `${b.id} (${String(b.texte || '').slice(0, 50)}…)`).join(' ; ')}`);
    const constatees = aConstater.filter((b) => b.constat === 'ok');
    if (constatees.length) l.push(`Constatées par Hugo, à passer « close » : ${constatees.map((b) => b.id).join(', ')}`);
    const enAttenteConstat = aConstater.filter((b) => !b.constat);
    if (enAttenteConstat.length) l.push(`Livrées, en attente du constat d'Hugo : ${enAttenteConstat.map((b) => b.id).join(', ')}`);
    l.push(`Closes : ${boite.filter((b) => FINAUX.includes(b.statut)).length}`, '');
  }
  const questions = collection('questions');
  if (!questions) manquantes.push('questions');
  else {
    const ouvertes = questions.filter((q) => q.statut !== 'traitee');
    const repondues = ouvertes.filter((q) => q.choix && q.choix !== 'pas-encore');
    const pasEncore = ouvertes.filter((q) => q.choix === 'pas-encore');
    const sansReponse = ouvertes.filter((q) => !q.choix);
    l.push(`## Questions répondues : ${repondues.length} — consigner dans docs/decisions.md AVANT d'agir dessus`);
    repondues.forEach((q) => l.push(`- [${q.id}] ${q.question} → « ${(q.options || []).find((o) => o.id === q.choix)?.libelle || q.choix} »${q.commentaire ? ` — « ${q.commentaire} »` : ''} (${jour(q.reponduLe)})${q.irreversible ? ' · IRRÉVERSIBLE (confirmé dans la page)' : ''}`));
    pasEncore.forEach((q) => l.push(`- [${q.id}] PAS ENCORE — il lui faut : ${q.commentaire || '(rien précisé)'} → préparer ce qui manque`));
    l.push(`Sans réponse : ${sansReponse.map((q) => `${q.id} (ouverte le ${jour(q.ouverteLe)})`).join(', ') || 'aucune'}`, '');
  }
  const att = collection('attentes');
  if (!att) manquantes.push('attentes');
  else {
    const faites = att.filter((a) => a.faitParHugo && a.statutClaude !== 'verifie');
    l.push(`## Actions cochées par Hugo : ${faites.length} — constater sur pièce (preuve conforme au contrôle), sinon redemander`);
    faites.forEach((a) => l.push(`- [${a.id}] ${a.titre} (coché le ${jour(a.faitLe)})\n    contrôle attendu : ${String(a.controle || '—').replace(/\n/g, ' | ')}\n    PREUVE COLLÉE : ${a.preuve ? String(a.preuve).replace(/\n/g, ' | ') : '(aucune — la demander)'}`));
    const restantes = att.filter((a) => !a.faitParHugo && a.statutClaude !== 'verifie');
    l.push(`Encore à faire par Hugo : ${restantes.map((a) => `${a.id}${a.creeLe ? ` (depuis ${jour(a.creeLe)})` : ''}`).join(', ') || 'rien'}`, '');
  }
  const ancien = collection('frictions');
  if (ancien && ancien.length) l.push(`⚠ ${ancien.length} entrée(s) dans l'ancien journal « frictions » : la page les reprend dans la boîte ; sinon les y recopier.`, '');
  const principal = json(path.join(base, 'pilote.json'));
  if (!principal) manquantes.push('document principal pilote');
  else {
    const etapes = principal.etapes || {};
    l.push(`## Étapes d'Hugo : ses engagements de la semaine = ${(principal.focus || []).join(', ') || 'aucun'} (c'est lui qui les choisit)`);
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

const COMMANDES = { vider, lire, sync, livraison, attentes, questions, etat };
if (!COMMANDES[commande]) { console.error(`Usage : node scripts/pilote/preparer.mjs ${Object.keys(COMMANDES).join('|')} …  (voir docs/pilote.md)`); process.exit(1); }
try { COMMANDES[commande](); } catch (e) { console.error('ÉCHEC :', e.message); process.exit(1); }
