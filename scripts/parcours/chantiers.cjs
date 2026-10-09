// Fiche chantier : deux pannes silencieuses corrigées le 9 oct. 2026.
//  - « Pointer » rangeait les heures dans une clé que personne ne lisait (et annonçait « Xh pointées ») ;
//  - la première photo, prise depuis l'état vide, partait dans une catégorie que la galerie n'affiche pas.
const fs = require('fs');
const os = require('os');
const path = require('path');

async function ouvrirFiche(page, attendre) {
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label^="Ouvrir le chantier Rénovation cuisine"]');
    if (!b) throw new Error('chantier « Rénovation cuisine » introuvable');
    b.click();
  });
  await attendre(1000);
}

module.exports = [
  {
    nom: 'fiche chantier → « Pointer des heures » ouvre le vrai formulaire (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Pointer des heures')?.click());
      await attendre(600);
      const formulaire = await page.evaluate(() => {
        const h = [...document.querySelectorAll('h3')].find((x) => x.innerText.trim() === 'Pointer des heures');
        return h ? { select: !!h.parentElement.querySelector('select'), heures: !!h.parentElement.querySelector('input[type="number"]') } : null;
      });
      verifier(formulaire !== null, 'le formulaire « Pointer des heures » est ouvert');
      verifier(formulaire?.select && formulaire?.heures, 'on y choisit la personne et le nombre d’heures');
    },
  },
  {
    nom: 'fiche chantier → la première photo prise depuis l’état vide apparaît (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375 });
      await ouvrirFiche(page, attendre);
      const fichier = path.join(os.tmpdir(), 'mallettico-photo-essai.png');
      fs.writeFileSync(fichier, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
      const avant = await page.evaluate(() => document.querySelectorAll('img[alt^="Photo "]').length);
      const champ = await page.evaluateHandle(() => {
        const etiquette = [...document.querySelectorAll('label')].find((l) => /Prendre une photo/.test(l.innerText));
        return etiquette ? etiquette.querySelector('input[type="file"]') : null;
      });
      verifier(champ && (await champ.evaluate((e) => !!e)), 'le bouton « Prendre une photo » de l’état vide est là');
      await champ.asElement().uploadFile(fichier);
      await attendre(1200);
      const apres = await page.evaluate(() => document.querySelectorAll('img[alt^="Photo "]').length);
      verifier(apres === avant + 1, `la photo est visible dans la galerie (${avant} → ${apres})`);
    },
  },
];
