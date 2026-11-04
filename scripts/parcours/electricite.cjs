// Parcours électricien (lot 4, migration 111) — critère : à 375 px, un chantier d'électricité : sans le réglage, pas
// d'onglet « Électricité » ; réglage allumé, l'onglet crée le rappel Consuel (tâche datée de la mise en service − 20 jours,
// visible dans « À faire » le jour même), le compte rendu d'intervention et d'autocontrôle se saisit, la base (démo) le
// numérote, l'aperçu ne dit jamais « conforme », le PDF est produit, et « Faire la facture » donne la facture sans
// ressaisie. Données fictives seulement.
const fs = require('fs');
const path = require('path');
const { ongletFiche, nomsOnglets, ouvrirFiche } = require('../lib/parcoursChantier.cjs');
const { creerBase, UID, json } = require('../lib/fauxSupabase.cjs');
const { CGU_VERSION } = require('../lib/cgu.cjs');

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

// ─── Mode réel simulé (faux Supabase) : ce que la démo cache (règle « données ») ─────────────────────────────────
const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
function jeuElectricite({ comptesRendus = [], memos = [] } = {}) {
  const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000111', nom: 'Exemple', prenom: 'Lucie', telephone: '0600000011', email: 'lucie@exemple.fr',
    adresse: '3 chemin de l’Exemple, 33000 Imaginaire', created_at: '2026-10-01T08:00:00Z' };
  const CHANTIER = { id: 'c1c1c1c1-0000-4000-8000-000000000111', nom: 'Tableau Exemple Parcours', client_id: CLIENT.id, statut: 'en_cours', avancement: 50,
    adresse: '3 chemin de l’Exemple', code_postal: '33000', ville: 'Imaginaire', date_debut: '2026-10-01', created_at: '2026-10-01T08:00:00Z' };
  const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000111', user_id: UID, organization_id: ORG, nom: 'Électricité Exemple', forme_juridique: 'Micro-entreprise',
    siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
    settings_json: { reglages: { electriciteActif: true, nomEntrepreneur: 'Paul Exemple' } }, cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: CGU_VERSION,
    created_at: '2026-01-01T00:00:00Z' };
  const cr = (id, numero, o = {}) => ({ id, user_id: UID, organization_id: ORG, numero, chantier_id: CHANTIER.id, client_id: CLIENT.id, remplace_id: null,
    facture_id: null, realise_le: `${AN}-10-20T09:00:00Z`, intervenant_nom: 'Paul Exemple', client_nom: 'Lucie Exemple', client_contact: null,
    adresse_intervention: '3 chemin de l’Exemple, 33000 Imaginaire', nature: 'renovation_partielle', travaux: `Travaux ${numero}`, mesures: { terre_ohms: '40' },
    reserves: null, observations: null, prix_ht: 380, annulee_le: null, annulation_motif: null,
    emetteur: { nom: 'Électricité Exemple', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Paul Exemple', siret: '00000000000000' },
    created_at: `${AN}-10-20T09:00:00Z`, updated_at: `${AN}-10-20T09:00:00Z`, ...o });
  return { CLIENT, CHANTIER, ENTREPRISE, cr, comptesRendus, memos };
}
async function ouvrirOnglet({ ouvrir, attendre, sessionFactice, base }) {
  const { page } = await ouvrir({ reel: true, largeur: 375, page: 'chantiers', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
  await attendre(2000);
  await ouvrirFiche(page, attendre, 'Tableau Exemple');
  await ongletFiche(page, attendre, 'Électricité');
  return page;
}
const ouvrirCompteRendu = (page, numero) => page.evaluate((n) => [...document.querySelectorAll('[data-testid="onglet-electricite"] [data-ui="LigneListe"] > button')]
  .find((b) => b.innerText.includes(n))?.click(), numero);
const texteFenetre = (page) => page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');

module.exports = [
  {
    nom: 'électricien (base) : le compte rendu part sans numéro, la base le numérote, l’écran le reprend ; facture liée, annulation et rappel Consuel en base',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const jeu = jeuElectricite();
      const ancien = jeu.cr('d1d1d1d1-0000-4000-8000-000000000111', `CRI-${AN}-00004`);
      let envoye = null;
      const base = creerBase({ clients: [jeu.CLIENT], chantiers: [jeu.CHANTIER], entreprise: [jeu.ENTREPRISE], comptes_rendus_electricite: [ancien] }, {
        refuser: (m, table, { corps }) => {
          if (m !== 'POST' || table !== 'comptes_rendus_electricite') return null;
          envoye = Array.isArray(corps) ? corps[0] : corps;
          const ligne = { ...envoye, numero: `CRI-${AN}-00005`, organization_id: ORG, user_id: UID, created_at: new Date().toISOString(), annulee_le: null, annulation_motif: null };
          base.tables.comptes_rendus_electricite.push(ligne);
          return json(ligne, 201);
        },
      });
      const page = await ouvrirOnglet({ ouvrir, attendre, sessionFactice, base });
      // 1. Relecture : le compte rendu en base revient dans l'onglet
      const onglet = await page.evaluate(() => document.querySelector('[data-testid="onglet-electricite"]')?.innerText || '');
      verifier(onglet.includes(`CRI-${AN}-00004`), 'le compte rendu en base revient dans l’onglet');

      // 2. Rappel Consuel : la tâche datée part en base (memos)
      const champDate = await page.evaluate(() => {
        const l = [...document.querySelectorAll('[data-testid="onglet-electricite"] label')].find((x) => x.innerText.startsWith('Mise sous tension prévue'));
        return l ? `#${CSS.escape(l.htmlFor)}` : null;
      });
      await poser(page, champDate, jourDans(30));
      await cliquer(page, 'Me rappeler l’envoi au Consuel', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(1200);
      const tache = base.journal.find((j) => j.m === 'POST' && j.table === 'memos');
      const corpsTache = tache && (Array.isArray(tache.corps) ? tache.corps[0] : tache.corps);
      verifier(corpsTache?.due_date === jourDans(10) && corpsTache?.chantier_id === jeu.CHANTIER.id && /^Envoyer la demande d’attestation Consuel/.test(corpsTache?.text || ''),
        `la tâche Consuel part en base, datée de la mise sous tension − 20 jours (${corpsTache?.due_date})`);

      // 3. Nouveau compte rendu : envoyé sans numéro, numéroté par la base, l'écran reprend ce numéro
      await cliquer(page, 'Nouveau compte rendu', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((y) => y.innerText.trim() === 'Dépannage')?.click());
      await poser(page, '#cr-travaux', 'Remplacement d’un disjoncteur différentiel');
      await poser(page, '#cr-prix_ht', '120');
      await attendre(200);
      await cliquer(page, 'Vérifier', { dans: '[role="dialog"]' });
      await attendre(500);
      await cliquer(page, 'Enregistrer', { dans: '[role="dialog"]' });
      await attendre(1500);
      verifier(!!envoye && !('numero' in envoye) && !('signature' in envoye), 'le compte rendu part sans numéro (ni signature) : la base le numérote');
      verifier(envoye?.nature === 'depannage' && envoye?.prix_ht === 120 && envoye?.emetteur?.nom === 'Électricité Exemple', 'nature, prix et émetteur figé partent en base');
      const titre = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText || '');
      verifier(titre === `Compte rendu CRI-${AN}-00005`, `l’écran reprend le numéro donné par la base (${titre})`);
      const apercu = await page.evaluate(() => document.querySelector('[role="dialog"] iframe')?.getAttribute('srcdoc') || '');
      verifier(apercu.includes('<h1>Compte rendu d’intervention</h1>') && !/autocontrôle/i.test(apercu.replace(/<style>[\s\S]*?<\/style>/, '')),
        'sans mesure, le titre est « Compte rendu d’intervention », sans autocontrôle');

      // 4. Facture tirée : la facture part, puis le lien du compte rendu vers elle (sans numéro)
      await cliquer(page, 'Faire la facture', { dans: '[role="dialog"]' });
      await attendre(2000);
      const factures = base.journal.filter((j) => j.m === 'POST' && j.table === 'devis');
      const lien = base.journal.find((j) => j.m === 'PATCH' && j.table === 'comptes_rendus_electricite' && j.corps?.facture_id);
      const idFacture = factures[0] && (Array.isArray(factures[0].corps) ? factures[0].corps[0] : factures[0].corps).id;
      verifier(factures.length === 1 && lien?.corps.facture_id === idFacture && lien.corps.numero === undefined, 'la facture part en base, puis le lien du compte rendu (sans numéro)');

      // 5. Annulation de l'ancien, motivée, envoyée en base
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'chantiers'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(2000);
      await ouvrirFiche(page, attendre, 'Tableau Exemple');
      await ongletFiche(page, attendre, 'Électricité');
      await ouvrirCompteRendu(page, `CRI-${AN}-00004`);
      await attendre(800);
      await cliquer(page, 'Annuler le compte rendu (erreur de saisie)', { dans: '[role="dialog"]' });
      await cliquer(page, 'Annuler le compte rendu', { dans: '[role="dialog"]' });
      await attendre(1200);
      const annulation = base.journal.find((j) => j.m === 'PATCH' && j.table === 'comptes_rendus_electricite' && j.corps?.annulee_le);
      verifier(annulation?.corps.annulation_motif === 'Erreur de saisie' && annulation.q.includes(ancien.id), 'l’annulation motivée part en base, sur le bon compte rendu');
      verifier(/Annulé/.test(await texteFenetre(page)) && /Refaire à partir de celui-ci/.test(await texteFenetre(page)), 'le compte rendu est marqué annulé, « Refaire » proposé');
    },
  },
  {
    nom: 'électricien (base) : chef de chantier sans prix ; lecture seule sans annuler, refaire ni cocher la tâche Consuel (375 px)',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const jeu = jeuElectricite();
      const annule = jeu.cr('d1d1d1d1-0000-4000-8000-000000000112', `CRI-${AN}-00006`, { annulee_le: `${AN}-10-21T09:00:00Z`, annulation_motif: 'Erreur de saisie' });
      const vivant = jeu.cr('d1d1d1d1-0000-4000-8000-000000000113', `CRI-${AN}-00007`);
      const MEMO = { id: 'a1a1a1a1-0000-4000-8000-000000000111', text: 'Envoyer la demande d’attestation Consuel — Tableau Exemple Parcours', chantier_id: jeu.CHANTIER.id,
        due_date: jourDans(5), is_done: false, category: 'rappel', priority: 'haute', created_at: '2026-10-20T08:00:00Z' };
      const tables = () => ({ clients: [jeu.CLIENT], chantiers: [jeu.CHANTIER], entreprise: [jeu.ENTREPRISE], comptes_rendus_electricite: [annule, vivant], memos: [MEMO] });

      // Chef de chantier : il modifie le chantier mais ne voit pas les prix
      const chef = creerBase(tables(), { role: 'chef_chantier' });
      let page = await ouvrirOnglet({ ouvrir, attendre, sessionFactice, base: chef });
      await ouvrirCompteRendu(page, `CRI-${AN}-00006`);
      await attendre(800);
      verifier(/Refaire à partir de celui-ci/.test(await texteFenetre(page)), 'le chef de chantier peut refaire un compte rendu annulé');
      await cliquer(page, 'Refaire à partir de celui-ci', { dans: '[role="dialog"]' });
      await attendre(800);
      const saisie = await texteFenetre(page);
      verifier(!/Prix|€/.test(saisie) && !(await page.$('#cr-prix_ht')), 'la saisie ne montre aucun prix au chef de chantier');
      await cliquer(page, 'Vérifier', { dans: '[role="dialog"]' });
      await attendre(500);
      await cliquer(page, 'Enregistrer', { dans: '[role="dialog"]' });
      await attendre(1500);
      const refait = chef.journal.find((j) => j.m === 'POST' && j.table === 'comptes_rendus_electricite');
      const corps = refait && (Array.isArray(refait.corps) ? refait.corps[0] : refait.corps);
      verifier(corps?.remplace_id === annule.id && corps?.prix_ht === null, `« Refaire » ne recopie pas l’ancien prix (${corps?.prix_ht})`);
      await page.close();

      // Lecture seule : il lit, mais n'annule, ne refait, ne crée ni ne coche
      const lecteur = creerBase(tables(), { role: 'readonly' });
      page = await ouvrirOnglet({ ouvrir, attendre, sessionFactice, base: lecteur });
      const onglet = await page.evaluate(() => document.querySelector('[data-testid="onglet-electricite"]')?.innerText || '');
      verifier(onglet.includes(`CRI-${AN}-00007`) && /Attestation à faire parvenir au Consuel/.test(onglet), 'en lecture seule, les comptes rendus et l’état Consuel se lisent');
      verifier(!onglet.includes('J’ai envoyé la demande') && !onglet.includes('Nouveau compte rendu'), 'ni « J’ai envoyé la demande », ni « Nouveau compte rendu »');
      await ouvrirCompteRendu(page, `CRI-${AN}-00007`);
      await attendre(800);
      verifier(!/Annuler le compte rendu/.test(await texteFenetre(page)), 'pas d’« Annuler le compte rendu » en lecture seule');
      await page.keyboard.press('Escape');
      await attendre(400);
      await ouvrirCompteRendu(page, `CRI-${AN}-00006`);
      await attendre(800);
      verifier(!/Refaire à partir de celui-ci/.test(await texteFenetre(page)), 'pas de « Refaire » en lecture seule');
      verifier(!lecteur.journal.some((j) => j.m !== 'GET' && ['comptes_rendus_electricite', 'memos'].includes(j.table)), 'aucune écriture partie');
      await page.close();

      // Contre-essai : le patron voit le prix et « J'ai envoyé la demande »
      const patron = creerBase(tables());
      page = await ouvrirOnglet({ ouvrir, attendre, sessionFactice, base: patron });
      const ongletPatron = await page.evaluate(() => document.querySelector('[data-testid="onglet-electricite"]')?.innerText || '');
      verifier(ongletPatron.includes('J’ai envoyé la demande'), 'contre-essai : le patron a « J’ai envoyé la demande »');
      await cliquer(page, 'Nouveau compte rendu', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(600);
      verifier(!!(await page.$('#cr-prix_ht')), 'contre-essai : le patron a le champ « Prix (€ HT) »');
    },
  },

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

      // 3. Rappel Consuel : mise sous tension dans 20 jours → la tâche est due aujourd'hui (dernier jour d'envoi)
      const champDate = await page.evaluate(() => {
        const l = [...document.querySelectorAll('[data-testid="onglet-electricite"] label')].find((x) => x.innerText.startsWith('Mise sous tension prévue'));
        return l ? `#${CSS.escape(l.htmlFor)}` : null;
      });
      await poser(page, champDate, jourDans(20));
      await cliquer(page, 'Me rappeler l’envoi au Consuel', { dans: '[data-testid="onglet-electricite"]' });
      await attendre(800);
      const etat = await page.evaluate(() => document.querySelector('[data-testid="onglet-electricite"]')?.innerText || '');
      verifier(/Attestation à faire parvenir au Consuel au plus tard le/.test(etat) && etat.includes('J’ai envoyé la demande'), `l’onglet dit la date limite (${etat.split('\n')[1] || ''})`);
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
