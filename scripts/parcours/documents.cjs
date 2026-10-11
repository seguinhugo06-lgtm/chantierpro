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

// Image JPEG de la première page d'un PDF remis : combien de pixels ne sont pas blancs ? Le PDF de facture est
// une image par page (src/lib/pdfDepuisHtml.js). Recette du 9 oct. 2026 : un PDF de 300 Ko passait ce
// parcours alors que toutes ses pages étaient blanches (seule la taille était contrôlée).
async function pixelsEncresPremierePage(page, href) {
  return page.evaluate(async (url) => {
    const octets = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const texte = new TextDecoder('latin1').decode(octets);
    const dct = texte.indexOf('/DCTDecode');
    if (dct < 0) return { images: 0, encre: 0 };
    let debut = texte.indexOf('stream', dct) + 'stream'.length;
    if (texte[debut] === '\r') debut++;
    if (texte[debut] === '\n') debut++;
    const fin = texte.indexOf('endstream', debut);
    const image = await createImageBitmap(new Blob([octets.slice(debut, fin)], { type: 'image/jpeg' }));
    const c = document.createElement('canvas');
    c.width = image.width; c.height = image.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let encre = 0;
    for (let i = 0; i < px.length; i += 16) if (px[i] < 200 || px[i + 1] < 200 || px[i + 2] < 200) encre++;
    return { images: (texte.match(/\/DCTDecode/g) || []).length, encre };
  }, href);
}

// Micro-entreprise (franchise en base, art. 293 B CGI), posée avant le chargement : fiche active de démo
// (ligne au format de la table) et copie de l'app.
const ENTREPRISE_MICRO = {
  id: 'ent-micro', nom: 'Hugo Séguin — Électricien', forme_juridique: 'Micro-entreprise', siret: '987 654 321 00018',
  adresse: '15 rue des Artisans', code_postal: '75012', ville: 'Paris', tva_defaut: 20,
  decennale_assureur: 'AXA', decennale_numero: 'DEC-1',
};
const ENTREPRISE_MICRO_APP = {
  id: 'ent-micro', nom: ENTREPRISE_MICRO.nom, formeJuridique: 'Micro-entreprise', siret: ENTREPRISE_MICRO.siret,
  adresse: ENTREPRISE_MICRO.adresse, codePostal: '75012', ville: 'Paris', tvaDefaut: 20, decennaleAssureur: 'AXA', decennaleNumero: 'DEC-1',
};
const poserEntrepriseMicro = `
  if (!sessionStorage.getItem('parcours-micro')) {
    sessionStorage.setItem('parcours-micro', '1');
    localStorage.setItem('mallettico_entreprises', ${JSON.stringify(JSON.stringify([ENTREPRISE_MICRO]))});
    localStorage.setItem('mallettico_entreprise_active_id', 'ent-micro');
    localStorage.setItem('mallettico_entreprise_migrated', 'true');
    localStorage.setItem('cp_entreprise', ${JSON.stringify(JSON.stringify(ENTREPRISE_MICRO_APP))});
  }`;

// Compte de démonstration (D-26) : fiche marquée « données fictives » (réglage de settings_json.reglages)
const ENTREPRISE_DEMO = { ...ENTREPRISE_MICRO, id: 'ent-demo', nom: 'Élec Exemple', settings_json: { reglages: { nomEntrepreneur: 'Julien Exemple', donneesFictives: true } } };
// (aussi exécuté dans l'iframe d'aperçu, sans stockage : d'où le try)
const poserEntrepriseDemo = `
  try {
    if (!sessionStorage.getItem('parcours-demo')) {
      sessionStorage.setItem('parcours-demo', '1');
      localStorage.setItem('mallettico_entreprises', ${JSON.stringify(JSON.stringify([ENTREPRISE_DEMO]))});
      localStorage.setItem('mallettico_entreprise_active_id', 'ent-demo');
      localStorage.setItem('mallettico_entreprise_migrated', 'true');
    }
  } catch (e) { /* iframe sans stockage */ }`;

