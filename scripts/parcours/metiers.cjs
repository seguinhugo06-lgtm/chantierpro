// Lot 1 « métiers » (docs/metiers/synthese.md § 3.1, 3.2, 3.7 ; décision d'Hugo du 4 nov. 2026) : le métier choisi à
// la bienvenue, enregistré en base et relu ; catalogue et bibliothèque triés ; « Mes qualifications » imprimées.
const { creerBase, ORG, UID } = require('../lib/fauxSupabase.cjs');

const ENT = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f10';
const FICHE = {
  id: ENT, nom: 'Élec Parcours', organization_id: ORG, user_id: UID, is_active: true, is_default: true, archived_at: null,
  siret: '123 456 789 00012', adresse: '15 rue des Artisans', code_postal: '75012', ville: 'Paris', settings_json: { reglages: {} },
};
// Bienvenue jamais vue sur ce navigateur (le banc la marque vue par défaut)
const BIENVENUE_A_VOIR = `try { if (!sessionStorage.getItem('bienvenue-posee')) { sessionStorage.setItem('bienvenue-posee', '1');
  localStorage.removeItem('mallettico_onboarding_complete'); localStorage.removeItem('batigesti_onboarding_complete'); }
  localStorage.removeItem('cp_catalogue_onboarding_dismissed'); } catch (e) { /* sans stockage */ }`;

const dialogue = (page) => page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  return d ? { texte: d.innerText, boutons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) } : null;
});
const cliquerDans = (page, selecteur, texte) => page.evaluate((s, t) => {
  const b = [...document.querySelectorAll(`${s} button`)].find((x) => x.innerText.trim() === t && x.getBoundingClientRect().width > 0);
  if (b) b.click();
  return !!b;
}, selecteur, texte);
const puces = (page) => page.evaluate(() => [...document.querySelectorAll('[data-testid="choix-metiers"] button')]
  .filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.innerText.trim()));
const jusqua = async (attendre, condition, max = 15000) => {
  const debut = Date.now();
  while (!(await condition()) && Date.now() - debut < max) await attendre(200);
};

