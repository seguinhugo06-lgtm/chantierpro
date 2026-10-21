#!/usr/bin/env node
/**
 * Génère l'onglet « Réseaux sociaux » du Pilote à partir du dossier de travail des réseaux
 * (par défaut ~/Documents/Mallettico/Réseaux sociaux ; autre dossier : premier argument ou RESEAUX_SOURCE).
 *
 *   node scripts/pilote/reseaux.mjs
 *
 * Écrit :
 *   scripts/pilote/page/reseaux-donnees.js     constantes de la page (RESEAUX) : publications, légendes, montages,
 *                                              points à valider, guide Meta Business Suite, plan du mois
 *   audit-ui/pilote/reseaux/miniatures/…jpg    copies réduites (540 px, JPEG ~80 %, via sips de macOS)
 *   audit-ui/pilote/reseaux/planche.html       la planche du mois, devenue une page complète
 *   audit-ui/pilote/reseaux/img/…              ses images
 *   audit-ui/pilote/reseaux/fichiers.json      {chemin publié: chemin local} de tout ce qui se publie à côté de la page
 *
 * Puis `npm run pilote:page` assemble la page (qui référence reseaux/miniatures/… et reseaux/planche.html).
 * À relancer chaque fois que le dossier des réseaux change (légende corrigée, publication ajoutée, nouveau mois).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.resolve(process.argv[2] || process.env.RESEAUX_SOURCE || path.join(os.homedir(), 'Documents/Mallettico/Réseaux sociaux'));
const KIT = path.join(SRC, 'a-publier-10-jours');
const SORTIE = path.join(RACINE, 'audit-ui/pilote/reseaux');
const DONNEES = path.join(RACINE, 'scripts/pilote/page/reseaux-donnees.js');
const LARGEUR = 540;

const lire = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const erreurs = [];
const faute = (m) => erreurs.push(m);

/* ───────── Markdown minimal (celui du guide et d'A-VALIDER) ───────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  const codes = [];
  let t = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  t = esc(t);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[\s(«])\*([^*\s][^*]*?)\*(?=[\s).,;:»]|$)/g, '$1<i>$2</i>');
  t = t.replace(/(à vérifier)/gi, '<mark class="rz-verif">$1</mark>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}
const texteBrut = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/(^|\s)\*(\S[^*]*)\*/g, '$1$2');
const indent = (l) => l.length - l.trimStart().length;
const vide = (l) => !l.trim();
const RE_LISTE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const RE_FENCE = /^\s*```/;
let compteurCode = 0;

function cellules(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()); }

function blocs(lignes) {
  const out = [];
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (vide(l)) { i++; continue; }
    // bloc de code
    let m = l.match(/^(\s*)```(\w*)\s*$/);
    if (m) {
      const ind = m[1].length, code = [];
      i++;
      while (i < lignes.length && !/^\s*```\s*$/.test(lignes[i])) { code.push(lignes[i].slice(Math.min(ind, indent(lignes[i])))); i++; }
      i++;
      const id = `rz-c${++compteurCode}`;
      out.push(`<div class="rz-cop"><pre class="rz-pre rz-code" id="${id}">${esc(code.join('\n'))}</pre><button class="btn" data-act="rz-copier" data-cible="${id}">%%ICO%%Copier</button></div>`);
      continue;
    }
    if (/^-{3,}\s*$/.test(l)) { i++; continue; }
    m = l.match(/^(#{1,4})\s+(.*)$/);
    if (m) { out.push(`<h${m[1].length + 2} class="rz-h">${inline(m[2])}</h${m[1].length + 2}>`); i++; continue; }
    // tableau
    if (/^\s*\|/.test(l) && i + 1 < lignes.length && /^\s*\|[\s:|-]+\|\s*$/.test(lignes[i + 1])) {
      const tete = cellules(l);
      i += 2;
      const lignesT = [];
      while (i < lignes.length && /^\s*\|/.test(lignes[i])) { lignesT.push(cellules(lignes[i])); i++; }
      out.push('<table class="rz-tab"><thead><tr>' + tete.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + lignesT.map((r) => '<tr>' + r.map((c, k) => `<td data-l="${esc(texteBrut(tete[k] || ''))}">${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    // citation
    if (/^\s*>/.test(l)) {
      const q = [];
      while (i < lignes.length && /^\s*>/.test(lignes[i])) { q.push(lignes[i].replace(/^\s*>\s?/, '')); i++; }
      const corps = blocs(q).join('');
      if (/^Si le menu a changé/i.test(q.join(' ').trim())) out.push(`<div class="rz-menu">${corps}</div>`);
      else { const id = `rz-c${++compteurCode}`; out.push(`<div class="rz-cop"><div class="rz-quote" id="${id}">${corps}</div><button class="btn" data-act="rz-copier" data-cible="${id}">%%ICO%%Copier</button></div>`); }
      continue;
    }
    // liste
    m = l.match(RE_LISTE);
    if (m) {
      const base = m[1].length, ordre = /\d/.test(m[2]), debut = ordre ? parseInt(m[2], 10) : 1;
      const memeListe = (x) => { const mm = x.match(RE_LISTE); return mm && mm[1].length === base && /\d/.test(mm[2]) === ordre ? mm : null; };
      const items = [];
      while (i < lignes.length) {
        const mm = memeListe(lignes[i]);
        if (!mm) break;
        const largeur = mm[0].length - mm[3].length;
        const contenu = [mm[3]];
        i++;
        while (i < lignes.length) {
          const c = lignes[i];
          if (vide(c)) {
            let j = i; while (j < lignes.length && vide(lignes[j])) j++;
            if (j < lignes.length && indent(lignes[j]) > base) { contenu.push(''); i++; continue; }
            break;
          }
          if (indent(c) > base) { contenu.push(c.slice(Math.min(indent(c), largeur))); i++; continue; }
          break;
        }
        items.push(contenu);
        let j = i; while (j < lignes.length && vide(lignes[j])) j++;
        if (j < lignes.length && memeListe(lignes[j])) i = j;
      }
      const lis = items.map((c) => {
        const b = blocs(c);
        if (b.length && /^<p[^>]*>[\s\S]*<\/p>$/.test(b[0]) && (b[0].match(/<p[ >]/g) || []).length === 1) b[0] = b[0].replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
        return `<li>${b.join('')}</li>`;
      }).join('');
      out.push(ordre ? `<ol${debut > 1 ? ` style="counter-reset:n ${debut - 1}"` : ''}>${lis}</ol>` : `<ul>${lis}</ul>`);
      continue;
    }
    // paragraphe
    const p = [];
    while (i < lignes.length && !vide(lignes[i]) && !RE_FENCE.test(lignes[i]) && !/^(#{1,4})\s/.test(lignes[i]) && !RE_LISTE.test(lignes[i]) && !/^\s*>/.test(lignes[i]) && !/^\s*\|/.test(lignes[i]) && !/^-{3,}\s*$/.test(lignes[i])) { p.push(lignes[i].trim()); i++; }
    if (!p.length) { i++; continue; }
    const brut = p.join(' ');
    const classe = /à vérifier/i.test(brut) ? ' class="rz-boite-verif"' : /^\*\*(Règle d’or|Ce que Claude fait et ne fait pas)/.test(brut) ? ' class="rz-note"' : '';
    out.push(`<p${classe}>${inline(brut)}</p>`);
  }
  return out;
}

/** Découpe un Markdown en sections selon le niveau de titre donné, sans regarder dans les blocs de code. */
function decouper(lignes, niveau) {
  const marque = '#'.repeat(niveau) + ' ';
  const sections = [{ titre: null, lignes: [] }];
  let code = false;
  for (const l of lignes) {
    if (RE_FENCE.test(l)) code = !code;
    if (!code && l.startsWith(marque)) sections.push({ titre: l.slice(marque.length).trim(), lignes: [] });
    else sections[sections.length - 1].lignes.push(l);
  }
  return sections;
}

/* ───────── Lecture de CALENDRIER.md ───────── */
const MOIS = { janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12 };
function dateIso(texte) {
  const m = texte.match(/(\d+)\S*\s+(\p{L}+)/u);
  if (!m || !MOIS[m[2].toLowerCase()]) { faute(`date illisible : « ${texte} »`); return ''; }
  return `2026-${String(MOIS[m[2].toLowerCase()]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
}
function lireCalendrier() {
  const lignes = lire(path.join(KIT, 'CALENDRIER.md')).split('\n');
  const lignesPub = [];
  for (const l of lignes) {
    if (!/^\|/.test(l) || /^\|[\s:|-]+\|$/.test(l.trim())) continue;
    const c = cellules(l);
    const dossier = c.map((x) => (x.match(/^`([^`]+)`$/) || [])[1]).find(Boolean);
    if (!dossier) continue;
    const huit = c.length >= 8; // tableau des 10 jours : Jour, Date, Heure, Réseaux, Format, Dossier, Avant, Statut
    const dec = huit ? 1 : 0;
    lignesPub.push({ dossier, date: c[dec], heure: c[dec + 1], reseaux: c[dec + 2], format: c[dec + 3], avant: c[dec + 5] });
  }
  return lignesPub;
}

/* ───────── Montage d'un Reel ───────── */
function lireMontage(texte) {
  const lignes = texte.split('\n');
  const titres = ['MUSIQUE (STYLE)', 'SOUS-TITRES', 'PLANS', 'TITRE YOUTUBE SHORTS', 'RAPPELS DE TOURNAGE'];
  const parties = {}; let courant = 'entete';
  parties[courant] = [];
  for (const l of lignes) {
    const t = l.trim();
    if (titres.includes(t)) { courant = t; parties[courant] = []; continue; }
    parties[courant].push(l);
  }
  const champ = (cle) => { const l = (parties.entete || []).find((x) => x.startsWith(cle + ' :')); return l ? l.slice(cle.length + 2).trim() : ''; };
  const titre = ((lignes[0] || '').split('·')[1] || '').trim();
  const plans = [];
  let p = null;
  for (const l of parties.PLANS || []) {
    const mp = l.match(/^Plan (\d+) · (.+)$/);
    if (mp) { p = { n: Number(mp[1]), temps: mp[2].trim(), champs: [] }; plans.push(p); continue; }
    const mc = l.match(/^\s{2,}([^:]+?) : (.*)$/);
    if (mc && p) p.champs.push([mc[1], mc[2]]);
  }
  const paragraphe = (cle) => (parties[cle] || []).join('\n').trim();
  return {
    titre, duree: champ('Durée'), format: champ('Format'),
    musique: paragraphe('MUSIQUE (STYLE)'), soustitres: paragraphe('SOUS-TITRES'),
    plans, titreShorts: paragraphe('TITRE YOUTUBE SHORTS'),
    rappels: (parties['RAPPELS DE TOURNAGE'] || []).map((x) => x.replace(/^-\s*/, '').trim()).filter(Boolean),
  };
}

/* ───────── Publications ───────── */
const TITRES = {
  'presentation': 'Présentation de Mallettico', 'tarifs': 'Les tarifs', 'fondateur': 'Le fondateur',
  'devis-par-lots': 'Un devis par lots', 'relance-a-j7': 'La relance à J+7', 'je-m-en-sers-sur-mes-chantiers': 'Je m’en sers sur mes chantiers',
  'signature-en-ligne': 'La signature en ligne', '4-reflexes-avant-d-envoyer-un-devis': '4 réflexes avant d’envoyer un devis',
};
function motsHashtags(texte) {
  const lignes = texte.trimEnd().split('\n');
  const derniere = (lignes[lignes.length - 1] || '').trim();
  return /^(#[\p{L}\p{N}_]+\s*)+$/u.test(derniere) ? derniere : '';
}
function lirePublications() {
  const cal = lireCalendrier();
  const dossiers = fs.readdirSync(KIT).filter((d) => fs.statSync(path.join(KIT, d)).isDirectory()).sort();
  const pubs = [];
  for (const dossier of dossiers) {
    const ligne = cal.find((x) => x.dossier === dossier);
    if (!ligne) { faute(`${dossier} : absent de CALENDRIER.md`); continue; }
    const dir = path.join(KIT, dossier);
    const mE = dossier.match(/^00-epingle-(\d)_(.+)$/), mJ = dossier.match(/^(J\d\d)_(\d{4}-\d\d-\d\d)_(.+)$/);
    const id = mE ? `E${mE[1]}` : mJ ? mJ[1] : dossier;
    const slug = mE ? mE[2] : mJ ? mJ[3] : dossier;
    const date = dateIso(ligne.date);
    if (mJ && mJ[2] !== date) faute(`${dossier} : la date du dossier (${mJ[2]}) diffère de CALENDRIER.md (${date})`);
    const images = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort();
    const reel = fs.existsSync(path.join(dir, 'montage.txt'));
    const attendu = Number((ligne.format.match(/(\d+) image/) || [])[1] || (reel ? 1 : 0));
    if (images.length !== attendu) faute(`${dossier} : ${images.length} image(s) dans le dossier, ${attendu} annoncée(s) par CALENDRIER.md`);
    const ig = lire(path.join(dir, 'legende.txt')).trim();
    const fb = lire(path.join(dir, 'legende-facebook.txt')).trim();
    const montageTexte = reel ? lire(path.join(dir, 'montage.txt')).trim() : '';
    const montage = reel ? lireMontage(montageTexte) : null;
    if (montage && !montage.plans.length) faute(`${dossier} : aucun plan lu dans montage.txt`);
    const titre = mE ? `Épinglée ${mE[1]} · ${TITRES[slug] || slug}` : (reel ? `Reel · ${montage.titre}` : (TITRES[slug] || slug));
    pubs.push({
      id, dossier, titre, date, heure: ligne.heure, reseaux: ligne.reseaux.split(',').map((x) => x.trim()), format: ligne.format,
      reel, avant: /^rien\.?$/i.test(ligne.avant.trim()) ? '' : texteBrut(ligne.avant),
      images: images.map((f) => ({ fichier: f.replace(/\.png$/i, '.jpg'), original: f })),
      cheminLocal: dir, ig, fb, hashtags: motsHashtags(ig), hashtagsFb: motsHashtags(fb),
      montageTexte, montage,
    });
  }
  pubs.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return pubs;
}

/* ───────── À valider ───────── */
function lireAValider() {
  const brut = lire(path.join(KIT, 'A-VALIDER.md')).split('\n');
  const sections = decouper(brut, 2);
  const intro = (sections[0].lignes.find((l) => l.trim() && !l.startsWith('#')) || '').trim();
  const liste = [];
  sections.slice(1).forEach((s, k) => {
    const points = [];
    for (const l of s.lignes) {
      const m = l.match(/^-\s+(.*)$/);
      if (!m) continue;
      const gras = (m[1].match(/^\*\*([^*]+)\*\*/) || [])[1] || m[1].slice(0, 40);
      const slug = texteBrut(gras).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      points.push({ id: `v${k + 1}-${slug}`, html: inline(m[1]) });
    }
    liste.push({ titre: s.titre.replace(/^\d+\.\s*/, ''), points });
  });
  const ids = liste.flatMap((s) => s.points.map((p) => p.id));
  if (new Set(ids).size !== ids.length) faute('A-VALIDER.md : deux points ont le même identifiant');
  return { intro, sections: liste };
}

/* ───────── Guide ───────── */
function lireGuide() {
  const brut = lire(path.join(SRC, 'GUIDE-meta-business-et-automatisation.md')).split('\n');
  const h2 = decouper(brut, 2);
  const preambule = blocs(h2[0].lignes.filter((l) => !l.startsWith('# ')));
  const titre = (brut.find((l) => l.startsWith('# ')) || '').slice(2).trim();
  const sections = h2.slice(1).map((s, n) => {
    const h3 = decouper(s.lignes, 3);
    return {
      id: `g${n + 1}`, titre: s.titre,
      intro: blocs(h3[0].lignes).join(''),
      sous: h3.slice(1).map((t, k) => ({ id: `g${n + 1}-${k + 1}`, titre: t.titre, html: blocs(t.lignes).join('') })),
    };
  });
  // Routine hebdomadaire : tableau « Minutes | Ce que vous faites » du paragraphe 3.8.
  const i38 = brut.findIndex((l) => /^### 3\.8/.test(l));
  const routine = [];
  for (let i = i38 + 1; i38 >= 0 && i < brut.length && !/^#{1,3} /.test(brut[i]); i++) {
    if (/^\|/.test(brut[i]) && !/^\|[\s:|-]+\|$/.test(brut[i].trim())) { const c = cellules(brut[i]); if (/^\d/.test(c[0])) routine.push([c[0], inline(c[1])]); }
  }
  if (routine.length < 5) faute('guide : routine hebdomadaire (3.8) introuvable');
  return { titre, preambule: preambule.join(''), sections, routine };
}

/* ───────── Plan du mois : résumé de la planche (section « Le plan de communication ») ───────── */
const PLAN = {
  objectifs: [
    ['Installer', 'Un profil complet, 15 publications du fil (dont 3 épinglées) et 8 Reels, tenus sur 4 semaines.'],
    ['Apprendre', 'Quels contenus sont enregistrés et partagés, quelles questions reviennent, quels mots les artisans emploient.'],
    ['Parler', 'Dix vraies conversations avec des artisans dans le mois : un objectif d’activité, pas une promesse de résultat.'],
    ['Mesurer d’abord', 'Aucun objectif d’abonnés ou d’inscriptions ce mois-ci : on les fixe après quatre semaines de mesure.'],
  ],
  reseaux: [
    ['1', 'Instagram', '3 publications et 2 Reels par semaine. La vitrine : les carrousels expliquent, les Reels touchent ceux qui ne vous suivent pas encore. Pas de lien cliquable dans les légendes : le lien est en bio.'],
    ['1', 'Facebook : la Page et les groupes d’artisans', 'La Page relaie Instagram ; 15 minutes par jour dans 3 groupes. On répond d’abord, on ne colle jamais de publicité, on dit « je suis le créateur » quand on cite Mallettico.'],
    ['2', 'LinkedIn : le profil d’Hugo', '1 publication par semaine, recyclée. Utile pour les experts-comptables, fédérations et fournisseurs qui recommandent des outils. Lien en premier commentaire.'],
    ['3', 'TikTok et YouTube Shorts', 'Les mêmes vidéos que les Reels, sans travail en plus. À garder si ces deux réseaux apportent des vues d’artisans au bout de 4 semaines, sinon on arrête.'],
  ],
  piliers: [
    ['Montrer l’appli en action', '4 publications sur 12 et 4 Reels. Toujours avec des données fictives, signalées.'],
    ['Astuces administratives du bâtiment', '2 publications et 2 Reels. Des repères d’artisan, pas de la théorie : un repère n’est pas une règle de droit.'],
    ['Coulisses du fondateur', '2 publications et 1 Reel, plus la présentation épinglée. À valider par Hugo, aucun fait inventé sur sa vie.'],
    ['Réglementation, simplement', '2 publications. Courtes, sourcées, relues juridiquement avant publication, jamais « conforme ».'],
    ['Communauté', '2 publications et 1 Reel. Aucun témoignage sans accord écrit de la personne.'],
  ],
  frequence: [
    ['Lundi', 'Publication', '12 h 15', 'Carrousel ou visuel : le gros contenu de la semaine.'],
    ['Mardi', 'Reel', '19 h 30', 'Tourné au fil des chantiers de la semaine précédente.'],
    ['Mercredi', 'Publication', '19 h 30', 'Astuce, réglementation ou communauté.'],
    ['Jeudi', 'Reel', '12 h 15', 'Second Reel, souvent plus court.'],
    ['Vendredi', 'Publication', '12 h 15', 'Coulisses ou question à la communauté.'],
  ],
  chaqueJour: 'Chaque jour : 10 minutes pour répondre aux commentaires et aux messages, et passer dans les groupes. Les heures sont des hypothèses : Meta affiche les meilleurs horaires du compte après quelques semaines.',
  questions: [
    'Chaque phrase sur Mallettico a-t-elle sa source (FAQ du site, fonctions, plans) ?',
    'Les captures sont-elles marquées comme données fictives ?',
    'Un prix est-il écrit ? Alors la mention « TVA non applicable, art. 293 B du CGI » l’accompagne.',
    'Un point de droit est-il avancé ? Alors il est relu, limité à ce qui est sourcé, et renvoie vers l’organisme ou le comptable.',
    'Une personne ou un client est-il identifiable ? Alors il y a un accord, sinon on floute.',
    'Le texte à la première personne est-il vrai, écrit ou validé par Hugo ?',
  ],
};

/* ───────── Fichiers à publier ───────── */
function miniatures(pubs) {
  const fichiers = {};
  for (const p of pubs) {
    const dest = path.join(SORTIE, 'miniatures', p.dossier);
    fs.mkdirSync(dest, { recursive: true });
    for (const im of p.images) {
      const src = path.join(p.cheminLocal, im.original), out = path.join(dest, im.fichier);
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '--resampleWidth', String(LARGEUR), src, '--out', out], { stdio: 'ignore' });
      const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', out]).toString();
      im.largeur = Number((info.match(/pixelWidth: (\d+)/) || [])[1]);
      im.hauteur = Number((info.match(/pixelHeight: (\d+)/) || [])[1]);
      fichiers[`reseaux/miniatures/${p.dossier}/${im.fichier}`] = out;
    }
  }
  return fichiers;
}
function planche() {
  const fichiers = {};
  const brut = lire(path.join(SRC, 'planche-reseaux.html'));
  const finStyle = brut.indexOf('</style>');
  if (finStyle < 0) throw new Error('planche-reseaux.html : pas de </style>');
  const cut = finStyle + '</style>'.length;
  const page = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + brut.slice(0, cut) + '</head><body>' + brut.slice(cut) + '</body></html>';
  fs.mkdirSync(SORTIE, { recursive: true });
  const dest = path.join(SORTIE, 'planche.html');
  fs.writeFileSync(dest, page);
  fichiers['reseaux/planche.html'] = dest;
  const imgSrc = path.join(SRC, 'img'), imgDest = path.join(SORTIE, 'img');
  fs.rmSync(imgDest, { recursive: true, force: true });
  fs.mkdirSync(imgDest, { recursive: true });
  for (const f of fs.readdirSync(imgSrc).sort()) {
    if (!fs.statSync(path.join(imgSrc, f)).isFile()) continue;
    fs.copyFileSync(path.join(imgSrc, f), path.join(imgDest, f));
    fichiers[`reseaux/img/${f}`] = path.join(imgDest, f);
  }
  const manquantes = [...brut.matchAll(/img\/([\w.-]+)/g)].map((m) => m[1]).filter((f) => !fichiers[`reseaux/img/${f}`]);
  if (manquantes.length) faute(`planche : images référencées mais absentes de img/ : ${[...new Set(manquantes)].join(', ')}`);
  return fichiers;
}

/* ───────── Assemblage ───────── */
if (!fs.existsSync(KIT)) { console.error(`✗ Dossier introuvable : ${KIT}`); process.exit(1); }
fs.rmSync(path.join(SORTIE, 'miniatures'), { recursive: true, force: true });
const pubs = lirePublications();
const guide = lireGuide();
const aValider = lireAValider();
const fichiers = { ...miniatures(pubs), ...planche() };

const RESEAUX = {
  genereLe: new Date().toISOString().slice(0, 10),
  source: 'Documents/Mallettico/Réseaux sociaux',
  periode: pubs.length ? `${pubs[0].date} → ${pubs[pubs.length - 1].date}` : '',
  planche: 'reseaux/planche.html',
  publications: pubs.map((p) => ({ ...p, images: p.images.map(({ fichier, largeur, hauteur }) => ({ fichier, largeur, hauteur })) })),
  aValider, guide, plan: { ...PLAN, routine: guide.routine },
};
if (RESEAUX.publications.length !== 11) faute(`11 publications attendues, ${RESEAUX.publications.length} lues`);
if (erreurs.length) { console.error('✗ Génération interrompue :\n  ' + erreurs.join('\n  ')); process.exit(1); }

const json = JSON.stringify(RESEAUX, null, 1).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
fs.writeFileSync(DONNEES, '/* GÉNÉRÉ par scripts/pilote/reseaux.mjs depuis le dossier des réseaux : ne pas modifier à la main.\n   Onglet « Réseaux sociaux » du Pilote : publications, légendes, montages, points à valider, guide Meta, plan du mois. */\n\nconst RESEAUX = ' + json + ';\n');

const ordre = Object.keys(fichiers).sort();
fs.writeFileSync(path.join(SORTIE, 'fichiers.json'), JSON.stringify(Object.fromEntries(ordre.map((k) => [k, fichiers[k]])), null, 2) + '\n');
const poids = ordre.reduce((s, k) => s + fs.statSync(fichiers[k]).size, 0);
console.log(`✓ ${DONNEES.replace(RACINE + '/', '')} — ${(fs.statSync(DONNEES).size / 1024).toFixed(0)} Ko, ${pubs.length} publications, ${pubs.reduce((s, p) => s + p.images.length, 0)} images, ${guide.sections.length} sections de guide, ${aValider.sections.reduce((s, x) => s + x.points.length, 0)} points à valider`);
console.log(`✓ ${ordre.length} fichiers à publier à côté de la page, ${(poids / 1024 / 1024).toFixed(2)} Mo (limite 8 Mo) → ${path.join(SORTIE, 'fichiers.json').replace(RACINE + '/', '')}`);
if (poids > 8 * 1024 * 1024) { console.error('✗ Plus de 8 Mo à publier.'); process.exit(1); }
