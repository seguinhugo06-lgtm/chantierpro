// Parcours de la dictée vocale (mode « réel simulé »), sur un build de TEST où FONCTIONS.ia est allumé
// (scripts/lib/vite-ia.config.mjs, dans audit-ui/dist-ia-reel) : le code livré garde l'IA éteinte (D-07).
// Le micro est simulé (le navigateur de test n'en a pas) ; la fonction voice-intent est simulée par le faux Supabase.
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { creerBase, ORG, json } = require('../lib/fauxSupabase.cjs');
const { RACINE } = require('../lib/navigateur.cjs');
const { CGU_VERSION_DATE, CGU_VERSION_DATE_IA, CGU_VERSION_IA, IA_ALLUMEE } = require('../lib/cgu.cjs');

// Version du texte de l'écran d'accord, lue dans l'app (src/lib/accordIa.js) : le parcours suit son changement.
const ACCORD_VERSION = (fs.readFileSync(path.join(RACINE, 'src', 'lib', 'accordIa.js'), 'utf8').match(/ACCORD_IA_VERSION = '([^']+)'/) || [])[1];
if (!ACCORD_VERSION) throw new Error('ACCORD_IA_VERSION introuvable dans src/lib/accordIa.js');
const { UID } = require('../lib/fauxSupabase.cjs');
const accordDonne = () => ({ id: 'accord-1', user_id: UID, fonction: 'dictee', version: ACCORD_VERSION, accepte_le: '2026-11-04T08:00:00Z', revoque_le: null });

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

/**
 * Ouvre l'app connectée (faux Supabase), avec le faux micro, puis touche « Dicter ». Par défaut, l'artisan a déjà donné
 * son accord (migration 109) : la fenêtre de dictée s'ouvre. `accord: false` : l'écran « Avant votre première dictée ».
 */
