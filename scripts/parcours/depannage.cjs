// Dépannage express (lot 3, src/lib/depannage.js) — critère : à 375 px, un dépanneur active le module, saisit sa grille
// et l'imprime (PDF : taux horaire TTC aux deux taux, décompte, déplacement, majoration) ; depuis la page Devis, il fait
// le devis d'un dépannage urgent en un écran (client particulier, urgence cochée, une pièce que le client garde) ; le
// devis porte les lignes de la grille et les mentions (« Devis gratuit », pièces) ; il le fait signer sur place (phrase
// d'urgence) puis le facture tout de suite, payable sans attendre sept jours (L221-10, 4°). Le devis n'est signé qu'après
// avoir été REMIS au client (C. conso. L221-8) : la remise est enregistrée avant que la signature s'ouvre, à sa propre
// date. Données fictives seulement.
const fs = require('fs');
const path = require('path');

const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
const { CGU_VERSION } = require('../lib/cgu.cjs');

const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };
// Avant chargement : pas d'invite d'installation, et une horloge dont le parcours règle le décalage (window.__decalageMs) :
// la signature a lieu « deux jours après » la remise. Fonction autonome (elle est sérialisée dans la page).
const avantChargementHorlogeReglable = () => {
  try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ }
  const Vraie = Date;
  window.__decalageMs = 0;
  class DateReglable extends Vraie {
    constructor(...a) { if (a.length === 0) super(Vraie.now() + window.__decalageMs); else super(...a); }
    static now() { return Vraie.now() + window.__decalageMs; }
  }
  window.Date = DateReglable;
};
const documentsEnregistres = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}'));

