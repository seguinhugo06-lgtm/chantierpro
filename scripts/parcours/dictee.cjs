// Parcours de la dictée vocale (mode « réel simulé »), sur un build de TEST où FONCTIONS.ia est allumé
// (scripts/lib/vite-ia.config.mjs, dans audit-ui/dist-ia-reel) : le code livré garde l'IA éteinte (D-07).
// Le micro est simulé (le navigateur de test n'en a pas) ; la fonction voice-intent est simulée par le faux Supabase.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { creerBase, ORG, json } = require('../lib/fauxSupabase.cjs');
const { RACINE } = require('../lib/navigateur.cjs');
const { CGU_VERSION_DATE, CGU_VERSION_DATE_IA } = require('../lib/cgu.cjs');

let distIa = null;
function construireDistIa() {
  if (distIa) return distIa;
  const dist = path.join(RACINE, 'audit-ui', 'dist-ia-reel');
  execSync(`npx vite build --config scripts/lib/vite-ia.config.mjs --outDir ${JSON.stringify(dist)} --emptyOutDir`, {
    cwd: RACINE, stdio: 'ignore',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://fauxprojet.supabase.co', VITE_SUPABASE_ANON_KEY: 'cle-factice' },
  });
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('build de test de la dictée absent');
  distIa = dist;
  return dist;
}

// Faux micro : la reconnaissance vocale du navigateur, pilotée par le parcours (window.__micro.emettre).
function fauxMicro() {
  class FausseReconnaissance {
    constructor() { window.__micro = this; }
    start() { window.__microEcoute = true; }
    stop() { window.__microEcoute = false; setTimeout(() => this.onend && this.onend(), 30); }
    abort() { this.stop(); }
    emettre(finaux, encours = []) {
      const res = (t, isFinal) => Object.assign([{ transcript: t }], { isFinal });
      const results = [...finaux.map((t) => res(t, true)), ...encours.map((t) => res(t, false))];
      if (this.onresult) this.onresult({ results, resultIndex: 0 });
    }
  }
  window.SpeechRecognition = FausseReconnaissance;
  window.webkitSpeechRecognition = FausseReconnaissance;
  if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { value: {} });
  navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [] });
}

const INTENTION = {
  resume: 'Un devis de carrelage pour Madame Durand.',
  incertitudes: [],
  client: { nom: 'Durand', prenom: null, telephone: null, email: null, adresse: null, codePostal: null, ville: null },
  chantiers: [],
  document: { type: 'devis', notes: null, lignes: [{ description: 'Carrelage', quantite: 15, unite: 'm²', prixUnitaire: 45 }] },
};

/** Ouvre l'app connectée (faux Supabase), avec le faux micro, puis la fenêtre de dictée. */
async function ouvrirDictee({ ouvrir, sessionFactice, cliquer, attendre }, voiceIntent) {
  const base = creerBase();
  const appels = [];
  const { page } = await ouvrir({
    reel: true, distReel: construireDistIa(), largeur: 375, session: sessionFactice(), avantChargement: fauxMicro,
    supabase: (req, u) => {
      if (u.pathname === '/functions/v1/voice-intent') {
        appels.push({ corps: JSON.parse(req.postData() || '{}'), jeton: req.headers().authorization || '' });
        return voiceIntent(appels.length);
      }
      return base.reponse(req, u);
    },
  });
  await attendre(2500);
  await cliquer(page, 'Dictée vocale');
  await attendre(800);
  return { page, appels };
}

const dialogue = (page) => page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const t = d?.querySelector('#dictee-texte');
  return {
    ouvert: !!d,
    texte: t ? t.value : null,
    alerte: [...(d?.querySelectorAll('[role="alert"]') || [])].map((e) => e.innerText).join(' '),
    boutons: [...(d?.querySelectorAll('button') || [])].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean),
    micro: d?.querySelector('button[aria-label$="la dictée"]')?.getAttribute('aria-label') || null,
  };
});

