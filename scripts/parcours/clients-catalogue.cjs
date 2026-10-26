// Task 7 « ancien code » (26 oct. 2026) — clients, catalogue, bibliothèque : un parcours par comportement corrigé, chacun avec son
// contre-essai (le même geste avec le rôle qui a le droit, ou avec la base qui accepte).
//  - une seule règle de prix : `canViewPrices` de usePermissions() — fausse pour chef_chantier et ouvrier ;
//  - la liste d'abord : pas de tuiles avant la liste ; une seule action pleine par écran ;
//  - pas de faux succès : un import arrêté en route, un mouvement de stock refusé ne s'annoncent pas comme faits.
const path = require('path');
const fs = require('fs');
const { creerBase, UID, json } = require('../lib/fauxSupabase.cjs');
const { texteContenu, ongletFiche, nomsOnglets } = require('../lib/parcoursChantier.cjs');

const REFUS = (table) => json({ code: '42501', message: `new row violates row-level security policy for table "${table}"` }, 403);
const sansInstallation = () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } };

const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000071', nom: 'Morel', prenom: 'Claire', telephone: '0600000071', email: 'claire@exemple.fr', adresse: '4 rue Neuve, 44000 Nantes', created_at: '2026-01-10T08:00:00Z' };
const AUTRE = { id: 'c0c0c0c0-0000-4000-8000-000000000072', nom: 'Girard', prenom: 'Lou', telephone: '0600000072', created_at: new Date().toISOString() }; // créé aujourd'hui, sans document : prospect
const CHANTIER = { id: 'c1c1c1c1-0000-4000-8000-000000000071', nom: 'Rénovation Morel', client_id: CLIENT.id, statut: 'en_cours', avancement: 40, budget_prevu: 8500, date_debut: '2026-09-01', date_fin: '2026-12-30', created_at: '2026-09-01T08:00:00Z' };
const DEVIS = { id: 'd0d0d0d0-0000-4000-8000-000000000071', client_id: CLIENT.id, chantier_id: CHANTIER.id, type: 'devis', statut: 'accepte', numero: 'DEV-2026-0071', date: '2026-09-02', date_validite: '2026-12-02', total_ht: 8500, total_tva: 850, total_ttc: 9350, lignes: [], created_at: '2026-09-02T08:00:00Z' };
const FACTURE = { id: 'd0d0d0d0-0000-4000-8000-000000000072', client_id: CLIENT.id, chantier_id: CHANTIER.id, type: 'facture', statut: 'envoye', numero: 'FAC-2026-0072', devis_source_id: DEVIS.id, facture_type: 'acompte', date: '2026-09-10', date_echeance: '2026-10-10', total_ht: 2000, total_tva: 200, total_ttc: 2200, lignes: [], created_at: '2026-09-10T08:00:00Z' };
const ECHANGE = { id: 'e1e1e1e1-0000-4000-8000-000000000071', client_id: CLIENT.id, type: 'email', contenu: 'Devis envoyé à Claire', date: '2026-09-03T09:00:00Z', created_at: '2026-09-03T09:00:00Z' };
const ARTICLES = [
  { id: 'a0a0a0a0-0000-4000-8000-000000000001', designation: 'Câble R2V 3G2,5', reference: 'CAB-325', unite: 'ml', prix_unitaire_ht: 1.8, prix_achat: 1.1, tva_rate: 20, categorie: 'Électricité', favori: true, actif: true, stock_actuel: 120, stock_minimum: 50, created_at: '2026-09-01T08:00:00Z' },
  { id: 'a0a0a0a0-0000-4000-8000-000000000002', designation: 'Gaine ICTA 20', reference: 'GAI-020', unite: 'ml', prix_unitaire_ht: 0.65, prix_achat: 0.35, tva_rate: 20, categorie: 'Électricité', favori: false, actif: true, stock_actuel: 10, stock_minimum: 40, created_at: '2026-09-01T08:00:00Z' },
  { id: 'a0a0a0a0-0000-4000-8000-000000000003', designation: 'Disjoncteur 20A', reference: 'DIS-020', unite: 'u', prix_unitaire_ht: 14, prix_achat: 9, tva_rate: 20, categorie: 'Électricité', favori: false, actif: true, stock_actuel: null, stock_minimum: null, created_at: '2026-09-01T08:00:00Z' },
];

