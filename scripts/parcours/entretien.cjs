// Parcours entretien (lot métier n° 2, D-33, migration 113) — critère : à 375 px, un chauffagiste active le module, saisit
// l'attestation d'entretien d'une chaudière gaz, l'alerte du CO s'affiche, l'aperçu porte les éléments de l'annexe 5
// (phrase du CO, tableaux, classe), la base la numérote, le PDF est produit, la facture sort à 10 % avec « immeuble achevé
// depuis plus de deux ans » ; horloge avancée : le rappel apparaît dans « À faire » avec un SMS qui cite l'article.
// Données fictives seulement.
const fs = require('fs');
const path = require('path');
const { json } = require('../lib/fauxSupabase.cjs');

const AN = new Date().getFullYear();
const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };

const dansDialogue = (page, fn, arg) => page.evaluate(fn, arg);
async function choisir(page, attendre, texte) {
  const ok = await dansDialogue(page, (x) => {
    const b = [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((y) => y.innerText.trim() === x);
    if (b) b.click();
    return !!b;
  }, texte);
  if (!ok) throw new Error(`choix « ${texte} » introuvable`);
  await attendre(150);
}
async function taper(page, selecteur, texte) {
  await page.click(selecteur, { clickCount: 3 });
  await page.type(selecteur, texte);
}
async function champParLibelle(page, debut) {
  return page.evaluateHandle((d) => {
    const l = [...document.querySelectorAll('[role="dialog"] label')].find((x) => x.innerText.startsWith(d));
    return l ? document.getElementById(l.htmlFor) : null;
  }, debut);
}

module.exports = [
  {
    nom: 'entretien : activer, attestation de chaudière au téléphone, alerte CO, PDF, facture à 10 %, puis rappel (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375, avantChargement: sansInstallation });
      // 1. Activer le module (Paramètres → Documents → Entretien)
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click());
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Entretien')?.click());
      await attendre(400);
      await page.click('#entretien-actif');
      await attendre(800);
      verifier(await page.$eval('#entretien-actif', (e) => e.getAttribute('aria-checked')) === 'true', 'le module entretien est activé');

      // 2. Fiche client : l'onglet « Entretien » vient en premier
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'clients'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('Dupont'))?.click());
      await attendre(900);
      const onglets = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.innerText.split('\n')[0]));
      verifier(onglets[0] === 'Entretien', `l'onglet Entretien est sur la fiche client (${onglets.join(', ')})`);
      await cliquer(page, 'Nouvel entretien', { dans: '[data-testid="onglet-entretien"]' });
      await attendre(600);

      // 3. À vide : le type d'appareil est demandé
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      const vide = await page.evaluate(() => document.querySelector('[role="dialog"] [role="alert"]')?.innerText || '');
      verifier(vide.includes('Le type d’appareil'), 'à vide, le type d’appareil est demandé');

      // 4. Chaudière gaz : ce qui manque est dit (CO, classe, appareils de mesure…)
      await choisir(page, attendre, 'Chaudière');
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      const manque = await page.evaluate(() => document.querySelector('[role="dialog"] [role="alert"]')?.innerText || '');
      verifier(manque.includes('La teneur en CO') && manque.includes('La classe énergétique') && manque.includes('Les points contrôlés'),
        'la chaudière demande le CO, la classe énergétique et les points contrôlés');

      await page.select('#entretien-appareil0-energie', 'gaz');
      await page.select('#entretien-appareil0-evacuation', 'ventouse');
      await taper(page, '#entretien-appareil0-marque', 'Exemplair');
      await taper(page, '#entretien-appareil0-modele', 'Naneo 24');
      await taper(page, '#entretien-local', 'Cuisine');
      const puissance = await champParLibelle(page, 'Puissance nominale');
      await puissance.type('24');
      await dansDialogue(page, () => [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.trim() === 'Tout cocher')?.click());
      await attendre(200);
      await taper(page, '#entretien-appareils_mesure', 'Analyseur Exemple A1');
      await taper(page, '#entretien-operations', 'Nettoyage du brûleur et de l’échangeur, contrôle de l’allumage');
      await taper(page, '#entretien-co_ppm', '30');
      await attendre(200);
      const alerte = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] [role="alert"]')].map((a) => a.innerText).join(' | '));
      verifier(alerte.includes('vous devez informer l’usager'), 'à 30 ppm de CO, le devoir d’informer l’usager s’affiche');
      await taper(page, '#entretien-rendement', '91 %');
      await taper(page, '#entretien-rendement_reference', '94 %');
      await taper(page, '#entretien-emissions', '60 mg/kWh');
      await page.select('#entretien-classe_energetique', 'C');
      const usage = await champParLibelle(page, 'Conseils et recommandations portant sur le bon usage');
      await usage.type('Baisser la température de consigne la nuit');
      await taper(page, '#entretien-intervenant_nom', 'Paul Exemple');
      const prix = await champParLibelle(page, 'Prix');
      if (prix && (await prix.evaluate((e) => !!e))) await prix.type('120');
      const zone = await page.$('[role="dialog"] canvas');
      await zone.evaluate((c) => c.scrollIntoView({ block: 'center' }));
      await attendre(200);
      const b = await zone.boundingBox();
      await page.mouse.move(b.x + b.width * 0.1, b.y + b.height * 0.6);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.4, { steps: 12 });
      await page.mouse.up();
      await attendre(200);

      // 5. Aperçu : les éléments de l'annexe 5
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      await attendre(500);
      const reste = await page.evaluate(() => document.querySelector('[role="dialog"] [role="alert"]')?.innerText || '');
      verifier(!reste.includes('À compléter'), `la saisie est complète (${reste.replace(/\n+/g, ' | ')})`);
      const apercu = await page.evaluate(() => document.querySelector('[role="dialog"] iframe')?.getAttribute('srcdoc') || '');
      for (const t of ['Attestation d’entretien de chaudière', 'Il y a anomalie de fonctionnement nécessitant impérativement des investigations complémentaires',
        'Rendement de référence', 'NOx : 35 mg / kWh', 'sauf impossibilité liée aux caractéristiques techniques de l’installation', 'Chaudière de type B1',
        'Classe énergétique de la chaudière</th><td>C', 'NF X50-010', 'Analyseur Exemple A1', 'Contrôle de la pression', 'Cuisine',
        'ne revêt un caractère obligatoire', 'À conserver au moins deux ans', 'alt="Signature"', 'Paul Exemple']) {
        verifier(apercu.includes(t), `l'aperçu porte « ${t.replace(/<[^>]+>/g, ' ')} »`);
      }
      verifier(!/conforme|certificat/i.test(apercu), 'jamais « conforme » ni « certificat »');
      await cliquer(page, 'Enregistrer l’attestation', { dans: '[role="dialog"]' });
      await attendre(1200);
      const titre = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText || '');
      verifier(titre === `Attestation ENT-${AN}-00001`, `l'attestation est numérotée (${titre})`);

      // 6. PDF
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
      verifier(pdf.taille > 20000, `le PDF de l'attestation est produit (${pdf.taille} octets)`);
      fs.mkdirSync(path.join(RACINE, 'audit-ui'), { recursive: true });
      fs.writeFileSync(path.join(RACINE, 'audit-ui', 'entretien-attestation.pdf'), Buffer.from(pdf.base64, 'base64'));
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'entretien-attestation-375.png') });

      // 7. Facture tirée de l'attestation : 10 %, adresse de l'installation, « immeuble achevé depuis plus de deux ans »
      await cliquer(page, 'Faire la facture', { dans: '[role="dialog"]' });
      await attendre(1800);
      const facture = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      verifier(/Facture/.test(facture) && facture.includes(`attestation n° ENT-${AN}-00001`) && facture.includes('immeuble achevé depuis plus de deux ans') && /10\s*%/.test(facture),
        'la facture reprend l’entretien, le numéro d’attestation, la mention du logement et le taux de 10 %');

      // 8. Horloge avancée de 340 jours : le rappel apparaît dans « À faire », SMS avec l'article (puissance connue)
      await page.evaluate(() => {
        const decalage = 340 * 86400000;
        const Vraie = Date;
        class Avancee extends Vraie {
          constructor(...a) { super(...(a.length ? a : [Vraie.now() + decalage])); }
          static now() { return Vraie.now() + decalage; }
        }
        window.Date = Avancee;
      });
      await page.evaluate(() => [...document.querySelectorAll('nav button, nav a, button')].find((x) => x.innerText.trim() === 'Accueil')?.click());
      await attendre(1200);
      const aFaire = await page.evaluate(() => document.querySelector('section[aria-label="À faire aujourd\'hui"]')?.innerText || '');
      verifier(aFaire.includes('Entretien à prévoir — Marie Dupont'), 'le rappel du prochain entretien est dans « À faire »');
      await page.evaluate(() => [...document.querySelectorAll('section[aria-label="À faire aujourd\'hui"] button')].find((x) => x.innerText.includes('Entretien à prévoir'))?.click());
      await attendre(900);
      const sms = decodeURIComponent(await page.evaluate(() => document.querySelector('[role="dialog"] a[href^="sms:"]')?.getAttribute('href') || ''));
      verifier(sms.includes('art. R. 224-41-7') && sms.includes('répondez STOP') && !/obligatoire/i.test(sms), `le SMS cite l'article et l'opposition STOP (${sms.slice(0, 160)}…)`);
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'entretien-rappel-375.png') });
    },
  },
  // Lien de désinscription des rappels d'entretien (CPCE L. 34-5), en mode réel simulé : copié du parcours ramonage
  // (relecture du 4 nov. 2026, point 4), avec un contre-essai sur un jeton que la base ne reconnaît pas
  {
    nom: 'entretien : le lien « ne plus recevoir de rappel » n’agit qu’au bouton, sans compte',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const JETON = 'a0a0a0a0-0000-4000-8000-000000000113';
      const appels = [];
      const { page } = await ouvrir({
        reel: true, largeur: 375, chemin: `/rappel-entretien/${JETON}`,
        supabase: (req, u) => {
          if (u.pathname === '/rest/v1/rpc/refuser_rappels_ramonage') { appels.push(req.postData()); return json(true); }
          return json([]);
        },
      });
      await attendre(800);
      const avant = await page.evaluate(() => document.body.innerText);
      verifier(appels.length === 0, 'rien n’est fait à l’ouverture du lien (les messageries ouvrent les liens)');
      verifier(avant.includes('prochain entretien'), 'la page parle de l’entretien, pas du ramonage');
      await cliquer(page, 'Ne plus recevoir de rappel');
      await attendre(800);
      const t = await page.evaluate(() => document.body.innerText);
      verifier(appels.length === 1 && JSON.parse(appels[0]).p_jeton === JETON, 'le refus est envoyé avec le jeton du lien');
      verifier(t.includes('C’est noté'), 'confirmation affichée');
    },
  },
  {
    nom: 'entretien : un jeton non reconnu n’affiche pas « C’est noté » (contre-essai)',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({
        reel: true, largeur: 375, chemin: '/rappel-entretien/a0a0a0a0-0000-4000-8000-0000000001ff',
        supabase: (req, u) => (u.pathname === '/rest/v1/rpc/refuser_rappels_ramonage' ? json(false) : json([])),
      });
      await attendre(800);
      await cliquer(page, 'Ne plus recevoir de rappel');
      await attendre(800);
      const t = await page.evaluate(() => document.body.innerText);
      verifier(!t.includes('C’est noté') && t.includes('Lien non reconnu'), 'jeton refusé : « Lien non reconnu », jamais « C’est noté »');
    },
  },
];
