#!/usr/bin/env node
/**
 * Fin de l'ancien code de thème et de couleurs (plan du 19 oct. 2026) : la transformation du code source.
 *
 *   transformer(source)  → { source, changements, ignores, detail, raisons, signalements, sansCorrespondance }
 *     (1) ternaires        isDark ? '<sombre>' : '<clair>' (deux chaînes simples) → '<jetonsPour(clair)>'
 *     (2) classes orange   dans les chaînes et gabarits d'un className (hors ternaires isDark) : les seules
 *                          lignes orange de la table de correspondances
 *     (3) style            style={{ background|backgroundColor: couleur|accent }} → bg-accent (+ text-sur-accent à la
 *                          place d'un text-white) ; style={{ color: couleur|accent }} → text-accent-texte, ajoutés au
 *                          className du même élément ; la propriété (ou l'attribut devenu vide) est retirée
 *   Jamais dans une chaîne ou un gabarit dont le texte fixe contient « < » (HTML d'un document imprimé ou d'un
 *   e-mail), même règle que le compteur (fichiers.mjs). Dans le doute, le code reste intact et le cas est compté
 *   dans `ignores` (avec sa raison) ; `signalements` liste, ligne du texte final à l'appui, ce qu'il faut regarder
 *   à la main (aplat sans couleur de texte, texte foncé laissé sur un aplat, className dynamique).
 *
 *   node scripts/migration/transformer.mjs [--appliquer] [--signalements] [--sauf=chemin…] [chemin…]
 *     à blanc par défaut (rien n'est écrit) sur les fichiers concernés (fichiersConcernes : atteignables depuis
 *     src/main.jsx, hors exceptions), ou sur ceux qui commencent par l'un des chemins donnés, moins ceux qui
 *     commencent par un chemin --sauf= ; --appliquer écrit ; --signalements liste les cas à regarder à la main.
 *
 * Les expressions sont localisées par @babel/parser (et @babel/traverse) et remplacées par positions dans le texte
 * d'origine, de la dernière à la première : ni mise en forme ni commentaires ne bougent. Trois passes successives
 * (ternaires, classes orange, style), chacune sur le texte produit par la précédente.
 * @babel/parser et @babel/traverse viennent de node_modules (dépendances de Vite), sans entrée dans package.json :
 * outil à usage unique (décision du plan) ; s'il ne se lance plus après un changement de dépendances, les ajouter
 * en devDependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import babelParser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import {
  analyserBrancheClaire, analyserClasse, estChaineDeClasses, remplacerOranges, estCouleurDeTexte, estCouleurDeFond,
  traductionOrange,
} from './correspondances.mjs';
import { fichiersConcernes, fichiersAtteignables, compterAncienCode, MOTIFS, EXCEPTIONS } from './fichiers.mjs';

const traverse = babelTraverse.default ?? babelTraverse;
const { parse } = babelParser;

const analyser = (source) => parse(source, { sourceType: 'module', plugins: ['jsx'] });

/* ------------------------------------------------------------------------------------------------
 * Outils communs
 * ---------------------------------------------------------------------------------------------- */

/** Applique des éditions { debut, fin, texte } (sans chevauchement) ; rend le texte et la fonction qui recale une position. */
function appliquer(source, editions) {
  const triees = [...editions].sort((a, b) => a.debut - b.debut || a.fin - b.fin);
  for (let k = 1; k < triees.length; k++) {
    if (triees[k].debut < triees[k - 1].fin) {
      throw new Error(`éditions qui se chevauchent aux positions ${triees[k - 1].debut} et ${triees[k].debut}`);
    }
  }
  let texte = source;
  for (let k = triees.length - 1; k >= 0; k--) {
    const e = triees[k];
    texte = texte.slice(0, e.debut) + e.texte + texte.slice(e.fin);
  }
  const recaler = (position) => {
    let decalage = 0;
    for (const e of triees) {
      if (e.fin <= position && !(e.debut === e.fin && e.debut === position)) decalage += e.texte.length - (e.fin - e.debut);
      else if (e.debut < position) return e.debut + decalage; // position dans un passage remplacé : son début
    }
    return position + decalage;
  };
  return { texte, recaler };
}

/** Texte fixe d'un gabarit qui contient « < » : du HTML de document, jamais touché (même règle que fichiers.mjs). */
const gabaritHtml = (noeud) => noeud.type === 'TemplateLiteral' && noeud.quasis.some((q) => q.value.raw.includes('<'));

/** Le chemin est-il dans un gabarit HTML ? */
const dansDuHtml = (p) => Boolean(p.findParent((a) => gabaritHtml(a.node)));

const nomAttribut = (attribut) => (attribut.name.type === 'JSXIdentifier' ? attribut.name.name : null);

/** Les classes d'un texte avec leurs positions dans ce texte. */
function decouper(texte) {
  return [...texte.matchAll(/\S+/g)].map((m) => ({ texte: m[0], debut: m.index, fin: m.index + m[0].length }));
}

/**
 * Les classes d'une chaîne (StringLiteral, y compris valeur d'attribut JSX) ou d'un gabarit, positions absolues :
 * { segments: [{ debut, fin, colleDebut, colleFin }] (texte brut entre guillemets, ou chaque partie fixe du gabarit,
 * collée ou non à une expression ${…}), classes: [{ texte, debut, fin, segment }] }.
 * Dans un gabarit, une classe collée à une expression n'est pas complète (text-orange-${x}) : écartée des classes.
 * Rend null pour une chaîne à barre oblique inverse (texte brut et valeur diffèrent).
 */