module.exports = [
  {
    // Q-identite-demo (11 oct. 2026) : rien de ce qui est filmé ne passe pour une vraie entreprise
    nom: 'compte de démonstration : bandeau à l’écran, filigrane « EXEMPLE » sur l’aperçu du document',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 390, avantChargement: poserEntrepriseDemo });
      await attendre(800);
      const bandeau = await page.evaluate(() => (document.querySelector('[data-ui="BandeauDonneesFictives"]')?.innerText || '').trim());
      verifier(bandeau === 'Données fictives — démonstration', `bandeau affiché (${bandeau || 'absent'})`);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => /(DEV|FAC)-\d{4}-\d{5}/.test(x.innerText || ''));
        if (b) b.click();
        return !!b;
      });
      verifier(ouvert, 'un document ouvert');
      await attendre(900);
      await actionFiche(page, attendre, ['Aperçu', 'Aperçu du document']);
      await attendre(1200);
      const doc = await page.evaluate(() => {
        const html = [...document.querySelectorAll('iframe')].map((x) => x.getAttribute('srcdoc') || '').find((x) => x.length > 100) || '';
        return { filigrane: html.includes('class="filigrane-demo"'), mention: html.includes('Données fictives — démonstration : document d’exemple') };
      });
      verifier(doc.filigrane && doc.mention, `aperçu (générateur de l’écran Devis) : filigrane et mention (${JSON.stringify(doc)})`);
    },
  },
  {
    // Migration 085 : la page publique reçoit le marqueur de la fiche (donneesFictives)
    nom: 'compte de démonstration : la page de signature du client porte le bandeau et le filigrane',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const json = (corps) => ({ status: 200, body: JSON.stringify(corps) });
      const reponse = {
        devis: { id: 'd-demo', numero: 'DEV-2026-00012', type: 'devis', statut: 'envoye', date: '2026-10-08', date_validite: '2099-11-07', validite: 30, objet: 'Volets roulants connectés',
          lignes: JSON.stringify([{ id: 'l1', description: 'Motorisation radio de volet roulant', quantite: 5, unite: 'u', prixUnitaire: 245, montant: 1225, tva: 0 }]),
          sections: '[]', total_ht: 1225, total_tva: 0, total_ttc: 1225, already_signed: false },
        client: { nom: 'Fournier', prenom: 'Isabelle' },
        chantier: null,
        entreprise: { nom: 'Élec Exemple', forme_juridique: 'Micro-entreprise', siret: '00000000000000', couleur: '#f97316', nomEntrepreneur: 'Julien Exemple', donneesFictives: true },
      };
      const { page } = await ouvrir({ reel: true, largeur: 390, supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_devis_for_signature' ? json(reponse) : json([])) });
      await page.goto(`${ORIGIN}/devis/signer/5d0c8a52-3c1e-4f8e-9a57-0c2f6e1b9d44`, { waitUntil: 'networkidle0' });
      await attendre(1200);
      const etat = await page.evaluate(() => ({
        bandeau: (document.querySelector('[data-ui="BandeauDonneesFictives"]')?.innerText || '').trim(),
        filigrane: [...document.querySelectorAll('iframe')].some((f) => (f.getAttribute('srcdoc') || '').includes('class="filigrane-demo"')),
      }));
      verifier(etat.bandeau === 'Données fictives — démonstration', `bandeau sur la page du client (${etat.bandeau || 'absent'})`);
      verifier(etat.filigrane, 'filigrane sur le devis montré au client');
    },
  },
  {
    nom: 'compte ordinaire : ni bandeau ni filigrane',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 390, avantChargement: poserEntrepriseMicro });
      await attendre(800);
      const bandeau = await page.evaluate(() => !!document.querySelector('[data-ui="BandeauDonneesFictives"]'));
      verifier(!bandeau, 'pas de bandeau');
    },
  },
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
        return { nom: r.nom, href: r.href, taille: octets.length, entete: texte.slice(0, 5), facturx: /factur-x\.xml/i.test(texte) };
      });
      verifier(!!fichier, 'un fichier est remis');
      verifier(/^Facture_FAC-\d{4}-\d{5}\.pdf$/.test(fichier.nom), `nom du fichier (${fichier.nom})`);
      verifier(fichier.entete === '%PDF-' && fichier.taille > 5000, `contenu PDF (${fichier.taille} octets)`);
      verifier(fichier.facturx, 'XML Factur-X embarqué');
      const rendu = await pixelsEncresPremierePage(page, fichier.href);
      verifier(rendu.images > 0, `pages dessinées dans le PDF (${rendu.images} image(s))`);
      verifier(rendu.encre > 2000, `la première page n'est pas blanche (${rendu.encre} points d'encre)`);
      const largeur = await page.evaluate(() => Math.round(document.body.getBoundingClientRect().width));
      verifier(largeur > 1000, `l'app garde sa largeur pendant la génération (${largeur} px)`);
    },
  },
  {
    nom: 'micro-entreprise : le devis de l’éditeur n’ajoute aucune TVA (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({
        page: 'devis', largeur: 1440,
        avantChargement: poserEntrepriseMicro,
      });
      await attendre(800);
      const dansDialogue = (re) => page.evaluate((src) => {
        const r = new RegExp(src);
        const b = [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=option], [role=dialog] li')]
          .find((x) => x.getBoundingClientRect().width > 0 && r.test((x.innerText || '').trim()));
        if (b) b.click();
        return !!b;
      }, re.source);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Nouveau$/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0); b?.click(); });
      await attendre(600);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=menuitem], a')].find((x) => (x.innerText || '').trim() === 'Nouveau devis'); b?.click(); });
      await attendre(1500);
      verifier(await dansDialogue(/Choisir un client/), 'sélecteur de client ouvert');
      await attendre(500);
      const choisi = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.getBoundingClientRect().width > 0 && /Dupont|Martin|Bernard|Durand|Petit/.test(x.innerText || ''));
        b?.click();
        return !!b;
      });
      verifier(choisi, 'un client de démo est choisi');
      await attendre(500);
      const champ = await page.$('input[placeholder^="Ajouter une prestation"]');
      await champ.click(); await champ.type('Pose prise 2P+T', { delay: 15 }); await attendre(400);
      await page.keyboard.press('Enter'); await attendre(600);
      const pu = await page.$('input[aria-label="Prix unitaire HT"]');
      await pu.click({ clickCount: 3 }); await pu.type('100', { delay: 15 }); await attendre(400);
      const barre = await page.evaluate(() => document.body.innerText);
      verifier(/TVA non applicable/.test(barre), 'l’éditeur annonce « TVA non applicable »');
      verifier(!(await page.$('select[aria-label="Taux de TVA"]')), 'aucun sélecteur de TVA sur les lignes');
      await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => /Créer le devis/.test(x.innerText || '')); b?.click(); });
      await attendre(2000);
      const devis = await page.evaluate(() => (JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}').devis || []).find((d) => (d.lignes || []).some((l) => l.description === 'Pose prise 2P+T')));
      verifier(!!devis, 'le devis est enregistré');
      verifier(devis.total_ht === 100 && devis.tva === 0 && devis.total_ttc === 100, `totaux enregistrés HT ${devis.total_ht} / TVA ${devis.tva} / total ${devis.total_ttc}`);
      verifier(devis.lignes.every((l) => l.tva === 0), 'lignes à 0 % de TVA');
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
