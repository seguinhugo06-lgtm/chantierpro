// Devis et factures : ce que le client reçoit (mention TVA réduite) et les fichiers remis à l'artisan.
module.exports = [
  {
    nom: 'aperçu PDF : la certification TVA réduite figure sur les documents à 10 % / 5,5 %',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      const vus = [];
      for (let i = 0; i < 4; i++) {
        const ouvert = await page.evaluate((index) => {
          const cartes = [...document.querySelectorAll('div.grid > div')]
            .filter((el) => /(DEV|FAC)-\d{4}-\d{5}/.test(el.innerText || '') && el.getBoundingClientRect().height > 40 && el.getBoundingClientRect().height < 260);
          if (!cartes[index]) return false;
          cartes[index].click();
          return true;
        }, i);
        if (!ouvert) break;
        await attendre(900);
        const apercu = await page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Aperçu du document');
          if (b) b.click();
          return !!b;
        });
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
        const carte = [...document.querySelectorAll('div.grid > div')]
          .find((el) => /FAC-\d{4}-\d{5}/.test(el.innerText || '') && el.getBoundingClientRect().height > 40 && el.getBoundingClientRect().height < 260);
        if (carte) carte.click();
        return !!carte;
      });
      verifier(ouverte, 'une facture de démo est ouverte');
      await attendre(900);
      await page.evaluate(() => document.querySelector('button[aria-label="Télécharger le PDF"]').click());
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