function classesDe(source, noeud) {
  const parties = noeud.type === 'StringLiteral'
    ? [{ debut: noeud.start + 1, fin: noeud.end - 1 }]
    : noeud.quasis.map((q) => ({ debut: q.start, fin: q.end }));
  if (noeud.type === 'StringLiteral' && source.slice(parties[0].debut, parties[0].fin).includes('\\')) return null;
  const segments = parties.map((s, k) => ({ ...s, colleDebut: k > 0, colleFin: k < parties.length - 1 }));
  const classes = [];
  segments.forEach((s, k) => {
    const brut = source.slice(s.debut, s.fin);
    for (const c of decouper(brut)) {
      if ((s.colleDebut && c.debut === 0) || (s.colleFin && c.fin === brut.length)) continue;
      classes.push({ texte: c.texte, debut: c.debut + s.debut, fin: c.fin + s.debut, segment: k });
    }
  });
  return { segments, classes };
}

/**
 * Le texte d'un segment réécrit : les classes retirées (par position absolue) disparaissent avec leur séparateur,
 * les ajouts viennent après les classes gardées ; les espaces de tête et de fin, et ceux qui séparent le segment
 * d'une expression ${…}, sont gardés.
 */
function reecrireSegment(source, segment, retirees, ajouts) {
  const texte = source.slice(segment.debut, segment.fin);
  const jetons = decouper(texte);
  const gardes = jetons.filter((j) => !retirees.has(segment.debut + j.debut));
  const tete = jetons.length ? texte.slice(0, jetons[0].debut) : texte;
  const queue = jetons.length ? texte.slice(jetons[jetons.length - 1].fin) : '';
  const espaceAvant = (j) => texte.slice(0, j.debut).match(/\s*$/)[0];
  const corps = gardes.map((j, i) => (i === 0 ? '' : espaceAvant(j)) + j.texte).join('');
  const ajout = ajouts.join(' ');
  if (gardes.length) return tete + corps + (ajout ? ` ${ajout}` : '') + queue;
  if (ajout) return (segment.colleDebut ? ' ' : '') + ajout;
  if (segment.colleDebut && segment.colleFin) return /\s/.test(tete + queue) ? ' ' : '';
  return '';
}

/** L'élément JSX a-t-il un contenu (texte, expression, élément) ? */
function aDuContenu(element) {
  if (!element || element.type !== 'JSXElement' || element.openingElement.selfClosing) return false;
  return element.children.some((enfant) => {
    if (enfant.type === 'JSXText') return enfant.value.trim() !== '';
    if (enfant.type === 'JSXExpressionContainer') return enfant.expression.type !== 'JSXEmptyExpression';
    return true;
  });
}

/* ------------------------------------------------------------------------------------------------
 * Le fond sous un élément : un jeton de texte, de trait ou d'anneau (text-accent-texte, border-accent/30,
 * ring-accent) n'est lisible que sur un fond qui suit le thème. Sur un fond de couleur fixe (l'écran de connexion
 * en bg-slate-900, un îlot bg-white codé en dur), il serait illisible dans l'un des deux modes : on n'y touche pas.
 * Un aplat (bg-accent + texte blanc) et une teinte (bg-accent/10) se lisent partout : ils passent toujours.
 * ---------------------------------------------------------------------------------------------- */

/** Un nom qui désigne un fond du thème (cardBg, tc.card, inputBg, modalBg…). */
const NOM_DE_FOND = /bg|fond|card|carte|surface|modal|panel|theme/i;

/** Nature d'une classe de fond de base, opaque, lue après les lignes orange : 'theme', 'fixe', ou null. */
function natureDuFond(classe) {
  const a = analyserClasse(traductionOrange(classe));
  if (a.variantes !== '' || !estCouleurDeFond(a) || a.opacite) return null; // pas un fond, ou translucide
  if (['bg-transparent', 'bg-current', 'bg-inherit'].includes(a.base)) return null;
  return a.genre === 'jeton' ? 'theme' : 'fixe';
}

/** Le fond qu'un élément JSX pose lui-même par son className : 'theme', 'fixe', ou null (on regarde au-dessus). */
function fondDeLElement(elementPath, source) {
  const attribut = elementPath.get('openingElement').get('attributes')
    .find((a) => a.isJSXAttribute() && nomAttribut(a.node) === 'className');
  const valeur = attribut?.get('value');
  if (!valeur?.node) return null;
  const natures = [];
  let nomDeFond = false;
  const lire = (noeud, duTheme) => {
    const lues = classesDe(source, noeud);
    for (const c of lues ? lues.classes : []) {
      const n = natureDuFond(c.texte);
      if (n) natures.push(duTheme ? 'theme' : n);
    }
  };
  if (valeur.isStringLiteral()) lire(valeur.node, false);
  else {
    valeur.traverse({
      StringLiteral(s) { lire(s.node, estBrancheIsDark(s)); }, // un ternaire isDark suit le thème
      TemplateLiteral(t) { if (!gabaritHtml(t.node)) lire(t.node, estBrancheIsDark(t)); },
      Identifier(i) { if (NOM_DE_FOND.test(i.node.name)) nomDeFond = true; },
    });
  }
  if (natures.includes('fixe')) return 'fixe';
  if (natures.includes('theme') || nomDeFond) return 'theme';
  return null;
}

/** Le fond opaque le plus proche d'un élément (lui compris), en remontant les éléments JSX ; 'theme' par défaut. */
function fondProche(chemin, source) {
  let element = chemin.isJSXElement() ? chemin : chemin.findParent((a) => a.isJSXElement());
  while (element) {
    const nature = fondDeLElement(element, source);
    if (nature) return nature;
    element = element.findParent((a) => a.isJSXElement());
  }
  return 'theme';
}

/** Une classe traduite dont la lisibilité dépend du fond : tout sauf un fond et sauf text-sur-accent (sur aplat). */
function dependDuFond(classe) {
  const a = analyserClasse(classe);
  return a.utilitaire !== 'bg' && a.base !== 'text-sur-accent';
}

