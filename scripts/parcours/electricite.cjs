// Parcours électricien (lot 4, migration 111) — critère : à 375 px, un chantier d'électricité : sans le réglage, pas
// d'onglet « Électricité » ; réglage allumé, l'onglet crée le rappel Consuel (tâche datée de la mise en service − 20 jours,
// visible dans « À faire » le jour même), le compte rendu d'intervention et d'autocontrôle se saisit, la base (démo) le
// numérote, l'aperçu ne dit jamais « conforme », le PDF est produit, et « Faire la facture » donne la facture sans
// ressaisie. Données fictives seulement.
const fs = require('fs');
const path = require('path');
const { ongletFiche, nomsOnglets } = require('../lib/parcoursChantier.cjs');

const AN = new Date().getFullYear();
const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };
const jourDans = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Pose une valeur dans un champ contrôlé par React (date, texte) en passant par le setter natif. */
const poser = (page, selecteur, valeur) => page.evaluate((s, v) => {
  const e = typeof s === 'string' ? document.querySelector(s) : null;
  if (!e) throw new Error(`champ ${s} introuvable`);
  const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
  e.dispatchEvent(new Event('input', { bubbles: true }));
}, selecteur, valeur);

async function premierChantier(page, attendre) {
  const nom = await page.evaluate(() => {
    const b = document.querySelector('button[aria-label^="Ouvrir le chantier"]');
    b?.click();
    return b?.getAttribute('aria-label').replace('Ouvrir le chantier ', '') || '';
  });
  await attendre(1000);
  return nom;
}

