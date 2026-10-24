// Parcours ramoneur (tâche ramonage, D-30, migration 104) — critère : à 375 px, un ramoneur active le module, crée
// l'attestation d'un client (nouvel appareil), la base la numérote, le PDF porte les mentions, « Faire la facture » donne
// la facture sans ressaisie, la fiche montre l'appareil et son historique ; horloge avancée : le rappel du prochain
// ramonage apparaît dans « À faire », SMS pré-rempli, puis disparaît ; un compte sans le module ne voit rien changer.
// Données fictives seulement.
const fs = require('fs');
const path = require('path');
const { creerBase, UID, json } = require('../lib/fauxSupabase.cjs');

const AN = new Date().getFullYear();
const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };

async function ouvrirFiche(page, attendre, nom) {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
    if (!b) throw new Error(`client « ${n} » introuvable dans la liste`);
    b.click();
  }, nom);
  await attendre(900);
}

const dansDialogue = (page, fn, arg) => page.evaluate(fn, arg);

/** Remplit l'attestation comme au téléphone : listes, saisies, boutons, case, signature au doigt (souris réelle). */
async function remplirAttestation(page, attendre) {
  await page.select('#ramonage-appareil_type', 'poele_bois');
  await page.select('#ramonage-combustible', 'bois');
  await page.select('#ramonage-conduit', 'tube_chemise');
  await page.type('#ramonage-localisation', 'Salon');
  await page.click('#ramonage-intervenant_nom', { clickCount: 3 });
  await page.type('#ramonage-intervenant_nom', 'Jean Exemple');
  for (const t of ['Propriétaire', 'Mécanique rotative', 'Assurée', 'Bon', 'Normaux']) {
    const ok = await dansDialogue(page, (x) => {
      const b = [...document.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((y) => y.innerText.trim() === x);
      if (b) b.click();
      return !!b;
    }, t);
    if (!ok) throw new Error(`choix « ${t} » introuvable`);
    await attendre(120);
  }
  await dansDialogue(page, () => {
    const l = [...document.querySelectorAll('[role="dialog"] label')].find((x) => x.innerText.includes('Qualité et stockage du combustible'));
    l.querySelector('input').click();
  });
  const prix = await page.evaluateHandle(() => {
    const l = [...document.querySelectorAll('[role="dialog"] label')].find((x) => x.innerText.startsWith('Prix'));
    return document.getElementById(l.htmlFor);
  });
  await prix.type('120');
  const zone = await page.$('[role="dialog"] canvas');
  await zone.evaluate((c) => c.scrollIntoView({ block: 'center' }));
  await attendre(200);
  const b = await zone.boundingBox();
  for (const [x1, y1, x2, y2] of [[0.1, 0.6, 0.8, 0.4], [0.2, 0.75, 0.7, 0.75]]) { // deux traits
    await page.mouse.move(b.x + b.width * x1, b.y + b.height * y1);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * x2, b.y + b.height * y2, { steps: 12 });
    await page.mouse.up();
    await attendre(150);
  }
}

