// Compte : suppression (démo), code testeur, retours utilisateurs, assistant de configuration, prix des abonnements.
const { plansDuSite } = require('../lib/plans.cjs');

// Paramètres (Task 8, 26 oct. 2026) : au bureau, une colonne de rubriques ; au téléphone, la liste des rubriques
// (l'état du profil au-dessus), puis la rubrique avec un retour « Paramètres ».
async function rubrique(page, { cliquer }, nom) {
  const dansUneRubrique = await page.evaluate(() => innerWidth < 768 && !document.querySelector('[data-parametres="liste"]'));
  if (dansUneRubrique) await cliquer(page, 'Paramètres');
  await cliquer(page, nom);
}
async function listeDesRubriques(page, { cliquer }) {
  const dansUneRubrique = await page.evaluate(() => innerWidth < 768 && !document.querySelector('[data-parametres="liste"]'));
  if (dansUneRubrique) await cliquer(page, 'Paramètres');
}
// Un choix de l'interface (ui/ChampChoix) : le champ ouvre un volet, on y coche l'option
async function choisir(page, selecteur, libelle, attendre) {
  const ok = await page.evaluate((s, l) => {
    const champ = document.querySelector(s);
    if (!champ) return 'champ';
    champ.click();
    return true;
  }, selecteur, libelle);
  if (ok !== true) throw new Error(`Choix ${selecteur} introuvable`);
  await attendre(400);
  const coche = await page.evaluate((l) => {
    const option = [...document.querySelectorAll('[role="radio"]')].find((o) => o.innerText.trim().startsWith(l));
    if (option) option.click();
    return !!option;
  }, libelle);
  if (!coche) throw new Error(`Option « ${libelle} » introuvable`);
  await attendre(600);
}

// Ouvre l'assistant depuis l'état du profil (bouton de l'écran tant qu'une mention bloque l'envoi) et va à sa
// dernière étape (`pendant(etape)` : geste fait dans l'assistant à l'étape donnée, avant « Suivant »)
async function assistantDerniereEtape(page, { cliquer }, pendant = async () => {}) {
  await listeDesRubriques(page, { cliquer });
  await cliquer(page, 'Compléter avec l’assistant');
  for (let i = 0; i < 4; i++) { await pendant(i); await cliquer(page, 'Suivant', { dans: '[role="dialog"]' }); }
}
const etatAssistant = (page) => page.evaluate(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const d = document.querySelector('[role="dialog"]');
  const boutons = d ? [...d.querySelectorAll('button')].filter(visible).map((b) => b.innerText.trim()) : [];
  const liste = document.querySelector('[data-assistant="manquantes"]');
  return {
    etape: !!d && d.innerText.includes('Étape 5 sur 5'),
    manquantes: liste ? [...liste.querySelectorAll('li')].map((l) => l.innerText) : [],
    terminer: boutons.includes('Terminer'),
    completer: boutons.includes('Compléter le profil'),
    debordement: document.documentElement.scrollWidth - innerWidth,
  };
});

