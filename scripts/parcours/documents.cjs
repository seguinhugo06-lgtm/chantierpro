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
  // ── Rétractation d'un devis signé à distance (migration 086, C. conso. L221-5, L221-14, L221-21, L221-25, D221-5) ──
  {
    nom: 'signature en ligne par un particulier : avis et formulaire de rétractation, demande expresse, « obligation de paiement »',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const json = (corps) => ({ status: 200, body: JSON.stringify(corps) });
      const jeton = '7a3f0c52-3c1e-4f8e-9a57-0c2f6e1b9d86';
      const reponse = {
        devis: { id: 'd-086', numero: 'DEV-2026-00086', type: 'devis', statut: 'envoye', date: '2026-10-12', date_validite: '2099-11-11', validite: 30, objet: 'Tableau électrique',
          lignes: JSON.stringify([{ id: 'l1', description: 'Tableau électrique 2 rangées', quantite: 1, unite: 'u', prixUnitaire: 690, montant: 690, tva: 0 }]),
          sections: '[]', total_ht: 690, total_tva: 0, total_ttc: 690, travaux_urgents: false, already_signed: false },
        client: { nom: 'Martin', prenom: 'Léa', categorie: 'Particulier', email: 'lea@exemple.fr' },
        chantier: null,
        entreprise: { nom: 'Élec du Sud', forme_juridique: 'SARL', siret: '12345678900012', adresse: '3 rue des Lilas\n33000 Bordeaux', telephone: '06 00 00 00 00', email: 'contact@elec.fr', couleur: '#f97316' },
      };
      let appelSignature = null;
      const appelsNotify = [];
      const { page } = await ouvrir({ reel: true, largeur: 390, supabase: (req, u) => {
        if (u.pathname === '/rest/v1/rpc/get_devis_for_signature') return json(reponse);
        if (u.pathname === '/rest/v1/rpc/sign_devis') { appelSignature = JSON.parse(req.postData() || '{}'); return json({ success: true, devis_id: 'd-086' }); }
        if (u.pathname === '/functions/v1/notify-signature') { appelsNotify.push(JSON.parse(req.postData() || '{}')); return json({ success: true }); }
        return json({});
      } });
      await page.goto(`${ORIGIN}/devis/signer/${jeton}`, { waitUntil: 'networkidle0' });
      await attendre(1200);
      const doc = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('srcdoc') || '').join(''));
      verifier(doc.includes('MODÈLE DE FORMULAIRE DE RÉTRACTATION') && doc.includes('INFORMATIONS CONCERNANT L\'EXERCICE DU DROIT DE RÉTRACTATION'), 'le devis montré au client porte l’avis et le formulaire type');
      verifier(doc.includes(`/devis/signer/${jeton}`) && doc.includes('exercer votre droit de rétractation en ligne sur'), 'l’avis annonce la rétractation en ligne à l’adresse du lien');
      verifier(!/lettre recommandée/.test(doc) && !/mention manuscrite/.test(doc), 'plus de lettre recommandée exigée, plus de mention manuscrite impossible');
      // Étape « informations » : la case de demande expresse, séparée de l'acceptation
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Signer/.test(x.innerText || '')); if (b) b.click(); });
      await attendre(500);
      const etape = await page.evaluate(() => ({
        demande: !!document.querySelector('[data-ui="DemandeExpresse"] input[type=checkbox]'),
        texte: document.querySelector('[data-ui="DemandeExpresse"]')?.innerText || '',
      }));
      verifier(etape.demande && /avant la fin du délai de rétractation/.test(etape.texte) && /montant proportionnel/.test(etape.texte), `case de demande expresse proposée au particulier (${etape.texte.slice(0, 60)}…)`);
      await page.evaluate(() => {
        const cases = [...document.querySelectorAll('input[type=checkbox]')];
        cases.forEach((c) => c.click());
      });
      await attendre(300);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Passer à la signature/.test(x.innerText || '')); if (b) b.click(); });
      await attendre(600);
      // Tracé sur le canevas
      const canevas = await page.$('canvas');
      const boite = canevas && await canevas.boundingBox();
      if (boite) {
        await page.mouse.move(boite.x + 30, boite.y + 60);
        await page.mouse.down();
        await page.mouse.move(boite.x + 160, boite.y + 110, { steps: 8 });
        await page.mouse.move(boite.x + 260, boite.y + 70, { steps: 8 });
        await page.mouse.up();
      }
      await attendre(300);
      const bouton = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).find((t) => /obligation de paiement/.test(t)) || '');
      verifier(bouton === 'Signer avec obligation de paiement', `bouton de validation explicite (L221-14) : « ${bouton || 'absent'} »`);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /obligation de paiement/.test(x.innerText || '')); if (b) b.click(); });
      await attendre(1200);
      verifier(appelSignature && appelSignature.p_execution_anticipee === true && appelSignature.p_avis_retractation === true,
        `la signature transmet la demande expresse et l’avis montré (${JSON.stringify(appelSignature && { e: appelSignature.p_execution_anticipee, a: appelSignature.p_avis_retractation })})`);
      // Tâche confirmation-client : l'exemplaire signé (vrai PDF) part au client, par le serveur ; la page le dit
      for (let i = 0; i < 20 && !appelsNotify.some((a) => a.evenement === 'exemplaire'); i++) await attendre(500);
      const exemplaire = appelsNotify.find((a) => a.evenement === 'exemplaire');
      verifier(exemplaire && exemplaire.token === jeton && /^JVBER/.test(exemplaire.pdf || '') && !exemplaire.email && !exemplaire.to,
        `exemplaire envoyé : jeton, PDF (${exemplaire ? `${Math.round((exemplaire.pdf || '').length / 1024)} Ko en base64` : 'aucun appel'}), aucune adresse fournie par la page`);
      await attendre(500);
      const message = await page.evaluate(() => document.querySelector('[data-ui="ExemplaireEnvoye"]')?.innerText || '');
      verifier(/vous a été envoyé par e-mail/.test(message), `la page dit que l’exemplaire est parti (${message})`);
    },
  },
  {
    nom: 'devis signé en ligne : « Renoncer au contrat ici », déclaration, « Confirmer la rétractation », accusé de réception',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const json = (corps) => ({ status: 200, body: JSON.stringify(corps) });
      let retracte = null;
      let accuse = false;
      const signe = () => ({
        devis: { already_signed: true, numero: 'DEV-2026-00086', date: '2026-10-12', signature_date: '2026-10-12T09:00:00Z', signataire_nom: 'Léa Martin',
          retractation: retracte
            ? { ouverte: false, fin: '2026-10-26', le: retracte, nom: 'Léa Martin', email: 'lea@exemple.fr', accuse_le: accuse ? retracte : null }
            : { ouverte: true, fin: '2026-10-26', le: null, nom: null, email: null, accuse_le: null } },
        client: { nom: 'Martin', prenom: 'Léa', email: 'lea@exemple.fr' },
        entreprise: { nom: 'Élec du Sud', couleur: '#f97316' },
      });
      let declaration = null;
      const { page } = await ouvrir({ reel: true, largeur: 390, supabase: (req, u) => {
        if (u.pathname === '/rest/v1/rpc/get_devis_for_signature') return json(signe());
        if (u.pathname === '/rest/v1/rpc/retracter_devis') { declaration = JSON.parse(req.postData() || '{}'); retracte = '2026-10-12T12:32:00Z'; return json({ success: true, retractation_le: retracte, fin: '2026-10-26' }); }
        if (u.pathname === '/functions/v1/notify-signature') { accuse = true; return json({ success: true }); }
        return json({});
      } });
      await page.goto(`${ORIGIN}/devis/signer/7a3f0c52-3c1e-4f8e-9a57-0c2f6e1b9d86`, { waitUntil: 'networkidle0' });
      await attendre(1000);
      const avant = await page.evaluate(() => ({
        texte: document.querySelector('[data-ui="RetractationEnLigne"]')?.innerText || '',
        bouton: [...document.querySelectorAll('button')].some((b) => (b.innerText || '').trim() === 'Renoncer au contrat ici'),
      }));
      verifier(avant.bouton && /jusqu'au 26 octobre 2026 inclus/.test(avant.texte), `bouton « Renoncer au contrat ici » visible, délai affiché (${avant.texte.slice(0, 80)})`);
      await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === 'Renoncer au contrat ici').click(); });
      await attendre(400);
      const formulaire = await page.evaluate(() => ({
        nom: document.querySelector('#retractation-nom')?.value,
        email: document.querySelector('#retractation-email')?.value,
        contrat: document.querySelector('[data-ui="DeclarationRetractation"]')?.innerText || '',
      }));
      verifier(formulaire.nom === 'Léa Martin' && formulaire.email === 'lea@exemple.fr' && /Devis n° DEV-2026-00086 du 12\/10\/2026/.test(formulaire.contrat) && /Je vous notifie par la présente ma rétractation/.test(formulaire.contrat),
        'déclaration préremplie : nom, contrat, adresse de l’accusé, texte de la rétractation');
      await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === 'Confirmer la rétractation').click(); });
      await attendre(1200);
      const apres = await page.evaluate(() => document.querySelector('[data-ui="RetractationRecue"]')?.innerText || '');
      verifier(declaration && declaration.p_nom === 'Léa Martin' && declaration.p_email === 'lea@exemple.fr', 'la déclaration est envoyée à la base');
      verifier(/transmise à Élec du Sud le 12\/10\/2026 à 14 h 32/.test(apres) && /accusé de réception a été envoyé à lea@exemple.fr/.test(apres),
        `confirmation avec date, heure et accusé envoyé (${apres.replace(/\s+/g, ' ').slice(0, 120)})`);
    },
  },
  {
    nom: 'signature en ligne par un professionnel : ni avis de rétractation, ni demande expresse',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const json = (corps) => ({ status: 200, body: JSON.stringify(corps) });
      const reponse = {
        devis: { id: 'd-pro', numero: 'DEV-2026-00087', type: 'devis', statut: 'envoye', date: '2026-10-12', date_validite: '2099-11-11', validite: 30,
          lignes: JSON.stringify([{ id: 'l1', description: 'Mise aux normes', quantite: 1, unite: 'u', prixUnitaire: 900, montant: 900, tva: 20 }]),
          sections: '[]', total_ht: 900, total_tva: 180, total_ttc: 1080, already_signed: false },
        client: { nom: 'Durand', entreprise: 'SCI Les Quais', categorie: 'Professionnel' },
        chantier: null,
        entreprise: { nom: 'Élec du Sud', forme_juridique: 'SARL', email: 'contact@elec.fr', couleur: '#f97316' },
      };
      const { page } = await ouvrir({ reel: true, largeur: 390, supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_devis_for_signature' ? json(reponse) : json({})) });
      await page.goto(`${ORIGIN}/devis/signer/0b9e1c52-3c1e-4f8e-9a57-0c2f6e1b9d87`, { waitUntil: 'networkidle0' });
      await attendre(1000);
      const doc = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('srcdoc') || '').join(''));
      verifier(!doc.includes('FORMULAIRE DE RÉTRACTATION') && !doc.includes('DROIT DE RÉTRACTATION'), 'pas d’avis de rétractation pour un professionnel');
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Signer/.test(x.innerText || '')); if (b) b.click(); });
      await attendre(500);
      verifier(!(await page.evaluate(() => !!document.querySelector('[data-ui="DemandeExpresse"]'))), 'pas de case de demande expresse pour un professionnel');
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
    nom: 'aperçu PDF : certification TVA réduite — signée sur le devis, « par le règlement » sur la facture',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      const vus = [];
      const assez = () => vus.some((d) => d.reduit && d.numero.startsWith('DEV')) && vus.some((d) => d.reduit && d.numero.startsWith('FAC'));
      for (let i = 0; i < 12 && !assez(); i++) {
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
          // Le bloc de certification seul (src/lib/mentionTvaReduite.js), pour ne pas lire la signature du devis
          const lu = new DOMParser().parseFromString(html, 'text/html');
          const bloc = lu.querySelector('.tva-reduite')?.textContent.replace(/\s+/g, ' ') || '';
          return {
            // Le titre du document (« Facture FAC-… ») : une facture cite aussi son devis d'origine
            numero: (lu.title.match(/(DEV|FAC)-\d{4}-\d{5}/) || [''])[0],
            reduit: /TVA (10|5[,.]5)\s?%/.test(html),
            titre: bloc.includes('CERTIFICATION DU CLIENT'),
            signe: /Je soussigné\(e\) .+ certifie/.test(bloc) && bloc.includes('La signature du présent devis vaut certification'),
            regle: bloc.includes('Par le règlement de la présente facture, le client certifie, en qualité de preneur de la prestation'),
            ligneSignature: /signature|soussigné/i.test(bloc),
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
      const devis = vus.filter((d) => d.reduit && d.numero.startsWith('DEV'));
      const factures = vus.filter((d) => d.reduit && d.numero.startsWith('FAC'));
      verifier(devis.length > 0, `au moins un devis à taux réduit dans la démo (vus : ${vus.map((d) => d.numero).join(', ')})`);
      verifier(factures.length > 0, `au moins une facture à taux réduit dans la démo (vus : ${vus.map((d) => d.numero).join(', ')})`);
      for (const d of devis) verifier(d.titre && d.signe, `${d.numero} porte la certification signée du client`);
      for (const d of factures) {
        verifier(d.titre && d.regle, `${d.numero} porte la certification « par le règlement de la présente facture »`);
        verifier(!d.ligneSignature, `${d.numero} ne demande pas de signature au client`);
      }
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
    // Le calcul de la fenêtre « Métré » est partagé avec le site public (src/lib/metre.js, refonte du site, T5b) :
    // l'éditeur réel doit donner le même métré qu'avant l'extraction, et l'appliquer à la ligne.
    nom: 'éditeur de devis : le métré express (4 × 3 m, 10 % de chutes) donne 13,2 m² et l’applique à la ligne (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      await attendre(800);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Nouveau$/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0); b?.click(); });
      await attendre(600);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=menuitem], a')].find((x) => (x.innerText || '').trim() === 'Nouveau devis'); b?.click(); });
      await attendre(1500);
      // Le client n'est pas nécessaire pour chiffrer une ligne
      const champ = await page.$('input[placeholder^="Ajouter une prestation"]');
      verifier(!!champ, 'éditeur de devis ouvert');
      await champ.click(); await champ.type('Carrelage sol', { delay: 15 }); await attendre(400);
      await page.keyboard.press('Enter'); await attendre(600);

      // Menu « ⋯ » de la ligne, puis « Métré L × l »
      const menu = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="Actions de ligne"]')].find((x) => x.getBoundingClientRect().width > 0);
        b?.click();
        return !!b;
      });
      verifier(menu, 'menu de la ligne ouvert');
      await attendre(300);
      const metre = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role=menuitem]')].find((x) => x.getBoundingClientRect().width > 0 && /Métré/.test(x.innerText || ''));
        b?.click();
        return !!b;
      });
      verifier(metre, '« Métré L × l » ouvre la fenêtre');
      await attendre(400);

      // Champs de la fenêtre, dans l'ordre : longueur, largeur, hauteur, nombre, chutes
      const CHAMPS = ['longueur', 'largeur', 'hauteur', 'nombre', 'chutes'];
      const remplir = async (nom, valeur) => {
        const champs = await page.$$('[role=dialog][aria-label="Métré express"] input');
        const el = champs[CHAMPS.indexOf(nom)];
        await el.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        if (valeur) await el.type(valeur, { delay: 10 });
        await attendre(150);
      };
      const quantite = () => page.evaluate(() => {
        const d = document.querySelector('[role=dialog][aria-label="Métré express"]');
        const ligne = [...d.querySelectorAll('span')].find((s) => s.textContent.trim() === 'Quantité calculée');
        return (ligne?.nextElementSibling?.textContent || '').replace(/[\s  ]+/g, ' ').trim();
      });
      await remplir('longueur', '4');
      await remplir('largeur', '3');
      await remplir('chutes', '10');
      const surface = await quantite();
      verifier(surface === '13,2 m²', `4 × 3 m et 10 % de chutes : 13,2 m² (« ${surface} »)`);
      await remplir('hauteur', '0.5');
      const volume = await quantite();
      verifier(volume === '6,6 m³', `avec une hauteur de 0,5 m : 6,6 m³ (« ${volume} »)`);
      await remplir('hauteur', '');
      await remplir('nombre', '2');
      const double = await quantite();
      verifier(double === '26,4 m²', `nombre 2 : 26,4 m² (« ${double} »)`);
      await remplir('nombre', '1');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role=dialog][aria-label="Métré express"] button')].find((x) => (x.innerText || '').trim() === 'Appliquer');
        b?.click();
      });
      await attendre(500);
      const ligne = await page.evaluate(() => {
        const vu = (el) => el.getBoundingClientRect().width > 0;
        return {
          quantite: [...document.querySelectorAll('input[aria-label="Quantité"]')].find(vu)?.value,
          unite: [...document.querySelectorAll('select[aria-label="Unité"]')].find(vu)?.value,
          fenetre: !!document.querySelector('[role=dialog][aria-label="Métré express"]'),
        };
      });
      verifier(!ligne.fenetre && ligne.quantite === '13.2' && ligne.unite === 'm²', `« Appliquer » pose 13,2 m² sur la ligne (${JSON.stringify(ligne)})`);
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
