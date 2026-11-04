// Dépannage express (lot 3, src/lib/depannage.js) — critère : à 375 px, un dépanneur active le module, saisit sa grille
// et l'imprime (PDF : taux horaire TTC aux deux taux, décompte, déplacement, majoration) ; depuis la page Devis, il fait
// le devis d'un dépannage urgent en un écran (client particulier, urgence cochée, une pièce que le client garde) ; le
// devis porte les lignes de la grille et les mentions (« Devis gratuit », pièces) ; il le fait signer sur place (phrase
// d'urgence) puis le facture tout de suite, payable sans attendre sept jours (L221-10, 4°). Données fictives seulement.
const fs = require('fs');
const path = require('path');

const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };
const documentsEnregistres = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}'));

/** Le champ relié au libellé (Champ : label[for]) dans `dans`. */
const champ = (page, libelle, dans = 'body') => page.evaluateHandle((l, d) => {
  const lab = [...document.querySelectorAll(`${d} label`)].find((x) => x.innerText.trim().startsWith(l));
  return lab ? document.getElementById(lab.htmlFor) : null;
}, libelle, dans);
async function saisir(page, libelle, valeur, dans) {
  const el = await champ(page, libelle, dans);
  if (!el || !(await el.evaluate((x) => !!x))) throw new Error(`champ « ${libelle} » introuvable`);
  await el.click({ clickCount: 3 });
  await el.type(valeur);
  await el.evaluate((x) => x.blur());
}
const capturerPdf = (page) => page.evaluate(() => {
  window.__pdf = null;
  const avant = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    if (blob?.type === 'application/pdf') {
      const r = new FileReader();
      r.onload = () => { window.__pdf = { taille: blob.size, base64: String(r.result).split(',')[1] }; };
      r.readAsDataURL(blob);
    }
    return avant(blob);
  };
});

