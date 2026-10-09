// Fiche client : « Nouveau devis » et « Nouveau chantier » partent avec ce client.
// Panne vécue jusqu'au 9 oct. 2026 : les boutons écrivaient une clé que personne ne lisait et
// activaient le mode « nouveau client » ; on arrivait sur une liste, sans éditeur ni client.
async function ouvrirFiche(page, attendre, nom) {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
    if (!b) throw new Error(`client « ${n} » introuvable dans la liste`);
    b.click();
  }, nom);
  await attendre(800);
}

module.exports = [
  {
    nom: 'fiche client → « Nouveau devis » ouvre l’éditeur avec ce client (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'clients', largeur: 375 });
      await page.evaluate(() => { try { localStorage.removeItem('batigesti_devis_composer_draft'); } catch { /* */ } });
      await ouvrirFiche(page, attendre, 'Dupont');
      const titre = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
      verifier(/Dupont/.test(titre), `la fiche de Marie Dupont est ouverte (titre « ${titre} »)`);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Nouveau devis')?.click());
      await attendre(1500);
      const editeur = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return d ? d.innerText.slice(0, 400) : null;
      });
      verifier(editeur !== null, 'l’éditeur de devis est ouvert');
      verifier(/Marie Dupont|Dupont Marie/.test(editeur || ''), `le client est déjà choisi (${JSON.stringify((editeur || '').slice(0, 120))})`);
    },
  },
  {
    nom: 'fiche client → « Nouveau chantier » ouvre le formulaire avec ce client (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'clients', largeur: 375 });
      await ouvrirFiche(page, attendre, 'Dupont');
      await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.innerText.startsWith('Chantiers'))?.click());
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Nouveau chantier')?.click());
      await attendre(1500);
      const formulaire = await page.evaluate(() => {
        const champ = [...document.querySelectorAll('input')].find((i) => /Rénovation cuisine/.test(i.placeholder || ''));
        const bloc = champ?.closest('form, [role="dialog"], .fixed');
        return bloc ? bloc.innerText.slice(0, 400) : null;
      });
      verifier(formulaire !== null, 'le formulaire « Nouveau chantier » est ouvert');
      verifier(/Dupont/.test(formulaire || ''), `le client est déjà choisi (${JSON.stringify((formulaire || '').slice(0, 120))})`);
    },
  },
];
