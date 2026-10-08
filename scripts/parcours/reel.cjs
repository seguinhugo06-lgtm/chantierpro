// Mode « réel simulé » : l'app pointe vers un faux Supabase dont le parcours contrôle les réponses.
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

module.exports = [
  {
    nom: 'mot de passe oublié : lien demandé vers le site, message neutre',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const appels = [];
      const { page } = await ouvrir({
        reel: true, largeur: 1440,
        supabase: (req, u) => {
          appels.push({ chemin: u.pathname, recherche: u.search, corps: req.postData() || '' });
          if (u.pathname === '/auth/v1/recover') return json({});
          return json([]);
        },
      });
      await cliquer(page, 'Connexion');
      await cliquer(page, 'Mot de passe oublié ?');
      await saisir(page, 'input[type="email"]', 'artisan@exemple.fr');
      await cliquer(page, 'Envoyer le lien');
      await attendre(800);
      const recover = appels.find((a) => a.chemin === '/auth/v1/recover');
      verifier(!!recover, 'Supabase a reçu la demande de réinitialisation');
      verifier(decodeURIComponent(recover.recherche).includes('redirect_to=http://localhost:4999/'), `retour vers le site (${recover.recherche})`);
      const info = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((e) => e.innerText).join(' '));
      verifier(info.includes('Si un compte existe pour artisan@exemple.fr'), 'message qui ne révèle pas si le compte existe');
    },
  },
  {
    nom: 'connexion refusée : message en français',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({
        reel: true, largeur: 1440,
        supabase: (req, u) => (u.pathname === '/auth/v1/token'
          ? json({ error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
          : json([])),
      });
      await cliquer(page, 'Connexion');
      await saisir(page, 'input[type="email"]', 'artisan@exemple.fr');
      await saisir(page, 'input[type="password"]', 'mauvais-mot-de-passe');
      await page.evaluate(() => document.querySelector('input[type="password"]').form.requestSubmit());
      await attendre(1000);
      const alerte = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText).join(' '));
      verifier(alerte.includes('E-mail ou mot de passe incorrect.'), `alerte traduite (${alerte || 'aucune'})`);
    },
  },
  {
    nom: 'connexion réussie : bienvenue demandée pour le compte connecté, sans adresse fournie',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const bienvenues = [];
      const maintenant = Math.floor(Date.now() / 1000);
      const utilisateur = {
        id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'artisan@exemple.fr',
        app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString(),
      };
      const { page } = await ouvrir({
        reel: true, largeur: 1440,
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/token') {
            return json({ access_token: 'jeton.factice.test', token_type: 'bearer', expires_in: 3600, expires_at: maintenant + 3600, refresh_token: 'r', user: utilisateur });
          }
          if (u.pathname === '/functions/v1/send-lifecycle-email') {
            bienvenues.push({ corps: JSON.parse(req.postData() || '{}'), jeton: req.headers().authorization || '' });
            return json({ success: true, id: 're_test' });
          }
          if (u.pathname === '/auth/v1/user') return json(utilisateur);
          return json([]);
        },
      });
      await cliquer(page, 'Connexion');
      await saisir(page, 'input[type="email"]', 'artisan@exemple.fr');
      await saisir(page, 'input[type="password"]', 'motdepasse123');
      await page.evaluate(() => document.querySelector('input[type="password"]').form.requestSubmit());
      await attendre(2500);
      verifier(bienvenues.length === 1, `une seule demande de bienvenue (${bienvenues.length})`);
      verifier(JSON.stringify(bienvenues[0]?.corps) === JSON.stringify({ type: 'welcome' }), `corps sans adresse : ${JSON.stringify(bienvenues[0]?.corps)}`);
      verifier(bienvenues[0]?.jeton === 'Bearer jeton.factice.test', 'appel fait avec le jeton du compte connecté');
    },
  },
  {
    nom: 'Supabase injoignable : bandeau d’échec au lieu de listes vides',
    reel: true,
    async executer({ ouvrir, sessionFactice, verifier }) {
      const { page } = await ouvrir({ reel: true, largeur: 390, page: 'clients', session: sessionFactice(), supabase: () => 'panne' });
      await new Promise((r) => setTimeout(r, 5000));
      const alerte = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText).join(' '));
      verifier(alerte.includes('n’ont pas pu être chargées') && alerte.includes('clients'), 'bandeau nommant les données manquantes');
      const bouton = await page.evaluate(() => [...document.querySelectorAll('[role="alert"] button')].some((b) => b.innerText.trim() === 'Réessayer'));
      verifier(bouton, 'bouton Réessayer');
    },
  },
];
