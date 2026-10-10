// Compte : suppression (démo), code testeur, retours utilisateurs, assistant de configuration.

// Ouvre l'assistant depuis la jauge « Profil complété » et va à sa dernière étape
async function assistantDerniereEtape(page, { cliquer }) {
  await cliquer(page, 'Cliquez pour voir les champs manquants');
  await cliquer(page, 'Compléter avec l\'assistant');
  for (let i = 0; i < 4; i++) await cliquer(page, 'Suivant →');
}
const etatAssistant = (page) => page.evaluate(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const boutons = [...document.querySelectorAll('button')].filter(visible).map((b) => b.innerText.trim());
  const liste = document.querySelector('[data-assistant="manquantes"]');
  return {
    etape: document.body.innerText.includes('Étape 5/5'),
    manquantes: liste ? [...liste.querySelectorAll('li')].map((l) => l.innerText) : [],
    terminer: boutons.includes('Terminer'),
    completer: boutons.includes('Compléter le profil'),
    debordement: document.documentElement.scrollWidth - innerWidth,
  };
});

module.exports = [
  {
    nom: 'assistant de configuration : sans décennale, il liste ce qui bloque l’envoi au lieu de dire « terminée »',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      await cliquer(page, 'Assurances');
      await saisir(page, '#settings-field-decennaleAssureur', '');
      await attendre(1200); // saisie différée (800 ms)
      await assistantDerniereEtape(page, { cliquer });
      const sans = await etatAssistant(page);
      verifier(sans.etape, 'dernière étape de l’assistant atteinte');
      verifier(sans.manquantes.length === 1 && sans.manquantes[0].includes('Assurance décennale') && sans.manquantes[0].includes('Assurances'),
        `la décennale est listée, avec son onglet (${JSON.stringify(sans.manquantes)})`);
      verifier(!sans.terminer && sans.completer, 'pas de « Terminer », mais « Compléter le profil »');
      verifier(sans.debordement <= 0, `rien ne déborde à 375 px (${sans.debordement} px)`);

      await page.evaluate(() => document.querySelector('[data-assistant="manquantes"] li button').click());
      await attendre(600);
      const apres = await page.evaluate(() => ({ ferme: !document.body.innerText.includes('Étape 5/5'), focus: document.activeElement?.id }));
      verifier(apres.ferme, 'l’assistant se ferme');
      verifier(apres.focus === 'settings-field-decennaleAssureur', `le champ de la décennale reçoit le curseur (${apres.focus})`);

      // Profil d'envoi complet (téléphone vide, non bloquant, pour que la jauge ouvre encore l'assistant) : réussite
      await saisir(page, '#settings-field-decennaleAssureur', 'SMABTP');
      await attendre(1200);
      await cliquer(page, 'Identité');
      await saisir(page, '#settings-field-tel', '');
      await attendre(1200);
      await assistantDerniereEtape(page, { cliquer });
      const avec = await etatAssistant(page);
      verifier(avec.manquantes.length === 0 && avec.terminer, 'profil d’envoi complet : « Terminer », aucune liste');
      await cliquer(page, 'Terminer');
      verifier(await page.evaluate(() => document.body.innerText.includes('Configuration terminée !')), 'message de réussite');
    },
  },
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
