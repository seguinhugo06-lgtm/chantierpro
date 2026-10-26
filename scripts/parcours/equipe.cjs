// Équipe et invitations, en mode « réel simulé » : la page /invitation/<jeton> avec les réponses
// de la migration 078 (réponse réduite à ce que la page affiche, acceptation pour le compte
// connecté), et l'écran Équipe quand la base refuse un geste (RLS : 0 ligne, sans erreur HTTP).
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });
const { CGU_VERSION } = require('../lib/cgu.cjs');

const JETON = '5d0c8a52-3c1e-4f8e-9a57-0c2f6e1b9d44';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Réponse de get_invitation_by_token après 078 : ces quatre champs, rien d'autre. Échéance dans 7 jours (comme
// une vraie invitation) : une date figée finit par passer, et l'app oublie alors l'invitation expirée (échec du
// 17 oct. 2026, date du 15 oct. écrite en dur).
// À midi UTC : même jour affiché à Paris et sur la CI (navigateur en UTC).
const ECHEANCE = new Date(`${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}T12:00:00Z`);
const INVITATION = { organization_name: 'Élec Durand', role: 'chef_chantier', invited_by_email: 'patron@exemple.fr', expires_at: ECHEANCE.toISOString() };
const ECHEANCE_LUE = ECHEANCE.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
const texte = (page) => page.evaluate(() => document.body.innerText);