module.exports = [
  {
    nom: 'métiers : bienvenue avec deux métiers, enregistrés en base, relus après rechargement ; catalogue pré-coché (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...FICHE }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => /Quels travaux faites-vous/.test((await dialogue(page))?.texte || ''));
      const d = await dialogue(page);
      verifier(/Quels travaux faites-vous/.test(d?.texte || ''), `la bienvenue commence par le métier (${(d?.texte || 'aucune').slice(0, 60)})`);
      verifier(d?.boutons.includes('Passer cette question'), `sans choix, le bouton dit « Passer cette question » (${d?.boutons.join(' | ')})`);
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Électricien');
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Plombier');
      await attendre(300);
      verifier(JSON.stringify(await puces(page)) === '["Électricien","Plombier"]', `deux puces choisies (${JSON.stringify(await puces(page))})`);
      await cliquerDans(page, '[role="dialog"]', 'Suivant');
      await jusqua(attendre, async () => base.tables.entreprise[0].metiers?.length === 2);
      verifier(JSON.stringify(base.tables.entreprise[0].metiers) === '["electricien","plombier"]', `enregistré dans la colonne metiers (${JSON.stringify(base.tables.entreprise[0].metiers)})`);
      verifier(/Bienvenue sur Mallettico/.test((await dialogue(page))?.texte || ''), 'puis la bienvenue continue');
      await cliquerDans(page, '[role="dialog"]', 'Passer');
      await attendre(500);

      // Rechargement (même base, autre écran) : Paramètres › Mon métier relit le choix
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'settings'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      verifier(!(await dialogue(page)), 'la bienvenue ne revient pas');
      const rubrique = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === 'Mon métier' && x.getBoundingClientRect().width > 0);
        if (b) b.click();
        return !!b;
      });
      verifier(rubrique, 'rubrique « Mon métier » dans Paramètres');
      await attendre(800);
      verifier(JSON.stringify(await puces(page)) === '["Électricien","Plombier"]', `le choix est relu depuis la base (${JSON.stringify(await puces(page))})`);

      // Catalogue vide : l'import du référentiel pré-coche Électricité et Plomberie
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'catalogue'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Importer le référentiel BTP')?.click());
      await attendre(600);
      const coches = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => (b.innerText.split('\n').find((l) => l.trim() && !/^\p{Extended_Pictographic}/u.test(l.trim())) || '').trim()));
      verifier(coches.includes('Électricité') && coches.includes('Plomberie') && coches.length === 2, `catalogue : Électricité et Plomberie pré-cochées (${JSON.stringify(coches)})`);
    },
  },
  {
    nom: 'métiers : bienvenue passée sans choix, rien d’enregistré, l’app reste telle qu’elle est (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...FICHE }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => /Quels travaux faites-vous/.test((await dialogue(page))?.texte || ''));
      verifier(await cliquerDans(page, '[role="dialog"]', 'Passer cette question'), 'bouton « Passer cette question »');
      await attendre(600);
      verifier(/Bienvenue sur Mallettico/.test((await dialogue(page))?.texte || ''), 'la bienvenue continue');
      const ecritures = base.journal.filter((j) => j.table === 'entreprise' && j.m !== 'GET');
      verifier(ecritures.length === 0 && base.tables.entreprise[0].metiers === undefined, `aucune écriture de la fiche (${ecritures.length})`);
    },
  },
  {
    nom: 'métiers : éditeur de devis, les lots du métier en premier et « Afficher tous les métiers » (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      // Sonde de Paramètres › Mon métier : choisir Électricien puis Plombier (mode démo), puis l'éditeur de devis
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      await attendre(800);
      const rubrique = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === 'Mon métier' && x.getBoundingClientRect().width > 0);
        if (b) b.click();
        return !!b;
      });
      verifier(rubrique, 'Paramètres › Mon métier');
      await attendre(600);
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Électricien');
      await attendre(700);
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Plombier');
      await attendre(1200);
      const largeurs = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, puces: [...document.querySelectorAll('[data-testid="choix-metiers"] button')].map((b) => b.getBoundingClientRect().height) }));
      verifier(largeurs.page <= 375 && largeurs.puces.every((h) => h >= 44), `375 px sans débordement, puces de 44 px au moins (${largeurs.page} px, ${Math.min(...largeurs.puces)} px)`);
      verifier(JSON.stringify(await puces(page)) === '["Électricien","Plombier"]', `deux métiers choisis (${JSON.stringify(await puces(page))})`);
      await page.screenshot({ path: 'audit-ui/sonde-mon-metier-375.png', fullPage: true });
      await page.evaluate(() => [...document.querySelectorAll('nav a, nav button')].find((x) => x.innerText.trim() === 'Devis')?.click());
      await attendre(1200);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Nouveau$/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0); b?.click(); });
      await attendre(600);
      await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=menuitem], a')].find((x) => (x.innerText || '').trim() === 'Nouveau devis'); b?.click(); });
      await attendre(1500);
      // Le sélecteur de client peut s'ouvrir d'abord : le fermer sans choisir
      await page.keyboard.press('Escape');
      await attendre(500);
      const lots = await page.evaluate(() => [...document.querySelectorAll('[data-testid="lots-du-metier"] button')].map((b) => b.innerText.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ')));
      verifier(lots.length > 0 && lots.every((l) => /Plomberie|Électricité/.test(l)), `« Votre métier » : lots d’électricité et de plomberie (${lots.slice(0, 2).join(' ; ')})`);
      const ouvert = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Afficher tous les métiers \(20\)$/.test(x.innerText.trim())); b?.click(); return !!b; });
      verifier(ouvert, 'bouton « Afficher tous les métiers (20) »');
      await attendre(700);
      const ordre = await page.evaluate(() => {
        const panneau = document.querySelector('[aria-label="Bibliothèque de modèles"]');
        return panneau ? [...panneau.querySelectorAll('button[aria-expanded] span.block.text-sm, p')].map((x) => x.innerText.trim()).filter((t) => /^(Plomberie|Électricité|Autres métiers|Maçonnerie)$/.test(t)) : [];
      });
      verifier(JSON.stringify(ordre.slice(0, 4)) === '["Électricité","Plomberie","Autres métiers","Maçonnerie"]', `bibliothèque : métiers choisis, puis « Autres métiers » (${JSON.stringify(ordre)})`);
    },
  },
  {
    nom: 'qualifications : IRVE et RGE imprimés dans l’aperçu du devis (générateur de DevisPage, 375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const quals = [
        { id: 'q1', type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'IRVE-375', fin: '2099-06-30', imprimer: true, motsCles: '' },
        { id: 'q2', type: 'rge', intitule: 'QualiPAC chauffage et eau chaude sanitaire', organisme: 'Qualibat', numero: 'E-375', fin: '2099-12-31', imprimer: true },
        { id: 'q3', type: 'pg_gaz', intitule: 'PG installation', organisme: 'Qualigaz', numero: '', fin: '2099-12-31', imprimer: true },
      ];
      const ligne = { id: 'ent-qualifs', nom: 'Élec Exemple', siret: '123 456 789 00012', adresse: '15 rue des Artisans', code_postal: '75012', ville: 'Paris', tva_defaut: 20, decennale_assureur: 'AXA', decennale_numero: 'DEC-1', forme_juridique: 'SARL', capital: '10000', settings_json: { reglages: { qualifications: quals } } };
      const app = { id: 'ent-qualifs', nom: 'Élec Exemple', siret: '123 456 789 00012', adresse: '15 rue des Artisans', codePostal: '75012', ville: 'Paris', tvaDefaut: 20, decennaleAssureur: 'AXA', decennaleNumero: 'DEC-1', formeJuridique: 'SARL', capital: '10000', qualifications: quals };
      const poser = `try { if (!sessionStorage.getItem('qualifs-pose')) { sessionStorage.setItem('qualifs-pose', '1');
        localStorage.setItem('mallettico_entreprises', ${JSON.stringify(JSON.stringify([ligne]))});
        localStorage.setItem('mallettico_entreprise_active_id', 'ent-qualifs'); localStorage.setItem('mallettico_entreprise_migrated', 'true');
        localStorage.setItem('cp_entreprise', ${JSON.stringify(JSON.stringify(app))}); } } catch (e) { /* sans stockage */ }`;
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: poser });
      await attendre(800);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => /DEV-\d{4}-\d{5}/.test(x.innerText || ''));
        if (b) b.click();
        return !!b;
      });
      verifier(ouvert, 'un devis ouvert');
      await attendre(900);
      const apercu = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => ['Aperçu', 'Aperçu du document'].includes((x.innerText || '').trim()) || ['Aperçu', 'Aperçu du document'].includes(x.getAttribute('aria-label')));
        if (b) { b.click(); return true; }
        document.querySelector('button[aria-label="Plus d\'actions"]')?.click();
        return false;
      });
      if (!apercu) {
        await attendre(400);
        await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((x) => ['Aperçu', 'Aperçu du document'].includes((x.innerText || '').trim()))?.click());
      }
      await attendre(1200);
      const html = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('srcdoc') || '').find((x) => x.length > 100) || '');
      verifier(html.length > 100, 'aperçu affiché');
      verifier(html.includes('IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° IRVE-375 — Valide jusqu'), `IRVE imprimé (${(html.match(/.{0,5}IRVE \(infrastructures.{0,50}/) || ['aucun'])[0]})`);
      verifier(/Entreprise RGE \(Reconnu garant de l(?:'|&#39;)environnement\) — Qualification : QualiPAC chauffage et eau chaude sanitaire — Qualibat — N° E-375/.test(html), 'RGE imprimé (libellé du lot 0)');
      verifier(!html.includes('Professionnel du gaz'), 'PG gaz sans numéro : absent');
    },
  },
  {
    // Réponse de get_devis_for_signature après la migration 110 (clé « qualifications ») : la page du client l'imprime
    nom: 'qualifications : la page de signature du client imprime la liste (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const json = (corps) => ({ status: 200, body: JSON.stringify(corps) });
      const reponse = {
        devis: { id: 'd-q', numero: 'DEV-2026-00110', type: 'devis', statut: 'envoye', date: '2026-11-04', date_validite: '2099-12-04', validite: 30, objet: 'Borne de recharge',
          lignes: JSON.stringify([{ id: 'l1', description: 'Fourniture et pose d’une borne de recharge 7 kW', quantite: 1, unite: 'u', prixUnitaire: 1200, montant: 1200, tva: 20 }]),
          sections: '[]', total_ht: 1200, total_tva: 240, total_ttc: 1440, already_signed: false },
        client: { nom: 'Exemple', prenom: 'Claire' },
        chantier: null,
        entreprise: { nom: 'Élec Exemple', forme_juridique: 'SARL', siret: '12345678900012', couleur: '#12336F',
          qualifications: [{ type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'IRVE-SIG', fin: '2099-06-30', motsCles: 'borne' }] },
      };
      const { page } = await ouvrir({ reel: true, largeur: 375, supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_devis_for_signature' ? json(reponse) : json([])) });
      await page.goto(`${ORIGIN}/devis/signer/5d0c8a52-3c1e-4f8e-9a57-0c2f6e1b9d45`, { waitUntil: 'networkidle0' });
      await attendre(1200);
      const html = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('srcdoc') || '').join(' ') + document.body.innerHTML);
      verifier(html.includes('IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° IRVE-SIG — Valide jusqu'), `IRVE imprimé sur le devis montré au client (${(html.match(/.{0,5}IRVE \(infrastructures.{0,40}/) || ['aucun'])[0]})`);
    },
  },
];