const donnees = () => ({ clients: [CLIENT, AUTRE], chantiers: [CHANTIER], devis: [DEVIS, FACTURE], echanges: [ECHANGE], catalogue: ARTICLES.map((a) => ({ ...a })) });

// Le journal d'activité du client : une entrée de statut et une entrée qui ne porte que des montants (sur son devis)
const entreeAudit = (id, type, entityId, action, changes, minutes) => ({
  id, entity_type: type, entity_id: entityId, action, changes, metadata: {}, snapshot_id: null, user_name: 'Hugo', created_at: new Date(Date.now() - minutes * 60000).toISOString(),
});
const AUDIT = [
  entreeAudit('a0a0a0a0-0000-4000-8000-000000000071', 'devis', DEVIS.id, 'updated', { total_ht: { old: 8000, new: 8500 }, total_ttc: { old: 9600, new: 10200 } }, 30),
  entreeAudit('a0a0a0a0-0000-4000-8000-000000000072', 'devis', DEVIS.id, 'status_changed', { statut: { old: 'brouillon', new: 'envoye' } }, 50),
];
const lignesAudit = (u) => {
  const type = (u.searchParams.get('entity_type') || '').replace(/^eq\./, '');
  const brut = u.searchParams.get('entity_id') || '';
  const ids = brut.startsWith('in.') ? brut.slice(4, -1).split(',') : [brut.replace(/^eq\./, '')];
  return AUDIT.filter((e) => e.entity_type === type && ids.includes(e.entity_id));
};
const avecAudit = (base) => (req, u) => (u.pathname === '/rest/v1/audit_logs' ? json(lignesAudit(u)) : base.reponse(req, u));

async function ouvrirFicheClient(page, attendre, nom) {
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
    if (!b) throw new Error(`client « ${n} » introuvable dans la liste`);
    b.click();
  }, nom);
  await attendre(900);
}

const boutonsPleins = (page) => page.evaluate(() => [...document.querySelectorAll('#main-content [data-ui="Bouton"]')]
  .filter((b) => b.getBoundingClientRect().width > 0 && /\bbg-accent\b/.test(b.className)).map((b) => b.innerText.trim()));

const libellesBoutons = (page) => page.evaluate(() => [...document.querySelectorAll('button, a')]
  .filter((b) => b.getBoundingClientRect().width > 0).map((b) => (b.innerText || b.getAttribute('aria-label') || b.title || '').replace(/\s+/g, ' ').trim()));