module.exports = [
  {
    nom: 'ramonage : activer, attestation au téléphone, PDF, facture sans ressaisie, historique, puis rappel (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier, RACINE }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375, avantChargement: sansInstallation });
      // 1. Activer le module (Paramètres → Documents → Ramonage)
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Documents')?.click();
      });
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Ramonage')?.click());
      await attendre(400);
      await page.click('#ramonage-actif');
      await attendre(800);
      verifier(await page.$eval('#ramonage-actif', (e) => e.getAttribute('aria-checked')) === 'true', 'le module ramonage est activé');

      // 2. Fiche client : l'onglet « Ramonage » vient en premier
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'clients'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Dupont');
      const onglets = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.innerText.split('\n')[0]));
      verifier(onglets[0] === 'Ramonage', `l'onglet Ramonage est sur la fiche client (${onglets.join(', ')})`);
      await cliquer(page, 'Nouveau ramonage', { dans: '[data-testid="onglet-ramonage"]' });
      await attendre(600);

      // 3. À vide : ce qui manque est dit ; la vacuité n'est jamais pré-remplie
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      const manque = await page.evaluate(() => document.querySelector('[role="dialog"] [role="alert"]')?.innerText || '');
      verifier(manque.includes('La vacuité du conduit') && manque.includes('La méthode'), 'à vide, la vacuité et la méthode sont demandées');

      // 4. Saisie complète, aperçu, enregistrement : numéro attribué
      await remplirAttestation(page, attendre);
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      await attendre(500);
      const apercu = await page.evaluate(() => document.querySelector('[role="dialog"] iframe')?.getAttribute('srcdoc') || '');
      for (const t of ['Attestation de ramonage', 'Article R. 1331-75 du code de la santé publique', 'Vacuité du conduit sur toute sa longueur</th><td>Assurée',
        'par action mécanique directe', 'Dépôts et suie</th><td>Normaux', 'État apparent du conduit</th><td>Bon', 'Conseils donnés (article R. 1331-77',
        'pourra vous rappeler par e-mail ou par SMS',
        'ne vaut pas attestation d’entretien', 'À conserver au moins deux ans', 'alt="Signature"', 'Jean Exemple']) {
        verifier(apercu.includes(t), `l'aperçu porte « ${t.replace(/<[^>]+>/g, ' ')} »`);
      }
      verifier(!/conforme/i.test(apercu), 'jamais « conforme »');
      await cliquer(page, 'Enregistrer l’attestation', { dans: '[role="dialog"]' });
      await attendre(1200);
      const titre = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText || '');
      verifier(titre === `Attestation RAM-${AN}-00001`, `l'attestation est numérotée (${titre})`);

      // 5. PDF : produit et gardé pour relecture (audit-ui)
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
      fs.writeFileSync(path.join(RACINE, 'audit-ui', 'ramonage-attestation.pdf'), Buffer.from(pdf.base64, 'base64'));

      // 6. Facture tirée de l'attestation, sans ressaisie
      await cliquer(page, 'Faire la facture', { dans: '[role="dialog"]' });
      await attendre(1800);
      const facture = await page.evaluate(() => document.querySelector('main')?.innerText || '');
      verifier(/Facture/.test(facture) && facture.includes(`attestation n° RAM-${AN}-00001`) && /120,00/.test(facture),
        'la facture reprend le ramonage, le numéro d’attestation et le prix');

      // 7. La fiche : l'appareil et son historique (date, méthode, prix, n° de facture, prochain ramonage)
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'clients'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Dupont');
      const fiche = await page.evaluate(() => document.querySelector('[data-testid="onglet-ramonage"]')?.innerText || '');
      verifier(fiche.includes('Poêle à bois') && fiche.includes(`RAM-${AN}-00001`) && /RAM-\d{4}-\d{5} · FAC-/.test(fiche) && /rotatif/.test(fiche) && /120\s*€\s*HT/.test(fiche) && fiche.includes('Prochain ramonage avant le'),
        `la fiche montre l'appareil et son historique (${fiche.replace(/\n+/g, ' | ')})`);
      await page.evaluate(() => document.querySelector('[data-testid="onglet-ramonage"]').scrollIntoView({ block: 'start' }));
      await attendre(300);
      await page.screenshot({ path: path.join(RACINE, 'audit-ui', 'ramonage-fiche-375.png') });

      // 8. Horloge avancée de 350 jours (prochain ramonage dans 15 jours) : le rappel apparaît dans « À faire »
      await page.evaluate(() => {
        const decalage = 350 * 86400000;
        const Vraie = Date;
        class Avancee extends Vraie {
          constructor(...a) { super(...(a.length ? a : [Vraie.now() + decalage])); }
          static now() { return Vraie.now() + decalage; }
        }
        window.Date = Avancee;
      });
      await page.evaluate(() => [...document.querySelectorAll('nav button, nav a, button')].find((b) => b.innerText.trim() === 'Accueil')?.click());
      await attendre(1200);
      const aFaire = await page.evaluate(() => document.querySelector('section[aria-label="À faire aujourd\'hui"]')?.innerText || '');
      verifier(aFaire.includes('Ramonage à prévoir — Marie Dupont'), 'le rappel du prochain ramonage est dans « À faire »');
      await page.evaluate(() => [...document.querySelectorAll('section[aria-label="À faire aujourd\'hui"] button')].find((b) => b.innerText.includes('Ramonage à prévoir'))?.click());
      await attendre(900);
      const sms = await page.evaluate(() => document.querySelector('[role="dialog"] a[href^="sms:"]')?.getAttribute('href') || '');
      verifier(sms.startsWith('sms:0612345678') && decodeURIComponent(sms).includes('répondez STOP') && !/obligatoire/i.test(decodeURIComponent(sms)),
        'le SMS de rappel est pré-rempli (identité, opposition STOP)');
      const appeler = await page.evaluate(() => !!document.querySelector('[role="dialog"] a[href^="tel:"]'));
      verifier(!appeler, 'pas de bouton « Appeler » pour un client particulier (consentement exigé, L. 223-1)');
      await page.evaluate(() => {
        document.addEventListener('click', (e) => { if (e.target.closest('a[href^="sms:"]')) e.preventDefault(); }, { once: true });
        document.querySelector('[role="dialog"] a[href^="sms:"]').click();
      });
      await attendre(500);
      const note = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(note.includes('Rappel noté (SMS)'), 'le rappel est noté, avec « Annuler »');
      await page.keyboard.press('Escape');
      await attendre(500);
      const apres = await page.evaluate(() => document.querySelector('section[aria-label="À faire aujourd\'hui"]')?.innerText || '');
      verifier(!apres.includes('Ramonage à prévoir'), 'puis le rappel disparaît de « À faire »');
    },
  },
  {
    nom: 'ramonage (base) : le refus des rappels dit au passage est noté sur la fiche, l’attestation ne l’annonce plus',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000106', nom: 'Exemple', prenom: 'Paul', telephone: '0600000002', adresse: '5 rue Imaginaire, 24000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000106', user_id: UID, organization_id: ORG, nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: '2025-02',
        created_at: '2026-01-01T00:00:00Z' };
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE] }, {
        refuser: (m, table, { corps }) => {
          if (m !== 'POST' || table !== 'ramonages') return null;
          const r = Array.isArray(corps) ? corps[0] : corps;
          const ligne = { ...r, numero: `RAM-${AN}-00008`, jeton_rappel: 'a0a0a0a0-0000-4000-8000-000000000106', organization_id: ORG, user_id: UID, created_at: new Date().toISOString() };
          (base.tables.ramonages = base.tables.ramonages || []).push(ligne);
          return json(ligne, 201);
        },
      });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Exemple');
      await cliquer(page, 'Nouveau ramonage', { dans: '[data-testid="onglet-ramonage"]' });
      await attendre(600);
      await remplirAttestation(page, attendre);
      await page.evaluate(() => {
        const l = [...document.querySelectorAll('[role="dialog"] label')].find((x) => x.innerText.includes('Le client refuse les rappels'));
        l.querySelector('input').click();
      });
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      await attendre(400);
      const apercu = await page.evaluate(() => document.querySelector('[role="dialog"] iframe')?.getAttribute('srcdoc') || '');
      verifier(!apercu.includes('pourra vous rappeler'), 'l’attestation n’annonce plus de rappel');
      await cliquer(page, 'Enregistrer l’attestation', { dans: '[role="dialog"]' });
      await attendre(1500);
      const patch = base.journal.find((j) => j.m === 'PATCH' && j.table === 'clients');
      verifier(!!patch?.corps?.rappels_refuses_le, 'le refus est enregistré sur la fiche du client');
      await page.keyboard.press('Escape');
      await attendre(400);
      const fiche = await page.evaluate(() => document.querySelector('[data-testid="onglet-ramonage"]')?.innerText || '');
      verifier(/a refusé les rappels de ramonage/.test(fiche), 'la fiche le dit');
    },
  },
  {
    nom: 'ramonage (base) : les attestations en base reviennent sur la fiche ; facture liée et annulation partent en base',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000107', nom: 'Exemple', prenom: 'Rose', telephone: '0600000003', email: 'rose@exemple.fr',
        adresse: '7 allée Imaginaire, 24000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000107', user_id: UID, organization_id: ORG, nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: '2025-02',
        created_at: '2026-01-01T00:00:00Z' };
      const ligne = (id, numero, le, prochain) => ({ id, user_id: UID, organization_id: ORG, numero, client_id: CLIENT.id, appareil_ref: 'f0f0f0f0-0000-4000-8000-000000000107',
        realise_le: le, intervenant_nom: 'Jean Exemple', client_nom: 'Rose Exemple', qualite_client: 'locataire', adresse_intervention: CLIENT.adresse,
        appareil_type: 'insert', combustible: 'bois', conduit: 'maconne', methode: 'mecanique_manuelle', complement_chimique: false, raccordement: 'ramone',
        vacuite: 'assuree', constats: {}, conseils: { choix: ['usage'] }, prochain_avant: prochain, nb_dans_annee: 1, prix_ht: 95, jeton_rappel: `${id.slice(0, 30)}aaaaaa`,
        emetteur: { nom: 'Ramonage Exemple', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Jean Exemple', siret: '00000000000000' },
        annulee_le: null, annulation_motif: null, rappel_fait_le: null, rappel_canal: null, facture_id: null, created_at: le });
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE], ramonages: [
        ligne('d0d0d0d0-0000-4000-8000-000000000001', `RAM-${AN - 1}-00003`, `${AN - 1}-10-12T09:00:00Z`, `${AN}-10-12`),
        ligne('d0d0d0d0-0000-4000-8000-000000000002', `RAM-${AN}-00011`, `${AN}-10-14T09:00:00Z`, `${AN + 1}-10-14`),
      ] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Exemple');
      const fiche = await page.evaluate(() => document.querySelector('[data-testid="onglet-ramonage"]')?.innerText || '');
      verifier(fiche.includes(`RAM-${AN - 1}-00003`) && fiche.includes(`RAM-${AN}-00011`) && fiche.includes('Insert'), 'les deux attestations en base reviennent sur la fiche');
      // Facture tirée de la plus récente : la facture part, puis son lien
      await page.evaluate((n) => [...document.querySelectorAll('[data-testid="onglet-ramonage"] [data-ui="LigneListe"] > button')].find((b) => b.innerText.includes(n))?.click(), `RAM-${AN}-00011`);
      await attendre(800);
      await cliquer(page, 'Faire la facture', { dans: '[role="dialog"]' });
      await attendre(2000);
      const factures = base.journal.filter((j) => j.m === 'POST' && j.table === 'devis');
      const lien = base.journal.find((j) => j.m === 'PATCH' && j.table === 'ramonages' && j.corps?.facture_id);
      verifier(factures.length === 1 && lien && lien.corps.facture_id === (Array.isArray(factures[0].corps) ? factures[0].corps[0] : factures[0].corps).id,
        'la facture part en base, puis le lien de l’attestation vers elle');
      verifier(lien && lien.corps.numero === undefined && lien.corps.jeton_rappel === undefined, 'le lien n’envoie ni numéro ni jeton');
      // Annulation de l'ancienne, motivée
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'clients'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Exemple');
      await page.evaluate((n) => [...document.querySelectorAll('[data-testid="onglet-ramonage"] [data-ui="LigneListe"] > button')].find((b) => b.innerText.includes(n))?.click(), `RAM-${AN - 1}-00003`);
      await attendre(800);
      await cliquer(page, 'Annuler l’attestation (erreur de saisie)', { dans: '[role="dialog"]' });
      await cliquer(page, 'Annuler l’attestation', { dans: '[role="dialog"]' });
      await attendre(1200);
      const annulation = base.journal.find((j) => j.m === 'PATCH' && j.table === 'ramonages' && j.corps?.annulee_le);
      verifier(annulation && annulation.corps.annulation_motif === 'Erreur de saisie', 'l’annulation motivée part en base');
      const pastille = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(/Annulée/.test(pastille) && /Refaire à partir de celle-ci/.test(pastille), 'l’attestation est marquée annulée, « Refaire » proposé');
    },
  },
  {
    nom: 'ramonage : sans le module, la fiche client et l’accueil ne changent pas (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'clients', largeur: 375, avantChargement: sansInstallation });
      await ouvrirFiche(page, attendre, 'Dupont');
      const onglets = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.innerText.split('\n')[0]));
      verifier(!onglets.includes('Ramonage') && onglets[0] === 'Documents', `aucun onglet Ramonage (${onglets.join(', ')})`);
      verifier(!(await page.$('[data-testid="onglet-ramonage"]')), 'aucun contenu de ramonage');
    },
  },
  {
    nom: 'ramonage (base) : l’attestation part sans numéro ni jeton, la base la numérote, l’écran reprend son numéro',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000104', nom: 'Exemple', prenom: 'Lucie', telephone: '0600000001', email: 'lucie@exemple.fr',
        adresse: '3 chemin de l’Exemple, 24000 Imaginaire', created_at: '2026-10-01T08:00:00Z' };
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000104', user_id: UID, organization_id: '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e',
        nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise', siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr',
        adresse: '1 rue de l’Exemple', code_postal: '24000', ville: 'Imaginaire', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: '2025-02',
        created_at: '2026-01-01T00:00:00Z' };
      let envoye = null;
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE] }, {
        refuser: (m, table, { corps }) => {
          if (m !== 'POST' || table !== 'ramonages') return null;
          envoye = Array.isArray(corps) ? corps[0] : corps;
          const ligne = { ...envoye, numero: `RAM-${AN}-00007`, jeton_rappel: 'a0a0a0a0-0000-4000-8000-000000000104', organization_id: ENTREPRISE.organization_id,
            user_id: UID, created_at: new Date().toISOString() };
          (base.tables.ramonages = base.tables.ramonages || []).push(ligne);
          return json(ligne, 201);
        },
      });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(1500);
      await ouvrirFiche(page, attendre, 'Exemple');
      await cliquer(page, 'Nouveau ramonage', { dans: '[data-testid="onglet-ramonage"]' });
      await attendre(600);
      await remplirAttestation(page, attendre);
      await cliquer(page, 'Vérifier l’attestation', { dans: '[role="dialog"]' });
      await attendre(400);
      await cliquer(page, 'Enregistrer l’attestation', { dans: '[role="dialog"]' });
      await attendre(1500);
      verifier(!!envoye, 'l’attestation est envoyée à la table ramonages');
      verifier(envoye && !('numero' in envoye) && !('jeton_rappel' in envoye), 'ni numéro ni jeton dans l’envoi : la base les attribue');
      verifier(envoye?.vacuite === 'assuree' && envoye?.methode === 'mecanique_rotative' && envoye?.prochain_avant > `${AN}-` && envoye?.constats?.depots === 'normaux',
        'constat, méthode, prochain ramonage et constats partent en base');
      const titre = await page.evaluate(() => document.querySelector('[role="dialog"] h2')?.innerText || '');
      verifier(titre === `Attestation RAM-${AN}-00007`, `l'écran reprend le numéro attribué par la base (${titre})`);
    },
  },
  {
    nom: 'ramonage : le lien « ne plus recevoir de rappel » n’agit qu’au bouton, sans compte',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const JETON = 'a0a0a0a0-0000-4000-8000-000000000105';
      const appels = [];
      const { page } = await ouvrir({
        reel: true, largeur: 375, chemin: `/rappel-ramonage/${JETON}`,
        supabase: (req, u) => {
          if (u.pathname === '/rest/v1/rpc/refuser_rappels_ramonage') { appels.push(req.postData()); return json(true); }
          return json([]);
        },
      });
      await attendre(800);
      verifier(appels.length === 0, 'rien n’est fait à l’ouverture du lien (les messageries ouvrent les liens)');
      await cliquer(page, 'Ne plus recevoir de rappel');
      await attendre(800);
      const t = await page.evaluate(() => document.body.innerText);
      verifier(appels.length === 1 && JSON.parse(appels[0]).p_jeton === JETON, 'le refus est envoyé avec le jeton du lien');
      verifier(t.includes('C’est noté'), 'confirmation affichée');
    },
  },
];
