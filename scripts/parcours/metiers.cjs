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
// Éditeur de devis vide, ouvert depuis n'importe quelle page de l'app (mode démo, téléphone)
const ouvrirEditeurDeDevis = async (page, attendre) => {
  await page.evaluate(() => [...document.querySelectorAll('nav a, nav button')].find((x) => x.innerText.trim() === 'Devis')?.click());
  await attendre(1200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Nouveau$/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0); b?.click(); });
  await attendre(600);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button, [role=menuitem], a')].find((x) => (x.innerText || '').trim() === 'Nouveau devis'); b?.click(); });
  await attendre(1500);
  // Le sélecteur de client peut s'ouvrir d'abord : le fermer sans choisir
  await page.keyboard.press('Escape');
  await attendre(500);
};
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
      // Un lot de chaque métier au moins (relecture du 4 nov. : Électricien, 7 lots, cachait toute la plomberie)
      verifier(lots.some((l) => /Électricité/.test(l)) && lots.some((l) => /Plomberie/.test(l)), `au moins un lot de chaque métier (${lots.join(' ; ')})`);
      const hauteur = await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Afficher tous les métiers \(20\)$/.test(x.innerText.trim()))?.getBoundingClientRect().height || 0);
      verifier(hauteur >= 44, `« Afficher tous les métiers (20) » : cible de 44 px au moins (${Math.round(hauteur)} px)`);
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
    // D-41 (5 nov. 2026) : Ramonage, Froid et climatisation, Multiservice n'ont aucun prix. L'éditeur écrit « Prix à saisir »,
    // jamais « 0 € » ; les lignes ajoutées arrivent avec un champ de prix vide, à remplir ; les autres métiers gardent leurs prix.
    nom: 'métiers : ramoneur : éditeur de devis, lots et prestations sans prix (« Prix à saisir », jamais 0 €), prix vide à saisir (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      await attendre(800);
      const rubrique = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === 'Mon métier' && x.getBoundingClientRect().width > 0);
        if (b) b.click();
        return !!b;
      });
      verifier(rubrique, 'Paramètres › Mon métier');
      await attendre(600);
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Ramoneur');
      await attendre(1200);
      verifier(JSON.stringify(await puces(page)) === '["Ramoneur"]', `ramoneur choisi (${JSON.stringify(await puces(page))})`);
      await ouvrirEditeurDeDevis(page, attendre);

      // « Votre métier » : les lots de Ramonage, sans total chiffré
      const lots = await page.evaluate(() => [...document.querySelectorAll('[data-testid="lots-du-metier"] button')].map((b) => b.innerText.split('\n').map((x) => x.trim()).filter(Boolean).join(' / ')));
      verifier(lots.length === 2 && lots.every((l) => /Ramonage/.test(l)), `« Votre métier » : les deux lots de Ramonage (${lots.join(' ; ')})`);
      verifier(lots.every((l) => /Prix à saisir/.test(l) && !/(^|[^\d])0\s?€|NaN/.test(l)), `lots sans total : « Prix à saisir », jamais 0 € (${lots.join(' ; ')})`);

      await page.screenshot({ path: 'audit-ui/sonde-ramoneur-editeur-375.png', fullPage: true });
      // La bibliothèque : lots et prestations de Ramonage sans prix, Électricité avec ses prix
      const ouvert = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Afficher tous les métiers \(20\)$/.test(x.innerText.trim())); b?.click(); return !!b; });
      verifier(ouvert, 'bibliothèque ouverte');
      await attendre(700);
      const deplier = (nom) => page.evaluate((n) => {
        const b = [...document.querySelectorAll('[aria-label="Bibliothèque de modèles"] button[aria-expanded]')].find((x) => x.innerText.split('\n').map((t) => t.trim()).includes(n));
        if (b && b.getAttribute('aria-expanded') !== 'true') b.click();
        return !!b;
      }, nom);
      const texteDuMetier = (nom) => page.evaluate((n) => {
        const b = [...document.querySelectorAll('[aria-label="Bibliothèque de modèles"] button[aria-expanded]')].find((x) => x.innerText.split('\n').map((t) => t.trim()).includes(n));
        return b?.parentElement?.innerText || '';
      }, nom);
      verifier(await deplier('Ramonage'), 'métier Ramonage déplié');
      await attendre(500);
      await page.screenshot({ path: 'audit-ui/sonde-ramoneur-bibliotheque-375.png' });
      const ramonage = await texteDuMetier('Ramonage');
      verifier((ramonage.match(/Prix à saisir/g) || []).length >= 9, `Ramonage : chaque lot et chaque prestation dit « Prix à saisir » (${(ramonage.match(/Prix à saisir/g) || []).length})`);
      verifier(!/(^|[^\d])0\s?€|NaN|€\/(u|ml|forfait)/.test(ramonage), 'Ramonage : aucun montant, ni 0 €, ni NaN');
      verifier(/sans prix : saisissez les vôtres/.test(ramonage), 'Ramonage : la note dit que le métier est livré sans prix');
      verifier(await deplier('Électricité'), 'métier Électricité déplié');
      await attendre(500);
      const elec = await texteDuMetier('Électricité');
      verifier(/\d[\d\s  ]* €/.test(elec) && !/Prix à saisir/.test(elec), 'Électricité : ses prix sont toujours là');
      verifier(/Prix indicatifs moyens du marché/.test(elec), 'Électricité : la note des prix indicatifs');

      // Un lot de Ramonage entier, puis une prestation : les lignes arrivent avec un prix VIDE (jamais « 0 »), curseur sur le prix
      const cliquerDansLeMetier = (nom, debut) => page.evaluate((n, d) => {
        const b = [...document.querySelectorAll('[aria-label="Bibliothèque de modèles"] button[aria-expanded]')].find((x) => x.innerText.split('\n').map((t) => t.trim()).includes(n));
        const ligne = [...(b?.parentElement?.querySelectorAll('button:not([aria-expanded])') || [])].find((x) => x.innerText.trim().startsWith(d));
        ligne?.click();
        return !!ligne;
      }, nom, debut);
      // Un seul métier est déplié à la fois : Ramonage se referme quand Électricité s'ouvre
      verifier(await deplier('Ramonage'), 'métier Ramonage déplié de nouveau');
      await attendre(500);
      verifier(await cliquerDansLeMetier('Ramonage', 'Ramonage d\'un insert ou foyer fermé'), 'lot « Ramonage d’un insert ou foyer fermé » ajouté');
      await attendre(500);
      verifier(await cliquerDansLeMetier('Ramonage', 'Ramonage mécanique d\'un conduit de cheminée ouverte'), 'prestation « Ramonage mécanique d’un conduit de cheminée ouverte » ajoutée');
      await attendre(500);
      await page.keyboard.press('Escape');
      await attendre(700);
      const prix = await page.evaluate(() => [...document.querySelectorAll('input[inputmode="decimal"]')]
        .filter((i) => i.getBoundingClientRect().width > 0 && /PU HT|Prix unitaire/.test(i.placeholder || ''))
        .map((i) => i.value));
      verifier(prix.length === 4 && prix.every((v) => v === ''), `un lot de trois lignes et une prestation : quatre lignes, tous les prix vides (${JSON.stringify(prix)})`);
      const actif = await page.evaluate(() => (document.activeElement?.placeholder || ''));
      verifier(/PU HT|Prix unitaire/.test(actif), `le curseur est sur le prix de la dernière ligne (${actif || 'ailleurs'})`);
      await page.screenshot({ path: 'audit-ui/sonde-ramoneur-lignes-375.png', fullPage: true });
    },
  },
  {
    nom: 'qualifications : IRVE et RGE imprimés dans l’aperçu du devis (générateur de DevisPage, 375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const quals = [
        { id: 'q1', type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'IRVE-375', fin: '2099-06-30', imprimer: true, motsCles: '' },
        { id: 'q2', type: 'rge', intitule: 'QualiPAC chauffage et eau chaude sanitaire', organisme: 'Qualibat', numero: 'E-375', fin: '2099-12-31', imprimer: true },
        { id: 'q3', type: 'pg_gaz', intitule: 'PG installation', organisme: 'Qualigaz', numero: '', fin: '2099-12-31', imprimer: true },
        // Services à la personne : jamais imprimée (avis du lot 4, 5 nov. 2026), même enregistrée « sur tous mes documents »
        // avec son numéro et sa date (une fiche d'avant ce changement)
        { id: 'q4', type: 'sap', numero: 'SAP-375', fin: '2019-03-01', imprimer: true, ou: 'tous', motsCles: '' },
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
      verifier(!html.includes('SAP-375') && !html.includes('Services à la personne'), 'services à la personne enregistrée « sur tous mes documents » : absente de l’aperçu');
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
  {
    nom: 'métiers : compte neuf SANS fiche, avant la migration 110 : bienvenue avec deux métiers, fiche créée par le repli, choix relu (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      // La base n'a pas encore la colonne metiers : toute insertion qui la porte est refusée comme PostgREST le fait
      const sansColonne = (m, table, { corps }) => {
        const l = Array.isArray(corps) ? corps[0] : corps;
        return m === 'POST' && table === 'entreprise' && l && 'metiers' in l
          ? { status: 400, body: JSON.stringify({ code: 'PGRST204', message: "Could not find the 'metiers' column of 'entreprise' in the schema cache" }) }
          : null;
      };
      const base = creerBase({ entreprise: [] }, { refuser: sansColonne });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => /Quels travaux faites-vous/.test((await dialogue(page))?.texte || ''));
      verifier(/Quels travaux faites-vous/.test((await dialogue(page))?.texte || ''), 'compte sans fiche : la question du métier est posée');
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Électricien');
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Plombier');
      await attendre(300);
      await cliquerDans(page, '[role="dialog"]', 'Suivant');
      await jusqua(attendre, async () => (base.tables.entreprise[0]?.settings_json?.reglages?.metiers || []).length === 2);
      const fiche = base.tables.entreprise[0] || {};
      const refusees = base.journal.filter((j) => j.table === 'entreprise' && j.m === 'POST' && 'metiers' in ((Array.isArray(j.corps) ? j.corps[0] : j.corps) || {}));
      verifier(base.tables.entreprise.length === 1, `une fiche créée (${base.tables.entreprise.length})`);
      verifier(refusees.length >= 1 && !('metiers' in fiche), `1re insertion refusée (colonne absente), fiche créée sans la colonne (${refusees.length} refus)`);
      verifier(JSON.stringify(fiche.settings_json?.reglages?.metiers) === '["electricien","plombier"]', `métiers rangés dans settings_json.reglages (${JSON.stringify(fiche.settings_json)})`);
      verifier(/Bienvenue sur Mallettico/.test((await dialogue(page))?.texte || ''), 'puis la bienvenue continue');
      await cliquerDans(page, '[role="dialog"]', 'Passer');
      await attendre(500);
      await page.evaluate(() => localStorage.setItem('cp_current_page', 'settings'));
      await page.reload({ waitUntil: 'networkidle0' });
      await attendre(1500);
      await page.evaluate(() => [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === 'Mon métier' && x.getBoundingClientRect().width > 0)?.click());
      await attendre(800);
      verifier(JSON.stringify(await puces(page)) === '["Électricien","Plombier"]', `le choix est relu depuis la fiche créée (${JSON.stringify(await puces(page))})`);
    },
  },
  {
    nom: 'métiers : second appareil, la fiche a déjà ses métiers : la question n’est pas reposée (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...FICHE, metiers: ['electricien'] }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => !!(await dialogue(page)));
      await attendre(500);
      const d = await dialogue(page);
      verifier(/Bienvenue sur Mallettico/.test(d?.texte || '') && !/Quels travaux faites-vous/.test(d?.texte || ''),
        `la bienvenue commence directement (${(d?.texte || 'aucune').slice(0, 50)})`);
    },
  },
  {
    nom: 'métiers : membre invité non gérant : la question du métier n’est pas posée (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...FICHE }] }, { role: 'chef_chantier' });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => !!(await dialogue(page)));
      await attendre(500);
      const d = await dialogue(page);
      verifier(!!d && !/Quels travaux faites-vous/.test(d.texte), `pas de question du métier (${(d?.texte || 'aucune').slice(0, 50)})`);
      const ecritures = base.journal.filter((j) => j.table === 'entreprise' && j.m !== 'GET');
      verifier(ecritures.length === 0, `aucune écriture de la fiche (${ecritures.length})`);
    },
  },
  {
    // D-41 (5 nov. 2026) : la question de la bienvenue n'est jamais posée à un membre invité, administrateur compris. Paramètres
    // › Mon métier, lui, reste ouvert à qui peut modifier la fiche (propriétaire et administrateur), selon les droits existants.
    nom: 'métiers : administrateur invité : pas de question à la bienvenue, mais « Mon métier » reste dans Paramètres, comme pour le propriétaire (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const admin = creerBase({ entreprise: [{ ...FICHE }] }, { role: 'admin' });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: admin.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => !!(await dialogue(page)));
      await attendre(500);
      const d = await dialogue(page);
      verifier(!!d && !/Quels travaux faites-vous/.test(d.texte), `administrateur invité : pas de question du métier (${(d?.texte || 'aucune').slice(0, 50)})`);
      verifier(admin.journal.filter((j) => j.table === 'entreprise' && j.m !== 'GET').length === 0, 'aucune écriture de la fiche');
      const rubriques = async (base) => {
        const { page: p } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(), supabase: base.reponse });
        await jusqua(attendre, async () => await p.evaluate(() => !!document.querySelector('[data-parametres="liste"]')));
        await attendre(500);
        return p.evaluate(() => document.querySelector('[data-parametres="liste"]')?.innerText || '');
      };
      const listeAdmin = await rubriques(admin);
      verifier(/Identité/.test(listeAdmin) && /Légal/.test(listeAdmin) && /Mon métier/.test(listeAdmin),
        `administrateur invité : Paramètres avec « Mon métier », selon ses droits (${listeAdmin.replace(/\s+/g, ' ').slice(0, 120)})`);
      const proprio = creerBase({ entreprise: [{ ...FICHE }] });
      const listeProprio = await rubriques(proprio);
      verifier(/Mon métier/.test(listeProprio), `propriétaire : Paramètres avec « Mon métier » (${listeProprio.replace(/\s+/g, ' ').slice(0, 120)})`);
    },
  },
  {
    nom: 'métiers : bienvenue, « Passer » avec deux puces cochées : le choix est enregistré, pas perdu (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...FICHE }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'dashboard', session: sessionFactice(), supabase: base.reponse, avantChargement: BIENVENUE_A_VOIR });
      await jusqua(attendre, async () => /Quels travaux faites-vous/.test((await dialogue(page))?.texte || ''));
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Peintre');
      await cliquerDans(page, '[data-testid="choix-metiers"]', 'Carreleur');
      await attendre(300);
      verifier(await cliquerDans(page, '[role="dialog"]', 'Passer'), 'petit bouton « Passer »');
      await jusqua(attendre, async () => (base.tables.entreprise[0].metiers || []).length === 2);
      verifier([...(base.tables.entreprise[0].metiers || [])].sort().join(',') === 'carreleur,peintre',
        `choix enregistré avant de fermer (${JSON.stringify(base.tables.entreprise[0].metiers)})`);
      await attendre(500);
      verifier(!(await dialogue(page)), 'la bienvenue est fermée');
    },
  },
  {
    // Avis du juriste du lot 4 (5 nov. 2026, point 9) : la déclaration de services à la personne ne s'imprime plus du tout, pour
    // l'instant. « Où l'imprimer » est figé sur « Ne pas l'imprimer » (les deux autres choix ne s'offrent pas) et l'écran dit pourquoi.
    nom: 'qualifications : services à la personne, ajoutée figée sur « Ne pas l’imprimer », sans autre choix, avec la raison à l’écran (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      // Mode démo : la déclaration est ajoutée par l'écran lui-même (type choisi dans la liste de l'app, puis « Ajouter »)
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button, a')].find((x) => x.innerText.trim() === 'Légal' && x.getBoundingClientRect().width > 0)?.click());
      await attendre(800);
      const avant = await page.evaluate(() => document.querySelectorAll('[data-testid="qualification"]').length);
      await page.evaluate(() => document.querySelector('#qualif-type-ajout')?.click());
      await attendre(400);
      const type = await page.evaluate(() => {
        const o = [...document.querySelectorAll('[role="radio"]')].find((x) => x.innerText.trim().startsWith('Services à la personne'));
        o?.click();
        return !!o;
      });
      verifier(type, 'type « Services à la personne » choisi dans la liste');
      await attendre(500);
      await page.evaluate(() => [...document.querySelectorAll('[data-testid="mes-qualifications"] button')].find((b) => b.innerText.trim() === 'Ajouter')?.click());
      await attendre(900);
      const nb = await page.evaluate(() => document.querySelectorAll('[data-testid="qualification"]').length);
      verifier(nb === avant + 1, `déclaration ajoutée (${avant} → ${nb})`);
      const etat = () => page.evaluate(() => {
        const q = [...document.querySelectorAll('[data-testid="qualification"]')].pop();
        if (!q) return null;
        return {
          radios: q.querySelectorAll('input[type=radio]').length,
          figee: q.querySelector('[data-testid="qualification-ou-figee"]')?.innerText.trim() || '',
          mots: !!q.querySelector('input[id$="-mots"]'),
          raison: q.querySelector('[data-testid="qualification-raison"]')?.innerText.trim() || '',
          apercu: !!q.querySelector('[data-testid="qualification-apercu"]'),
          texte: q.innerText,
        };
      });
      const enregistre = () => page.evaluate(() => {
        try {
          const fiches = JSON.parse(localStorage.getItem('mallettico_entreprises') || '[]');
          const l = fiches.flatMap((f) => f?.settings_json?.reglages?.qualifications || []).filter((x) => x.type === 'sap');
          return l.length ? { ou: l[l.length - 1].ou, imprimer: l[l.length - 1].imprimer, motsCles: l[l.length - 1].motsCles } : null;
        } catch { return null; }
      });
      const RAISON = 'Cette déclaration ne s’imprime pas : une facture de services à la personne demande d’autres mentions (prix TTC, temps passé, intervenant) et une attestation fiscale chaque année, que Mallettico ne fait pas encore.';
      const e0 = await etat();
      verifier(e0?.figee === 'Ne pas l’imprimer', `« Où l’imprimer » figé sur « Ne pas l’imprimer » (${e0?.figee})`);
      verifier(e0?.radios === 0 && !e0?.mots, `aucun autre choix ne s’offre : ni radio, ni mots cherchés (${e0?.radios} radios)`);
      verifier(!/Sur tous mes documents|Seulement si une ligne contient/.test(e0?.texte || ''), 'ni « Sur tous mes documents » ni « Seulement si une ligne contient… »');
      verifier(e0?.raison === RAISON && !e0?.apercu, `l’écran dit pourquoi, mot pour mot, et n’annonce aucun « Imprimé ainsi » (${e0?.raison})`);
      const e1 = await enregistre();
      verifier(e1?.ou === 'non' && e1?.imprimer === false, `enregistrée « ne pas l’imprimer » (${JSON.stringify(e1)})`);
      // Numéro et date saisis : toujours rien d'imprimé, la raison ne change pas
      await page.evaluate(() => { const q = [...document.querySelectorAll('[data-testid="qualification"]')].pop(); q?.querySelector('input[id$="-numero"]')?.focus(); });
      await page.keyboard.type('SAP123456789', { delay: 20 });
      await attendre(1200);
      const e2 = await etat();
      verifier(e2?.raison === RAISON && !e2?.apercu && e2?.radios === 0, `numéro saisi : toujours figée, même raison (${e2?.raison})`);
      await page.screenshot({ path: 'audit-ui/sonde-qualif-sap-375.png', fullPage: true });
    },
  },
];