module.exports = [
  {
    // Le point imposé par la relecture de la Task 6 : la page Clients montrait « Encaissé », « En cours », « à encaisser » à un chef de chantier.
    nom: 'chef de chantier : aucun montant dans Clients, la fiche client ni le Catalogue ; le gérant les voit (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      for (const role of ['owner', 'chef_chantier']) {
        const base = creerBase(donnees(), { role });
        const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: avecAudit(base), avantChargement: sansInstallation });
        await attendre(2500);
        const chef = role === 'chef_chantier';

        // La liste des clients
        const liste = await texteContenu(page);
        verifier(/Morel/.test(liste), `${role} : la liste montre le client`);
        if (chef) {
          verifier(!/€|à encaisser|Encaissé|En cours/.test(liste), `chef : aucun montant dans la liste (« ${liste.slice(0, 200)} »)`);
          const boutons = await libellesBoutons(page);
          verifier(!boutons.includes('Nouveau client') && !boutons.some((b) => /Importer/.test(b)), `chef : ni « Nouveau client » ni import (${boutons.slice(0, 12).join(' | ')})`);
        } else {
          verifier(/2\s?200\s?€/.test(liste) && /à encaisser/.test(liste), `gérant : le reste dû de la cliente est dans la liste (« ${liste.slice(0, 200)} »)`);
        }

        // La fiche
        await ouvrirFicheClient(page, attendre, 'Morel');
        const fiche = await texteContenu(page);
        if (chef) {
          verifier(!/€|Encaissé|Reste dû/.test(fiche), `chef : aucun chiffre dans la fiche (« ${fiche.slice(0, 200)} »)`);
          const boutons = await libellesBoutons(page);
          verifier(!boutons.includes('Nouveau devis') && !boutons.includes('Modifier le client'), `chef : ni « Nouveau devis » ni « Modifier » (${boutons.slice(0, 14).join(' | ')})`);
        } else {
          verifier(/Encaissé/.test(fiche) && /Reste dû/.test(fiche), 'gérant : « Encaissé » et « Reste dû » dans la fiche');
        }
        await ongletFiche(page, attendre, 'Documents');
        const docs = await texteContenu(page);
        verifier(/Facture/.test(docs) && /Devis/.test(docs) && /FAC-2026-0*72/.test(docs), `${role} : les documents sont listés avec leur numéro (« ${docs.slice(0, 200)} »)`);
        if (chef) verifier(!/€/.test(docs), `chef : mais sans aucun montant (« ${docs.slice(0, 200)} »)`);
        else verifier(/9\s?350\s?€/.test(docs), 'gérant : avec leur montant');
        await ongletFiche(page, attendre, 'Échanges');
        verifier(/Devis envoyé à Claire/.test(await texteContenu(page)), `${role} : l’échange est listé`);
        await ongletFiche(page, attendre, 'Activité');
        await attendre(1200);
        await page.evaluate(() => [...document.querySelectorAll('#main-content button')].filter((b) => /modification/.test(b.innerText)).forEach((b) => b.click()));
        await attendre(500);
        const journal = await texteContenu(page);
        if (chef) {
          verifier(!/€|Total|\b8[\s  ]?500\b|\b10[\s  ]?200\b/.test(journal), `chef : le journal d’activité ne montre aucun montant (« ${journal.slice(0, 220)} »)`);
          verifier(/Statut modifié/.test(journal), 'chef : mais garde l’entrée de statut');
        } else {
          verifier(/8\s?500\s?€/.test(journal) && /Total HT/.test(journal), `gérant : les montants du journal sont là (« ${journal.slice(0, 220)} »)`);
        }

        // Le Catalogue
        await page.evaluate(() => localStorage.setItem('cp_current_page', 'catalogue'));
        await page.reload({ waitUntil: 'networkidle0' });
        await attendre(2500);
        const cat = await texteContenu(page);
        verifier(/Câble R2V/.test(cat) && /Gaine ICTA/.test(cat), `${role} : les articles sont listés`);
        const onglets = await nomsOnglets(page);
        if (chef) {
          verifier(!/€|Marge|Achat|Vente/.test(cat), `chef : aucun prix ni marge dans le catalogue (« ${cat.slice(0, 260)} »)`);
          for (const o of ['Référentiel', 'Fournisseurs', 'Packs', 'Coefficients']) verifier(!onglets.includes(o), `chef : pas d’onglet « ${o} » (${onglets.join(', ')})`);
          verifier(onglets.includes('Articles') && onglets.includes('Inventaire'), 'chef : mais Articles et Inventaire restent');
          const boutons = await libellesBoutons(page);
          verifier(!boutons.includes('Ajouter') && !boutons.some((b) => /^Modifier|^Supprimer/.test(b)), `chef : pas d’ajout, de modification ni de suppression (${boutons.slice(0, 16).join(' | ')})`);
          // La fiche d'un article : le stock oui, aucun prix
          await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((b) => /Câble R2V/.test(b.innerText))?.click());
          await attendre(700);
          const article = await texteContenu(page);
          verifier(/Câble R2V/.test(article) && /Stock/.test(article), 'chef : la fiche de l’article montre son stock');
          verifier(!/€|Marge|Prix de vente|Prix d.achat|Fournisseurs/.test(article), `chef : sans aucun prix, marge ni fournisseur (« ${article.slice(0, 260)} »)`);
        } else {
          verifier(/1,8\s?€/.test(cat), 'gérant : les prix sont dans le catalogue');
          for (const o of ['Référentiel', 'Fournisseurs', 'Packs', 'Coefficients']) verifier(onglets.includes(o), `gérant : l’onglet « ${o} » est là (${onglets.join(', ')})`);
        }
      }
    },
  },
  {
    // Le module ramonage ajoute un onglet à la fiche client : son historique porte un prix (« 95 € HT »).
    nom: 'ramonage : l’historique d’un appareil sur la fiche client ne montre aucun prix au chef de chantier ; le gérant le voit (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const { CGU_VERSION } = require('../lib/cgu.cjs');
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const AN = new Date().getFullYear();
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000171', user_id: UID, organization_id: ORG, nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise', siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, cgu_accepted_at: '2026-01-01T00:00:00Z', cgu_version: CGU_VERSION, created_at: '2026-01-01T00:00:00Z' };
      const ramonage = { id: 'd0d0d0d0-0000-4000-8000-000000000171', user_id: UID, organization_id: ORG, numero: `RAM-${AN}-00011`, client_id: CLIENT.id, appareil_ref: 'f0f0f0f0-0000-4000-8000-000000000171',
        realise_le: `${AN}-03-14T09:00:00Z`, intervenant_nom: 'Jean Exemple', client_nom: 'Claire Morel', qualite_client: 'locataire', adresse_intervention: CLIENT.adresse, appareil_type: 'insert', combustible: 'bois', conduit: 'maconne',
        methode: 'mecanique_manuelle', complement_chimique: false, raccordement: 'ramone', vacuite: 'assuree', constats: {}, conseils: { choix: ['usage'] }, prochain_avant: `${AN + 1}-03-14`, nb_dans_annee: 1, prix_ht: 95,
        jeton_rappel: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', emetteur: { nom: 'Ramonage Exemple', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Jean Exemple', siret: '00000000000000' },
        annulee_le: null, annulation_motif: null, rappel_fait_le: null, rappel_canal: null, facture_id: null, created_at: `${AN}-03-14T09:00:00Z` };
      for (const role of ['owner', 'chef_chantier']) {
        const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE], ramonages: [ramonage] }, { role });
        const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
        await attendre(2500);
        await ouvrirFicheClient(page, attendre, 'Morel');
        const onglet = await page.evaluate(() => document.querySelector('[data-testid="onglet-ramonage"]')?.innerText.replace(/\s+/g, ' ') || '');
        verifier(onglet.includes(`RAM-${AN}-00011`) && /Insert/.test(onglet), `${role} : l’appareil et son passage sont listés (« ${onglet.slice(0, 160)} »)`);
        if (role === 'chef_chantier') verifier(!/€|HT/.test(onglet), `chef : sans le prix du passage (« ${onglet.slice(0, 160)} »)`);
        else verifier(/95\s?€\s?HT/.test(onglet), `gérant : avec le prix du passage (« ${onglet.slice(0, 160)} »)`);
      }
    },
  },
  {
    nom: 'liste des clients : la liste d’abord, sans tuiles ; « devis du … » dans la méta ; pas de pastille « Actif » (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase(donnees());
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      const mesure = await page.evaluate(() => {
        const premiere = document.querySelector('[data-ui="GroupeListe"] [data-ui="LigneListe"]');
        return {
          tuiles: document.querySelectorAll('[data-ui="TuileChiffre"], .bandeau-chiffres').length,
          hautPremiereLigne: premiere ? Math.round(premiere.getBoundingClientRect().top) : null,
          pastilles: [...document.querySelectorAll('[data-ui="GroupeListe"] [data-ui="Pastille"]')].map((p) => p.innerText.trim()),
          texte: (document.querySelector('#main-content')?.innerText || '').replace(/\s+/g, ' '),
        };
      });
      verifier(mesure.tuiles === 0, `aucune tuile avant la liste (${mesure.tuiles})`);
      verifier(mesure.hautPremiereLigne !== null && mesure.hautPremiereLigne < 400, `la première ligne arrive haut dans l’écran (${mesure.hautPremiereLigne} px sur 812)`);
      verifier(!mesure.pastilles.includes('Actif') && !mesure.pastilles.includes('Inactif'), `aucune pastille « Actif » ni « Inactif » (${JSON.stringify(mesure.pastilles)})`);
      verifier(mesure.pastilles.includes('Prospect'), `un client sans document, créé aujourd’hui, est « Prospect » (${JSON.stringify(mesure.pastilles)})`);
      verifier(/Nantes · devis du/.test(mesure.texte), `la date du dernier devis est dans la méta (« ${mesure.texte.slice(0, 240)} »)`);
      // La rangée de statuts dit sa règle
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="SegmentDefilant"] button')].find((b) => /^Inactifs/.test(b.innerText))?.click());
      await attendre(400);
      const regle = await texteContenu(page);
      verifier(/Ni chantier ouvert, ni devis envoyé ou signé\./.test(regle), `le choix « Inactifs » écrit sa règle (« ${regle.slice(0, 200)} »)`);
    },
  },
  {
    nom: 'clients : au premier usage, un seul bouton plein (celui de l’état vide) ; avec des clients, « Nouveau client » (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const vide = creerBase({ clients: [] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: vide.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      const pleins = await boutonsPleins(page);
      verifier(pleins.length === 1 && pleins[0] === 'Ajouter un client', `un seul bouton plein au premier usage (${JSON.stringify(pleins)})`);
      verifier(/Ajoutez votre premier client/.test(await texteContenu(page)), 'l’état vide dit quoi faire');
      const plein = creerBase(donnees());
      const { page: page2 } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: plein.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      const pleins2 = await boutonsPleins(page2);
      verifier(pleins2.length === 1 && pleins2[0] === 'Nouveau client', `avec des clients : un seul bouton plein, « Nouveau client » (${JSON.stringify(pleins2)})`);
    },
  },
  {
    nom: 'fiche client : une action pleine, la corbeille dans « ⋯ », deux colonnes au bureau (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase(donnees());
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      await ouvrirFicheClient(page, attendre, 'Morel');
      const pleins = await boutonsPleins(page);
      verifier(pleins.length === 1 && pleins[0] === 'Nouveau devis', `un seul bouton plein, « Nouveau devis » (${JSON.stringify(pleins)})`);
      const avant = await libellesBoutons(page);
      verifier(!avant.includes('Supprimer le client'), 'aucune corbeille à côté du crayon');
      verifier(avant.includes('Modifier le client') && avant.includes("Plus d'actions"), 'le crayon et « ⋯ » sont là');
      const colonnes = await page.evaluate(() => {
        const carte = [...document.querySelectorAll('#main-content [data-ui="Carte"]')].find((c) => /claire@exemple\.fr/.test(c.innerText));
        const onglets = document.querySelector('#main-content [role="tablist"]');
        const bouton = [...document.querySelectorAll('#main-content [data-ui="Bouton"]')].find((b) => b.innerText.trim() === 'Nouveau devis');
        return { carteDroite: carte?.getBoundingClientRect().right, ongletsGauche: onglets?.getBoundingClientRect().left, largeurBouton: bouton?.getBoundingClientRect().width };
      });
      verifier(colonnes.ongletsGauche > colonnes.carteDroite, `deux colonnes : les documents à droite des coordonnées (${JSON.stringify(colonnes)})`);
      verifier(colonnes.largeurBouton < 420, `le bouton n’est plus pleine largeur d’une colonne de 770 px (${Math.round(colonnes.largeurBouton)} px)`);
      await page.evaluate(() => document.querySelector('button[aria-label="Plus d\'actions"]')?.click());
      await attendre(500);
      const menu = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(/Supprimer le client/.test(menu), `« Supprimer le client » est dans le menu (« ${menu.replace(/\s+/g, ' ').slice(0, 100)} »)`);
    },
  },
  {
    nom: 'catalogue : la recherche en tête, « Favoris » et « Stock bas » en puces, pas de tuiles (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase(donnees());
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'catalogue', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      const mesure = await page.evaluate(() => {
        const premiere = document.querySelector('[data-ui="GroupeListe"] [data-ui="LigneListe"]');
        const chips = [...document.querySelectorAll('[data-ui="SegmentDefilant"] button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim());
        const bas = [...document.querySelectorAll('[data-ui="SegmentDefilant"] button')].find((b) => /^Stock bas/.test(b.innerText.trim()));
        return {
          tuiles: document.querySelectorAll('[data-ui="TuileChiffre"], .bandeau-chiffres').length,
          hautPremiereLigne: premiere ? Math.round(premiere.getBoundingClientRect().top) : null,
          chips,
          puceBasEnAlerte: !!bas && /bg-alerte-fond/.test(bas.className),
          texte: (document.querySelector('#main-content')?.innerText || '').replace(/\s+/g, ' '),
          pleins: [...document.querySelectorAll('#main-content [data-ui="Bouton"]')].filter((b) => b.getBoundingClientRect().width > 0 && /\bbg-accent\b/.test(b.className)).map((b) => b.innerText.trim()),
        };
      });
      verifier(mesure.tuiles === 0, `aucune tuile (${mesure.tuiles})`);
      verifier(!/Valeur stock|Marge moyenne|Favoris \d+ article/.test(mesure.texte), 'ni « Valeur stock » ni bandeaux de stock avant la liste');
      verifier(mesure.hautPremiereLigne !== null && mesure.hautPremiereLigne < 500, `la première ligne arrive haut dans l’écran (${mesure.hautPremiereLigne} px sur 812 ; avant : vers 1 400)`);
      verifier(mesure.chips.some((c) => /^Favoris/.test(c)) && mesure.chips.some((c) => /^Stock bas/.test(c)), `« Favoris » et « Stock bas » sont des puces (${mesure.chips.join(' | ')})`);
      verifier(mesure.puceBasEnAlerte, '« Stock bas » est en ton alerte');
      verifier(mesure.pleins.length === 1 && mesure.pleins[0] === 'Ajouter', `une seule action pleine, « Ajouter » (${JSON.stringify(mesure.pleins)})`);
      // Le choix « Stock bas » filtre la liste
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="SegmentDefilant"] button')].find((b) => /^Stock bas/.test(b.innerText.trim()))?.click());
      await attendre(500);
      const apres = await texteContenu(page);
      verifier(/Gaine ICTA/.test(apres) && !/Câble R2V/.test(apres), `« Stock bas » ne garde que l’article sous son seuil (« ${apres.slice(0, 200)} »)`);
    },
  },
  {
    // Avant : « N clients importés avec succès » même quand l'import s'était arrêté en route (limite de l'offre, refus de la base).
    nom: 'import de clients : un import arrêté en route n’est pas annoncé comme réussi ; accepté, il l’est (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, cliquer, sessionFactice }) {
      const dossier = path.join(__dirname, '..', '..', 'audit-ui');
      fs.mkdirSync(dossier, { recursive: true });
      const csv = path.join(dossier, 'parcours-import-clients.csv');
      fs.writeFileSync(csv, 'Nom;Prénom;Email;Téléphone\nMartin;Alice;alice@exemple.fr;0600000001\nDurand;Bruno;bruno@exemple.fr;0600000002\nLeroy;Chloé;chloe@exemple.fr;0600000003\n');
      for (const refus of [true, false]) {
        let postes = 0;
        const base = creerBase({ clients: [CLIENT] }, { refuser: (m, table) => (m === 'POST' && table === 'clients' && refus && ++postes >= 2 ? REFUS('clients') : null) });
        const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
        await attendre(2500);
        await cliquer(page, "Plus d'actions");
        await cliquer(page, 'Importer un fichier (CSV)', { dans: '[role="dialog"]' });
        await attendre(600);
        const entree = await page.$('[role="dialog"] input[type="file"]');
        await entree.uploadFile(csv);
        await attendre(1200);
        const mapping = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.replace(/\s+/g, ' ') || '');
        verifier(/Étape 2 sur 3/.test(mapping) && /3 lignes détectées/.test(mapping), `le fichier est lu, les colonnes à associer (« ${mapping.slice(0, 160)} »)`);
        await cliquer(page, 'Importer 3 lignes', { dans: '[role="dialog"]' });
        await attendre(3500);
        const fin = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText.replace(/\s+/g, ' ') || '');
        if (refus) {
          verifier(/Importation incomplète/.test(fin) && /1 clients? importés? sur 3/.test(fin), `refusé au 2e client : l’import est dit incomplet, 1 sur 3 (« ${fin.slice(0, 220)} »)`);
          verifier(!/Importation terminée/.test(fin), 'et jamais « Importation terminée »');
          verifier(base.tables.clients.length === 2, `un seul client de plus en base (${base.tables.clients.length - 1})`);
        } else {
          verifier(/Importation terminée/.test(fin) && /3 clients importés/.test(fin), `accepté : « Importation terminée », 3 clients (« ${fin.slice(0, 200)} »)`);
          verifier(base.tables.clients.length === 4, `les trois clients sont en base (${base.tables.clients.length - 1})`);
        }
      }
    },
  },
  {
    // Avant : le mouvement était noté et « stock mis à jour » annoncé même quand la base refusait la mise à jour du stock.
    nom: 'catalogue : un mouvement de stock refusé par la base n’est pas annoncé, la fenêtre et la saisie restent ; accepté, le stock suit (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, cliquer, saisir, sessionFactice }) {
      let refus = true;
      const base = creerBase(donnees(), { refuser: (m, table) => (refus && m === 'PATCH' && table === 'catalogue' ? REFUS('catalogue') : null) });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'catalogue', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      await page.evaluate(() => localStorage.removeItem('mallettico_mouvements'));
      await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((t) => /^Mouvements/.test(t.innerText.trim()))?.click());
      await attendre(500);
      await cliquer(page, 'Enregistrer un mouvement');
      await attendre(500);
      await page.select('[role="dialog"] #mouvement-article', ARTICLES[0].id);
      await saisir(page, '[role="dialog"] #mouvement-quantite', '30');
      await cliquer(page, 'Valider', { dans: '[role="dialog"]' });
      await attendre(1800);
      const t = await page.evaluate(() => document.body.innerText);
      verifier(!/Mouvement enregistré/.test(t), 'refusé : « Mouvement enregistré » n’est pas annoncé');
      const ouverte = await page.evaluate(() => ({ dialogue: !!document.querySelector('[role="dialog"]'), quantite: document.querySelector('[role="dialog"] #mouvement-quantite')?.value }));
      verifier(ouverte.dialogue && ouverte.quantite === '30', `refusé : la fenêtre et la saisie restent (${JSON.stringify(ouverte)})`);
      verifier(base.tables.catalogue.find((a) => a.id === ARTICLES[0].id).stock_actuel === 120, 'refusé : le stock en base n’a pas bougé');
      refus = false;
      await cliquer(page, 'Valider', { dans: '[role="dialog"]' });
      await attendre(1800);
      const apres = await page.evaluate(() => document.body.innerText);
      verifier(/Mouvement enregistré — stock mis à jour/.test(apres), 'accepté : le mouvement est annoncé');
      verifier(base.tables.catalogue.find((a) => a.id === ARTICLES[0].id).stock_actuel === 150, `accepté : le stock en base suit (${base.tables.catalogue.find((a) => a.id === ARTICLES[0].id).stock_actuel})`);
      verifier(!(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'accepté : la fenêtre se ferme');
    },
  },
  {
    nom: 'fenêtres rapides : « Nouveau chantier » est un dialogue sans astérisque, avec un encadré de budget neutre ; « Nouveau client » sans dégradé (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase(donnees());
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID), supabase: base.reponse, avantChargement: sansInstallation });
      await attendre(2500);
      // Nouveau client
      await page.evaluate(() => [...document.querySelectorAll('#main-content [data-ui="Bouton"]')].find((b) => b.innerText.trim() === 'Nouveau client')?.click());
      await attendre(800);
      const client = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return { dialogue: !!d, nom: d?.getAttribute('aria-labelledby') ? document.getElementById(d.getAttribute('aria-labelledby'))?.innerText : '', degrade: !!d?.querySelector('[style*="linear-gradient"]'), champNom: !!d?.querySelector('#qc-nom'), croix: !!d?.querySelector('button[aria-label="Fermer"]') };
      });
      verifier(client.dialogue && /Nouveau client/.test(client.nom || '') && client.champNom && client.croix, `« Nouveau client » : dialogue nommé, champ Nom, croix nommée (${JSON.stringify(client)})`);
      verifier(!client.degrade, 'sans dégradé de la couleur de l’entreprise');
      await page.keyboard.press('Escape');
      await attendre(500);
      verifier(!(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'Échap ferme la fenêtre');
      // Nouveau chantier, depuis la fiche du client
      await ouvrirFicheClient(page, attendre, 'Morel');
      await ongletFiche(page, attendre, 'Chantiers');
      await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Nouveau chantier').pop()?.click());
      await attendre(1000);
      const chantier = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const budget = d?.querySelector('#chantier-budget');
        const cadre = budget?.closest('div.rounded-xl');
        return {
          dialogue: !!d, croix: !!d?.querySelector('button[aria-label="Fermer"]'),
          asterisques: [...(d?.querySelectorAll('label') || [])].filter((l) => /\*/.test(l.innerText)).length,
          cadreVert: !!cadre && /succes|emerald|green/.test(cadre.className),
          indicationTactile: !!d?.querySelector('.indication-clavier'),
        };
      });
      verifier(chantier.dialogue && chantier.croix, `« Nouveau chantier » est un dialogue avec une croix nommée (${JSON.stringify(chantier)})`);
      verifier(chantier.asterisques === 0, `aucun astérisque (${chantier.asterisques})`);
      verifier(!chantier.cadreVert, 'l’encadré du budget n’est pas vert');
      verifier(chantier.indicationTactile, 'l’indication « Entrée » porte la classe qui la cache sur écran tactile');
    },
  },
];
