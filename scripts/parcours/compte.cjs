// Compte : suppression (démo), code testeur, retours utilisateurs.
module.exports = [
  {
    nom: 'suppression de compte : modale plein écran, confirmation exigée, données effacées',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 1440 });
      await cliquer(page, 'Avancé');
      await cliquer(page, 'Données');
      await cliquer(page, 'Supprimer mon compte');
      const etat = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const b = d && [...d.querySelectorAll('button')].find((x) => x.innerText.includes('Supprimer définitivement'));
        return { dialogue: !!d, dansBody: d?.parentElement?.parentElement === document.body, desactive: b?.disabled };
      });
      verifier(etat.dialogue && etat.dansBody, 'la modale est rendue au niveau du document');
      verifier(etat.desactive === true, 'bouton désactivé tant que SUPPRIMER n’est pas saisi');
      await saisir(page, '[role="dialog"] input', 'supprimer');
      const avant = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cp_') || k.startsWith('mallettico')).length);
      await cliquer(page, 'Supprimer définitivement', { dans: '[role="dialog"]' });
      await attendre(500);
      const apres = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cp_') || k.startsWith('mallettico')).length);
      verifier(avant > 0 && apres === 0, `données locales effacées (${avant} → ${apres})`);
    },
  },
  {
    nom: 'code testeur : plan offert affiché sans prélèvement ni bouton Stripe',
    async executer({ ouvrir, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'plan', largeur: 1440, plan: 'gratuit' });
      await saisir(page, '#code-testeur', 'AMIS-ARTISANS-7K3PX9');
      await page.evaluate(() => document.getElementById('code-testeur').form.requestSubmit());
      await attendre(800);
      const texte = await page.evaluate(() => document.body.innerText);
      const pastille = await page.evaluate(() => [...document.querySelectorAll('[data-ui="Pastille"]')].some((p) => p.innerText.trim() === 'Offert'));
      verifier(pastille, 'pastille « Offert »');
      verifier(/Offert jusqu'au .+ — aucun prélèvement/.test(texte), 'date de fin affichée');
      verifier(!texte.includes('Mes factures et paiement'), 'pas d’accès au portail Stripe');
    },
  },
  {
    nom: 'retours : un message envoyé apparaît avec son statut',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 1440 });
      await cliquer(page, 'Signaler un problème ou proposer une idée');
      await saisir(page, '[role="dialog"] textarea', 'Le bouton Envoyer ne réagit pas sur mon téléphone.');
      await cliquer(page, 'Envoyer', { dans: '[role="dialog"]' });
      await attendre(500);
      const liste = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] li')].map((l) => l.innerText));
      verifier(liste.some((l) => l.includes('Envoyé') && l.includes('ne réagit pas')), 'retour listé avec le statut « Envoyé »');
    },
  },
];