module.exports = [
  {
    // Recette du 11 oct. 2026 (iPhone) : « Se connecter / Créer un compte » menait à la vitrine, sans
    // retour à l'invitation.
    nom: 'invitation sans compte : créer son compte depuis l’invitation, le lien de confirmation y ramène',
    reel: true,
    async executer({ ouvrir, cliquer, saisir, attendre, verifier, ORIGIN }) {
      const inscriptions = [];
      const { page } = await ouvrir({
        reel: true, largeur: 390,
        supabase: (req, u) => {
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json(INVITATION);
          if (u.pathname === '/auth/v1/signup') {
            inscriptions.push({ recherche: decodeURIComponent(u.search), corps: JSON.parse(req.postData() || '{}') });
            return json({ id: '77777777-7777-4777-8777-777777777777', aud: 'authenticated', email: 'invitee@exemple.fr', user_metadata: {}, app_metadata: {}, identities: [{}], created_at: new Date().toISOString() });
          }
          return json([]);
        },
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      let t = await texte(page);
      verifier(t.includes('Rejoindre Élec Durand') && t.includes('Invitation de patron@exemple.fr'), 'équipe et auteur affichés');
      verifier(t.includes('Chef de chantier'), 'rôle affiché en français');
      verifier(t.includes(ECHEANCE_LUE), `date de fin de validité affichée (${ECHEANCE_LUE})`);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()));
      verifier(boutons.includes('Créer mon compte') && boutons.includes('J’ai déjà un compte') && !boutons.includes('Rejoindre l’équipe'), `sans compte : créer son compte ou se connecter, pas de bouton Rejoindre (${boutons.join(' | ')})`);

      await cliquer(page, 'Créer mon compte');
      await attendre(1500);
      verifier(new URL(page.url()).pathname === '/inscription', `formulaire d’inscription, pas la vitrine (${page.url()})`);
      t = await texte(page);
      verifier(t.includes('Invitation de Élec Durand') && t.includes('Pour rejoindre Élec Durand'), 'l’écran d’inscription annonce l’invitation');
      const champNom = await page.evaluate(() => !!document.querySelector('input[placeholder="Votre prénom et nom"]'));
      verifier(champNom, 'l’invité donne son nom, pas celui d’une entreprise');

      await saisir(page, 'input[placeholder="Votre prénom et nom"]', 'Léa Martin');
      await saisir(page, 'input[type="email"]', 'invitee@exemple.fr');
      await saisir(page, 'input[type="password"]', 'motdepasse123');
      // Un invité accepte aussi les CGU à l'inscription (décision du 25 oct. 2026) : la case est là, non cochée
      verifier(await page.evaluate(() => document.querySelector('#inscription-conditions')?.checked === false), 'la case des conditions, non cochée');
      await page.evaluate(() => document.querySelector('#inscription-conditions').click());
      await page.evaluate(() => document.querySelector('input[type="password"]').form.requestSubmit());
      await attendre(1500);
      const ins = inscriptions[0];
      verifier(inscriptions.length === 1 && ins.corps.email === 'invitee@exemple.fr', 'compte demandé à Supabase');
      verifier(ins.corps.data?.cgu_version === CGU_VERSION, `l’acceptation des CGU part avec le compte de l’invité (${JSON.stringify(ins.corps.data)})`);
      verifier(ins.recherche.includes(`redirect_to=http://localhost:4999/invitation/${JETON}`), `le lien de confirmation ramène à l’invitation (${ins.recherche})`);
      const info = await page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((e) => e.innerText).join(' '));
      verifier(info.includes('il vous ramène à l\'invitation pour rejoindre Élec Durand'), `consigne après inscription (${info})`);
    },
  },
  {
    nom: 'invitation : l’invité connecté rejoint l’équipe pour son propre compte, l’app ouvrira cette équipe',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice, ORIGIN }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'invite@exemple.fr');
      const acceptations = [];
      const { page } = await ouvrir({
        reel: true, largeur: 390, session,
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json(INVITATION);
          if (u.pathname === '/rest/v1/rpc/accept_invitation') {
            acceptations.push({ corps: JSON.parse(req.postData() || '{}'), jeton: req.headers().authorization || '' });
            return json({ success: true, organization_id: ORG, role: 'chef_chantier' });
          }
          return json([]);
        },
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      // Invitation gardée pendant l'inscription, sur cet appareil
      await page.evaluate((j) => localStorage.setItem('cp_pending_invitation', JSON.stringify({ token: j, fin: Date.now() + 86400000 })), JETON);
      let t = await texte(page);
      verifier(t.includes('Connecté avec invite@exemple.fr'), 'compte connecté reconnu');
      verifier(t.includes('Changer de compte'), 'on peut changer de compte (téléphone partagé)');
      await cliquer(page, 'Rejoindre l’équipe');
      await attendre(800);
      const a = acceptations[0];
      verifier(acceptations.length === 1 && a.corps.p_token === JETON, `une acceptation, avec le jeton (${JSON.stringify(a?.corps)})`);
      verifier(!a.corps.p_user_id || a.corps.p_user_id === session.user.id, 'jamais pour un autre compte que le compte connecté');
      verifier(a.jeton === 'Bearer jeton.factice.test', 'appel fait avec le jeton de session (auth.uid() côté base)');
      t = await texte(page);
      verifier(t.includes('Vous faites partie de l’équipe') && t.includes('Ouvrir Élec Durand'), 'confirmation affichée');
      const stockage = await page.evaluate(() => ({
        org: localStorage.getItem('cp_organisation_active_66666666-6666-4666-8666-666666666666'),
        attente: localStorage.getItem('cp_pending_invitation'),
      }));
      verifier(stockage.org === ORG, `l’app ouvrira l’équipe rejointe (${stockage.org})`);
      verifier(stockage.attente === null, 'invitation en attente oubliée');
    },
  },
  {
    // Relecture gardien-securite : « Changer de compte » déconnectait le compte partout (portée globale)
    // et laissait sur l'appareil la copie de sa fiche entreprise.
    nom: 'invitation : « Changer de compte » déconnecte cet appareil seulement et efface les données du compte',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice, ORIGIN }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'patron@exemple.fr');
      const deconnexions = [];
      const { page } = await ouvrir({
        reel: true, largeur: 390, session,
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/auth/v1/logout') { deconnexions.push(u.search); return { status: 204, body: '' }; }
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json(INVITATION);
          return json([]);
        },
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      await page.evaluate((j) => {
        localStorage.setItem('cp_pending_invitation', JSON.stringify({ token: j, fin: Date.now() + 86400000 }));
        localStorage.setItem('cp_entreprise', JSON.stringify({ nom: 'Entreprise du patron', iban: 'FR76 0000' }));
      }, JETON);
      await cliquer(page, 'Ce n’est pas vous ? Changer de compte');
      await attendre(1000);
      verifier(deconnexions.length === 1 && deconnexions[0].includes('scope=local'), `déconnexion de cet appareil seulement (${deconnexions.join(' | ') || 'aucune'})`);
      const reste = await page.evaluate(() => ({
        attente: localStorage.getItem('cp_pending_invitation'),
        fiche: localStorage.getItem('cp_entreprise'),
        session: Object.keys(localStorage).filter((k) => k.startsWith('sb-')),
      }));
      verifier(reste.attente === null && reste.fiche === null, `invitation et fiche effacées (${JSON.stringify(reste)})`);
      verifier(reste.session.length === 0, `session effacée (${reste.session.join(', ')})`);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText.trim()));
      verifier(boutons.includes('Créer mon compte') && boutons.includes('J’ai déjà un compte'), 'l’autre personne peut créer son compte ou se connecter');
    },
  },
  {
    // Relecture gardien-securite : invitation illisible (panne) + « Ouvrir Mallettico » → l'app renvoyait
    // aussitôt sur l'invitation, en boucle.
    nom: 'invitation illisible : « Ouvrir Mallettico » mène à l’app sans y revenir en boucle',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice, ORIGIN }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'invite@exemple.fr');
      const { page } = await ouvrir({
        reel: true, largeur: 390, session,
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json({ message: 'panne' }, 500);
          if (u.pathname === '/rest/v1/rpc/get_user_org_id') return json('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
          return json([]);
        },
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      await page.evaluate((j) => localStorage.setItem('cp_pending_invitation', JSON.stringify({ token: j, fin: Date.now() + 86400000 })), JETON);
      verifier((await texte(page)).includes('Impossible de charger l’invitation'), 'panne dite');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
        cliquer(page, 'Ouvrir Mallettico'),
      ]);
      await attendre(2500);
      verifier(new URL(page.url()).pathname === '/', `reste dans l’app (${page.url()})`);
    },
  },
  {
    nom: 'invitation : un refus de la base est affiché, pas une fausse réussite',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice, ORIGIN }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'invite@exemple.fr');
      const { page } = await ouvrir({
        reel: true, largeur: 390, session,
        supabase: (req, u) => {
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json(INVITATION);
          if (u.pathname === '/rest/v1/rpc/accept_invitation') return json({ error: 'Invitation introuvable ou expirée' });
          return json([]);
        },
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      await cliquer(page, 'Rejoindre l’équipe');
      await attendre(800);
      const t = await texte(page);
      verifier(t.includes('Cette invitation n’est plus valable') && t.includes('Invitation introuvable ou expirée') && !t.includes('Vous faites partie'), 'message de refus');
      verifier(t.includes('Ouvrir Mallettico'), 'une sortie vers l’app');
    },
  },
  {
    // Recette du 11 oct. 2026 : l'inscription créait un espace vide avant l'acceptation, ouvert ensuite
    // à la place de l'équipe ; et l'invitée recevait « configurez votre entreprise ».
    nom: 'invité qui vient de se connecter : renvoyé sur l’invitation, sans espace vide ni e-mail de bienvenue',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'invite@exemple.fr');
      const appels = [];
      const { page } = await ouvrir({
        reel: true, largeur: 390, session,
        avantChargement: () => {
          try { localStorage.setItem('cp_pending_invitation', JSON.stringify({ token: '5d0c8a52-3c1e-4f8e-9a57-0c2f6e1b9d44', organisation: 'Élec Durand', role: 'chef_chantier', fin: Date.now() + 86400000 })); } catch { /* sans stockage */ }
        },
        supabase: (req, u) => {
          appels.push(u.pathname);
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/rpc/get_user_org_id') return json(null);
          if (u.pathname === '/rest/v1/rpc/get_invitation_by_token') return json(INVITATION);
          return json([]);
        },
      });
      await attendre(2500);
      verifier(new URL(page.url()).pathname === `/invitation/${JETON}`, `renvoyé sur l’invitation (${page.url()})`);
      verifier((await texte(page)).includes('Rejoindre Élec Durand'), 'la page de l’invitation s’affiche');
      verifier(!appels.includes('/rest/v1/rpc/create_default_org'), 'aucun espace vide créé pour l’invité');
      verifier(!appels.includes('/functions/v1/send-lifecycle-email'), 'pas d’e-mail « configurez votre entreprise »');
    },
  },
  {
    nom: 'membre d’une équipe : l’app ouvre l’équipe, le dit, et permet de basculer d’organisation',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const session = sessionFactice('66666666-6666-4666-8666-666666666666', 'invite@exemple.fr');
      const uid = session.user.id;
      const PERSO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const NOMS = { [ORG]: 'Élec Durand', [PERSO]: 'Mon espace' };
      const lectures = [];
      const appels = [];
      const ecrituresEntreprise = [];
      const { page } = await ouvrir({
        reel: true, largeur: 1440, session,
        supabase: (req, u) => {
          appels.push(u.pathname);
          const objet = (req.headers().accept || '').includes('vnd.pgrst.object');
          const un = (o) => (objet ? json(o) : json([o]));
          const org = (u.searchParams.get('organization_id') || u.searchParams.get('id') || '').replace(/^eq\./, '');
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/organization_members') {
            // L'invitée : son espace vide (créé à l'inscription, avant l'acceptation), puis l'équipe
            if ((u.searchParams.get('select') || '').includes('joined_at') && u.searchParams.get('user_id')) {
              return json([
                { organization_id: PERSO, role: 'owner', joined_at: '2026-10-11T11:06:16Z' },
                { organization_id: ORG, role: 'ouvrier', joined_at: '2026-10-11T11:06:36Z' },
              ]);
            }
            if (u.searchParams.get('user_id')) return un({ role: org === ORG ? 'ouvrier' : 'owner', equipe_member_id: null });
            return json([]);
          }
          if (u.pathname === '/rest/v1/organizations') {
            if ((u.searchParams.get('id') || '').startsWith('in.')) return json(Object.entries(NOMS).map(([id, name]) => ({ id, name })));
            return un({ name: NOMS[org] || '', slug: 'x' });
          }
          if (u.pathname === '/rest/v1/entreprise') {
            if (req.method() !== 'GET') ecrituresEntreprise.push(`${req.method()} ${org}`);
            return json(org === ORG ? [{ id: 'e0e0e0e0-e0e0-4e0e-8e0e-e0e0e0e0e0e0', organization_id: ORG, user_id: '22222222-2222-4222-8222-222222222222', nom: 'Élec Durand', is_active: true, archived_at: null }] : []);
          }
          if (u.pathname === '/rest/v1/chantiers') lectures.push(`${req.method()} ${org || '(sans organisation)'}`);
          return json([]);
        },
      });
      await attendre(2500);
      verifier(lectures.length > 0 && lectures.every((o) => o === `GET ${ORG}`), `chantiers lus dans l’équipe (${[...new Set(lectures)].join(', ') || 'aucune lecture'})`);
      verifier(!appels.includes('/rest/v1/rpc/create_default_org'), 'pas de nouvelle organisation');
      const t = await texte(page);
      verifier(t.includes('Équipe Élec Durand · Ouvrier'), 'l’accueil dit dans quelle équipe on est et avec quel rôle');
      verifier(t.includes('Équipe · Ouvrier'), 'le haut du menu aussi');

      await cliquer(page, 'Changer d’organisation (Élec Durand, Équipe · Ouvrier)');
      const menu = await texte(page);
      verifier(menu.toLowerCase().includes('mes organisations') && menu.includes('Mon espace') && menu.includes('Votre entreprise'), 'menu des organisations');
      lectures.length = 0;
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {}),
        page.evaluate(() => {
          const b = [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Mon espace'));
          if (b) b.click();
        }),
      ]);
      await attendre(2500);
      const choix = await page.evaluate((id) => localStorage.getItem(`cp_organisation_active_${id}`), uid);
      verifier(choix === PERSO, `choix gardé sur l’appareil (${choix})`);
      verifier(lectures.length > 0 && lectures.every((o) => o === `GET ${PERSO}`), `après bascule, chantiers lus dans l’autre organisation, rien d’autre (${[...new Set(lectures)].join(', ') || 'aucune lecture'})`);
      // La fiche de l'équipe (IBAN, SIRET) n'est pas recopiée dans l'autre organisation
      verifier(ecrituresEntreprise.length === 0, `aucune fiche entreprise écrite (${ecrituresEntreprise.join(', ')})`);
    },
  },
  {
    nom: 'équipe : un geste refusé par la base n’est pas annoncé comme fait',
    reel: true,
    async executer({ ouvrir, cliquer, attendre, verifier, sessionFactice }) {
      const session = sessionFactice();
      const uid = session.user.id;
      const gestes = [];
      const membres = [
        { id: 'm-1', user_id: uid, role: 'owner', joined_at: '2026-01-01T00:00:00Z', equipe_member_id: null },
        { id: 'm-2', user_id: '22222222-2222-4222-8222-222222222222', role: 'ouvrier', joined_at: '2026-02-01T00:00:00Z', equipe_member_id: null },
      ];
      const invitations = [{
        id: 'i-1', organization_id: ORG, email: 'nouvel@exemple.fr', phone: null, role: 'ouvrier', token: JETON, status: 'pending',
        invited_by: uid, created_at: '2026-10-08T08:00:00Z', expires_at: '2026-10-15T08:00:00Z',
      }];
      const { page } = await ouvrir({
        reel: true, largeur: 1440, page: 'settings', session,
        supabase: (req, u) => {
          const un = (o) => ((req.headers().accept || '').includes('vnd.pgrst.object') ? json(o) : json([o]));
          if (u.pathname === '/auth/v1/user') return json(session.user);
          if (u.pathname === '/rest/v1/rpc/get_user_org_id') return json(ORG);
          if (u.pathname === '/rest/v1/organizations') return un({ name: 'Élec Durand', slug: 'elec-durand' });
          if (u.pathname === '/rest/v1/organization_members') {
            if (req.method() !== 'GET') { gestes.push(req.method()); return json([]); } // RLS : 0 ligne, pas d'erreur
            return u.searchParams.get('user_id') ? un({ role: 'owner', equipe_member_id: null }) : json(membres);
          }
          if (u.pathname === '/rest/v1/invitations') return json(invitations);
          if (u.pathname === '/rest/v1/rpc/revoke_invitation') { gestes.push('revoke'); return json({ error: 'Invitation introuvable' }); }
          return json([]);
        },
      });
      // La rubrique « Équipe & accès » des Paramètres (colonne des rubriques au bureau), pas la page « Équipe »
      // (salariés) du menu latéral.
      const onglet = await page.evaluate(() => {
        const b = [...document.querySelectorAll('nav[aria-label="Rubriques des paramètres"] button')].find((x) => x.innerText.trim() === 'Équipe & accès');
        if (b) b.click();
        return !!b;
      });
      verifier(onglet, 'rubrique Équipe & accès des Paramètres visible pour le propriétaire');
      await attendre(800);
      verifier((await texte(page)).includes('nouvel@exemple.fr'), 'invitation en attente listée');
      const toasts = () => page.evaluate(() => document.body.innerText);

      // Le rôle se choisit dans le menu de l'interface (ui/ChampChoix), plus dans une liste native
      await page.evaluate(() => document.getElementById('role-membre-m-2')?.click());
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].find((o) => o.innerText.trim().startsWith('Chef de chantier'))?.click());
      await attendre(800);
      verifier(gestes.includes('PATCH'), 'changement de rôle envoyé');
      let t = await toasts();
      verifier(t.includes('Erreur lors du changement de rôle') && !t.includes('Rôle modifié'), 'rôle refusé : erreur affichée, pas « Rôle modifié »');

      await cliquer(page, 'Annuler l\'invitation');
      await cliquer(page, 'Confirmer', { dans: '[role="dialog"]' });
      await attendre(800);
      t = await toasts();
      verifier(gestes.includes('revoke'), 'annulation demandée');
      verifier(t.includes('Invitation non annulée : Invitation introuvable') && !t.includes('Invitation annulée'), 'annulation refusée : dite, pas « Invitation annulée »');

      await cliquer(page, 'Retirer ce membre');
      await cliquer(page, 'Confirmer', { dans: '[role="dialog"]' });
      await attendre(800);
      verifier(gestes.includes('DELETE') && !(await toasts()).includes('Membre retiré'), 'retrait refusé : pas « Membre retiré »');
    },
  },
];