function nouveauBilan() {
  return {
    detail: { ternaires: 0, classes: 0, styles: 0 },
    ignores: 0,
    raisons: {},
    signalements: [],
    sansCorrespondance: {},
  };
}

function ignorer(bilan, raison, nombre = 1) {
  bilan.ignores += nombre;
  bilan.raisons[raison] = (bilan.raisons[raison] || 0) + nombre;
}

/* ------------------------------------------------------------------------------------------------
 * Passe 1 : ternaires isDark ? '…' : '…'
 * ---------------------------------------------------------------------------------------------- */

const classesNeutres = (texte) => texte.split(/\s+/).filter(Boolean)
  .filter((c) => analyserClasse(c).genre === 'neutre').sort().join(' ');

/**
 * Les propriétés colorées d'une branche (variantes + utilitaire : 'focus:ring', 'border-t'…), hors texte et fond.
 * Sans classe, le texte hérite et le fond est transparent : une branche claire qui n'en pose pas suit le thème.
 * Mais un trait, un anneau, son décalage, un séparateur ou un texte indicatif reprennent leur valeur par défaut,
 * claire : si le côté sombre en pose une et pas le côté clair, la traduction l'imposerait au mode sombre.
 */
function proprietesColorees(texte) {
  const cles = new Set();
  for (const c of texte.split(/\s+/).filter(Boolean)) {
    const a = analyserClasse(c);
    if (a.genre === 'neutre' || !a.utilitaire) continue;
    const cle = a.utilitaire === 'placeholder' ? `${a.variantes}placeholder:text` : a.variantes + a.utilitaire;
    if (!/^(?:.*:)?(?:text|bg)$/.test(cle) || cle.endsWith('placeholder:text')) cles.add(cle);
  }
  return cles;
}