module.exports = [
  {
    nom: 'électricien : rappel Consuel à J-20, compte rendu numéroté, PDF, facture tirée du compte rendu (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      fs.mkdirSync(path.join(RACINE, 'audit-ui'), { recursive: true });
      // 0. Contre-essai : sans le réglage, pas d'onglet « Électricité »
      const { page } = await ouvrir({ page: 'chantiers', largeur: 375, avantChargement: sansInstallation });
      await attendre(800);
      const nom = await premierChantier(page, attendre);
      verifier(!!nom, `un chantier de démo s'ouvre (${nom})`);
      verifier(!(await nomsOnglets(page)).includes('Électricité'), 'sans le réglage, pas d’onglet « Électricité »');

      // 1. Paramètres → Documents → Électricité : allumer
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'settings'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1200);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click());
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Électricité')?.click());
      await attendre(400);
      await page.click('#electricite-actif');
      await attendre(800);
      verifier(await page.$eval('#electricite-actif', (e) => e.getAttribute('aria-checked')) === 'true', 'le réglage Électricité est allumé');

      // 2. La fiche chantier gagne l'onglet « Électricité »
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'chantiers'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1200);
      await premierChantier(page, attendre);
      verifier((await nomsOnglets(page)).includes('Électricité'), 'l’onglet « Électricité » est sur la fiche chantier');
      await ongletFiche(page, attendre, 'Électricité');

      // 3. Rappel Consuel : mise en service dans 20 jours → la tâche est due aujourd'hui (dernier jour d'envoi)
      const champDate = await page.evaluate(() => {
        const l = [...document.querySelectorAll('[data-testid="onglet-electricite"] label')].find((x) => x.innerText.startsWith('Mise en service prévue'));
        return l ? `#${CSS.escape(l.htmlFor)}` : null;
      });
      await poser(page, champDate, jourDans(20));
      await cliquer(page, 'Me rappeler l’envoi au Consuel', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(800);
      const etat = await page.evaluate(() => document.querySelector('[data-testid="onglet-electricite"]')?.innerText || '');
      verifier(/Demande à envoyer au plus tard le/.test(etat) && etat.includes('J’ai envoyé la demande'), `l’onglet dit la date limite (${etat.split('\n')[1] || ''})`);
      verifier(!/conforme/i.test(etat), 'jamais « conforme » dans l’onglet');
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'electricite-consuel-375.png') });

      // 4. Compte rendu : à vide, ce qui manque est dit ; puis saisie complète
      await cliquer(page, 'Nouveau compte rendu', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(600);
      await cliquer(page, 'Vérifier', { dans: '[role="dialog"]' });
      const manque = await page.evaluate(() => document.querySelector('[role="dialog"] [role="alert"]')?.innerText || '');
      verifier(manque.includes('La nature des travaux') && manque.includes('Les travaux réalisés'), 'à vide, la nature et les travaux sont demandés');
      for (const t of ['Rénovation partielle', 'Déclenchement constaté', 'Vérifiée']) {
        const ok = await page.evaluate((x) => {
          const b = [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((y) => y.innerText.trim() === x);
          b?.click();
          return !!b;
        }, t);
        verifier(ok, `choix « ${t} »`);
        await attendre(100);
      }
      await poser(page, '#cr-travaux', 'Remplacement du tableau électrique\nPose de deux circuits prises cuisine');
      const terre = await page.evaluate(() => {
        const l = [...document.querySelectorAll('[role="dialog"] label')].find((x) => x.innerText.startsWith('Résistance de la prise de terre'));
        return `#${CSS.escape(l.htmlFor)}`;
      });
      await poser(page, terre, '42');
      await poser(page, '#cr-intervenant_nom', 'Paul Exemple');
      await poser(page, '#cr-prix_ht', '450');
      await attendre(200);
      await cliquer(page, 'Vérifier', { dans: '[role="dialog"]' });
      await attendre(600);
      const apercu = await page.evaluate(() => document.querySelector('[role="dialog"] iframe')?.getAttribute('srcdoc') || '');
      for (const t of ['Compte rendu d’intervention et d’autocontrôle', 'Autocontrôle réalisé le', 'Résistance de la prise de terre (Ω)</th><td>42',
        'Déclenchement constaté', 'Remplacement du tableau électrique', 'Il ne remplace pas l’attestation visée par le Consuel']) {
        verifier(apercu.includes(t), `l'aperçu porte « ${t.replace(/<[^>]+>/g, ' ')} »`);
      }
      verifier(!/conform/i.test(apercu.replace(/<style>[\s\S]*?<\/style>/, '')) && !/certifi/i.test(apercu), 'jamais « conforme » ni « certifié » sur le compte rendu');
      await cliquer(page, 'Enregistrer', { dans: '[role="dialog"]' });
      await attendre(1200);
      const titre = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText || '');
      verifier(titre === `Compte rendu CRI-${AN}-00001`, `le compte rendu est numéroté (${titre})`);
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'electricite-compte-rendu-375.png') });

      // 5. PDF produit, gardé pour relecture
      await page.evaluate(() => {
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
      await cliquer(page, 'PDF', { dans: '[role="dialog"]' });
      await page.waitForFunction(() => window.__pdf, { timeout: 30000 });
      const pdf = await page.evaluate(() => window.__pdf);
      verifier(pdf.taille > 20000, `le PDF du compte rendu est produit (${pdf.taille} octets)`);
      fs.writeFileSync(path.join(RACINE, 'audit-ui', 'electricite-compte-rendu.pdf'), Buffer.from(pdf.base64, 'base64'));

      // 6. Facture tirée du compte rendu, sans ressaisie
      await cliquer(page, 'Faire la facture', { dans: '[role="dialog"]' });
      await attendre(1800);
      const facture = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      verifier(/Facture/.test(facture) && facture.includes(`compte rendu n° CRI-${AN}-00001`) && /450,00/.test(facture),
        'la facture reprend les travaux, le numéro du compte rendu et le prix');
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'electricite-facture-375.png') });

      // 7. « À faire » de l'Accueil : la tâche Consuel est due aujourd'hui
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'dashboard'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      const aFaire = await page.evaluate(() => document.querySelector('section[aria-label="À faire aujourd\'hui"]')?.innerText || '');
      verifier(aFaire.includes('Envoyer la demande d’attestation Consuel'), 'le rappel Consuel est dans « À faire » le dernier jour d’envoi');
    },
  },
];
