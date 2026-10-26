// Tâches & Planning — passe « ancien code » du 25 oct. 2026 (audit UX du 20 oct.) :
//  - un choix à deux (Planning / Tâches) au lieu de trois niveaux de navigation empilés ;
//  - le calendrier ne montre que les rendez-vous : les chantiers sont dans une ligne « Chantiers sur la période » ;
//  - un seul « Événement » ; un sous-titre qui dit un fait ;
//  - Tâches : pas de tuile sans tâche, un état vide, des textes de 12 px au moins.

async function boutons(page, racine = 'body') {
  return page.evaluate((sel) => [...document.querySelectorAll(sel + ' button')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()), racine);
}

module.exports = [
  {
    nom: 'planning : un choix à deux, un seul « Événement », le sous-titre dit un fait (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'planning', largeur: 1440 });
      const etat = await page.evaluate(() => ({
        titre: document.querySelector('h1')?.innerText,
        sousTitre: document.querySelector('header p, h1 + p')?.innerText || '',
        rubriques: [...document.querySelectorAll('[aria-label="Rubrique"] button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.innerText.trim()),
        vues: [...document.querySelectorAll('[aria-label="Affichage du planning"] button')].map((b) => b.innerText.trim()),
        retour: !!document.querySelector('button[aria-label="Retour au tableau de bord"]'),
        flottant: !!document.querySelector('button[aria-label="Ouvrir le menu actions rapides"]'),
        selects: document.querySelectorAll('select').length,
      }));
      const liste = await boutons(page);
      verifier(JSON.stringify(etat.rubriques) === JSON.stringify(['Planning', 'Tâches']), `deux rubriques : Planning, Tâches (${JSON.stringify(etat.rubriques)})`);
      verifier(JSON.stringify(etat.vues) === JSON.stringify(['Mois', 'Semaine', 'Jour', 'Agenda']), `Mois, Semaine, Jour, Agenda (${JSON.stringify(etat.vues)})`);
      verifier(!etat.retour && !etat.flottant, 'pas de sous-en-tête avec sa flèche, pas de bouton flottant');
      verifier(liste.filter((l) => l === 'Événement').length === 1, `un seul bouton « Événement » (${liste.filter((l) => /vénement/.test(l)).length})`);
      verifier(/rendez-vous aujourd'hui/.test(etat.sousTitre) && !/évén\./.test(await page.evaluate(() => document.body.innerText)), `le sous-titre dit un fait (« ${etat.sousTitre} ») et aucun « N évén. »`);
      verifier(etat.selects === 0, `plus de liste déroulante native de 36 px (${etat.selects})`);
    },
  },
  {
    nom: 'planning : les chantiers ne remplissent plus les jours, ils sont sur une ligne dépliable (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'planning', largeur: 1440 });
      const dansLesCases = await page.evaluate(() => {
        const cases = [...document.querySelectorAll('[aria-label^="Ajouter un événement le"]')];
        return cases.filter((c) => /Rénovation|Salle de bain|Ravalement|Extension/.test(c.innerText)).length;
      });
      verifier(dansLesCases === 0, `aucun nom de chantier dans les cases du mois (${dansLesCases})`);
      const ligne = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-expanded]')].find((x) => /chantiers? sur la période/.test(x.innerText));
        return b ? { texte: b.innerText.replace(/\s+/g, ' ').trim(), ouverte: b.getAttribute('aria-expanded') } : null;
      });
      verifier(ligne && ligne.ouverte === 'false', `la ligne « Chantiers sur la période » est là, repliée (${ligne?.texte})`);
      await page.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')].find((x) => /chantiers? sur la période/.test(x.innerText))?.click());
      await attendre(400);
      const noms = await page.evaluate(() => document.body.innerText);
      verifier(/Rénovation cuisine Dupont/.test(noms), 'dépliée, elle liste les chantiers');
    },
  },
  {
    nom: 'planning : « Événement » ouvre une fenêtre de création, un rendez-vous créé apparaît (1440 px)',
    async executer({ ouvrir, cliquer, attendre, verifier, saisir }) {
      const { page } = await ouvrir({ page: 'planning', largeur: 1440 });
      await cliquer(page, 'Événement');
      const fenetre = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return d ? { titre: d.querySelector('h2')?.innerText, titreChamp: !!d.querySelector('input[placeholder^="Ex: RDV"]') } : null;
      });
      verifier(fenetre && /Nouvel événement/.test(fenetre.titre), 'la fenêtre « Nouvel événement » s’ouvre (rôle dialogue)');
      await saisir(page, 'input[placeholder^="Ex: RDV"]', 'RDV devis Parcours');
      await cliquer(page, 'Créer');
      await attendre(1000);
      const apres = await page.evaluate(() => ({ dialogue: !!document.querySelector('[role="dialog"]'), texte: document.body.innerText }));
      verifier(!apres.dialogue && /RDV devis Parcours/.test(apres.texte), 'la fenêtre se ferme et le rendez-vous est dans le calendrier');
      verifier(/1 rendez-vous aujourd'hui/.test(apres.texte), 'le sous-titre le compte (1 rendez-vous aujourd’hui)');
    },
  },
  {
    nom: 'planning au téléphone : l’agenda par défaut, la vue active entière (375 px)',
    async executer({ ouvrir, verifier }) {
      const { page } = await ouvrir({ page: 'planning', largeur: 375 });
      const etat = await page.evaluate(() => {
        const actif = document.querySelector('[aria-label="Affichage du planning"] [aria-pressed="true"]');
        const r = actif?.getBoundingClientRect();
        return { actif: actif?.innerText.trim(), dansEcran: !!r && r.left >= 0 && r.right <= innerWidth, debordement: document.documentElement.scrollWidth - innerWidth };
      });
      verifier(etat.actif === 'Agenda', `l’Agenda est la vue du téléphone (${etat.actif})`);
      verifier(etat.dansEcran && etat.debordement <= 0, 'la vue active tient dans l’écran, sans défilement horizontal');
    },
  },
  {
    nom: 'tâches : le menu « Vue » porte Colonnes, Frise et Équipe ; changer de vue marche (1440 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'tasks', largeur: 1440 });
      const liste = await boutons(page, 'main');
      verifier(liste.some((l) => /^Vue Liste/.test(l)), `un menu « Vue » (${liste.filter((l) => /Vue/.test(l)).join(', ')})`);
      verifier(!liste.includes('Colonnes') && !liste.includes('Frise') && !liste.includes('Équipe'), 'Colonnes, Frise et Équipe ne sont plus une rangée de cinq vues');
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Vue/.test(b.innerText.trim()))?.click());
      await attendre(500);
      const options = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] [role="radio"], [role="radio"]')].map((r) => r.innerText.trim()));
      verifier(['Liste', 'Colonnes', 'Frise', 'Équipe'].every((o) => options.includes(o)), `le menu propose Liste, Colonnes, Frise, Équipe (${JSON.stringify(options)})`);
      await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].find((r) => r.innerText.trim() === 'Colonnes')?.click());
      await attendre(800);
      const texte = await page.evaluate(() => document.body.innerText);
      verifier(/À faire/.test(texte) && /En cours/.test(texte) && /Terminé/.test(texte), 'la vue Colonnes affiche À faire, En cours, Terminé');
    },
  },
  {
    // Audit UX du 20 oct. 2026 : quatre tuiles à zéro, « 0% » en rouge pour 0 sur 0, libellés de 10 px, état vide caché
    nom: 'tâches : pas de tuile sans tâche, un état vide, puis des tuiles quand il y a des tâches ; rien sous 12 px (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'tasks', largeur: 375 });
      const vide = await page.evaluate(() => ({ tuiles: document.querySelectorAll('[data-ui="TuileChiffre"]').length, etat: document.querySelector('[data-ui="EtatVide"]')?.innerText || '' }));
      verifier(vide.tuiles === 0, `aucune tuile sans tâche (${vide.tuiles})`);
      verifier(/Aucune tâche/.test(vide.etat), `l’état vide le dit (« ${vide.etat.replace(/\s+/g, ' ')} »)`);
      for (const texte of ['Appeler le plombier', 'Commander le carrelage']) {
        await page.type('input[aria-label="Créer une nouvelle tâche"]', texte);
        await page.keyboard.press('Enter');
        await attendre(900);
        await page.keyboard.press('Escape'); // le panneau de détail s'ouvre sur la tâche créée
        await attendre(300);
      }
      const rempli = await page.evaluate(() => {
        const petits = [...document.querySelectorAll('main *')].filter((e) => {
          if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && parseFloat(getComputedStyle(e).fontSize) < 12;
        }).map((e) => `${e.tagName}:${e.innerText?.slice(0, 20)}`);
        return { tuiles: document.querySelectorAll('[data-ui="TuileChiffre"]').length, petits, texte: document.body.innerText };
      });
      verifier(rempli.tuiles === 3, `avec des tâches, trois tuiles (${rempli.tuiles})`);
      verifier(/Appeler le plombier/.test(rempli.texte) && /Commander le carrelage/.test(rempli.texte), 'les deux tâches sont dans la liste');
      verifier(rempli.petits.length === 0, `aucun texte sous 12 px (${JSON.stringify(rempli.petits.slice(0, 5))})`);
    },
  },
];
