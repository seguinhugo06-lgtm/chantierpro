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