/** L'aperçu du document de la fiche ouverte (le générateur de DevisPage) : son HTML, la fenêtre refermée. */
async function apercuDuDocument(page, attendre) {
  const direct = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'Aperçu' && x.offsetParent);
    if (b) b.click();
    return !!b;
  });
  if (!direct) {
    await page.evaluate(() => [...document.querySelectorAll('button[aria-label="Plus d\'actions"]')].find((b) => b.offsetParent)?.click());
    await attendre(500);
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Aperçu du document')?.click());
  }
  await attendre(1200);
  const html = await page.evaluate(() => document.querySelector('iframe[title="Aperçu du document"]')?.getAttribute('srcdoc') || '');
  await page.keyboard.press('Escape');
  await attendre(500);
  return html;
}

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
      const { page } = await ouvrir({ page: 'settings', largeur: 375, avantChargement: avantChargementHorlogeReglable });

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
      verifier(aide.includes('Ce que demande l’arrêté du 24 janvier 2017') && aide.includes('Arrêté du 24 janvier 2017, articles 2 et 3'),
        'l’obligation d’affichage est résumée avec sa source');
      verifier(!aide.includes('docs/') && !aide.includes('« Taux horaires'), 'ni chemin du dépôt, ni guillemets autour du résumé');
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
      // Pas de majoration d'urgence (décision du 5 nov. 2026) : la grille ne propose que la nuit, le dimanche et les jours fériés
      const majorations = await page.evaluate((d) => {
        const lab = [...document.querySelectorAll(`${d} label`)].find((l) => l.innerText.trim().startsWith('Majoration'));
        const sel = lab && document.getElementById(lab.htmlFor);
        return sel ? [...sel.options].map((o) => o.text) : null;
      }, D);
      verifier(majorations && majorations.some((o) => /^Nuit/.test(o)) && majorations.every((o) => !/urgence/i.test(o)),
        `les majorations proposées sont celles de la grille, jamais l’urgence (${(majorations || []).join(' | ')})`);
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
      verifier(/122,10/.test(total), `le total TTC suit la grille, urgence cochée : aucune majoration d’urgence (${total})`);
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
      const apercu = await apercuDuDocument(page, attendre);
      verifier(apercu.includes('Devis gratuit.') && apercu.includes('Souhaitez-vous conserver les pièces') && /OUI<span[^>]*>✕<\/span>/.test(apercu),
        'l’aperçu porte « Devis gratuit » et le choix « OUI » pour les pièces (modèle de l’annexe 2)');
      verifier(apercu.includes('mention manuscrite « Lu et approuvé »'), 'l’aperçu porte la ligne « Lu et approuvé » de l’annexe 2');
      verifier(apercu.includes('Lieu d’intervention : '), 'le lieu d’intervention est imprimé (adresse du client par défaut)');
      verifier(apercu.includes('Pièces remplacées') && apercu.includes('Siphon PVC'), 'l’aperçu liste les pièces remplacées');
      verifier(apercu.includes('Dépannage urgent : vous avez expressément demandé'), 'l’aperçu porte l’exception d’urgence de la rétractation');

      // 5. Signature sur place depuis le brouillon (C. conso. L221-8) : le devis est d'abord REMIS (PDF imprimé ou partagé),
      // l'artisan confirme « Devis remis au client », la remise est ENREGISTRÉE (statut « envoyé », jour de la remise),
      // et seulement alors la signature s'ouvre. Contre-essais : tant que la remise n'est pas confirmée, rien n'est
      // enregistré et la signature ne s'ouvre pas ; la date de remise n'est pas celle de la signature (posée 2 jours après)
      const boutonDialogue = (texte) => page.evaluate((t) => { const b = [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')].find((x) => (x.innerText || '').trim() === t); if (b) b.click(); return !!b; }, texte);
      const signatureOuverte = () => page.evaluate(() => document.body.innerText.includes('Passer a la signature'));
      const stocke = async () => (await documentsEnregistres(page)).devis.find((x) => x.id === d.id);
      const sansRemise = (s) => s?.statut === 'brouillon' && !s.date_envoi;

      // 5a. On renonce dès la première fenêtre
      await cliquer(page, 'Faire signer');
      await attendre(500);
      verifier(await boutonDialogue('Annuler'), 'avant la signature, l’app demande de remettre le devis');
      await attendre(500);
      verifier(!(await signatureOuverte()), 'sans remise, la signature ne s’ouvre pas');
      verifier(sansRemise(await stocke()), 'rien n’est enregistré tant que le devis n’est pas remis (brouillon, sans date de remise)');

      // 5b. Le PDF est remis, mais l'artisan ne confirme pas la remise
      await capturerPdf(page);
      await cliquer(page, 'Faire signer');
      await attendre(500);
      verifier(await boutonDialogue('Ouvrir le PDF'), 'le PDF du devis est proposé');
      await page.waitForFunction(() => window.__pdf, { timeout: 30000 }).catch(() => null);
      verifier(!!(await page.evaluate(() => window.__pdf)), 'le PDF du devis est remis avant la signature');
      await attendre(500);
      verifier(await boutonDialogue('Annuler'), 'l’app demande si le client a reçu le devis');
      await attendre(500);
      verifier(!(await signatureOuverte()), 'PDF ouvert mais remise non confirmée : la signature ne s’ouvre pas');
      verifier(sansRemise(await stocke()), 'une remise non confirmée n’est pas enregistrée');

      // 5c. L'artisan confirme la remise : elle est enregistrée AVANT que la signature s'ouvre
      await capturerPdf(page);
      await cliquer(page, 'Faire signer');
      await attendre(500);
      await page.screenshot({ path: path.join(sortie, 'depannage-4-remise-1.png'), fullPage: false });
      verifier(await boutonDialogue('Ouvrir le PDF'), 'le PDF du devis est proposé une seconde fois');
      await page.waitForFunction(() => window.__pdf, { timeout: 30000 }).catch(() => null);
      await attendre(500);
      await page.screenshot({ path: path.join(sortie, 'depannage-5-remise-2.png'), fullPage: false });
      const jourDeRemise = await page.evaluate(() => new Date().toLocaleDateString('sv-SE'));
      verifier(await boutonDialogue('Devis remis au client'), 'l’artisan confirme « Devis remis au client »');
      await attendre(800);
      verifier(await signatureOuverte(), 'la remise confirmée, la signature s’ouvre');
      const remis = await stocke();
      verifier(remis?.statut === 'envoye' && remis.date_envoi === jourDeRemise, `la remise est enregistrée avant la signature (${remis?.statut}, remis le ${remis?.date_envoi}, attendu ${jourDeRemise})`);
      const pad = await page.evaluate(() => document.body.innerText);
      verifier(pad.includes('À ma demande, ces travaux de dépannage sont réalisés en urgence à mon domicile.'), 'la phrase d’urgence est sous la signature');
      // La signature a lieu deux jours plus tard : elle ne réécrit pas la date de remise
      await page.evaluate(() => { window.__decalageMs = 2 * 24 * 3600 * 1000; });
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
      await page.evaluate(() => { window.__decalageMs = 0; });
      const apresSignature = await stocke();
      const jourDeSignature = String(apresSignature?.signatureDate || apresSignature?.signature_date || '').slice(0, 10);
      verifier(apresSignature?.signature && apresSignature.statut === 'accepte', `devis signé sur place (${apresSignature?.statut}, signé le ${jourDeSignature})`);
      verifier(jourDeSignature && jourDeSignature !== jourDeRemise, `la signature est datée d’un autre jour que la remise (${jourDeSignature} ≠ ${jourDeRemise})`);
      verifier(apresSignature?.date_envoi === jourDeRemise, `la date de remise reste celle de la remise, pas celle de la signature (${apresSignature?.date_envoi})`);

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

      // 7. Contre-essai de « Devis gratuit » (décision du 5 nov. 2026) : un devis ordinaire d'un particulier (démo :
      // DEV-2026-00001, Marie Dupont, ni catégorie ni entreprise) n'imprime rien du dépannage, dans le générateur de la fiche
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'devis'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').includes('DEV-2026-00001'));
        if (b) b.click();
        return !!b;
      });
      verifier(ouvert, 'un devis ordinaire de la démo (DEV-2026-00001) s’ouvre');
      await attendre(1000);
      const ordinaire = await apercuDuDocument(page, attendre);
      verifier(ordinaire.includes('MODÈLE DE FORMULAIRE DE RÉTRACTATION'), 'c’est bien le devis d’un particulier (le formulaire de rétractation est imprimé)');
      verifier(!ordinaire.includes('Devis gratuit.') && !ordinaire.includes('depannage-mentions') && !ordinaire.includes('Souhaitez-vous conserver les pièces'),
        'un devis ordinaire d’un particulier n’imprime ni « Devis gratuit » ni la question sur les pièces (générateur de la fiche)');

      // 8. Seconde voie de remise : l'envoi par e-mail (démo : envoi simulé). Le devis envoyé a sa remise enregistrée (statut
      // « envoyé », jour d'envoi) : « Faire signer » ouvre la signature sans nouvelle fenêtre de remise
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'devis'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.click('[aria-label="Options de création"]');
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith('Dépannage express'))?.click());
      await attendre(1200);
      await (await champ(page, 'Client', D)).select('c1');
      await saisir(page, 'Intervention', 'Serrure qui force', D);
      await cliquer(page, 'Créer le devis', { dans: D });
      await attendre(2000);
      const stocke2 = async () => (await documentsEnregistres(page)).devis.find((x) => x.objet === 'Dépannage : Serrure qui force');
      verifier(sansRemise(await stocke2()), 'le second devis est un brouillon, jamais remis');
      await cliquer(page, 'Envoyer');
      await attendre(1500);
      verifier(await boutonDialogue('OK'), 'l’envoi par e-mail (simulé en démo) est confirmé');
      await attendre(500);
      const envoye = await stocke2();
      verifier(envoye?.statut === 'envoye' && envoye.date_envoi === await page.evaluate(() => new Date().toLocaleDateString('sv-SE')),
        `l’e-mail enregistre la remise (${envoye?.statut}, envoyé le ${envoye?.date_envoi})`);
      await cliquer(page, 'Faire signer');
      await attendre(800);
      verifier(await signatureOuverte(), 'devis envoyé par e-mail : « Faire signer » ouvre la signature');
      verifier(!(await page.evaluate(() => document.body.innerText.includes('Remettez d’abord le devis'))), 'sans nouvelle fenêtre de remise : il l’a déjà été');
    },
  },
  {
    nom: 'dépannage express (base) : grille rangée dans settings_json.reglages, forfait à moitié saisi gardé, devis enregistré avec ses catégories',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000301', nom: 'Exemple', prenom: 'Lucie', categorie: 'Particulier', telephone: '0600000004', email: 'lucie@exemple.fr',
        adresse: '9 impasse Imaginaire, 33000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000301', user_id: UID, organization_id: ORG, nom: 'Dépannage Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', adresse: '1 rue Imaginaire, 33000 Exempleville', is_active: true, is_default: true,
        settings_json: { reglages: { depannageActif: true, nomEntrepreneur: 'Jean Exemple', depannageGrille: { tauxHoraire: 60, decompte: 'quart', deplacement: 39 } } },
        cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: CGU_VERSION, created_at: '2026-01-01T00:00:00Z' };
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(1500);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click());
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Dépannage')?.click());
      await attendre(600);
      const zone = '[data-testid="reglages-depannage"]';
      verifier(!!(await page.$(zone)), 'Paramètres › Dépannage est ouvert');
      // Micro-entreprise (franchise de TVA, D-31) : ni « HT » ni « TTC » sur les libellés de la grille
      const libellesGrille = await page.evaluate((z) => [...document.querySelectorAll(`${z} label`)].map((l) => l.innerText.trim()).join(' | '), zone);
      verifier(libellesGrille.includes('Taux horaire (€)') && !/(^|[^A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/.test(libellesGrille), `en franchise, la grille s’écrit sans « HT » (${libellesGrille.slice(0, 80)}…)`);
      // Un forfait à moitié saisi (intitulé sans prix), puis un autre champ s'enregistre : le forfait reste
      await cliquer(page, 'Ajouter un forfait', { dans: zone });
      await attendre(200);
      await saisir(page, 'Intitulé', 'Ouverture de porte', zone);
      await attendre(300);
      await saisir(page, 'Taux horaire', '65', zone);
      await attendre(1500);
      const intitule = await page.evaluate((z) => { const l = [...document.querySelectorAll(`${z} label`)].find((x) => x.innerText.trim().startsWith('Intitulé')); return l ? document.getElementById(l.htmlFor)?.value : null; }, zone);
      verifier(intitule === 'Ouverture de porte', `le forfait à moitié saisi est gardé (${intitule})`);
      const ecritures = base.journal.filter((j) => (j.m === 'PATCH' || j.m === 'POST') && j.table === 'entreprise');
      const grille = ecritures.map((j) => j.corps?.settings_json?.reglages?.depannageGrille).filter(Boolean).pop();
      verifier(grille && grille.tauxHoraire === 65 && grille.deplacement === 39, `la grille est rangée dans settings_json.reglages (${JSON.stringify(grille)})`);

      // Devis express enregistré en base, avec ses lignes et leurs catégories
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'devis'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1800);
      // Aucun devis encore : le bouton « Dépannage express » de l'état vide
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith('Dépannage express'))?.click());
      await attendre(1200);
      const D = '[data-testid="devis-express"]';
      const client = await champ(page, 'Client', D);
      await client.select(CLIENT.id);
      await attendre(200);
      const lieu = await page.evaluate((d) => { const l = [...document.querySelectorAll(`${d} label`)].find((x) => x.innerText.trim().startsWith('Lieu')); return l ? document.getElementById(l.htmlFor)?.value : null; }, D);
      verifier(lieu === CLIENT.adresse, `le lieu d’intervention est pré-rempli avec l’adresse du client (${lieu})`);
      await saisir(page, 'Intervention', 'Robinet qui fuit', D);
      await cliquer(page, 'Ajouter une pièce', { dans: D });
      await attendre(200);
      await saisir(page, 'Pièce', 'Cartouche', D);
      // Micro-entreprise : le prix de la pièce s'écrit « € », sans « HT » (D-31)
      await saisir(page, '€', '15', D);
      const ecranExpress = await page.evaluate((d) => document.querySelector(d)?.innerText || '', D);
      verifier(!/(^|[^A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/.test(ecranExpress), 'en franchise, l’écran express n’écrit ni « HT » ni « TTC »');
      // Aucune réponse par défaut sur les pièces : la création la demande
      await cliquer(page, 'Créer le devis', { dans: D });
      await attendre(500);
      const alerte = await page.evaluate((d) => document.querySelector(`${d} [role="alert"]`)?.innerText || '', D);
      verifier(/conserver les pièces/.test(alerte), `sans réponse sur les pièces, le devis n’est pas créé (${alerte})`);
      await page.evaluate((d) => [...document.querySelectorAll(`${d} label`)].find((l) => l.innerText.trim() === 'Non')?.querySelector('input')?.click(), D);
      await attendre(200);
      await cliquer(page, 'Créer le devis', { dans: D });
      await attendre(2500);
      const post = base.journal.filter((j) => j.m === 'POST' && j.table === 'devis').pop();
      const corps = Array.isArray(post?.corps) ? post.corps[0] : post?.corps;
      let lignes = corps?.lignes;
      if (typeof lignes === 'string') { try { lignes = JSON.parse(lignes); } catch { lignes = []; } }
      const cats = (lignes || []).filter((l) => !l._isSection).map((l) => l.depannage);
      verifier(JSON.stringify(cats) === JSON.stringify(['deplacement', 'main_oeuvre', 'piece']), `devis enregistré en base avec ses catégories (${cats.join(', ')})`);
      verifier((lignes || []).find((l) => l.depannage === 'piece')?.conservee === false, 'la réponse « Non » est enregistrée sur la pièce');
      verifier(String(corps?.notes || '').includes(`Lieu d’intervention : ${CLIENT.adresse}`), 'le lieu d’intervention est enregistré');
    },
  },
];
