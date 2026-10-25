// Coque et Accueil (Task 5 du plan « ancien code », audit UX du 20 oct. 2026) : navigation au téléphone et au bureau,
// en-tête resserré, pastilles qui ne crient qu'en cas de retard, fond des fenêtres sans « petit jour », Accueil qui
// guide un compte neuf et dont les boutons font ce qu'ils disent, conditions d'utilisation demandées au premier document.
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });
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

      // Pastilles : Devis & Factures compte les documents à traiter, en rouge s'il y a un retard ou une relance due (la démo a
      // un devis sans réponse depuis plus de 7 jours) ; plus rien sur Chantiers (« 5 » vert qui ne demandait rien)
      const pastilles = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('aside nav button')].map((b) => {
        const p = b.querySelector('span[title]');
        return [(b.querySelector('span.truncate')?.innerText || '').trim(), p ? { n: p.childNodes[0]?.textContent, classe: p.className, titre: p.title } : null];
      })));
      verifier(pastilles['Devis & Factures'] && /bg-danger-fond/.test(pastilles['Devis & Factures'].classe) && /à traiter/.test(pastilles['Devis & Factures'].titre),
        `pastille rouge « à traiter » sur Devis & Factures (${JSON.stringify(pastilles['Devis & Factures'])})`);
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
    // Retour d'Hugo sur « Au Bon Volt » (21-23 oct. 2026) : la fenêtre des CGU surgissait au premier réglage enregistré.
    // Elle vient maintenant au premier document ; refusée, l'éditeur ne s'ouvre pas ; une acceptation que la base refuse
    // n'est pas annoncée comme faite ; acceptée, elle est enregistrée (cgu_version) et l'éditeur s'ouvre.
    nom: 'CGU : rien au chargement d’un compte neuf ; demandées au premier document ; annulables ; acceptation enregistrée ou refus dit (1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const ORGA = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
      const ENT = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f';
      const ecritures = [];
      let baseAccepte = false;
      const { page } = await ouvrir({
        reel: true, largeur: 1440, page: 'devis', session: sessionFactice(),
        supabase: (req, u) => {
          if (u.pathname === '/rest/v1/rpc/get_user_org_id') return json(ORGA);
          if (u.pathname === '/rest/v1/entreprise') {
            if (req.method() === 'PATCH') {
              ecritures.push(JSON.parse(req.postData() || '{}'));
              return json(baseAccepte ? [{ id: ENT }] : []); // refus RLS : 0 ligne, aucune erreur
            }
            return json([{ id: ENT, organization_id: ORGA, nom: 'Élec Test', is_active: true, archived_at: null }]);
          }
          return json([]);
        },
      });
      await attendre(2500);
      const cgu = () => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((d) => /Conditions générales d'utilisation/.test(d.innerText)));
      const editeur = () => page.evaluate(() => !!document.querySelector('[role="dialog"][aria-label="Nouveau devis"]'));
      verifier(!(await cgu()), 'aucune fenêtre des CGU au chargement (la fiche entreprise existe, sans acceptation)');

      await cliquer(page, 'Créer mon premier devis');
      await attendre(800);
      verifier(await cgu(), 'les CGU sont demandées au premier document');
      verifier(!(await editeur()), 'l’éditeur attend l’acceptation');
      await cliquer(page, 'Annuler');
      await attendre(600);
      verifier(!(await cgu()) && !(await editeur()), 'annulées : ni fenêtre, ni éditeur');

      await cliquer(page, 'Créer mon premier devis');
      await attendre(800);
      // Lire jusqu'au bout, cocher, accepter : la base refuse d'abord (0 ligne), puis accepte
      await page.evaluate(() => {
        const corps = [...document.querySelectorAll('[role="dialog"] .overflow-y-auto')].find((x) => /1\. Objet/.test(x.innerText));
        if (corps) corps.scrollTop = corps.scrollHeight;
      });
      await attendre(400);
      await page.evaluate(() => document.querySelector('[role="dialog"] input[type="checkbox"]')?.click());
      await attendre(300);
      await cliquer(page, 'Accepter et continuer');
      await attendre(1500);
      const refus = await texteDialogue(page);
      verifier(/Acceptation non enregistrée/.test(refus), 'une acceptation refusée par la base est dite, la fenêtre reste ouverte');
      verifier(!(await editeur()), 'et l’éditeur ne s’ouvre pas');
      baseAccepte = true;
      await cliquer(page, 'Accepter et continuer');
      await attendre(1500);
      const derniere = ecritures[ecritures.length - 1] || {};
      verifier(derniere.cgu_version === '2025-02' && !!derniere.cgu_accepted_at, `acceptation envoyée à la base (${JSON.stringify(derniere)})`);
      verifier(Object.keys(derniere).every((k) => ['cgu_version', 'cgu_accepted_at'].includes(k)), 'ces deux champs seulement');
      verifier(!(await cgu()), 'la fenêtre se ferme');
      verifier(await editeur(), 'et l’éditeur du premier devis s’ouvre');
    },
  },
];
