// Coque et Accueil (Task 5 du plan « ancien code », audit UX du 20 oct. 2026) : navigation au téléphone et au bureau,
// en-tête resserré, pastilles qui ne crient qu'en cas de retard, fond des fenêtres sans « petit jour », Accueil qui
// guide un compte neuf et dont les boutons font ce qu'ils disent, conditions d'utilisation demandées au premier document.
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });
const { CGU_VERSION, CGU_VERSION_DATE } = require('../lib/cgu.cjs');
const texteDialogue = (page) => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.innerText).join('\n'));

module.exports = [
  {
    nom: 'coque : « Plus » ouvre une feuille du bas avec les seules rubriques absentes de la barre, puis retours, thème, déconnexion (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375 });
      const aside = await page.evaluate(() => [...document.querySelectorAll('aside')].some((a) => a.getBoundingClientRect().width > 0 && getComputedStyle(a).display !== 'none'));
      verifier(!aside, 'pas de menu latéral au téléphone (avant : « Plus » l’ouvrait depuis la gauche)');
      await cliquer(page, 'Plus : autres rubriques');
      const feuille = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        const r = d.getBoundingClientRect();
        return {
          texte: d.innerText,
          bas: Math.round(r.bottom),
          rubriques: [...d.querySelectorAll('nav button')].map((b) => (b.children[1]?.innerText || '').trim()),
          hauteurs: [...d.querySelectorAll('nav button')].map((b) => Math.round(b.getBoundingClientRect().height)),
        };
      });
      verifier(!!feuille, 'une feuille s’ouvre');
      verifier(JSON.stringify(feuille.rubriques) === JSON.stringify(['Tâches & Planning', 'Catalogue', 'Équipe', 'Finances', 'Paramètres', 'Mon plan']),
        `les six autres rubriques, dans l’ordre (${JSON.stringify(feuille.rubriques)})`);
      verifier(!['Accueil', 'Devis & Factures', 'Chantiers', 'Clients'].some((t) => feuille.rubriques.includes(t)), 'aucun onglet déjà visible dans la barre');
      verifier(feuille.hauteurs.every((h) => h >= 64), `tuiles de 64 px au moins (${feuille.hauteurs.join(', ')})`);
      verifier(/Un bug \? Une idée \?/.test(feuille.texte) && /Mode sombre/.test(feuille.texte) && /Se déconnecter/.test(feuille.texte), 'retours, thème et déconnexion sous les rubriques');
      verifier(feuille.bas >= 812 - 24, `feuille posée en bas de l’écran (bas à ${feuille.bas} px)`);
      const aller = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] nav button')].find((x) => (x.children[1]?.innerText || '').trim() === 'Catalogue');
        b?.click();
        return !!b;
      });
      verifier(aller, 'tuile « Catalogue »');
      await attendre(900);
      verifier(await page.evaluate(() => localStorage.getItem('cp_current_page')) === 'catalogue', 'la tuile ouvre le Catalogue');
      verifier(!(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))), 'la feuille se referme');
    },
  },
  {
    nom: 'coque : en-tête du bureau (recherche, confidentiel, notifications, « Nouveau », avatar) ; thème, installation et aide dans le menu de l’avatar ; menu latéral en trois groupes (1440 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 1440 });
      const entete = await page.evaluate(() => [...document.querySelectorAll('header button')]
        .filter((b) => b.getBoundingClientRect().width > 0)
        .map((b) => b.getAttribute('aria-label') || (b.innerText || '').trim()));
      verifier(!entete.some((e) => /mode sombre|mode clair|aide|installer/i.test(e)), `ni thème, ni aide, ni installation dans l’en-tête (${JSON.stringify(entete)})`);
      for (const attendu of ['Masquer les montants', 'Créer nouveau', 'Mon compte']) verifier(entete.includes(attendu), `« ${attendu} » dans l’en-tête`);
      verifier(entete.some((e) => /^Notifications/.test(e)), 'les notifications dans l’en-tête');
      const yeux = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /les montants$/.test(b.getAttribute('aria-label') || '') && b.getBoundingClientRect().width > 0).length);
      verifier(yeux === 1, `une seule commande du mode confidentiel à l’écran (${yeux})`);
      const logos = await page.evaluate(() => [...document.querySelectorAll('header')].map((h) => h.innerText).join(' ').includes('BTP Rénovation Pro'));
      verifier(!logos, 'le nom de l’entreprise n’est plus répété dans l’en-tête (le menu latéral le porte)');

      const menuLateral = await page.evaluate(() => [...document.querySelectorAll('aside nav')].map((n) => ({
        groupe: n.getAttribute('aria-label'),
        rubriques: [...n.querySelectorAll('button')].map((b) => (b.querySelector('span.truncate')?.innerText || '').trim()),
      })));
      verifier(JSON.stringify(menuLateral.map((g) => g.groupe)) === JSON.stringify(['Navigation principale', 'Gestion', 'Compte']), `trois groupes (${JSON.stringify(menuLateral.map((g) => g.groupe))})`);
      verifier(JSON.stringify(menuLateral[0].rubriques) === JSON.stringify(['Accueil', 'Devis & Factures', 'Chantiers', 'Clients', 'Tâches & Planning']), `premier groupe (${JSON.stringify(menuLateral[0].rubriques)})`);
      verifier(JSON.stringify(menuLateral[1].rubriques) === JSON.stringify(['Catalogue', 'Équipe', 'Finances']), `Gestion (${JSON.stringify(menuLateral[1].rubriques)})`);
      verifier(JSON.stringify(menuLateral[2].rubriques) === JSON.stringify(['Paramètres', 'Mon plan']), `Compte (${JSON.stringify(menuLateral[2].rubriques)})`);

      // Pastilles : Devis & Factures compte les documents à traiter ; le rouge est réservé aux factures en retard (la démo
      // n'en a pas, mais un devis à relancer : ambre) ; plus rien sur Chantiers (« 5 » vert qui ne demandait rien)
      const pastilles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('aside nav button')].map((b) => {
        const p = b.querySelector('span[title]');
        return [(b.querySelector('span.truncate')?.innerText || '').trim(), p ? { n: p.childNodes[0]?.textContent, classe: p.className, titre: p.title } : null];
      })));
      verifier(pastilles['Devis & Factures'] && /bg-alerte-fond/.test(pastilles['Devis & Factures'].classe) && /à traiter/.test(pastilles['Devis & Factures'].titre),
        `pastille ambre « à traiter » sur Devis & Factures, sans facture en retard (${JSON.stringify(pastilles['Devis & Factures'])})`);
      verifier(!pastilles.Chantiers, 'pas de pastille sur Chantiers');

      await cliquer(page, 'Mon compte');
      const menu = await page.evaluate(() => document.querySelector('[role="menu"][aria-label="Mon compte"]')?.innerText || '');
      for (const attendu of ['Paramètres', 'Mon plan', 'Mode sombre', 'Aide', 'Un bug ? Une idée ?', 'Se déconnecter']) verifier(menu.includes(attendu), `« ${attendu} » dans le menu de l’avatar`);
      await cliquer(page, 'Mode sombre');
      verifier(await page.evaluate(() => document.documentElement.dataset.theme) === 'sombre', 'le menu de l’avatar passe l’app en sombre');
      await cliquer(page, 'Mon compte');
      await cliquer(page, 'Aide');
      await attendre(500);
      verifier(/Guide d'utilisation/.test(await texteDialogue(page)), '« Aide » ouvre le guide, dans une fenêtre (role=dialog)');
    },
  },
  {
    // Retour d'Hugo sur « Au Bon Volt » (23 oct. 2026) : une bande de page non assombrie en haut d'un formulaire ouvert.
    // Cause mesurée : le fond position:fixed recevait la marge de son parent .space-y-4 (16 px).
    nom: 'coque : le fond d’une fenêtre de formulaire couvre l’écran depuis le haut, sans « petit jour » (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375 });
      await cliquer(page, 'Créer nouveau');
      await cliquer(page, 'Nouveau chantier');
      await attendre(1000);
      const fonds = await page.evaluate(() => [...document.querySelectorAll('.fixed.inset-0')]
        .filter((el) => getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().height > 100)
        .map((el) => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }; }));
      verifier(fonds.length > 0, 'la fenêtre « Nouveau chantier » a un fond plein écran');
      verifier(fonds.every((f) => f.t === 0 && f.h === 812 && f.w === 375), `le fond couvre exactement l’écran (${JSON.stringify(fonds)})`);
    },
  },
  {
    nom: 'Accueil, premier usage : « Pour envoyer votre premier devis », un seul bouton plein, ni « Mallette bouclée » ni tuiles à 0 (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375, chemin: '/' });
      const t = await page.evaluate(() => document.querySelector('main').innerText);
      verifier(/Pour envoyer votre premier devis/.test(t), 'la carte du premier devis');
      verifier(/Compléter mon profil/.test(t) && /Ajouter mon premier client/.test(t) && /Créer mon premier devis/.test(t), 'profil, premier client, premier devis');
      verifier(/Manque : SIRET/.test(t), 'l’étape du profil dit ce qui manque');
      verifier(!/Mallette bouclée/.test(t), 'pas de « Mallette bouclée » quand rien n’existe');
      verifier(!/À encaisser/.test(t) && !/Encaissé sur 6 mois/.test(t), 'ni tuiles ni graphique à zéro');
      const pleins = await page.evaluate(() => [...document.querySelectorAll('main [data-ui="Bouton"]')]
        .filter((b) => b.getBoundingClientRect().width > 0 && /\bbg-accent\b/.test(b.className)).map((b) => b.innerText.trim()));
      verifier(pleins.length === 1 && pleins[0] === 'Compléter', `un seul bouton plein, celui de l’étape suivante (${JSON.stringify(pleins)})`);
      const etape = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('Ajouter mon premier client'));
        b?.click();
        return !!b;
      });
      verifier(etape, 'l’étape « Ajouter mon premier client » se touche');
      await attendre(1200);
      verifier(await page.evaluate(() => localStorage.getItem('cp_current_page')) === 'clients', '« Ajouter mon premier client » ouvre les clients');
      verifier(/Nouveau client/.test(await page.evaluate(() => document.body.innerText)), 'et le formulaire du client');
    },
  },
  {
    nom: 'Accueil : « Relancer » ouvre la feuille de relance du devis ; « Finaliser » la liste filtrée sur les brouillons ; titre entier (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375 });
      const titreCoupe = await page.evaluate(() => {
        const l = [...document.querySelectorAll('[data-ui="LigneListe"]')].find((x) => x.innerText.includes('Devis sans réponse'));
        const t = l?.querySelector('span.font-semibold');
        return t ? t.scrollWidth > t.clientWidth + 1 : null;
      });
      verifier(titreCoupe === false, 'le titre « Devis sans réponse depuis … » n’est pas coupé');
      await cliquer(page, 'Relancer');
      await attendre(1200);
      const feuille = await texteDialogue(page);
      verifier(/Relancer Marc Lefevre/.test(feuille) && feuille.includes('marc.lefevre@pro.fr'), `« Relancer » ouvre la feuille de relance, destinataire écrit (${feuille.slice(0, 50)}…)`);
      verifier(/Envoyer la relance/.test(feuille), 'rien n’est parti : la feuille attend « Envoyer la relance »');
      await page.keyboard.press('Escape');
      await attendre(500);
      await cliquer(page, 'Accueil');
      await attendre(900);
      await cliquer(page, 'Finaliser');
      await attendre(1200);
      const etat = await page.evaluate(() => document.querySelector('[data-ui="SegmentDefilant"] [aria-pressed="true"]')?.innerText || '');
      verifier(await page.evaluate(() => localStorage.getItem('cp_current_page')) === 'devis', '« Finaliser » ouvre les documents');
      verifier(/^Brouillons/.test(etat.trim()), `filtrés sur les brouillons (puce active : « ${etat.trim()} »)`);
    },
  },
  {
    // Rapport de la Task 4 « ancien code » (24 oct. 2026) : un envoi enregistre aussi le statut et la date d'envoi, et
    // « Document mis à jour » s'affichait par-dessus le message de l'envoi. Un envoi, un message (audit § 2.6).
    nom: 'envoi d’un brouillon par e-mail : un seul message (la fenêtre « Devis envoyé »), pas « Document mis à jour » (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375 });
      await attendre(800);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('DEV-2026-00003'));
        b?.click();
        return !!b;
      });
      verifier(ouvert, 'le brouillon DEV-2026-00003 est dans la liste');
      await attendre(1000);
      await page.evaluate(() => {
        window.__messages = [];
        const lire = () => {
          const t = [...document.querySelectorAll('[role="status"][aria-live="polite"]')].map((e) => (e.innerText || '').trim()).filter(Boolean).join(' | ');
          if (t && window.__messages[window.__messages.length - 1] !== t) window.__messages.push(t);
        };
        new MutationObserver(lire).observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await cliquer(page, 'Envoyer');
      await attendre(2500);
      const messages = await page.evaluate(() => window.__messages || []);
      const fenetre = await texteDialogue(page);
      verifier(/envoyé/i.test(fenetre), `la fenêtre dit que le devis est parti (${fenetre.slice(0, 60)}…)`);
      verifier(!messages.some((m) => /Document mis à jour/.test(m)), `pas de « Document mis à jour » par-dessus (${JSON.stringify(messages)})`);
      verifier(messages.length === 0, `aucune notification en plus de la fenêtre (${JSON.stringify(messages)})`);
    },
  },
  {
    // Relecture du 25 oct. 2026 (M6) : les commandes « filtre » de la recherche ouvrent la liste filtrée (avant : la liste
    // non filtrée, quel que soit le libellé)
    nom: 'recherche : « Devis en attente de réponse » et « Voir les avoirs » ouvrent la liste filtrée (1440 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 1440 });
      const commande = async (libelle) => {
        await page.evaluate(() => [...document.querySelectorAll('header button')].find((b) => (b.innerText || '').trim().startsWith('Rechercher'))?.click());
        await attendre(700);
        const ok = await page.evaluate((l) => {
          const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => (x.innerText || '').includes(l));
          b?.click();
          return !!b;
        }, libelle);
        verifier(ok, `commande « ${libelle} » dans la recherche`);
        await attendre(1200);
      };
      await commande('Devis en attente de réponse');
      verifier(await page.evaluate(() => localStorage.getItem('cp_current_page')) === 'devis', 'la commande ouvre les documents');
      const tuile = await page.evaluate(() => document.querySelector('[data-ui="TuileChiffre"][aria-pressed="true"]')?.innerText || '');
      verifier(/Devis en attente/.test(tuile), `filtrés sur les devis en attente (tuile active : « ${tuile.split('\n')[0]} »)`);
      await commande('Voir les avoirs');
      const filtre = await page.evaluate(() => [...document.querySelectorAll('[data-ui="PucesActives"] button')].map((b) => b.getAttribute('aria-label')));
      verifier(filtre.includes('Retirer le filtre Avoirs'), `filtrés sur les avoirs (${JSON.stringify(filtre)})`);
    },
  },
  {
    // Décision du 25 oct. 2026 (relecture juriste, C. civ. 1119) : les CGU s'acceptent à l'inscription, par une case
    // jamais cochée d'avance, avec l'information RGPD ; l'acceptation part dans les métadonnées du compte.
    nom: 'inscription : impossible sans cocher la case des conditions ; l’acceptation (version) part avec le compte ; information RGPD (375 px)',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier }) {
      const inscriptions = [];
      const { page } = await ouvrir({
        reel: true, largeur: 375, chemin: '/inscription',
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/signup') {
            const corps = JSON.parse(req.postData() || '{}');
            inscriptions.push(corps);
            return json({ id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', role: '', email: corps.email, user_metadata: corps.data || {}, created_at: new Date().toISOString() });
          }
          return json([]);
        },
      });
      await attendre(1500);
      const formulaire = await page.evaluate(() => document.querySelector('form')?.innerText || '');
      verifier(formulaire.includes(`J'ai lu et j'accepte les Conditions générales d'utilisation de Mallettico (version du ${CGU_VERSION_DATE}) et les Conditions générales de vente`), 'la case des conditions, avec la version');
      verifier(/Mallettico \(Hugo Seguin EI\) utilise votre e-mail et votre nom pour créer et sécuriser votre compte/.test(formulaire), 'l’information sur les données');
      const liens = await page.evaluate(() => [...document.querySelectorAll('form a')].map((a) => a.getAttribute('href')));
      verifier(['/cgu', '/cgv', '/confidentialite'].every((h) => liens.includes(h)), `liens vers les CGU, les CGV et la politique (${JSON.stringify(liens)})`);
      verifier(await page.evaluate(() => document.querySelector('#inscription-conditions')?.checked === false), 'la case n’est pas cochée d’avance');
      await saisir(page, 'input[autocomplete="organization"]', 'Élec Parcours');
      await saisir(page, 'input[type="email"]', 'parcours@exemple.fr');
      await saisir(page, 'input[type="password"]', 'motdepasse123');
      await cliquer(page, 'Créer mon compte');
      await attendre(800);
      const refus = await page.evaluate(() => document.querySelector('[role="alert"]')?.innerText || '');
      verifier(/Cochez la case pour accepter les conditions d'utilisation et créer votre compte/.test(refus), `sans la case, le compte n’est pas créé et le message le dit (${refus})`);
      verifier(inscriptions.length === 0, 'rien n’est parti sans la case');
      await page.evaluate(() => document.querySelector('#inscription-conditions')?.click());
      await cliquer(page, 'Créer mon compte');
      await attendre(1500);
      verifier(inscriptions.length === 1, `le compte est demandé une fois la case cochée (${inscriptions.length})`);
      const meta = inscriptions[0]?.data || {};
      verifier(meta.cgu_version === CGU_VERSION && !!meta.cgu_accepted_at, `la version et la date acceptées partent avec le compte (${JSON.stringify(meta)})`);
    },
  },
  {
    // Un compte créé avant la case (ni métadonnées ni fiche) : rien au chargement ; la garde unique de DataContext demande
    // les CGU au premier document — ici le cas du ramoneur, la facture tirée d'une attestation, qui la contournait.
    nom: 'CGU d’un compte ancien : rien au chargement ; demandées au premier document ; annulables ; refus du serveur dit, acceptation enregistrée sur le compte (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
      const AN = new Date().getFullYear();
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000501', nom: 'Exemple', prenom: 'Rose', telephone: '0600000003', email: 'rose@exemple.fr',
        adresse: '7 allée Imaginaire, 24000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      // Fiche d'entreprise SANS acceptation (compte d'avant la case)
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000501', user_id: UID, organization_id: ORG, nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, created_at: '2026-01-01T00:00:00Z' };
      const RAMONAGE = { id: 'd0d0d0d0-0000-4000-8000-000000000501', user_id: UID, organization_id: ORG, numero: `RAM-${AN}-00021`, client_id: CLIENT.id,
        appareil_ref: 'f0f0f0f0-0000-4000-8000-000000000501', realise_le: `${AN}-10-14T09:00:00Z`, intervenant_nom: 'Jean Exemple', client_nom: 'Rose Exemple',
        qualite_client: 'locataire', adresse_intervention: CLIENT.adresse, appareil_type: 'insert', combustible: 'bois', conduit: 'maconne',
        methode: 'mecanique_manuelle', complement_chimique: false, raccordement: 'ramone', vacuite: 'assuree', constats: {}, conseils: { choix: ['usage'] },
        prochain_avant: `${AN + 1}-10-14`, nb_dans_annee: 1, prix_ht: 95, jeton_rappel: 'a0a0a0a0-0000-4000-8000-000000000501',
        emetteur: { nom: 'Ramonage Exemple', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Jean Exemple', siret: '00000000000000' },
        annulee_le: null, annulation_motif: null, rappel_fait_le: null, rappel_canal: null, facture_id: null, created_at: `${AN}-10-14T09:00:00Z` };
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE], ramonages: [RAMONAGE] });
      const acceptations = [];
      let serveurAccepte = false;
      const { page } = await ouvrir({
        reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID),
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') {
            const corps = JSON.parse(req.postData() || '{}');
            acceptations.push(corps);
            if (!serveurAccepte) return { status: 500, body: JSON.stringify({ code: 500, msg: 'Erreur du service' }) };
            return json({ id: UID, aud: 'authenticated', role: 'authenticated', email: 'test@exemple.fr', user_metadata: corps.data || {} });
          }
          return base.reponse(req, u);
        },
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } },
      });
      await attendre(2000);
      const cgu = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((d) => /Conditions générales d'utilisation/.test(d.innerText)));
      const factures = () => base.journal.filter((j) => j.m === 'POST' && j.table === 'devis').length;
      verifier(!(await cgu()), 'aucune fenêtre des CGU au chargement');
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('Exemple'))?.click());
      await attendre(900);
      await page.evaluate((n) => [...document.querySelectorAll('[data-testid="onglet-ramonage"] [data-ui="LigneListe"] > button')].find((b) => b.innerText.includes(n))?.click(), `RAM-${AN}-00021`);
      await attendre(800);
      const faireLaFacture = () => page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => (x.innerText || '').trim() === 'Faire la facture');
        b?.click();
        return !!b;
      });
      verifier(await faireLaFacture(), '« Faire la facture » sur l’attestation');
      await attendre(800);
      verifier(await cgu(), 'les CGU sont demandées avant la facture tirée de l’attestation');
      verifier(factures() === 0, 'la facture attend l’acceptation');
      await cliquer(page, 'Annuler');
      await attendre(800);
      verifier(!(await cgu()) && factures() === 0, 'annulées : pas de facture');

      verifier(await faireLaFacture(), '« Faire la facture », une seconde fois');
      await attendre(800);
      await page.evaluate(() => {
        const corps = [...document.querySelectorAll('[role="dialog"] .overflow-y-auto')].find((x) => /Article 1 - Objet/.test(x.innerText));
        if (corps) corps.scrollTop = corps.scrollHeight;
      });
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] input[type="checkbox"]')].pop()?.click());
      await attendre(300);
      await cliquer(page, 'Accepter et continuer');
      await attendre(1500);
      const refus = await texteDialogue(page);
      verifier(/Acceptation non enregistrée/.test(refus) && !/Vérifiez votre connexion/.test(refus), `le refus du serveur est dit avec sa cause, pas « vérifiez votre connexion » (${(refus.match(/Acceptation non enregistrée[^\n]*/) || [''])[0]})`);
      verifier(factures() === 0, 'et la facture n’est pas créée');
      serveurAccepte = true;
      await cliquer(page, 'Accepter et continuer');
      await attendre(2500);
      const derniere = acceptations[acceptations.length - 1] || {};
      verifier(derniere.data?.cgu_version === CGU_VERSION && !!derniere.data?.cgu_accepted_at, `acceptation enregistrée sur le compte de l’utilisateur (${JSON.stringify(derniere.data)})`);
      verifier(!base.journal.some((j) => j.m === 'PATCH' && j.table === 'entreprise' && j.corps?.cgu_version), 'sans écrire la fiche de l’entreprise (un membre invité peut accepter)');
      verifier(!(await cgu()), 'la fenêtre se ferme');
      verifier(factures() === 1, `et la facture de l’attestation est créée (${factures()})`);
    },
  },
  {
    // Le chemin principal (relecture du 25 oct. 2026, tour 2) : un compte sans acceptation crée un devis dans l'éditeur ;
    // la garde unique de DataContext ouvre la fenêtre avant d'écrire, et le devis est créé une fois les CGU acceptées.
    nom: 'CGU d’un compte sans acceptation : « Créer le devis » ouvre « Avant votre premier document » ; acceptées, le devis est créé (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000502', nom: 'Exemple', prenom: 'Lou', telephone: '0600000004', email: 'lou@exemple.fr',
        adresse: '9 rue Imaginaire, 24000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000502', user_id: UID, organization_id: ORG, nom: 'Élec Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', adresse: '1 rue Imaginaire', code_postal: '24000', ville: 'Exempleville',
        is_active: true, is_default: true, settings_json: { reglages: { nomEntrepreneur: 'Jean Exemple' } }, created_at: '2026-01-01T00:00:00Z' };
      const base = creerBase({ clients: [CLIENT], entreprise: [ENTREPRISE] });
      const acceptations = [];
      const { page } = await ouvrir({
        reel: true, largeur: 375, page: 'clients', session: sessionFactice(UID),
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') {
            const corps = JSON.parse(req.postData() || '{}');
            acceptations.push(corps);
            return json({ id: UID, aud: 'authenticated', role: 'authenticated', email: 'test@exemple.fr', user_metadata: corps.data || {} });
          }
          return base.reponse(req, u);
        },
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } },
      });
      await attendre(1500);
      const devisCrees = () => base.journal.filter((j) => j.m === 'POST' && j.table === 'devis');
      const fenetreCgu = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.innerText).find((t) => /Conditions générales d'utilisation/.test(t)) || null);
      verifier(!(await fenetreCgu()), 'aucune fenêtre des CGU au chargement');
      await page.evaluate(() => [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes('Exemple'))?.click());
      await attendre(900);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Nouveau devis')?.click());
      await attendre(1500);
      // Catalogue vide (compte neuf) : « Ajouter une ligne… (désignation libre) »
      const champ = await page.$('input[placeholder^="Ajouter une ligne"]');
      const editeur = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(!!champ && /Lou Exemple/.test(editeur), 'l’éditeur de devis est ouvert, avec ce client');
      await champ.click(); await champ.type('Pose prise 2P+T', { delay: 15 }); await attendre(400);
      await page.keyboard.press('Enter'); await attendre(600);
      // Au téléphone, le prix visible de la ligne (celui du tableau du bureau est masqué)
      const pu = await page.evaluate(() => {
        const champ = [...document.querySelectorAll('input[aria-label="Prix unitaire HT"], input[placeholder="PU HT"]')].find((x) => x.getBoundingClientRect().width > 0);
        if (!champ) return false;
        champ.focus();
        champ.select();
        return true;
      });
      verifier(pu, 'une ligne à chiffrer');
      await page.keyboard.type('100', { delay: 15 }); await attendre(400);
      const creer = await page.evaluate(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => /Créer le devis/.test(x.innerText || '')); b?.click(); return !!b; });
      verifier(creer, '« Créer le devis »');
      await attendre(1200);
      const fenetre = await fenetreCgu();
      verifier(!!fenetre, 'la fenêtre des CGU s’ouvre avant la création');
      verifier(/Avant votre premier document, lisez et acceptez les conditions d’utilisation de Mallettico\./.test(fenetre || ''), `elle dit pourquoi : « Avant votre premier document » (${(fenetre || '').slice(0, 160)})`);
      verifier(!/Avant d’activer les envois automatiques/.test(fenetre || ''), 'et pas la raison des envois automatiques');
      verifier(devisCrees().length === 0, 'le devis attend l’acceptation');
      // Un seul texte de CGU (avis juriste du 24 oct. 2026, H1) : la fenêtre affiche celui de la page /cgu
      const texteCgu = (p) => p.evaluate(() => (document.querySelector('[data-texte-cgu]')?.innerText || '').replace(/\s+/g, ' ').trim());
      const texteFenetre = await page.evaluate(() => (document.querySelector('[role="dialog"] [data-texte-cgu]')?.innerText || '').replace(/\s+/g, ' ').trim());
      const publique = await ouvrir({ reel: true, largeur: 375, chemin: '/cgu', supabase: () => json([]) });
      await attendre(800);
      const textePage = await texteCgu(publique.page);
      await publique.browser.close();
      verifier(texteFenetre.length > 2000 && texteFenetre === textePage,
        `la fenêtre et la page /cgu affichent le même texte (${texteFenetre.length} et ${textePage.length} caractères)`);
      verifier(texteFenetre.startsWith(`Version du ${CGU_VERSION_DATE}`), `en tête, « Version du ${CGU_VERSION_DATE} »`);
      verifier(texteFenetre.includes('Mallettico peut modifier les présentes CGU pour un motif légitime. Toute modification qui réduit les droits de l\'utilisateur lui est notifiée par e-mail au moins 30 jours avant son entrée en vigueur ; l\'utilisateur qui la refuse peut supprimer son compte avant cette date. Les corrections de forme et les modifications imposées par la loi s\'appliquent dès leur publication.'),
        'article 10 : le texte H2 du juriste, mot pour mot');
      verifier(!/poursuite de l'utilisation/.test(texteFenetre) && !/conservées pendant 30 jours/.test(texteFenetre),
        'ni « la poursuite de l’utilisation vaut acceptation », ni l’ancienne conservation « 30 jours »');
      await page.evaluate(() => {
        const corps = [...document.querySelectorAll('[role="dialog"] .overflow-y-auto')].find((x) => /Article 1 - Objet/.test(x.innerText));
        if (corps) corps.scrollTop = corps.scrollHeight;
      });
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] input[type="checkbox"]')].pop()?.click());
      await attendre(300);
      await cliquer(page, 'Accepter et continuer');
      await attendre(2500);
      const derniere = acceptations[acceptations.length - 1] || {};
      verifier(derniere.data?.cgu_version === CGU_VERSION && !!derniere.data?.cgu_accepted_at, `acceptation enregistrée sur le compte, version ${CGU_VERSION} (${JSON.stringify(derniere.data)})`);
      verifier(!(await fenetreCgu()), 'la fenêtre se ferme');
      const crees = devisCrees();
      const corps = crees.map((j) => (Array.isArray(j.corps) ? j.corps[0] : j.corps)).find(Boolean) || {};
      verifier(crees.length === 1, `le devis est créé, une fois (${crees.length})`);
      verifier(corps.client_id === CLIENT.id && JSON.stringify(corps.lignes || '').includes('Pose prise 2P+T'), `avec son client et sa ligne (${JSON.stringify({ client: corps.client_id, lignes: (corps.lignes || []).length })})`);
    },
  },
  {
    // Activer un envoi automatique (rappels de ramonage, relances) demande aussi les CGU (relecture juriste G3) ; annulée,
    // la fenêtre ne laisse ni écriture ni « Enregistré » (relecture du 25 oct. 2026, tour 2 : le message s'affichait).
    nom: 'CGU : activer les envois automatiques sans acceptation ouvre « Avant d’activer les envois automatiques » ; annulée, rien n’est écrit ni « Enregistré » (375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
      const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const ENTREPRISE = { id: 'e0e0e0e0-0000-4000-8000-000000000503', user_id: UID, organization_id: ORG, nom: 'Ramonage Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', is_active: true, is_default: true,
        settings_json: { reglages: { ramonageActif: true, nomEntrepreneur: 'Jean Exemple' } }, created_at: '2026-01-01T00:00:00Z' };
      const base = creerBase({ entreprise: [ENTREPRISE] });
      const acceptations = [];
      const { page } = await ouvrir({
        reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID),
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') {
            acceptations.push(JSON.parse(req.postData() || '{}'));
            return json({ id: UID, aud: 'authenticated', role: 'authenticated', email: 'test@exemple.fr', user_metadata: {} });
          }
          return base.reponse(req, u);
        },
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } },
      });
      await attendre(1500);
      // Paramètres au téléphone : la liste des rubriques (Task 8, 26 oct. 2026), « Ramonage » sous « Documents »
      await cliquer(page, 'Ramonage');
      await attendre(600);
      verifier(!!(await page.$('#ramonage-envoi-auto')), 'l’interrupteur « Envoyer les rappels automatiquement par e-mail »');
      const ecritures = () => base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').length;
      const avant = ecritures();
      // Au milieu de l'écran : en bas, la barre d'onglets fixe recouvre l'interrupteur et recevrait le clic
      await page.evaluate(() => document.getElementById('ramonage-envoi-auto').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await attendre(300);
      await page.click('#ramonage-envoi-auto');
      await attendre(900);
      const fenetre = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map((d) => d.innerText).find((t) => /Conditions générales d'utilisation/.test(t)) || null);
      verifier(!!fenetre, 'la fenêtre des CGU s’ouvre');
      verifier(/Avant d’activer les envois automatiques, lisez et acceptez les conditions d’utilisation de Mallettico\./.test(fenetre || ''), `elle dit pourquoi : « Avant d’activer les envois automatiques » (${(fenetre || '').slice(0, 160)})`);
      verifier(!/Avant votre premier document/.test(fenetre || ''), 'et pas « Avant votre premier document »');
      await cliquer(page, 'Annuler', { dans: '[role="dialog"]' });
      // Le message « Modifications enregistrées » partait 800 ms après l'enregistrement : on attend au-delà
      await attendre(2000);
      const ecran = await page.evaluate(() => document.body.innerText);
      verifier(!/Enregistré(?![a-z])/i.test(ecran) && !/Modifications enregistrées/.test(ecran), 'aucun « Enregistré » ni « Modifications enregistrées »');
      verifier(/Envois automatiques non activés/.test(ecran), 'l’app dit que les envois automatiques ne sont pas activés');
      verifier(await page.$eval('#ramonage-envoi-auto', (e) => e.getAttribute('aria-checked')) === 'false', 'l’interrupteur reste éteint');
      verifier(ecritures() === avant, `rien n’est écrit sur la fiche de l’entreprise (${ecritures() - avant} écriture)`);
      verifier(acceptations.length === 0, 'aucune acceptation enregistrée');
    },
  },
  {
    // Hygiène (relecture du 25 oct. 2026, tour 2) : la vitrine est servie par l'app ; un visiteur non connecté n'y laisse
    // ni la page, ni le thème, ni le mode confidentiel, ni la base des saisies hors ligne.
    nom: 'vitrine : un visiteur anonyme ne laisse ni page, ni thème, ni mode confidentiel, ni base hors ligne sur son appareil (375 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({
        reel: true, largeur: 375, supabase: () => json([]),
        // Le navigateur de test pose la page au premier chargement : on la retire pour mesurer ce que la vitrine écrit
        avantChargement: () => { try { localStorage.removeItem('cp_current_page'); } catch { /* */ } },
      });
      await attendre(1500);
      const titre = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
      verifier(/rangé dans une mallette/.test(titre), `la vitrine est affichée (${titre})`);
      const traces = await page.evaluate(async () => ({
        cles: ['cp_current_page', 'cp_theme', 'cp_mode_discret'].filter((k) => localStorage.getItem(k) !== null),
        bases: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
      }));
      verifier(traces.cles.length === 0, `ni page, ni thème, ni mode confidentiel enregistrés (${JSON.stringify(traces.cles)})`);
      verifier(!traces.bases.includes('mallettico-offline'), `pas de base des saisies hors ligne (${JSON.stringify(traces.bases)})`);
    },
  },
  {
    // Décision du 25 oct. 2026 (tour 2) : le rouge veut dire « en retard » — une facture, ou une tâche ; une tâche du jour
    // reste neutre
    nom: 'pastilles : une tâche en retard met « Tâches & Planning » en rouge ; une tâche du jour, non (1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const { creerBase, UID } = require('../lib/fauxSupabase.cjs');
      const jour = (decalage) => {
        const d = new Date(Date.now() + decalage * 864e5);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const tache = (id, echeance) => ({ id, text: `Tâche ${id}`, due_date: echeance, is_done: false, status: 'a_faire', position: 0, subtasks: '[]', created_at: '2026-10-01T08:00:00Z' });
      const lire = async (memos) => {
        const { page, browser } = await ouvrir({ reel: true, largeur: 1440, page: 'dashboard', session: sessionFactice(UID), supabase: creerBase({ memos }).reponse });
        await attendre(1500);
        const p = await page.evaluate(() => {
          const b = [...document.querySelectorAll('aside nav button')].find((x) => (x.querySelector('span.truncate')?.innerText || '').trim() === 'Tâches & Planning');
          const s = b?.querySelector('span[title]');
          return s ? { classe: s.className, titre: s.title } : null;
        });
        await browser.close();
        return p;
      };
      const enRetard = await lire([tache('a1a1a1a1-0000-4000-8000-000000000601', jour(-2))]);
      verifier(!!enRetard && /bg-danger-fond/.test(enRetard.classe) && /en retard/.test(enRetard.titre), `une tâche en retard : pastille rouge (${JSON.stringify(enRetard)})`);
      const duJour = await lire([tache('a1a1a1a1-0000-4000-8000-000000000602', jour(0))]);
      verifier(!duJour || /bg-neutre-fond/.test(duJour.classe), `une tâche du jour : pas de rouge (${JSON.stringify(duJour)})`);
    },
  },
  {
    // Relecture du 25 oct. 2026, tour 3 : la vue « Tableau » marquait « J+N » sur des factures payées (statut « envoyé »
    // et 7 jours, sans autre règle). Elle suit maintenant devisARelancer (src/lib/ventes.js), comme la liste et l'Accueil.
    nom: 'documents, vue « Tableau » au bureau : « J+N » sur un devis à relancer, jamais sur une facture (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 1440 });
      // La vue se choisit dans le volet « Trier et afficher »
      await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^Trier/.test((x.innerText || '').trim()) && x.getBoundingClientRect().width > 0)?.click());
      await attendre(500);
      const vue = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'Tableau' && x.getBoundingClientRect().width > 0);
        b?.click();
        return !!b;
      });
      verifier(vue, 'la vue « Tableau »');
      await attendre(800);
      const lignes = await page.evaluate(() => [...document.querySelectorAll('table tbody tr')].map((tr) => {
        const texte = tr.innerText.replace(/\s+/g, ' ');
        return { numero: (texte.match(/\b(DEV|FAC|AV)-\d{4}-\d+/) || [''])[0], relance: /J\+\d+/.test(texte) };
      }));
      verifier(lignes.length > 5, `des lignes dans le tableau (${lignes.length})`);
      const marquees = lignes.filter((l) => l.relance);
      verifier(marquees.length > 0 && marquees.every((l) => l.numero.startsWith('DEV-')),
        `« J+N » seulement sur des devis (${JSON.stringify(marquees.map((l) => l.numero))})`);
    },
  },
  {
    // Relecture juriste du 25 oct. 2026 (H5) : la FAQ ne dit « hors ligne » que ce qui est constaté ici — une saisie faite
    // sans réseau est gardée sur l'appareil et part au retour de la connexion
    nom: 'hors ligne : une saisie sans réseau est gardée sur l’appareil, puis part au retour de la connexion (1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, saisir, attendre, verifier }) {
      const ORGA = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const envois = [];
      let horsLigne = false; // la requête interceptée ne voit pas le mode hors ligne du navigateur : on coupe ici aussi
      const { page } = await ouvrir({
        reel: true, largeur: 1440, page: 'clients', session: sessionFactice(),
        supabase: (req, u) => {
          if (horsLigne) return 'panne';
          if (u.pathname === '/rest/v1/rpc/get_user_org_id') return json(ORGA);
          if (u.pathname === '/rest/v1/clients' && req.method() === 'POST') {
            const corps = JSON.parse(req.postData() || '{}');
            envois.push(corps);
            return json(Array.isArray(corps) ? corps[0] : corps, 201);
          }
          return json([]);
        },
      });
      await attendre(2500);
      await page.evaluate(() => {
        window.__messages = [];
        new MutationObserver(() => {
          const t = document.body.innerText;
          if (/Enregistré sur cet appareil/.test(t) && !window.__messages.includes('attente')) window.__messages.push('attente');
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await cliquer(page, 'Ajouter un client'); // formulaire chargé avec le réseau
      await attendre(800);
      horsLigne = true;
      await page.setOfflineMode(true);
      await attendre(1500);
      await saisir(page, '#client-nom', 'Client hors ligne');
      await cliquer(page, 'Créer');
      await attendre(2000);
      verifier(envois.length === 0, 'rien ne part sans réseau');
      verifier((await page.evaluate(() => window.__messages || [])).includes('attente'), 'l’app dit que la saisie est gardée sur l’appareil');
      horsLigne = false;
      await page.setOfflineMode(false);
      await attendre(6000);
      verifier(envois.some((c) => (Array.isArray(c) ? c[0] : c)?.nom === 'Client hors ligne'), `au retour du réseau, le client part en base (${envois.length} envoi(s))`);
    },
  },
];
