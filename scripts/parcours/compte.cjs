// Compte : suppression (démo), code testeur, retours utilisateurs, assistant de configuration.

// Ouvre l'assistant depuis la jauge « Profil complété » et va à sa dernière étape
// (`pendant(etape)` : geste fait dans l'assistant à l'étape donnée, avant « Suivant »)
async function assistantDerniereEtape(page, { cliquer }, pendant = async () => {}) {
  await cliquer(page, 'Cliquez pour voir les champs manquants');
  await cliquer(page, 'Compléter avec l\'assistant');
  for (let i = 0; i < 4; i++) { await pendant(i); await cliquer(page, 'Suivant →'); }
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

// La jauge « Profil complété » : son chiffre, la ligne sous le chiffre et, menu ouvert, ses groupes (lib/jaugeProfil)
const lireJauge = (page) => page.evaluate(() => {
  const jauge = document.querySelector('[title="Cliquez pour voir les champs manquants"], [title="Profil complet !"]');
  const groupes = {};
  document.querySelectorAll('[data-groupe]').forEach((g) => { groupes[g.dataset.groupe] = [...g.querySelectorAll('li')].map((l) => l.innerText); });
  const menu = document.querySelector('[data-groupe]')?.closest('.absolute')?.getBoundingClientRect();
  return {
    ouvrable: jauge?.title === 'Cliquez pour voir les champs manquants',
    texte: jauge?.innerText || '',
    groupes,
    assistant: [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Compléter avec l\'assistant'),
    dansEcran: !menu || (menu.left >= 0 && menu.right <= innerWidth),
    debordement: document.documentElement.scrollWidth - innerWidth,
  };
});

module.exports = [
  {
    nom: 'jauge du profil : capital, médiateur, RCS et TVA intracom rangés selon la situation de l’entreprise, à 375 px',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      // Démo : SARL complète (capital, RCS, TVA intracom), sans médiateur ni coordonnées de l'assureur décennal,
      // hors pourcentage : 100 %, et le menu s'ouvre quand même (avant : fermé dès 100 %)
      const complet = await lireJauge(page);
      verifier(complet.texte.includes('100 %') && complet.texte.includes('2 mentions obligatoires selon votre situation') && complet.ouvrable,
        `100 % et ce qui reste dû dit sous le chiffre (${JSON.stringify(complet.texte)})`);
      await cliquer(page, 'Cliquez pour voir les champs manquants');
      const menu100 = await lireJauge(page);
      const situation = (j) => (j.groupes['selon-situation'] || []).join(' / ');
      verifier(/Médiateur/.test(situation(menu100)) && /assureur décennal/.test(situation(menu100)) && !menu100.groupes.obligatoires,
        `médiateur et assureur décennal sous les mentions selon la situation (${JSON.stringify(menu100.groupes)})`);
      verifier(!menu100.assistant, 'pas d’assistant quand rien ne bloque l’envoi');
      await cliquer(page, 'Cliquez pour voir les champs manquants'); // referme

      // SARL sans capital : la note baisse (comme l'onglet Facture 2026) et le capital n'est pas « recommandé »
      await saisir(page, '#settings-field-capital', '');
      await attendre(1200); // saisie différée (800 ms)
      await cliquer(page, 'Cliquez pour voir les champs manquants');
      const sansCapital = await lireJauge(page);
      verifier(!sansCapital.texte.includes('100 %'), `moins de 100 % sans capital social (${JSON.stringify(sansCapital.texte)})`);
      verifier(/^Capital social/.test((sansCapital.groupes['selon-situation'] || [])[0] || '') && !/Capital/.test((sansCapital.groupes.recommandes || []).join()),
        `capital social sous les mentions obligatoires selon la situation (${JSON.stringify(sansCapital.groupes)})`);
      verifier(sansCapital.dansEcran && sansCapital.debordement <= 0, `menu dans l’écran, rien ne déborde (${sansCapital.debordement} px)`);
      await cliquer(page, 'Cliquez pour voir les champs manquants');

      // TVA intracom vidée : listée pour la SARL ; en micro-entreprise (franchise), ni TVA intracom, ni RCS, ni capital
      await cliquer(page, 'Légal');
      await saisir(page, '#settings-field-tvaIntra', '');
      await attendre(1200);
      await cliquer(page, 'Cliquez pour voir les champs manquants');
      verifier(/TVA intracommunautaire/.test(situation(await lireJauge(page))), 'TVA intracom listée pour une société');
      await cliquer(page, 'Cliquez pour voir les champs manquants');
      await cliquer(page, 'Identité');
      await page.evaluate(() => {
        const s = document.querySelector('#settings-field-formeJuridique');
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'Micro-entreprise');
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await attendre(800);
      await cliquer(page, 'Cliquez pour voir les champs manquants');
      const micro = await lireJauge(page);
      verifier(!/TVA intracommunautaire|RCS|Capital/.test(situation(micro)) && /Médiateur/.test(situation(micro)),
        `micro-entreprise : ni TVA intracom, ni RCS, ni capital (${JSON.stringify(micro.groupes)})`);
    },
  },
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

      // L'assistant ne se propose que s'il manque une mention qui bloque l'envoi : téléphone vidé, puis saisi dans l'assistant
      // (étape « Informations légales ») ; le profil ne bloque plus l'envoi à la dernière étape : réussite
      await saisir(page, '#settings-field-decennaleAssureur', 'SMABTP');
      await attendre(1200);
      await cliquer(page, 'Identité');
      await saisir(page, '#settings-field-tel', '');
      await attendre(1200);
      await assistantDerniereEtape(page, { cliquer }, async (etape) => {
        // saisie différée (800 ms) puis « Modifications enregistrées » (800 ms) : une notification en remplace une autre
        if (etape === 1) { await saisir(page, '#assistant-tel', '06 12 34 56 78'); await attendre(2500); }
      });
      const avec = await etatAssistant(page);
      verifier(avec.manquantes.length === 0 && avec.terminer, `profil d’envoi complet : « Terminer », aucune liste (${JSON.stringify(avec.manquantes)})`);
      await page.evaluate(() => {
        window.__reussite = false;
        new MutationObserver(() => { if (document.body.innerText.includes('Configuration terminée !')) window.__reussite = true; })
          .observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await cliquer(page, 'Terminer');
      verifier(await page.evaluate(() => window.__reussite), 'message de réussite');
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