function passeTernaires(source, ast, bilan) {
  const editions = [];
  traverse(ast, {
    ConditionalExpression(p) {
      const n = p.node;
      if (n.test.type !== 'Identifier' || n.test.name !== 'isDark') return;
      if (n.consequent.type !== 'StringLiteral' || n.alternate.type !== 'StringLiteral') return;
      const sombre = n.consequent.value;
      const clair = n.alternate.value;
      if (sombre.includes('<') || clair.includes('<') || dansDuHtml(p)) return; // HTML de document : ni compté ni touché

      const parent = p.parentPath;
      if (parent.isJSXExpressionContainer() && (parent.parentPath.isJSXElement() || parent.parentPath.isJSXFragment())) {
        ignorer(bilan, 'texte affiché, pas des classes');
        return;
      }
      if (!estChaineDeClasses(sombre) || !estChaineDeClasses(clair)) {
        ignorer(bilan, 'valeurs, pas des classes');
        return;
      }
      if (classesNeutres(sombre) !== classesNeutres(clair)) {
        ignorer(bilan, 'diffère aussi par des classes non colorées');
        return;
      }
      const clairesPosees = proprietesColorees(clair);
      if ([...proprietesColorees(sombre)].some((cle) => !clairesPosees.has(cle))) {
        ignorer(bilan, 'couleur sombre sans pendant clair (trait, anneau…)');
        return;
      }
      const { resultat: traduit, manquantes } = analyserBrancheClaire(clair);
      if (traduit === null) {
        if (manquantes.length) {
          ignorer(bilan, 'classe claire sans correspondance');
          for (const c of manquantes) bilan.sansCorrespondance[c] = (bilan.sansCorrespondance[c] || 0) + 1;
        } else {
          ignorer(bilan, 'texte foncé sur un aplat d\'accent');
        }
        return;
      }
      // les espaces de tête et de fin de la branche claire restent : 'flex' + (isDark ? ' a' : ' b') → 'flex' + ' …'
      const resultat = clair.trim() === '' ? clair : clair.match(/^\s*/)[0] + traduit + clair.match(/\s*$/)[0];

      // l'étendue : le ternaire, avec ses parenthèses devenues inutiles autour d'une simple chaîne
      let debut = n.start;
      let fin = n.end;
      if (n.extra?.parenthesized && source.slice(n.extra.parenStart + 1, n.start).trim() === '') {
        let k = n.end;
        while (/\s/.test(source[k])) k++;
        if (source[k] === ')') {
          debut = n.extra.parenStart;
          fin = k + 1;
        }
      }
      const texteTernaire = source.slice(debut, fin);
      const guillemet = source[n.alternate.start];
      bilan.detail.ternaires++;

      // barre oblique inverse, retour à la ligne, tabulation, séparateurs U+2028 / U+2029 : à échapper dans une chaîne
      const caracteresAEchapper = /[\\\n\r\t]/.test(resultat) || [0x2028, 0x2029].some((c) => resultat.includes(String.fromCharCode(c)));
      // seul contenu d'un attribut JSX : className={isDark ? … : …} → className="…"
      if (parent.isJSXExpressionContainer() && parent.parentPath.isJSXAttribute()
        && source.slice(parent.node.start + 1, parent.node.end - 1).trim() === texteTernaire
        && !resultat.includes('"') && !caracteresAEchapper) {
        editions.push({ debut: parent.node.start, fin: parent.node.end, texte: `"${resultat}"` });
        return;
      }
      // seule expression d'un ${…} de gabarit : les classes entrent dans le texte du gabarit
      if (parent.isTemplateLiteral() && !/[`\\$]/.test(resultat)) {
        const k = parent.node.expressions.indexOf(n);
        const avant = parent.node.quasis[k];
        const apres = parent.node.quasis[k + 1];
        if (source.slice(avant.end + 2, apres.start - 1).trim() === texteTernaire) {
          let finGabarit = apres.start;
          if (resultat === '' && source[avant.end - 1] === ' ' && source[apres.start] === ' ') finGabarit++;
          editions.push({ debut: avant.end, fin: finGabarit, texte: resultat });
          return;
        }
      }
      // même guillemet que la branche claire ; JSON si une valeur arbitraire le contient (content-['x']) ou s'il
      // faut échapper un caractère (retour à la ligne de la branche d'origine)
      const chaine = resultat.includes(guillemet) || caracteresAEchapper ? JSON.stringify(resultat) : guillemet + resultat + guillemet;
      editions.push({ debut, fin, texte: chaine });
    },
  });
  return editions;
}

/* ------------------------------------------------------------------------------------------------
 * Passe 2 : classes orange des className
 * ---------------------------------------------------------------------------------------------- */

const estBrancheIsDark = (p) => {
  const parent = p.parentPath;
  return parent.isConditionalExpression() && p.key !== 'test'
    && parent.node.test.type === 'Identifier' && parent.node.test.name === 'isDark';
};

function passeOranges(source, ast, bilan) {
  const editions = [];
  traverse(ast, {
    JSXAttribute(p) {
      if (nomAttribut(p.node) !== 'className' || !p.node.value || dansDuHtml(p)) return;
      const element = p.parentPath.parentPath.node;
      const chaines = [];
      const valeur = p.get('value');
      if (valeur.isStringLiteral()) chaines.push(valeur);
      else {
        valeur.traverse({
          StringLiteral(s) { chaines.push(s); },
          TemplateLiteral(t) { chaines.push(t); },
        });
      }
      for (const s of chaines) {
        if (estBrancheIsDark(s)) continue; // ternaire isDark laissé intact par la passe 1
        if (s.isStringLiteral() ? s.node.value.includes('<') : gabaritHtml(s.node)) continue;
        const lues = classesDe(source, s.node);
        if (!lues || !lues.classes.length) continue;
        const { classes, changements, refus } = remplacerOranges(lues.classes.map((c) => c.texte));
        let fond = null;
        let gardees = 0;
        lues.classes.forEach((c, i) => {
          if (classes[i] === c.texte) return;
          if (dependDuFond(classes[i])) {
            fond ??= fondProche(p, source);
            if (fond === 'fixe') {
              classes[i] = c.texte;
              gardees++;
              return;
            }
          }
          editions.push({ debut: c.debut, fin: c.fin, texte: classes[i] });
        });
        bilan.detail.classes += changements - gardees;
        if (gardees) {
          ignorer(bilan, 'surface de couleur fixe', gardees);
          bilan.signalements.push({ position: s.node.start, motif: 'orange laissé : fond de couleur fixe (texte, trait ou anneau)' });
        }
        for (const r of refus) {
          ignorer(bilan, 'texte foncé sur un aplat d\'accent');
          bilan.signalements.push({ position: s.node.start, motif: `aplat orange laissé : texte non blanc (${r.classe})` });
        }
        // un aplat traduit sans couleur de texte, sur un élément qui en affiche : à regarder
        const aplatTraduit = classes.some((c, i) => c !== lues.classes[i].texte && analyserClasse(c).base === 'bg-accent'
          && analyserClasse(c).variantes === '' && analyserClasse(c).opacite === '');
        const texte = classes.some((c) => { const a = analyserClasse(c); return a.variantes === '' && estCouleurDeTexte(a); });
        if (aplatTraduit && !texte && aDuContenu(element)) {
          bilan.signalements.push({ position: s.node.start, motif: 'aplat d\'accent sans couleur de texte dans la même chaîne' });
        }
      }
    },
  });
  return editions;
}

/* ------------------------------------------------------------------------------------------------
 * Passe 3 : couleur de l'entreprise posée en style
 * ---------------------------------------------------------------------------------------------- */

const PROPRIETES_FOND = new Set(['background', 'backgroundColor']);
const nomCle = (cle) => (cle.type === 'Identifier' ? cle.name : cle.type === 'StringLiteral' ? cle.value : null);
const estCandidat = (propriete) => propriete.type === 'ObjectProperty' && !propriete.computed
  && ['background', 'backgroundColor', 'color'].includes(nomCle(propriete.key))
  && propriete.value.type === 'Identifier' && ['couleur', 'accent'].includes(propriete.value.name);
const TEXTE_BLANC = /^(?:white|#fff|#ffffff)$/i;

/** Noms locaux des icônes lucide-react et de `motion` (framer-motion) : ils transmettent className. */
function composantsSurs(ast) {
  const icones = new Set();
  const motions = new Set();
  for (const instruction of ast.program.body) {
    if (instruction.type !== 'ImportDeclaration') continue;
    for (const s of instruction.specifiers) {
      if (instruction.source.value === 'lucide-react') icones.add(s.local.name);
      if (instruction.source.value === 'framer-motion' && s.type === 'ImportSpecifier' && s.imported.name === 'motion') motions.add(s.local.name);
    }
  }
  return { icones, motions };
}

function elementSur(nom, surs) {
  if (nom.type === 'JSXIdentifier') return /^[a-z]/.test(nom.name) || surs.icones.has(nom.name);
  return nom.type === 'JSXMemberExpression' && nom.object.type === 'JSXIdentifier'
    && surs.motions.has(nom.object.name) && /^[a-z]/.test(nom.property.name);
}

/* ------------------------------------------------------------------------------------------------
 * D'où vient la couleur : `couleur` / `accent` ne valent la couleur de l'entreprise (donc bg-accent,
 * text-accent-texte) que si leur déclaration y remonte. Contre-exemples du dépôt : DevisComposer passe à SectionRow
 * couleur={accentPlein}, la teinte des factures ; EntrepriseBadge prend `ent.couleur`, celle d'une des entreprises.
 * Un composant est « douteux » pour une prop (clé « Composant.prop ») si l'un de ses appels JSX lui passe autre
 * chose que la couleur de l'entreprise ; la ligne de commande réunit ces clés sur tout le dépôt (option `douteux`).
 * Un identifiant sans déclaration (extrait isolé, jamais dans un vrai fichier : ce serait une ReferenceError) est
 * présumé être la couleur de l'entreprise.
 * ---------------------------------------------------------------------------------------------- */

/** Props d'appel examinées : celles qui portent une couleur (couleur, accent, color, accentColor…). */
const PROP_DE_COULEUR = /couleur|color|accent/i;

/** Le nom du composant (capitale initiale) que déclare cette fonction, ou null (rappel de .map, fonction utilitaire). */
function nomDuComposant(fonction) {
  if (!fonction?.isFunction()) return null;
  let nom = fonction.node.id?.name ?? null;
  if (!nom) {
    let p = fonction.parentPath;
    while (p?.isCallExpression()) p = p.parentPath; // memo(…), forwardRef(…)
    if (p?.isVariableDeclarator() && p.node.id.type === 'Identifier') nom = p.node.id.name;
  }
  return nom && /^[A-Z]/.test(nom) ? nom : null;
}

/** La prop d'où sort un identifiant dans un motif déstructuré ({ couleur: c = '#…' } → 'couleur'), ou null. */
function propDuMotif(motif, identifiant) {
  for (const pr of motif.properties) {
    if (pr.type !== 'ObjectProperty' || pr.computed) continue;
    const valeur = pr.value.type === 'AssignmentPattern' ? pr.value.left : pr.value;
    if (valeur === identifiant) return nomCle(pr.key);
  }
  return null;
}

/** Clé « Composant.prop » douteuse ? null si la prop du composant est sûre, sinon la raison. */
function verdictDeProp(composant, prop, douteux) {
  if (!composant) return 'paramètre d\'une fonction qui n\'est pas un composant';
  if (!prop) return 'paramètre non déstructuré';
  return douteux.has(`${composant}.${prop}`) ? `${composant} reçoit ailleurs une autre couleur (${prop})` : null;
}

function origineIdentifiant(chemin, douteux, profondeur) {
  const binding = chemin.scope.getBinding(chemin.node.name);
  if (!binding) return null; // présumée (voir plus haut)
  if (binding.constantViolations.length) return `${chemin.node.name} est réaffectée`;
  if (binding.kind === 'param') {
    const prop = binding.path.isObjectPattern() ? propDuMotif(binding.path.node, binding.identifier) : null;
    return verdictDeProp(nomDuComposant(binding.scope.path), prop, douteux);
  }
  const declaration = binding.path;
  if (!declaration.isVariableDeclarator()) return `${chemin.node.name} : déclaration inconnue`;
  if (declaration.node.id.type === 'Identifier') {
    return declaration.node.init ? origineExpression(declaration.get('init'), douteux, profondeur + 1) : `${chemin.node.name} sans valeur`;
  }
  if (declaration.node.id.type === 'ObjectPattern') {
    const init = declaration.get('init');
    // const { couleur } = props : une prop du composant
    const source = init.isIdentifier() ? init.scope.getBinding(init.node.name) : null;
    if (source?.kind === 'param' && source.path.isIdentifier()) {
      return verdictDeProp(nomDuComposant(source.scope.path), propDuMotif(declaration.node.id, binding.identifier), douteux);
    }
    // const { couleur } = entreprise (ou useEntreprise()…)
    return init.node && /entreprise/i.test(init.toString()) ? null : `${chemin.node.name} déstructurée d'un objet inconnu`;
  }
  return `${chemin.node.name} : déclaration inconnue`;
}

/** La valeur est-elle la couleur de l'entreprise ? null si oui, sinon la raison. */
function origineExpression(chemin, douteux, profondeur = 0) {
  if (profondeur > 6) return 'origine trop indirecte';
  const n = chemin.node;
  if (chemin.isIdentifier()) return origineIdentifiant(chemin, douteux, profondeur);
  if (chemin.isMemberExpression() || chemin.isOptionalMemberExpression()) {
    // entreprise.couleur, signe.entreprise?.couleur, devisData?.entreprise?.couleur
    if (n.computed || nomCle(n.property) !== 'couleur') return `autre valeur (${chemin.toString()})`;
    const noms = [];
    let objet = chemin.get('object');
    while (objet.isMemberExpression() || objet.isOptionalMemberExpression()) {
      noms.push(objet.node.computed ? '' : nomCle(objet.node.property));
      objet = objet.get('object');
    }
    if (!objet.isIdentifier()) return `autre valeur (${chemin.toString()})`;
    noms.push(objet.node.name);
    if (!noms.some((x) => /^entreprise$/i.test(x || ''))) return `couleur d'un autre objet (${chemin.toString()})`;
    const racine = objet.scope.getBinding(objet.node.name);
    if (racine?.kind === 'param' && !nomDuComposant(racine.scope.path)) return 'paramètre d\'une fonction qui n\'est pas un composant';
    return null;
  }
  if (chemin.isLogicalExpression() && (n.operator === '||' || n.operator === '??')) {
    const gauche = origineExpression(chemin.get('left'), douteux, profondeur + 1);
    if (gauche) return gauche;
    return chemin.get('right').isStringLiteral() ? null : origineExpression(chemin.get('right'), douteux, profondeur + 1);
  }
  // couleurPleine(couleur, isDark) : la couleur de l'entreprise assombrie pour un aplat, c'est bg-accent
  if (chemin.isCallExpression() && chemin.get('callee').isIdentifier({ name: 'couleurPleine' }) && n.arguments.length) {
    return origineExpression(chemin.get('arguments.0'), douteux, profondeur + 1);
  }
  return `autre valeur (${chemin.toString().slice(0, 60)})`;
}

/**
 * Les clés « Composant.prop » qu'un code appelle avec une couleur qui n'est pas celle de l'entreprise (en plus de
 * `connus`) : point fixe, un composant douteux qui passe sa prop à un autre le rend douteux à son tour.
 */
export function appelsDouteux(ast, connus = new Set()) {
  const douteux = new Set(connus);
  for (let tour = 0; tour < 6; tour++) {
    const avant = douteux.size;
    traverse(ast, {
      JSXAttribute(p) {
        const prop = nomAttribut(p.node);
        const nom = p.parentPath.node.name;
        if (!prop || !PROP_DE_COULEUR.test(prop) || nom.type !== 'JSXIdentifier' || !/^[A-Z]/.test(nom.name)) return;
        const cle = `${nom.name}.${prop}`;
        if (douteux.has(cle)) return;
        const valeur = p.get('value');
        const sure = valeur.isJSXExpressionContainer() && !valeur.get('expression').isJSXEmptyExpression()
          && origineExpression(valeur.get('expression'), douteux) === null;
        if (!sure) douteux.add(cle);
      },
    });
    if (douteux.size === avant) break;
  }
  return douteux;
}

/** Retirer des propriétés d'un objet littéral : chaque suite de propriétés retirées avec son séparateur. */
function retraitsDeProprietes(proprietes, retirees) {
  const editions = [];
  let k = 0;
  while (k < proprietes.length) {
    if (!retirees.has(proprietes[k])) { k++; continue; }
    let j = k;
    while (j + 1 < proprietes.length && retirees.has(proprietes[j + 1])) j++;
    if (j + 1 < proprietes.length) editions.push({ debut: proprietes[k].start, fin: proprietes[j + 1].start, texte: '' });
    else editions.push({ debut: proprietes[k - 1].end, fin: proprietes[j].end, texte: '' });
    k = j + 1;
  }
  return editions;
}

/** Variantes de pseudo-élément : le style posé sur l'élément ne les recouvrait pas (placeholder:text-…). */
const PSEUDO_ELEMENT = /(?:^|:)(?:placeholder|before|after|file|marker|selection|first-letter|first-line|backdrop):/;

function passeStyles(source, ast, bilan, options) {
  const editions = [];
  const surs = composantsSurs(ast);
  const douteux = appelsDouteux(ast, options.douteux);
  traverse(ast, {
    JSXAttribute(p) {
      if (nomAttribut(p.node) !== 'style' || p.node.value?.type !== 'JSXExpressionContainer' || dansDuHtml(p)) return;
      const chemins = [];
      p.get('value').traverse({ ObjectProperty(op) { if (estCandidat(op.node)) chemins.push(op); } });
      if (!chemins.length) return;
      const candidats = chemins.map((c) => c.node);
      const objet = p.node.value.expression;
      const directs = objet.type === 'ObjectExpression' ? candidats.filter((c) => objet.properties.includes(c)) : [];
      if (candidats.length > directs.length) ignorer(bilan, 'style qui n\'est pas un objet littéral', candidats.length - directs.length);
      if (!directs.length) return;
      const refuser = (raison, signaler) => {
        ignorer(bilan, raison, directs.length);
        if (signaler) bilan.signalements.push({ position: p.node.start, motif: signaler });
      };

      for (const c of chemins.filter((ch) => directs.includes(ch.node))) {
        const raison = origineExpression(c.get('value'), douteux);
        if (raison) return refuser('couleur qui n\'est peut-être pas celle de l\'entreprise', `couleur laissée : ${raison}`);
      }
      const ouvrant = p.parentPath.node;
      const element = p.parentPath.parentPath.node;
      if (!elementSur(ouvrant.name, surs)) return refuser('composant qui ne transmet peut-être pas className');
      if (objet.properties.some((pr) => pr.type !== 'ObjectProperty' || pr.computed)) return refuser('style avec décomposition ou clé calculée');
      const fonds = directs.filter((c) => PROPRIETES_FOND.has(nomCle(c.key)));
      const textes = directs.filter((c) => nomCle(c.key) === 'color');
      if (fonds.length && textes.length) return refuser('fond et texte de la même couleur');
      const attributsClasse = ouvrant.attributes.filter((a) => a.type === 'JSXAttribute' && nomAttribut(a) === 'className');
      if (attributsClasse.length > 1) return refuser('className en double');
      const attributClasse = attributsClasse[0];
      const decomposition = ouvrant.attributes.some((a) => a.type === 'JSXSpreadAttribute');
      if (!attributClasse && decomposition) return refuser('props décomposées : className écraserait le leur');
      if (textes.length && fondProche(p.parentPath.parentPath, source) === 'fixe') {
        return refuser('surface de couleur fixe', 'couleur de texte laissée : fond de couleur fixe');
      }

      let lues = { segments: [], classes: [] };
      let dynamique = false;
      if (attributClasse) {
        const v = attributClasse.value;
        const noeud = v?.type === 'JSXExpressionContainer' ? v.expression : v;
        if (!noeud || !['StringLiteral', 'TemplateLiteral'].includes(noeud.type)) return refuser('className dynamique');
        if (noeud.type === 'TemplateLiteral' && gabaritHtml(noeud)) return refuser('className dynamique');
        lues = classesDe(source, noeud);
        if (!lues) return refuser('className dynamique');
        dynamique = noeud.type === 'TemplateLiteral' && noeud.expressions.length > 0;
      }
      const analyses = lues.classes.map((c) => ({ ...c, a: analyserClasse(c.texte) }));
      const deBase = analyses.filter((c) => c.a.variantes === '');
      // le style recouvrait la propriété dans tous les états (hover:, disabled:, sm:…) : gardées en classe, ces
      // variantes l'emporteraient désormais ; seules restent celles des pseudo-éléments (placeholder:…)
      const recouvertes = (estPropriete) => analyses.filter((c) => estPropriete(c.a) && !PSEUDO_ELEMENT.test(c.a.variantes));
      const autresProprietes = objet.properties.filter((pr) => !directs.includes(pr));
      const couleurDuStyle = autresProprietes.find((pr) => nomCle(pr.key) === 'color');

      const retraits = [];
      const ajouts = [];
      let signal = null;
      if (fonds.length) {
        if (fonds.some((c) => nomCle(c.key) === 'background')
          && deBase.some((c) => /^bg-(?:gradient|\[(?:url|linear|radial|conic))/.test(c.a.base))) {
          return refuser('dégradé recouvert par le style', 'aplat laissé : un dégradé en classe était recouvert par le style');
        }
        const couleursTexte = deBase.filter((c) => estCouleurDeTexte(c.a));
        const fonce = couleursTexte.find((c) => c.a.base !== 'text-white' && c.a.base !== 'text-sur-accent');
        const styleFonce = couleurDuStyle && !(couleurDuStyle.value.type === 'StringLiteral' && TEXTE_BLANC.test(couleurDuStyle.value.value));
        if (fonce || styleFonce) {
          return refuser('texte foncé sur un aplat d\'accent', `aplat laissé : texte non blanc (${fonce ? fonce.texte : 'color du style'})`);
        }
        retraits.push(...recouvertes(estCouleurDeFond));
        const blancs = couleursTexte.filter((c) => c.a.base === 'text-white');
        retraits.push(...blancs);
        ajouts.push('bg-accent');
        if (blancs.length) ajouts.push(`${blancs[0].a.important}text-sur-accent${blancs[0].a.opacite}`);
        if (dynamique) signal = 'className dynamique : vérifier la couleur du texte sur l\'aplat';
        else if (!couleursTexte.length && !couleurDuStyle && aDuContenu(element)) signal = 'aplat d\'accent sans couleur de texte';
      } else {
        retraits.push(...recouvertes(estCouleurDeTexte));
        ajouts.push('text-accent-texte');
        if (dynamique) signal = 'className dynamique : vérifier qu\'aucune autre couleur de texte ne s\'y ajoute';
      }

      // className : chaque segment touché réécrit (classes retirées), les ajouts à la fin du dernier
      if (attributClasse) {
        const retirees = new Set(retraits.map((c) => c.debut));
        const dernier = lues.segments.length - 1;
        lues.segments.forEach((s, k) => {
          const touche = k === dernier || retraits.some((c) => c.segment === k);
          if (touche) editions.push({ debut: s.debut, fin: s.fin, texte: reecrireSegment(source, s, retirees, k === dernier ? ajouts : []) });
        });
      }
      // style : propriétés retirées, ou l'attribut entier s'il ne reste rien
      const nouvelAttribut = `className="${ajouts.join(' ')}"`;
      if (!autresProprietes.length) {
        if (attributClasse) {
          let debut = p.node.start;
          while (/\s/.test(source[debut - 1])) debut--;
          editions.push({ debut, fin: p.node.end, texte: '' });
        } else {
          editions.push({ debut: p.node.start, fin: p.node.end, texte: nouvelAttribut });
        }
      } else {
        editions.push(...retraitsDeProprietes(objet.properties, new Set(directs)));
        if (!attributClasse) editions.push({ debut: p.node.start, fin: p.node.start, texte: `${nouvelAttribut} ` });
      }
      bilan.detail.styles += directs.length;
      if (signal) bilan.signalements.push({ position: p.node.start, motif: signal });
    },
  });
  return editions;
}

/* ------------------------------------------------------------------------------------------------
 * La transformation complète
 * ---------------------------------------------------------------------------------------------- */

/**
 * Transforme le code d'un fichier : { source, changements, ignores, detail: { ternaires, classes, styles }, raisons,
 * signalements: [{ ligne, motif, extrait }] (lignes du texte final), sansCorrespondance: { classe: nombre } }.
 * options.douteux : clés « Composant.prop » appelées ailleurs dans le dépôt avec une couleur qui n'est pas celle de
 * l'entreprise (douteuxDuDepot) ; celles du fichier lui-même sont toujours ajoutées.
 * Lève une erreur si le code ne se lit pas (@babel/parser, plugin jsx).
 */
export function transformer(source, options = {}) {
  const reglages = { douteux: options.douteux ?? new Set() };
  const bilan = nouveauBilan();
  let texte = source;
  const enAttente = []; // signalements des passes déjà faites, positions dans le texte courant
  for (const passe of [passeTernaires, passeOranges, passeStyles]) {
    const avant = bilan.signalements.length;
    const editions = passe(texte, analyser(texte), bilan, reglages);
    enAttente.push(...bilan.signalements.splice(avant));
    if (!editions.length) continue;
    const { texte: suivant, recaler } = appliquer(texte, editions);
    for (const s of enAttente) s.position = recaler(s.position);
    texte = suivant;
  }
  if (texte !== source) analyser(texte); // le code produit doit se relire : sinon erreur, rien n'est écrit
  const lignes = texte.split('\n');
  const ligneDe = (position) => texte.slice(0, position).split('\n').length;
  const signalements = enAttente
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ ligne: ligneDe(s.position), motif: s.motif, extrait: lignes[ligneDe(s.position) - 1].trim().slice(0, 140) }));
  const { ternaires, classes, styles } = bilan.detail;
  return {
    source: texte,
    changements: ternaires + classes + styles,
    ignores: bilan.ignores,
    detail: bilan.detail,
    raisons: bilan.raisons,
    signalements,
    sansCorrespondance: bilan.sansCorrespondance,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Ligne de commande
 * ---------------------------------------------------------------------------------------------- */

const estException = (f) => EXCEPTIONS.fichiers.includes(f) || EXCEPTIONS.dossiers.some((d) => f.startsWith(d));

/**
 * Les clés « Composant.prop » appelées, quelque part dans les fichiers atteignables (exceptions comprises : un
 * appel du site public compte aussi), avec une couleur qui n'est pas celle de l'entreprise ; point fixe entre
 * fichiers (un composant douteux qui transmet sa prop rend douteux celui qu'il appelle).
 */
export function douteuxDuDepot(racine) {
  const arbres = [];
  for (const f of fichiersAtteignables(racine)) {
    try {
      arbres.push(analyser(fs.readFileSync(path.join(racine, f), 'utf8')));
    } catch {
      continue; // illisible : signalé par la transformation elle-même
    }
  }
  let douteux = new Set();
  for (let tour = 0; tour < 6; tour++) {
    const avant = douteux.size;
    for (const arbre of arbres) douteux = appelsDouteux(arbre, douteux);
    if (douteux.size === avant) break;
  }
  return douteux;
}

function executer(argv) {
  const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const appliquerVraiment = argv.includes('--appliquer');
  const avecSignalements = argv.includes('--signalements');
  const enPosix = (a) => a.replace(/\\/g, '/').replace(/^\.\//, '');
  const filtres = argv.filter((a) => !a.startsWith('--')).map(enPosix);
  const exclus = argv.filter((a) => a.startsWith('--sauf=')).map((a) => enPosix(a.slice('--sauf='.length)));
  const fichiers = fichiersConcernes(racine)
    .filter((f) => !estException(f))
    .filter((f) => !filtres.length || filtres.some((x) => f.startsWith(x)))
    .filter((f) => !exclus.some((x) => f.startsWith(x)));

  const sortie = [];
  const totaux = { fichiers: 0, modifies: 0, changements: 0, ignores: 0, ternaires: 0, classes: 0, styles: 0, signalements: 0 };
  const raisons = {};
  const sansCorrespondance = {};
  const ancienAvant = Object.fromEntries(MOTIFS.map((m) => [m, 0]));
  const ancienApres = Object.fromEntries(MOTIFS.map((m) => [m, 0]));
  const parFichier = [];
  const echecs = [];
  const douteux = douteuxDuDepot(racine);
  for (const f of fichiers) {
    const chemin = path.join(racine, f);
    const source = fs.readFileSync(chemin, 'utf8');
    let r;
    try {
      r = transformer(source, { douteux });
    } catch (e) {
      echecs.push(`${f} : ${e.message}`);
      continue;
    }
    totaux.fichiers++;
    const avant = compterAncienCode(source);
    const apres = compterAncienCode(r.source);
    for (const m of MOTIFS) {
      ancienAvant[m] += avant[m];
      ancienApres[m] += apres[m];
    }
    for (const [k, n] of Object.entries(r.raisons)) raisons[k] = (raisons[k] || 0) + n;
    for (const [k, n] of Object.entries(r.sansCorrespondance)) sansCorrespondance[k] = (sansCorrespondance[k] || 0) + n;
    totaux.changements += r.changements;
    totaux.ignores += r.ignores;
    totaux.ternaires += r.detail.ternaires;
    totaux.classes += r.detail.classes;
    totaux.styles += r.detail.styles;
    totaux.signalements += r.signalements.length;
    if (r.source !== source) {
      totaux.modifies++;
      if (appliquerVraiment) fs.writeFileSync(chemin, r.source);
    }
    if (r.changements || r.ignores || r.signalements.length) {
      const reste = MOTIFS.reduce((s, m) => s + apres[m], 0);
      parFichier.push({ f, r, reste });
    }
  }

  parFichier.sort((a, b) => b.r.changements - a.r.changements);
  for (const { f, r, reste } of parFichier) {
    const d = r.detail;
    sortie.push(`${String(r.changements).padStart(5)} changements (ternaires ${d.ternaires}, classes ${d.classes}, styles ${d.styles}) · ${r.ignores} ignorés · ${r.signalements.length} signalés · reste ${reste}  ${f}`);
    if (avecSignalements) for (const s of r.signalements) sortie.push(`        ${f}:${s.ligne}  ${s.motif}  │ ${s.extrait}`);
  }
  const fmt = (o) => MOTIFS.map((m) => `${m} ${o[m]}`).join(', ');
  sortie.push(
    '',
    `${appliquerVraiment ? 'APPLIQUÉ' : 'À BLANC (rien n\'est écrit ; --appliquer pour écrire)'} — ${totaux.fichiers} fichiers lus, ${totaux.modifies} modifiés`,
    `changements : ${totaux.changements} (ternaires ${totaux.ternaires}, classes orange ${totaux.classes}, styles ${totaux.styles})`,
    `ignorés : ${totaux.ignores}`,
    ...Object.entries(raisons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${String(n).padStart(5)}  ${k}`),
    `signalés (à regarder à la main) : ${totaux.signalements}${avecSignalements ? '' : ' (--signalements pour la liste)'}`,
    `ancien code compté avant : ${fmt(ancienAvant)}`,
    `ancien code compté après : ${fmt(ancienApres)}`,
    'classes claires sans correspondance qui bloquent un ternaire (25 premières) :',
    ...Object.entries(sansCorrespondance).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `  ${String(n).padStart(5)}  ${k}`),
  );
  if (echecs.length) sortie.push('', `ILLISIBLES (non transformés) : ${echecs.length}`, ...echecs.map((e) => `  ${e}`));
  process.stdout.write(sortie.join('\n') + '\n');
  if (echecs.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executer(process.argv.slice(2));
}