const texteDe = (page) => page.evaluate(() => document.body.innerText);

module.exports = [
  {
    // D-07, 2e condition : Anthropic déclaré sous-traitant (textes de juriste-btp du 3 nov. 2026), affiché avec la dictée
    nom: 'dictée : avec l’IA allumée, la politique et les CGU déclarent Anthropic ; la version des CGU change',
    reel: true,
    async executer({ ouvrir, verifier }) {
      const conf = await ouvrir({ reel: true, distReel: construireDistIa(), chemin: '/confidentialite', largeur: 375 });
      const t = await texteDe(conf.page);
      verifier(t.includes('Dictée vocale (analyse par intelligence artificielle).') && t.includes('Mallettico ne reçoit jamais le son'),
        'article 2 : la dictée est décrite');
      verifier(t.includes('Anthropic') && t.includes('clauses contractuelles types'), 'article 4 : Anthropic est listé, avec ses garanties');
      verifier(t.includes('conservé 12 mois, puis supprimé'), 'article 3 : durée du journal des analyses');
      verifier(t.includes(`Version du ${CGU_VERSION_DATE_IA}`), 'la politique change de version');
      const cgu = await ouvrir({ reel: true, distReel: construireDistIa(), chemin: '/cgu', largeur: 375 });
      const c = await texteDe(cgu.page);
      verifier(c.includes(`Version du ${CGU_VERSION_DATE_IA}`), 'les CGU changent de version (acceptation redemandée)');
      verifier(c.includes('sous-traitants ultérieurs') && c.includes('intelligence artificielle, qui peut se tromper'),
        'CGU : sous-traitance (art. 11) et relecture de la dictée (art. 7)');
    },
  },
  {
    nom: 'dictée : avec l’IA éteinte (build livré), rien n’annonce Anthropic ni la dictée',
    async executer({ ouvrir, verifier }) {
      const conf = await ouvrir({ chemin: '/confidentialite', largeur: 375 });
      const t = await texteDe(conf.page);
      verifier(t.includes('Article 4') && !t.includes('Anthropic') && !t.includes('Dictée vocale'), 'politique sans la dictée');
      verifier(t.includes('Version du 24 octobre 2026'), 'politique : version inchangée');
      const cgu = await ouvrir({ chemin: '/cgu', largeur: 375 });
      const c = await texteDe(cgu.page);
      verifier(c.includes(`Version du ${CGU_VERSION_DATE}`) && !c.includes('sous-traitants ultérieurs'), 'CGU : version et texte inchangés');
    },
  },
  {
    // D-07, 3e condition : taper au clavier pendant que le micro écoute. Avant : l'analyse partait au milieu de la
    // frappe (le silence se comptait depuis le dernier mot parlé), et un résultat tardif du micro recopiait le texte
    // déjà entendu derrière la correction.
    nom: 'dictée : corriger au clavier pendant l’écoute coupe le micro, sans analyse intempestive ni texte en double',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page, appels } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }));
      await cliquer(page, 'Démarrer la dictée', { dans: '[role="dialog"]' });
      await attendre(400);
      verifier(await page.evaluate(() => window.__microEcoute === true), 'le micro écoute');
      await page.evaluate(() => window.__micro.emettre(['Madame Dupont 12 rue des Lilas']));
      await attendre(300);
      verifier((await dialogue(page)).texte === 'Madame Dupont 12 rue des Lilas', 'le texte entendu s’affiche dans le champ');

      const CORRIGE = 'Madame Durand 12 rue des Lilas, 15 m² de carrelage à 45 euros';
      await saisir(page, '#dictee-texte', CORRIGE);
      await attendre(300);
      const apres = await dialogue(page);
      verifier(apres.micro === 'Démarrer la dictée' && (await page.evaluate(() => window.__microEcoute)) === false,
        `taper coupe le micro (${apres.micro})`);
      // Le navigateur livre encore un résultat après l'arrêt : il ne doit rien ajouter
      await page.evaluate(() => window.__micro.emettre(['Madame Dupont 12 rue des Lilas']));
      await attendre(300);
      verifier((await dialogue(page)).texte === CORRIGE, `la correction n’est ni doublée ni écrasée (${(await dialogue(page)).texte})`);
      await attendre(4500); // plus que le délai de silence (3,5 s)
      verifier(appels.length === 0, `aucune analyse lancée pendant la correction (${appels.length})`);
      verifier((await dialogue(page)).texte === CORRIGE, 'l’artisan est toujours sur son texte');

      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      verifier(appels.length === 1 && appels[0].corps.transcript === CORRIGE, 'c’est le texte corrigé qui part à l’analyse');
    },
  },
  {
    nom: 'dictée : API indisponible → message court, le texte reste, « Saisir mon devis à la main » ouvre un devis',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page, appels } = await ouvrirDictee(ctx,
        () => json({ error: 'Dictée indisponible pour le moment. Saisissez votre devis à la main.', code: 'IA_INDISPONIBLE' }, 503));
      const TEXTE = 'Madame Durand, 15 m² de carrelage à 45 euros';
      await saisir(page, '#dictee-texte', TEXTE);
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const d = await dialogue(page);
      verifier(appels.length === 1, 'la fonction a été appelée');
      verifier(appels[0].jeton === 'Bearer jeton.factice.test', 'avec le jeton du compte connecté');
      verifier(appels[0].corps.organisation === ORG, `avec l’organisation active (${appels[0].corps.organisation})`);
      verifier(d.alerte === 'Dictée indisponible pour le moment. Saisissez votre devis à la main.', `message du serveur affiché tel quel (${d.alerte})`);
      verifier(!/non-2xx|Edge Function/i.test(d.alerte), 'aucun message technique');
      verifier(d.texte === TEXTE, 'le texte dicté reste dans le champ');
      verifier(!d.boutons.some((b) => /^Créer/.test(b)), `pas de faux succès (${d.boutons.join(' | ')})`);
      await cliquer(page, 'Saisir mon devis à la main', { dans: '[role="dialog"]' });
      await attendre(1500);
      const fin = await page.evaluate(() => ({
        dialogue: !!document.querySelector('[role="dialog"] #dictee-texte'),
        page: localStorage.getItem('cp_current_page'),
      }));
      verifier(!fin.dialogue && fin.page === 'devis', `la dictée se ferme et l’écran des devis s’ouvre (${JSON.stringify(fin)})`);
    },
  },
  {
    nom: 'dictée : quota du mois atteint (serveur) → message, saisie à la main et offres proposées',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page } = await ouvrirDictee(ctx, () => json({
        error: 'Vos 10 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez à une offre sans limite.',
        code: 'QUOTA_ATTEINT', quota: { limite: 10, utilise: 10, plan: 'gratuit' },
      }, 429));
      await saisir(page, '#dictee-texte', 'Facture pour Madame Leroy : dépannage 150 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const d = await dialogue(page);
      verifier(d.alerte.startsWith('Vos 10 dictées du mois sont utilisées.'), `message du quota (${d.alerte})`);
      verifier(d.boutons.includes('Saisir mon devis à la main') && d.boutons.includes('Voir les offres'), `suites proposées (${d.boutons.join(' | ')})`);
    },
  },
  {
    nom: 'dictée : réponse de l’analyse → relecture avant toute création',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page, appels } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION, quota: { limite: 10, utilise: 4, plan: 'gratuit' } }));
      await saisir(page, '#dictee-texte', 'Madame Durand, 15 m² de carrelage à 45 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const relecture = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(appels.length === 1, 'une analyse');
      verifier(relecture.includes('Un devis de carrelage pour Madame Durand.'), 'le résumé de l’analyse est affiché');
      verifier(/Créer/.test(relecture), 'la création attend la validation de l’artisan');
    },
  },
];