async function ouvrirDictee({ ouvrir, sessionFactice, cliquer, attendre }, voiceIntent, { accord = true, cgu = true, initial = {}, role = 'owner', largeur = 375, page: pageApp } = {}) {
  // CGU en vigueur déjà acceptées (sinon « Dicter » les demande d'abord : scénario à part, cgu: false)
  const metadonnees = cgu ? { cgu_version: CGU_VERSION_IA, cgu_accepted_at: '2026-11-04T08:00:00Z' } : {};
  const base = creerBase({ ...(accord ? { accords_ia: [accordDonne()] } : {}), ...initial }, { filtrer: ['accords_ia'], role });
  const appels = [];
  // Comme Supabase : l'acceptation des CGU (updateUser) est relue dans les métadonnées du compte.
  const utilisateur = () => json({ id: UID, aud: 'authenticated', role: 'authenticated', email: 'test@exemple.fr', user_metadata: metadonnees });
  const { page } = await ouvrir({
    reel: true, distReel: construireDistIa(), largeur, session: { ...sessionFactice(), user: { ...sessionFactice().user, user_metadata: { ...metadonnees } } }, avantChargement: fauxMicro, ...(pageApp ? { page: pageApp } : {}),
    supabase: (req, u) => {
      if (u.pathname === '/auth/v1/user') {
        if (req.method() === 'PUT') { try { Object.assign(metadonnees, JSON.parse(req.postData() || '{}').data || {}); } catch { /* corps illisible */ } }
        return utilisateur();
      }
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
  return { page, appels, base };
}

/** L'écran d'accord affiché (fenêtre commune Modal.jsx), lu dans le [role=dialog]. */
const ecranAccord = (page) => page.evaluate(() => {
  // Plusieurs fenêtres peuvent être ouvertes (formulaire de devis derrière) : on prend celle de l'accord, sinon la première.
  const toutes = [...document.querySelectorAll('[role="dialog"]')];
  const d = toutes.find((x) => /Avant votre première dictée/.test(x.innerText || '')) || toutes[0];
  if (!d) return { ouvert: false };
  const boutons = [...d.querySelectorAll('button')];
  const pleins = boutons.filter((b) => /\bbg-accent\b/.test(b.className));
  return {
    ouvert: /Avant votre première dictée/.test(d.innerText || ''),
    texte: (d.innerText || '').replace(/\s+/g, ' '),
    boutons: boutons.map((b) => (b.innerText || '').trim()),
    focus: (document.activeElement?.innerText || '').trim(),
    pleins: pleins.map((b) => (b.innerText || '').trim()),
    hauteurs: boutons.map((b) => Math.round(b.getBoundingClientRect().height)),
    champDictee: !!d.querySelector('#dictee-texte'),
  };
});
const ecrituresAccord = (base) => base.journal.filter((j) => j.table === 'accords_ia' && j.m !== 'GET');

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
      verifier(c.includes('exécuter le contrat qui le lie à Mallettico') && !c.includes('consent au traitement de ses données'),
        'CGU : la base légale du contrat (art. 11) part avec la nouvelle version');
      verifier(t.includes('nous enregistrons votre compte, la date et la version du texte accepté'), 'politique : l’accord avant la première dictée est déclaré');
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
      verifier(c.includes(`Version du ${CGU_VERSION_DATE}`) && !c.includes('sous-traitants ultérieurs'), 'CGU : version inchangée, sans clause de sous-traitance');
      verifier(c.includes('consent au traitement de ses données') && !c.includes('exécuter le contrat qui le lie à Mallettico'),
        'CGU : l’ancienne phrase de l’article 11 reste tant que la version ne change pas');
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
        error: 'Vos 5 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez au plan Artisan : 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises.',
        code: 'QUOTA_ATTEINT', quota: { limite: 5, utilise: 5, plan: 'gratuit' },
      }, 429));
      await saisir(page, '#dictee-texte', 'Facture pour Madame Leroy : dépannage 150 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const d = await dialogue(page);
      verifier(d.alerte === 'Vos 5 dictées du mois sont utilisées. Saisissez votre devis à la main, ou passez au plan Artisan : 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises.',
        `le message du serveur est affiché tel quel (${d.alerte})`);
      verifier(d.boutons.includes('Saisir mon devis à la main') && d.boutons.includes('Voir les offres'), `suites proposées (${d.boutons.join(' | ')})`);
    },
  },
  {
    nom: 'dictée : réponse de l’analyse → relecture avant toute création',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page, appels } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION, quota: { limite: 5, utilise: 4, plan: 'gratuit' } }));
      await saisir(page, '#dictee-texte', 'Madame Durand, 15 m² de carrelage à 45 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const relecture = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(appels.length === 1, 'une analyse');
      verifier(relecture.includes('Un devis de carrelage pour Madame Durand.'), 'le résumé de l’analyse est affiché');
      verifier(/Créer/.test(relecture), 'la création attend la validation de l’artisan');
    },
  },

  // ── Écran d'accord avant la première dictée (décision d'Hugo du 4 nov. 2026, migration 109) ─────────────────────
  {
    nom: 'dictée : au premier « Dicter », l’écran d’accord (texte exact, focus, 44 px, un seul bouton plein) ; accepter l’enregistre puis ouvre la dictée ; ensuite il ne revient plus',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, verifier } = ctx;
      const { page, appels, base } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }), { accord: false });
      const e = await ecranAccord(page);
      verifier(e.ouvert && !e.champDictee, `l’écran d’accord s’affiche avant la dictée (${e.texte?.slice(0, 80)})`);
      verifier(e.texte?.includes('Votre dictée est analysée par une intelligence artificielle : Claude, de la société Anthropic, qui stocke les données aux États-Unis (le calcul peut avoir lieu dans d\'autres pays).')
        && e.texte.includes('les noms de vos clients (60 au plus) et les libellés de votre catalogue (80 au plus)')
        && e.texte.includes('et les efface sous 30 jours (jusqu\'à 2 ans si ses contrôles de sécurité les signalent).')
        && e.texte.includes('rien n\'est créé sans votre validation.'), 'le texte du juriste, mot pour mot');
      verifier(JSON.stringify(e.boutons) === JSON.stringify(['J\'accepte et je dicte', 'Non, je saisis à la main', 'En savoir plus (Politique de confidentialité, article 4)']),
        `les trois choix, dans l’ordre (${e.boutons.join(' | ')})`);
      verifier(e.focus === 'J\'accepte et je dicte', `le focus est sur le premier bouton (${e.focus})`);
      verifier(e.pleins.length === 1 && e.pleins[0] === 'J\'accepte et je dicte', `un seul bouton plein (${e.pleins.join(' | ')})`);
      verifier(e.hauteurs.every((h) => h >= 44), `cibles de 44 px au moins (${e.hauteurs.join(', ')})`);
      verifier(appels.length === 0 && ecrituresAccord(base).length === 0, 'rien n’est envoyé ni enregistré avant le choix');

      await cliquer(page, 'J\'accepte et je dicte', { dans: '[role="dialog"]' });
      await attendre(1200);
      const ecrit = ecrituresAccord(base);
      verifier(ecrit.length === 1 && ecrit[0].m === 'POST' && JSON.stringify(ecrit[0].corps) === JSON.stringify({ version: ACCORD_VERSION }),
        `l’accord est enregistré avec la seule version du texte (${JSON.stringify(ecrit.map((x) => [x.m, x.corps]))})`);
      verifier((await dialogue(page)).texte !== null, 'puis la fenêtre de dictée s’ouvre');

      await cliquer(page, 'Fermer', { dans: '[role="dialog"]' });
      await attendre(500);
      await cliquer(page, 'Dictée vocale');
      await attendre(1000);
      const deux = await ecranAccord(page);
      verifier(!deux.ouvert && deux.champDictee === true, 'à la dictée suivante, plus d’écran d’accord : la dictée s’ouvre directement');
      verifier(ecrituresAccord(base).length === 1, 'l’accord n’est pas réécrit');
    },
  },
  {
    nom: 'dictée : « Non, je saisis à la main » ouvre un devis sans rien envoyer ni enregistrer',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, verifier } = ctx;
      const { page, appels, base } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }), { accord: false });
      verifier((await ecranAccord(page)).ouvert, 'l’écran d’accord s’affiche');
      await cliquer(page, 'Non, je saisis à la main', { dans: '[role="dialog"]' });
      await attendre(1500);
      const fin = await page.evaluate(() => ({
        accord: [...document.querySelectorAll('[role="dialog"]')].some((x) => /Avant votre première dictée/.test(x.innerText || '')),
        dictee: !!document.querySelector('#dictee-texte'),
        page: localStorage.getItem('cp_current_page'),
      }));
      verifier(!fin.accord && !fin.dictee && fin.page === 'devis', `l’écran se ferme et la saisie d’un devis s’ouvre (${JSON.stringify(fin)})`);
      verifier(appels.length === 0, `aucune analyse demandée (${appels.length})`);
      verifier(ecrituresAccord(base).length === 0, 'aucun accord enregistré');
      await cliquer(page, 'Dictée vocale');
      await attendre(1000);
      verifier((await ecranAccord(page)).ouvert, 'au prochain « Dicter », l’écran revient');
    },
  },
  {
    nom: 'dictée : retirer son accord dans Paramètres › Données fait revenir l’écran à la dictée suivante (1440 px)',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, verifier } = ctx;
      const { page, base } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }), { largeur: 1440, page: 'settings' });
      verifier(!(await ecranAccord(page)).ouvert && (await dialogue(page)).texte !== null, 'avec un accord : la dictée s’ouvre directement');
      await cliquer(page, 'Fermer', { dans: '[role="dialog"]' });
      await attendre(400);
      await cliquer(page, 'Données');
      await attendre(1200);
      const avant = await page.evaluate(() => document.querySelector('[data-accord-ia]')?.getAttribute('data-accord-ia') || null);
      verifier(avant === 'donne', `Paramètres › Données montre l’accord donné (${avant})`);
      await cliquer(page, 'Retirer mon accord');
      await attendre(1200);
      const ecrit = ecrituresAccord(base);
      verifier(ecrit.some((x) => x.m === 'PATCH' && x.corps && 'revoque_le' in x.corps), `le retrait est enregistré (${JSON.stringify(ecrit.map((x) => x.m))})`);
      const apres = await page.evaluate(() => document.querySelector('[data-accord-ia]')?.getAttribute('data-accord-ia') || null);
      verifier(apres === 'absent', `relu après le retrait : plus d’accord en cours (${apres})`);
      await cliquer(page, 'Dictée vocale');
      await attendre(1000);
      const e = await ecranAccord(page);
      verifier(e.ouvert && !e.champDictee, 'à la dictée suivante, l’écran d’accord revient');
    },
  },
  {
    // Contrôle local du 4 nov. 2026 : rien ne prouvait qu'un chef de chantier ne voit pas « Dicter » (droitsDictee).
    // Décision d'Hugo du 5 nov. 2026 (D-37) : la dictée est réservée au propriétaire et à l'administrateur. Le comptable ne
    // pourrait pas retirer son accord (Paramètres lui est fermé) ; il garde ses droits sur les devis. Contre-essai : le
    // propriétaire et l'administrateur ont le bouton (la page est bien chargée, le bouton n'est pas absent pour une autre raison).
    nom: 'dictée : le propriétaire et l’administrateur ont « Dicter » ; le comptable et le chef de chantier n’ont ni bouton ni fenêtre, et le comptable crée toujours un devis',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const vus = {};
      for (const role of ['chef_chantier', 'comptable', 'admin', 'owner']) {
        const base = creerBase({ accords_ia: [accordDonne()] }, { filtrer: ['accords_ia'], role });
        const { page } = await ouvrir({ reel: true, distReel: construireDistIa(), largeur: 375, page: 'devis', session: sessionFactice(), avantChargement: fauxMicro, supabase: base.reponse });
        await attendre(2500);
        vus[role] = await page.evaluate(() => ({
          bouton: !!document.querySelector('button[aria-label="Dictée vocale"]'),
          fenetre: !!document.querySelector('#dictee-texte'),
          creerUnDevis: /Créer mon premier devis|Nouveau devis/.test(document.body.innerText),
        }));
      }
      for (const role of ['owner', 'admin']) verifier(vus[role].bouton, `${role} : le bouton « Dicter » est là (${JSON.stringify(vus[role])})`);
      for (const role of ['comptable', 'chef_chantier']) {
        verifier(!vus[role].bouton && !vus[role].fenetre, `${role} : ni bouton « Dicter » ni fenêtre (${JSON.stringify(vus[role])})`);
      }
      verifier(vus.comptable.creerUnDevis === true, `comptable : il crée toujours un devis à la main (${JSON.stringify(vus.comptable)})`);
      verifier(vus.chef_chantier.creerUnDevis === false, `chef de chantier : pas de création de devis (la vérification distingue bien les rôles) (${JSON.stringify(vus.chef_chantier)})`);
    },
  },
  {
    // Décision d'Hugo du 5 nov. 2026 (D-37) : la FAQ ne promet pas la dictée à ceux qui ne l'ont pas (le comptable), et ses
    // quotas disent qui partage le compteur et que le plafond du jour compte des « analyses ».
    nom: 'dictée : la FAQ n’explique la dictée qu’à ceux qui peuvent dicter, avec les quotas « partagés » et les « analyses » par jour',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const faq = {};
      for (const role of ['comptable', 'owner']) {
        const base = creerBase({ accords_ia: [accordDonne()] }, { filtrer: ['accords_ia'], role });
        const { page } = await ouvrir({ reel: true, distReel: construireDistIa(), largeur: 375, session: sessionFactice(), avantChargement: fauxMicro, supabase: base.reponse });
        await attendre(2500);
        await cliquer(page, 'Mon compte');
        await cliquer(page, 'Aide');
        await attendre(500);
        await cliquer(page, 'FAQ', { dans: '[role="dialog"]' });
        await attendre(400);
        // Les réponses sont dans des <details> repliés : textContent les lit, innerText non
        faq[role] = await page.evaluate(() => ({
          texte: (document.querySelector('[role="dialog"]')?.textContent || '').replace(/\s+/g, ' '),
          questions: [...document.querySelectorAll('[role="dialog"] summary')].map((x) => x.textContent.trim()).length,
        }));
      }
      verifier(faq.owner.questions > 5 && faq.comptable.questions > 5, `la FAQ est chargée dans les deux cas (${faq.owner.questions}, ${faq.comptable.questions} questions)`);
      verifier(!faq.comptable.texte.includes('Comment fonctionne la dictée') && !faq.comptable.texte.includes('Touchez « Dicter »'),
        'comptable : la FAQ ne lui explique pas une dictée qu’il n’a pas');
      verifier(faq.owner.texte.includes('Comment fonctionne la dictée'), 'propriétaire : la question sur la dictée est là');
      verifier(faq.owner.texte.includes('Plan Gratuit : 5 dictées par mois, partagées entre les utilisateurs de l’entreprise ; plan Artisan : 100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises ; plan Équipe : dictées sans limite mensuelle (100 analyses par jour et par personne au plus).'),
        `propriétaire : les quotas sont dits mot pour mot (${faq.owner.texte.slice(faq.owner.texte.indexOf('Plan Gratuit'), faq.owner.texte.indexOf('Plan Gratuit') + 120)})`);
    },
  },
  {
    // Décision d'Hugo du 5 nov. 2026 (D-37) : les CGV de l'allumage (article 4) disent que le quota est partagé, que le
    // plafond du jour compte les échecs, et qu'au plan Gratuit les dictées des autres entreprises gratuites comptent aussi.
    // Textes de juriste-btp (avis du 4 nov., C.2), mot pour mot ; le build livré (IA éteinte) n'en dit rien.
    nom: 'dictée : les CGV (IA allumée) disent le quota partagé, les échecs compris et les autres entreprises gratuites ; IA éteinte, rien de cela',
    reel: true,
    async executer({ ouvrir, verifier }) {
      const lu = (t) => String(t || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
      const avec = lu(await texteDe((await ouvrir({ reel: true, distReel: construireDistIa(), chemin: '/cgv', largeur: 375 })).page));
      verifier(avec.includes('5 dictées par mois, partagées entre les utilisateurs de l’entreprise'), 'CGV : le plan Gratuit partage ses 5 dictées entre les utilisateurs de l’entreprise');
      verifier(avec.includes('100 dictées par mois par abonnement, partagées entre ses utilisateurs et ses entreprises'), 'CGV : le plan Artisan compte par abonnement');
      verifier(avec.includes('Dictées sans limite mensuelle (100 analyses par jour et par personne au plus). 100 analyses par jour et par personne, échecs compris.'),
        'CGV : le plan Équipe dit « analyses », puis « échecs compris »');
      verifier(avec.includes('au plan Gratuit, vos dictées dans vos autres entreprises au plan Gratuit comptent aussi.'), 'CGV : au plan Gratuit, les dictées des autres entreprises gratuites comptent aussi');
      verifier(!/\(100 par jour/.test(avec), 'CGV : plus de « (100 par jour… » sans « analyses »');
      const sans = lu(await texteDe((await ouvrir({ chemin: '/cgv', largeur: 375 })).page));
      verifier(sans.includes('Article 4 - Plans tarifaires') && !/dictée|échecs compris|autres entreprises au plan Gratuit/i.test(sans), 'build livré (IA éteinte) : les CGV ne parlent ni de dictée, ni d’échecs, ni d’autres entreprises');
    },
  },
  {
    // Décision d'Hugo du 5 nov. 2026 (D-37) : la ligne « Dictées » de la page des tarifs dit qui partage le quota et que le
    // plafond du jour compte des « analyses ». Ces valeurs sont longues : ni le tableau (ou la liste, au téléphone) ni les
    // cartes ne doivent déborder de la page. Sur le build livré (IA éteinte), la ligne n'existe pas (parcours « site »).
    nom: 'dictée : la page des tarifs (IA allumée) dit les quotas partagés dans la ligne « Dictées », sans déborder (375 et 1440 px)',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const ATTENDU = [
        '5 par mois, partagées entre les utilisateurs de l’entreprise',
        '100 par mois par abonnement, partagées entre ses utilisateurs et ses entreprises',
        'Sans limite mensuelle (100 analyses par jour et par personne au plus)',
      ];
      const lu = (t) => String(t || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
      for (const largeur of [375, 1440]) {
        const a = `(${largeur} px)`;
        const { page } = await ouvrir({ reel: true, distReel: construireDistIa(), chemin: '/', largeur });
        await attendre(2500);
        await cliquer(page, 'Comparer les plans en détail', { dans: '#pricing' });
        await attendre(900);
        const etat = await page.evaluate(() => {
          const visible = (el) => el.getClientRects().length > 0;
          const lignes = [...document.querySelectorAll('#pricing [data-ligne]')].filter(visible);
          const ligne = lignes.find((l) => /^Dictées$/.test((l.querySelector('[data-libelle]')?.textContent || '').trim()));
          const cases = ligne ? [...ligne.querySelectorAll('[data-case]')] : [];
          const cartes = [...document.querySelectorAll('#pricing [data-plan] [data-limite="dictees"] dd')];
          return {
            lignes: lignes.length,
            tableau: cases.map((c) => c.textContent),
            debordeCase: cases.some((c) => c.scrollWidth > c.clientWidth + 1),
            cartes: cartes.map((d) => d.textContent),
            debordeCarte: cartes.some((d) => d.scrollWidth > d.clientWidth + 1),
            page: document.documentElement.scrollWidth - window.innerWidth,
            petit: [...cases, ...cartes].some((c) => parseFloat(getComputedStyle(c).fontSize) < 12),
          };
        });
        verifier(etat.lignes >= 5, `la comparaison des plans est ouverte ${a} (${etat.lignes} lignes)`);
        verifier(JSON.stringify(etat.tableau.map(lu)) === JSON.stringify(ATTENDU), `ligne « Dictées » du tableau : les trois textes, dans l’ordre des plans ${a} (${etat.tableau.map(lu).join(' | ')})`);
        verifier(JSON.stringify(etat.cartes.map(lu)) === JSON.stringify(ATTENDU), `cartes : la même ligne « Dictées » ${a} (${etat.cartes.map(lu).join(' | ')})`);
        verifier(!etat.debordeCase && !etat.debordeCarte && etat.page <= 0, `rien ne déborde, ni dans les cases, ni dans les cartes, ni dans la page ${a} (case ${etat.debordeCase}, carte ${etat.debordeCarte}, page +${etat.page} px)`);
        verifier(!etat.petit, `texte de 12 px au moins ${a}`);
      }
    },
  },
  {
    // Contrôle local du 4 nov. 2026 (3e condition de D-07) : taper au clavier collait les mots (« devis pourM »).
    nom: 'dictée : taper au clavier, touche par touche, garde les espaces',
    reel: true,
    async executer(ctx) {
      const { attendre, verifier } = ctx;
      const { page } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }));
      const TEXTE = 'Madame Durand, 15 m² de carrelage';
      await page.focus('#dictee-texte');
      await page.keyboard.type(TEXTE, { delay: 15 });
      await attendre(300);
      const v = (await dialogue(page)).texte;
      verifier(v === TEXTE, `la valeur est exactement celle tapée (« ${v} »)`);
    },
  },
  {
    // Juriste-btp du 4 nov. 2026 : la clause qui autorise Anthropic (CGU art. 11, RGPD art. 28.2) est dans les CGU de
    // l'allumage ; elles sont demandées dès « Dicter », avant l'écran d'accord. Constaté aussi le 4 nov. : à z-[9999], la
    // dictée cachait cette demande (z-[1050]) ; la dictée est passée à z-[1040].
    nom: 'dictée : CGU pas acceptées → « Dicter » les demande d’abord (annuler n’ouvre rien) ; acceptées, l’écran d’accord suit ; la création ne les redemande pas',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier } = ctx;
      const { page, appels, base } = await ouvrirDictee(ctx, () => json({ success: true, intention: INTENTION }), { accord: false, cgu: false });
      const fenetres = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => (d.innerText || '').replace(/\s+/g, ' ').slice(0, 160)));
      let f = await fenetres();
      verifier(f.length === 1 && /Conditions générales d'utilisation/.test(f[0]) && /utiliser la dictée|Avant votre première dictée, lisez/.test(f[0]),
        `« Dicter » demande d’abord les CGU (${f.join(' || ')})`);
      await cliquer(page, 'Annuler', { dans: '[role="dialog"]' });
      await attendre(800);
      f = await fenetres();
      verifier(f.length === 0 && appels.length === 0 && ecrituresAccord(base).length === 0, `annuler : ni écran d’accord, ni dictée, rien d’envoyé (${f.join(' || ')})`);

      await cliquer(page, 'Dictée vocale');
      await attendre(1000);
      await page.evaluate(() => {
        const corps = [...document.querySelectorAll('[role="dialog"] .overflow-y-auto')].find((x) => /Article 1 - Objet/.test(x.innerText));
        if (corps) corps.scrollTop = corps.scrollHeight;
      });
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] input[type="checkbox"]')].pop()?.click());
      await attendre(300);
      await cliquer(page, 'Accepter et continuer');
      await attendre(1500);
      verifier((await ecranAccord(page)).ouvert, 'les CGU acceptées, l’écran d’accord suit');
      await cliquer(page, 'J\'accepte et je dicte', { dans: '[role="dialog"]' });
      await attendre(1200);
      await saisir(page, '#dictee-texte', 'Madame Durand, 15 m² de carrelage à 45 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => /^Créer/.test((x.innerText || '').trim()));
        b?.click();
      });
      for (let i = 0; i < 20 && !(base.tables.devis || []).length; i++) await attendre(500);
      verifier((base.tables.devis || []).length === 1, `le devis dicté est créé sans redemander les CGU (${(base.tables.devis || []).length})`);
    },
  },
  {
    // Contrôle local du 4 nov. 2026 (écart « Juriste 9 ») : en franchise, une ligne reprise du catalogue gardait 20 %.
    nom: 'dictée en franchise (micro-entreprise) : ligne du catalogue à 0 %, ni « HT » ni « TTC » à la relecture ; le devis créé n’a pas de TVA et l’aperçu imprimé porte la mention 293 B',
    reel: true,
    async executer(ctx) {
      const { attendre, cliquer, saisir, verifier, ouvrir, sessionFactice } = ctx;
      const ORG_ = ORG;
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000901', user_id: UID, organization_id: ORG_, nom: 'Élec Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', adresse: '1 rue Imaginaire', code_postal: '24000', ville: 'Exempleville',
        is_active: true, is_default: true, settings_json: { reglages: { nomEntrepreneur: 'Jean Exemple' } }, created_at: '2026-01-01T00:00:00Z',
        cgu_accepted_at: '2026-11-04T08:00:00Z', cgu_version: CGU_VERSION_IA };
      const ARTICLE = { id: 'a0a0a0a0-0000-4000-8000-000000000901', user_id: UID, organization_id: ORG_, designation: 'Carrelage grès cérame', unite: 'm²', prix_unitaire_ht: 45, tva_rate: 20, actif: true, created_at: '2026-01-01T00:00:00Z' };
      const intention = { ...INTENTION, document: { type: 'devis', notes: null, lignes: [
        { description: 'Carrelage grès cérame', quantite: 15, unite: 'm²', prixUnitaire: null },
        { description: 'Plinthes', quantite: 10, unite: 'ml', prixUnitaire: 8 },
      ] } };
      const { page, base } = await ouvrirDictee(ctx, () => json({ success: true, intention }), { initial: { entreprise: [ENTREPRISE], catalogue: [ARTICLE] } });
      await saisir(page, '#dictee-texte', 'Madame Durand, 15 m² de carrelage grès cérame et 10 mètres de plinthes à 8 euros');
      await cliquer(page, 'Analyser ma dictée', { dans: '[role="dialog"]' });
      await attendre(1500);
      const relecture = await page.evaluate(() => (document.querySelector('[role="dialog"]')?.innerText || '').replace(/\s+/g, ' '));
      verifier(/Prix repris du catalogue : Carrelage grès cérame/.test(relecture), `la ligne vient du catalogue (taux 20 %) (${relecture.slice(0, 160)})`);
      const ht = relecture.match(/.{0,30}(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ]).{0,30}/);
      verifier(!ht, `ni « HT » ni « TTC » à la relecture (${ht ? ht[0] : ''})`);
      verifier(/TVA non applicable, art\. 293 B du CGI/.test(relecture) && /Total 755,00 €/.test(relecture), `un seul total (675 + 80 = 755 €) et la mention 293 B (${relecture.slice(-200)})`);
      verifier(!(await page.evaluate(() => !!document.querySelector('[role="dialog"] #dictee-tva'))), 'pas de choix de taux');

      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => /^Créer/.test((x.innerText || '').trim()));
        b?.click();
      });
      for (let i = 0; i < 30 && !(base.tables.devis || []).length; i++) await attendre(500);
      await attendre(500);
      const cree = (base.tables.devis || [])[0];
      const lignes = cree ? JSON.parse(cree.lignes || '[]').filter((l) => !l._isSection && !l.isSection && l.description) : [];
      verifier(!!cree && cree.tva_rate === 0 && cree.total_tva === 0 && cree.total_ht === 755 && cree.total_ttc === 755,
        `le devis enregistré : taux 0, TVA 0, total = HT (${cree ? JSON.stringify({ tva_rate: cree.tva_rate, total_tva: cree.total_tva, total_ht: cree.total_ht, total_ttc: cree.total_ttc })
          : `aucun ; écritures : ${base.journal.filter((j) => j.m !== 'GET').map((j) => `${j.m} ${j.table}`).join(', ')} ; fenêtre : ${(await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '')).replace(/\s+/g, ' ').slice(-200)}`})`);
      verifier(lignes.length === 2 && lignes.every((l) => Number(l.tva) === 0), `chaque ligne à 0 %, celle du catalogue comprise (${lignes.map((l) => l.tva).join(', ')})`);

      // Le second générateur (aperçu imprimé de DevisPage) sur ce devis, une fois accepté : la mention 293 B, ni HT ni TTC.
      if (cree) {
        const base2 = creerBase({ entreprise: [ENTREPRISE], devis: [{ ...cree, statut: 'accepte', numero: 'DEV-2026-0901' }], clients: base.tables.clients || [], accords_ia: [accordDonne()] }, { filtrer: ['accords_ia'] });
        const { page: p2 } = await ouvrir({ reel: true, distReel: construireDistIa(), largeur: 1440, page: 'devis', session: sessionFactice(UID), supabase: base2.reponse });
        await attendre(2500);
        const ouvert = await p2.evaluate(() => {
          const ligne = [...document.querySelectorAll('button, [role="button"], tr, a')].find((x) => /DEV-2026-0*901/.test(x.innerText || ''));
          ligne?.click();
          return !!ligne;
        });
        verifier(ouvert, 'le devis dicté est dans la liste');
        await attendre(1500);
        // Comme documents.cjs (actionFiche) : le bouton direct, sinon le menu « Plus d'actions ».
        const l = ['Aperçu', 'Aperçu du document'];
        let apercu = await p2.evaluate((lib) => {
          const b = [...document.querySelectorAll('button')].find((x) => lib.includes((x.innerText || '').trim()) || lib.includes(x.title) || lib.includes(x.getAttribute('aria-label')));
          b?.click();
          return !!b;
        }, l);
        if (!apercu && await p2.evaluate(() => { const b = document.querySelector('button[aria-label="Plus d\'actions"]'); b?.click(); return !!b; })) {
          await attendre(400);
          apercu = await p2.evaluate((lib) => {
            const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => lib.includes((x.innerText || '').trim()));
            b?.click();
            return !!b;
          }, l);
        }
        verifier(apercu, 'l’aperçu s’ouvre');
        await attendre(1200);
        const imprime = await p2.evaluate(() => {
          const f = [...document.querySelectorAll('iframe')].find((x) => (x.getAttribute('srcdoc') || '').length > 100);
          const lu = new DOMParser().parseFromString(f?.getAttribute('srcdoc') || '', 'text/html');
          lu.querySelectorAll('style, script').forEach((x) => x.remove());
          return (lu.body?.textContent || '').replace(/\s+/g, ' ');
        });
        const htImprime = imprime.match(/.{0,30}(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ]).{0,30}/);
        verifier(/TVA non applicable, article 293 B du CGI/.test(imprime) && !htImprime,
          `aperçu imprimé (générateur de DevisPage) : mention 293 B, ni « HT » ni « TTC » (${htImprime ? htImprime[0] : imprime.slice(0, 80)})`);
      }
    },
  },
];