module.exports = [
  {
    nom: 'dépannage express : grille imprimée, devis d’un dépannage urgent, signature sur place, facture immédiate (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const sortie = path.join(RACINE, 'audit-ui');
      fs.mkdirSync(sortie, { recursive: true });
      const { page } = await ouvrir({ page: 'settings', largeur: 375, avantChargement: sansInstallation });

      // 1. Paramètres → Documents → Dépannage : activer, saisir la grille
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click());
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Dépannage')?.click());
      await attendre(400);
      await page.click('#depannage-actif');
      await attendre(800);
      verifier(await page.$eval('#depannage-actif', (e) => e.getAttribute('aria-checked')) === 'true', 'le module dépannage est activé');
      const zone = '[data-testid="reglages-depannage"]';
      await saisir(page, 'Taux horaire', '60', zone);
      await attendre(300);
      await saisir(page, 'Frais de déplacement', '39', zone);
      await attendre(300);
      await saisir(page, 'Majoration de nuit', '50', zone);
      await attendre(300);
      await saisir(page, 'Horaires de nuit', 'de 20 h à 8 h', zone);
      await attendre(800);
      const aide = await page.evaluate((z) => document.querySelector(z)?.innerText || '', zone);
      verifier(/66(,00)?\s€ TTC à 10 %/.test(aide) && /72(,00)?\s€ TTC à 20 %/.test(aide), 'le taux horaire est montré TTC aux deux taux');
      verifier(aide.includes('Taux horaires TTC, décompte du temps, frais de déplacement et forfaits s\'affichent') && aide.includes('Arrêté du 24 janvier 2017, article 3'),
        'l’obligation d’affichage est citée avec sa source');
      await page.screenshot({ path: path.join(sortie, 'depannage-1-grille.png'), fullPage: true });

      // 2. Imprimer la grille : un PDF est remis
      await capturerPdf(page);
      await cliquer(page, 'Imprimer la grille', { dans: zone });
      await page.waitForFunction(() => window.__pdf, { timeout: 30000 });
      const pdf = await page.evaluate(() => window.__pdf);
      verifier(pdf.taille > 10000, `la grille imprimable est produite (${pdf.taille} octets)`);
      fs.writeFileSync(path.join(sortie, 'depannage-grille.pdf'), Buffer.from(pdf.base64, 'base64'));
      // Le contenu imprimé, tel que le générateur le produit avec les réglages enregistrés
      const reglages = await page.evaluate(() => {
        const e = JSON.parse(localStorage.getItem('mallettico_entreprises') || '[]');
        return Array.isArray(e) && e[0] ? e[0] : null;
      });
      verifier(!reglages || JSON.stringify(reglages).includes('"tauxHoraire":60'), 'la grille est enregistrée dans les réglages');

      // 3. Page Devis → menu de création → « Dépannage express »
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'devis'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.click('[aria-label="Options de création"]');
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith('Dépannage express'))?.click());
      await attendre(1200);
      const D = '[data-testid="devis-express"]';
      verifier(!!(await page.$(D)), 'la feuille « Dépannage express » est ouverte');
      const client = await champ(page, 'Client', D);
      await client.select('c1');
      await saisir(page, 'Intervention', 'Fuite sous l’évier', D);
      const urgence = await page.$(`${D} [data-ui="UrgenceExpress"] input`);
      verifier(!(await urgence.evaluate((x) => x.checked)), 'la case urgence n’est pas pré-cochée');
      await urgence.click();
      await attendre(300);
      const avert = await page.evaluate((d) => document.querySelector(`${d} [role="note"]`)?.innerText || '', D);
      verifier(/strictement nécessaires/.test(avert) && /devis séparé/.test(avert), 'cochée, l’urgence affiche l’avertissement du juriste');
      await cliquer(page, 'Ajouter une pièce', { dans: D });
      await attendre(200);
      await saisir(page, 'Pièce', 'Siphon PVC', D);
      await saisir(page, '€ HT', '12', D);
      await page.evaluate((d) => [...document.querySelectorAll(`${d} label`)].find((l) => l.innerText.trim() === 'Oui')?.querySelector('input')?.click(), D);
      await attendre(300);
      // 39 + 60 + 12 = 111 € HT, TVA 10 % : 122,10 € TTC
      const total = await page.$eval('[data-testid="total-express"]', (e) => e.innerText);
      verifier(/122,10/.test(total), `le total TTC suit la grille (${total})`);
      await page.screenshot({ path: path.join(sortie, 'depannage-2-devis-express.png'), fullPage: false });
      await cliquer(page, 'Créer le devis', { dans: D });
      await attendre(2000);

      // 4. Le devis enregistré : lignes de la grille, urgence, choix des pièces
      const { devis = [] } = await documentsEnregistres(page);
      const d = devis.find((x) => x.objet === 'Dépannage : Fuite sous l’évier');
      verifier(d && d.travaux_urgents === true && d.statut === 'brouillon', `devis créé, urgence posée (${d?.numero}, ${d?.statut})`);
      const cats = (d?.lignes || []).filter((l) => !l._isSection).map((l) => l.depannage);
      verifier(JSON.stringify(cats) === JSON.stringify(['deplacement', 'main_oeuvre', 'piece']), `lignes de la grille (${cats.join(', ')})`);
      verifier(Math.abs((d?.total_ttc || 0) - 122.1) < 0.005, `total enregistré ${d?.total_ttc}`);
      // Aperçu du document (générateur de DevisPage) : menu « ⋯ » → « Aperçu du document »
      await page.evaluate(() => [...document.querySelectorAll('button[aria-label="Plus d\'actions"]')].find((b) => b.offsetParent)?.click());
      await attendre(500);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Aperçu du document')?.click());
      await attendre(1200);
      const apercu = await page.evaluate(() => document.querySelector('iframe[title="Aperçu du document"]')?.getAttribute('srcdoc') || '');
      await page.keyboard.press('Escape');
      await attendre(500);
      verifier(apercu.includes('Devis gratuit.') && apercu.includes('Souhaitez-vous conserver les pièces') && /✕<\/span>Oui/.test(apercu),
        'l’aperçu porte « Devis gratuit » et le choix « Oui » pour les pièces');
      verifier(apercu.includes('Pièces remplacées') && apercu.includes('Siphon PVC'), 'l’aperçu liste les pièces remplacées');
      verifier(apercu.includes('Dépannage urgent : vous avez expressément demandé'), 'l’aperçu porte l’exception d’urgence de la rétractation');

      // 5. Signature sur place depuis le brouillon : la phrase d'urgence est signée
      await cliquer(page, 'Faire signer');
      await attendre(800);
      const pad = await page.evaluate(() => document.body.innerText);
      verifier(pad.includes('À ma demande, ces travaux de dépannage sont réalisés en urgence à mon domicile.'), 'la phrase d’urgence est sous la signature');
      await page.evaluate(() => {
        const accepte = [...document.querySelectorAll('input[type=checkbox]')].find((c) => /J'accepte ce devis/.test(c.closest('label')?.innerText || ''));
        accepte?.click();
      });
      await attendre(300);
      await cliquer(page, 'Passer a la signature');
      await attendre(600);
      const canevas = await page.$('canvas');
      const boite = canevas && await canevas.boundingBox();
      if (boite) {
        await page.mouse.move(boite.x + 30, boite.y + 40);
        await page.mouse.down();
        await page.mouse.move(boite.x + 150, boite.y + 70, { steps: 8 });
        await page.mouse.up();
      }
      await attendre(300);
      await cliquer(page, 'Valider');
      await attendre(1800);
      const apresSignature = (await documentsEnregistres(page)).devis.find((x) => x.id === d.id);
      verifier(apresSignature?.signature && apresSignature.statut === 'accepte' && apresSignature.date_envoi, `devis signé sur place (${apresSignature?.statut}, remis le ${apresSignature?.date_envoi})`);

      // 6. Facture immédiate : urgence demandée, payable sur place (pas de report au 8e jour)
      await page.keyboard.press('Escape');
      await attendre(300);
      await cliquer(page, 'Facturer');
      await attendre(500);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((x) => (x.innerText || '').trim().startsWith('Facture complète'))?.click());
      await attendre(800);
      await page.evaluate(() => { const dlg = document.querySelector('[role="dialog"]'); [...(dlg?.querySelectorAll('button') || [])].find((x) => /^Confirmer/.test((x.innerText || '').trim()))?.click(); });
      await attendre(1800);
      const facture = (await documentsEnregistres(page)).devis.find((x) => x.devis_source_id === d.id && x.type === 'facture');
      verifier(facture && Math.abs(facture.total_ttc - 122.1) < 0.005, `facture tirée du devis (${facture?.numero}, ${facture?.total_ttc} €)`);
      verifier(facture && !/au plus tôt/.test(facture.conditions || ''), `urgence : pas de report du paiement (« ${facture?.conditions || 'conditions standard'} »)`);
      const pieces = (facture?.lignes || []).find((l) => l.depannage === 'piece');
      verifier(pieces && pieces.description === 'Siphon PVC', 'la facture reprend la pièce remplacée');
      await page.screenshot({ path: path.join(sortie, 'depannage-3-facture.png'), fullPage: false });
    },
  },
];