// L'état du profil (settings/EtatProfil, lib/jaugeProfil) : ce qui bloque l'envoi, ce qui est à vérifier, la barre,
// et, détail ouvert, ses groupes
const lireProfil = (page) => page.evaluate(() => {
  const carte = document.querySelector('[data-profil="etat"]');
  const groupes = {};
  document.querySelectorAll('[data-groupe]').forEach((g) => { groupes[g.dataset.groupe] = [...g.querySelectorAll('li')].map((l) => l.innerText); });
  const barre = carte?.querySelector('[role="progressbar"]');
  return {
    bloque: carte?.querySelector('[data-profil="bloque"]')?.innerText.trim() || '',
    aVerifier: carte?.querySelector('[data-profil="a-verifier"]')?.innerText.trim() || '',
    completude: Number(barre?.getAttribute('aria-valuenow')),
    barreVerte: !!barre?.firstElementChild?.className.includes('bg-succes-point'),
    mediateur: !!carte && [...carte.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Renseigner le médiateur (clients particuliers)'),
    groupes,
    assistant: [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Compléter avec l’assistant'),
    debordement: document.documentElement.scrollWidth - innerWidth,
  };
});
async function detailDuProfil(page, { cliquer }, ouvert) {
  await listeDesRubriques(page, { cliquer });
  const etat = await page.evaluate(() => [...document.querySelectorAll('[data-profil="etat"] button')].find((b) => /^(Voir ce qui manque|Masquer le détail)$/.test(b.innerText.trim()))?.innerText.trim());
  if (ouvert && etat === 'Voir ce qui manque') await cliquer(page, 'Voir ce qui manque');
  if (!ouvert && etat === 'Masquer le détail') await cliquer(page, 'Masquer le détail');
}

module.exports = [
  {
    // Audit UX du 20 oct. 2026 (P1) : « Profil complété 100 % » en vert avec « 2 mentions obligatoires selon votre
    // situation » ; l'artisan se croyait en règle. Maintenant : ce qui bloque l'envoi, à part ce qui est à vérifier,
    // et la barre verte seulement quand les deux sont faits.
    nom: 'jauge du profil : capital, médiateur, RCS et TVA intracom rangés selon la situation de l’entreprise, à 375 px',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      // Démo : SARL complète (capital, RCS, TVA intracom), sans médiateur ni coordonnées de l'assureur décennal
      const complet = await lireProfil(page);
      verifier(complet.bloque === 'Mentions qui bloquent l’envoi : complètes', `rien ne bloque l’envoi, dit en clair (« ${complet.bloque} »)`);
      verifier(complet.aVerifier === '2 mentions obligatoires selon votre situation, à compléter' && complet.mediateur,
        `à part, 2 mentions obligatoires selon la situation (avis juriste R11) et le lien vers le médiateur (« ${complet.aVerifier} »)`);
      verifier(complet.completude === 100 && !complet.barreVerte, `100 % mais la barre n’est pas verte tant qu’il reste à vérifier (${complet.completude} %)`);
      verifier(!complet.assistant, 'pas d’assistant quand rien ne bloque l’envoi');
      await detailDuProfil(page, { cliquer }, true);
      const detail = await lireProfil(page);
      const situation = (j) => (j.groupes['selon-situation'] || []).join(' / ');
      verifier(/Médiateur/.test(situation(detail)) && /assureur décennal/.test(situation(detail)) && !detail.groupes.obligatoires,
        `médiateur et assureur décennal sous les mentions selon la situation (${JSON.stringify(detail.groupes)})`);

      // SARL sans capital : la note baisse (comme l'onglet Facture 2026) et le capital n'est pas « recommandé »
      await rubrique(page, { cliquer }, 'Identité');
      await saisir(page, '#settings-field-capital', '');
      await attendre(1200); // saisie différée (800 ms)
      await detailDuProfil(page, { cliquer }, true);
      const sansCapital = await lireProfil(page);
      verifier(sansCapital.completude < 100, `moins de 100 % sans capital social (${sansCapital.completude} %)`);
      verifier(/^Capital social/.test((sansCapital.groupes['selon-situation'] || [])[0] || '') && !/Capital/.test((sansCapital.groupes.recommandes || []).join()),
        `capital social sous les mentions obligatoires selon la situation (${JSON.stringify(sansCapital.groupes)})`);
      verifier(sansCapital.debordement <= 0, `rien ne déborde (${sansCapital.debordement} px)`);

      // TVA intracom vidée : listée pour la SARL ; en micro-entreprise (franchise), ni TVA intracom, ni RCS, ni capital
      await rubrique(page, { cliquer }, 'Légal');
      await saisir(page, '#settings-field-tvaIntra', '');
      await attendre(1200);
      await detailDuProfil(page, { cliquer }, true);
      verifier(/TVA intracommunautaire/.test(situation(await lireProfil(page))), 'TVA intracom listée pour une société');
      await rubrique(page, { cliquer }, 'Identité');
      await choisir(page, '#settings-field-formeJuridique', 'Micro-entreprise', attendre);
      await detailDuProfil(page, { cliquer }, true);
      const micro = await lireProfil(page);
      verifier(!/TVA intracommunautaire|RCS|Capital/.test(situation(micro)) && /Médiateur/.test(situation(micro)),
        `micro-entreprise : ni TVA intracom, ni RCS, ni capital (${JSON.stringify(micro.groupes)})`);
    },
  },
  {
    nom: 'assistant de configuration : sans décennale, il liste ce qui bloque l’envoi au lieu de dire « terminée »',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      await rubrique(page, { cliquer }, 'Assurances');
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
      await attendre(800);
      const apres = await page.evaluate(() => ({ ferme: !document.querySelector('[role="dialog"]'), focus: document.activeElement?.id }));
      verifier(apres.ferme, 'l’assistant se ferme');
      verifier(apres.focus === 'settings-field-decennaleAssureur', `le champ de la décennale reçoit le curseur (${apres.focus})`);

      // L'assistant ne se propose que s'il manque une mention qui bloque l'envoi : téléphone vidé, puis saisi dans l'assistant
      // (étape « Informations légales ») ; le profil ne bloque plus l'envoi à la dernière étape : réussite
      await saisir(page, '#settings-field-decennaleAssureur', 'SMABTP');
      await attendre(1200);
      await rubrique(page, { cliquer }, 'Identité');
      await saisir(page, '#settings-field-tel', '');
      await attendre(1200);
      await assistantDerniereEtape(page, { cliquer }, async (etape) => {
        if (etape === 1) { await saisir(page, '#assistant-tel', '06 12 34 56 78'); await attendre(1500); }
      });
      const avec = await etatAssistant(page);
      verifier(avec.manquantes.length === 0 && avec.terminer, `profil d’envoi complet : « Terminer », aucune liste (${JSON.stringify(avec.manquantes)})`);
      await page.evaluate(() => {
        window.__reussite = false;
        new MutationObserver(() => { if (document.body.innerText.includes('Configuration terminée !')) window.__reussite = true; })
          .observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await cliquer(page, 'Terminer', { dans: '[role="dialog"]' });
      verifier(await page.evaluate(() => window.__reussite), 'message de réussite');
    },
  },
  {
    nom: 'suppression de compte : modale plein écran, confirmation exigée, données effacées',
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 1440 });
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
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'plan', largeur: 1440, plan: 'gratuit' });
      // Replié en bas de « Mon plan », après les offres (audit du 20 oct. 2026)
      verifier(await page.evaluate(() => !document.getElementById('code-testeur')), 'le code testeur est replié');
      await cliquer(page, "J'ai un code");
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
  {
    // Les abonnements sont en franchise de TVA (D-19) : « TVA non applicable, art. 293 B du CGI » à la place de « HT »
    // dans « Mon plan » ; prix lus dans PLANS. (La fenêtre d'abonnement n'a pas de chemin court en démo : elle est couverte par `prixAbonnementAffiche.test.jsx` ; la page `pricing` de l'app n'a aucun lien qui y mène : non parcourue.)
    nom: 'abonnements : franchise de TVA à la place de « HT » (D-19)',
    async executer({ ouvrir, attendre, verifier, RACINE }) {
      const { PLANS } = plansDuSite(RACINE);
      const MENTION = 'TVA non applicable, art. 293 B du CGI';
      const lire = (page) => page.evaluate(() => document.body.innerText.replace(/[\s\u00a0\u202f]+/g, ' '));
      const sansHT = (texte) => !/\bHT\b/.test(texte);
      const prix = (n) => (Number.isInteger(n) ? `${n} €` : `${n.toFixed(2).replace('.', ',')} €`);

      for (const largeur of [375, 1440]) {
        const a = `à ${largeur} px`;

        // « Mon plan », plan Gratuit : les deux plans payants, au mois puis à l'année
        const mon = await ouvrir({ page: 'plan', largeur, plan: 'gratuit' });
        await attendre(500);
        let texte = await lire(mon.page);
        verifier(texte.includes('Mon plan'), `« Mon plan » affiché ${a}`);
        verifier(sansHT(texte), `« Mon plan » : aucun « HT » ${a}`);
        verifier(texte.includes(MENTION), `« Mon plan » : la mention de franchise de TVA ${a}`);
        for (const id of ['artisan', 'equipe']) {
          verifier(texte.includes(`${prix(PLANS[id].priceMonthly)} par mois`), `« Mon plan » : ${PLANS[id].name} à ${prix(PLANS[id].priceMonthly)} par mois ${a}`);
        }
        await mon.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith('Annuel'))?.click());
        await attendre(400);
        texte = await lire(mon.page);
        verifier(texte.includes(`Facturé ${prix(PLANS.artisan.priceYearly)}/an`) && texte.includes(`Facturé ${prix(PLANS.equipe.priceYearly)}/an`), `« Mon plan », annuel : prix annuels lus dans PLANS ${a}`);
        verifier(sansHT(texte), `« Mon plan », annuel : aucun « HT » ${a}`);
        await mon.browser.close();

        // « Mon plan », abonné Artisan : la ligne du plan actuel
        const abonne = await ouvrir({ page: 'plan', largeur, plan: 'artisan' });
        await attendre(500);
        texte = await lire(abonne.page);
        verifier(texte.includes(`${prix(PLANS.artisan.priceMonthly)} par mois, ${MENTION}`) && sansHT(texte), `« Mon plan », abonné Artisan : prix, mention, aucun « HT » ${a}`);
        await abonne.browser.close();
      }
    },
  },
];
