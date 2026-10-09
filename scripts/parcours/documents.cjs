// Devis et factures : ce que le client reçoit (mention TVA réduite) et les fichiers remis à l'artisan.

// Action de la fiche (refonte du 9 oct. 2026) : le bouton visible qui porte ce libellé, sinon
// l'entrée du menu « ⋯ ».
async function actionFiche(page, attendre, libelles) {
  const direct = await page.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find((x) => l.includes((x.innerText || '').trim()) || l.includes(x.title) || l.includes(x.getAttribute('aria-label')));
    if (b) b.click();
    return !!b;
  }, libelles);
  if (direct) return true;
  const menu = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label="Plus d\'actions"]');
    if (b) b.click();
    return !!b;
  });
  if (!menu) return false;
  await attendre(400);
  return page.evaluate((l) => {
    const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => l.includes((x.innerText || '').trim()));
    if (b) b.click();
    return !!b;
  }, libelles);
}

module.exports = [
  {
    nom: 'aperçu PDF : la certification TVA réduite figure sur les documents à 10 % / 5,5 %',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      const vus = [];
      for (let i = 0; i < 4; i++) {
        // Liste : une ligne par document (ui/LigneListe), ouverte par son bouton principal.
        const ouvert = await page.evaluate((index) => {
          const lignes = [...document.querySelectorAll('[data-ui="LigneListe"] > button')]
            .filter((b) => /(DEV|FAC)-\d{4}-\d{5}/.test(b.innerText || '') && b.getBoundingClientRect().height > 40);
          if (!lignes[index]) return false;
          lignes[index].click();
          return true;
        }, i);
        if (!ouvert) break;
        await attendre(900);
        const apercu = await actionFiche(page, attendre, ['Aperçu', 'Aperçu du document']);
        if (!apercu) continue;
        await attendre(1200);
        const doc = await page.evaluate(() => {
          const f = [...document.querySelectorAll('iframe')].find((x) => (x.getAttribute('srcdoc') || '').length > 100);
          const html = f?.getAttribute('srcdoc') || '';
          return {
            numero: (html.match(/(DEV|FAC)-\d{4}-\d{5}/) || [''])[0],
            reduit: /TVA (10|5[,.]5)\s?%/.test(html),
            mention: html.includes('CERTIFICATION DU CLIENT') && /Je soussigné\(e\) [^<]+ certifie/.test(html),
          };
        });
        vus.push(doc);
        // Revenir à la liste
        await page.keyboard.press('Escape');
        await attendre(300);
        await page.evaluate(() => {
          const r = [...document.querySelectorAll('button')].find((b) => /retour/i.test(b.getAttribute('aria-label') || b.title || ''));
          if (r) r.click();
        });
        await attendre(600);
      }
      verifier(vus.length > 0, 'au moins un document ouvert en aperçu');
      const reduits = vus.filter((d) => d.reduit);
      verifier(reduits.length > 0, 'au moins un document à taux réduit dans la démo');
      for (const d of reduits) verifier(d.mention, `${d.numero} porte la certification du client`);
    },
  },
  {
    nom: 'facture PDF : un vrai PDF Factur-X est remis (jsPDF + pdf-lib)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      await page.evaluate(() => {
        window.__remis = [];
        HTMLAnchorElement.prototype.click = function () { window.__remis.push({ nom: this.download, href: this.href }); };
      });
      const ouverte = await page.evaluate(() => {
        const ligne = [...document.querySelectorAll('[data-ui="LigneListe"] > button')]
          .find((b) => /FAC-\d{4}-\d{5}/.test(b.innerText || '') && b.getBoundingClientRect().height > 40);
        if (ligne) ligne.click();
        return !!ligne;
      });
      verifier(ouverte, 'une facture de démo est ouverte');
      await attendre(900);
      verifier(await actionFiche(page, attendre, ['PDF', 'Télécharger le PDF']), 'le PDF se télécharge depuis la fiche');
      // Génération : rendu HTML → PDF (jsPDF), puis XML Factur-X embarqué (pdf-lib).
      for (let i = 0; i < 30 && !(await page.evaluate(() => window.__remis.length)); i++) await attendre(500);
      const fichier = await page.evaluate(async () => {
        const r = window.__remis[0];
        if (!r) return null;
        const octets = new Uint8Array(await (await fetch(r.href)).arrayBuffer());
        const texte = new TextDecoder('latin1').decode(octets);
        return { nom: r.nom, taille: octets.length, entete: texte.slice(0, 5), facturx: /factur-x\.xml/i.test(texte) };
      });
      verifier(!!fichier, 'un fichier est remis');
      verifier(/^Facture_FAC-\d{4}-\d{5}\.pdf$/.test(fichier.nom), `nom du fichier (${fichier.nom})`);
      verifier(fichier.entete === '%PDF-' && fichier.taille > 5000, `contenu PDF (${fichier.taille} octets)`);
      verifier(fichier.facturx, 'XML Factur-X embarqué');
    },
  },
  {
    nom: 'export CSV du catalogue sur téléphone : fichier remis avec le bon nom',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'catalogue', largeur: 375 });
      await page.evaluate(() => {
        window.__remis = [];
        HTMLAnchorElement.prototype.click = function () { window.__remis.push(this.download); };
      });
      await cliquer(page, "Plus d'actions");
      await cliquer(page, 'Exporter le catalogue');
      await attendre(600);
      const remis = await page.evaluate(() => window.__remis);
      verifier(remis.length === 1 && /^catalogue_\d{4}-\d{2}-\d{2}\.csv$/.test(remis[0]), `fichier remis (${remis.join(', ') || 'aucun'})`);
    },
  },
];
