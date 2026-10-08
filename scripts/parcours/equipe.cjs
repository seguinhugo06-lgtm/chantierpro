// Équipe et invitations, en mode « réel simulé » : la page /invitation/<jeton> avec les réponses
// de la migration 078 (réponse réduite à ce que la page affiche, acceptation pour le compte
// connecté), et l'écran Équipe quand la base refuse un geste (RLS : 0 ligne, sans erreur HTTP).
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

const JETON = '5d0c8a52-3c1e-4f8e-9a57-0c2f6e1b9d44';
const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Réponse de get_invitation_by_token après 078 : ces quatre champs, rien d'autre.
const INVITATION = { organization_name: 'Élec Durand', role: 'chef_chantier', invited_by_email: 'patron@exemple.fr', expires_at: '2026-10-15T10:00:00Z' };
const texte = (page) => page.evaluate(() => document.body.innerText);

module.exports = [
  {
    nom: 'invitation : la page s’affiche sans compte avec la réponse réduite de 078',
    reel: true,
    async executer({ ouvrir, attendre, verifier, ORIGIN }) {
      const { page } = await ouvrir({
        reel: true, largeur: 390,
        supabase: (req, u) => (u.pathname === '/rest/v1/rpc/get_invitation_by_token' ? json(INVITATION) : json([])),
      });
      await page.goto(`${ORIGIN}/invitation/${JETON}`, { waitUntil: 'networkidle0' });
      await attendre(800);
      const t = await texte(page);
      verifier(t.includes('Vous êtes invité !') && t.includes('patron@exemple.fr') && t.includes('Élec Durand'), 'auteur et entreprise affichés');
      verifier(t.includes('Chef de chantier'), 'rôle affiché en français');
      verifier(t.includes('15/10/2026'), 'date d’expiration affichée');
      verifier(t.includes('Se connecter / Créer un compte') && !t.includes('Accepter l\'invitation'), 'sans compte : se connecter d’abord, pas de bouton Accepter');
    },
  },
  {
    nom: 'invitation : l’invité connecté accepte pour son propre compte',
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
      verifier((await texte(page)).includes('Connecté en tant que invite@exemple.fr'), 'compte connecté reconnu');
      await cliquer(page, 'Accepter l\'invitation');
      await attendre(800);
      const a = acceptations[0];
      verifier(acceptations.length === 1 && a.corps.p_token === JETON, `une acceptation, avec le jeton (${JSON.stringify(a?.corps)})`);
      verifier(!a.corps.p_user_id || a.corps.p_user_id === session.user.id, 'jamais pour un autre compte que le compte connecté');
      verifier(a.jeton === 'Bearer jeton.factice.test', 'appel fait avec le jeton de session (auth.uid() côté base)');
      verifier((await texte(page)).includes('Bienvenue dans l\'équipe !'), 'confirmation affichée');
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
      await cliquer(page, 'Accepter l\'invitation');
      await attendre(800);
      const t = await texte(page);
      verifier(t.includes('Invitation non valide') && t.includes('Invitation introuvable ou expirée') && !t.includes('Bienvenue'), 'message de refus');
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
      // L'onglet « Équipe » des Paramètres, pas la page « Équipe » (salariés) du menu latéral.
      const onglet = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Équipe' && !x.closest('nav, aside'));
        if (b) b.click();
        return !!b;
      });
      verifier(onglet, 'onglet Équipe des Paramètres visible pour le propriétaire');
      await attendre(800);
      verifier((await texte(page)).includes('nouvel@exemple.fr'), 'invitation en attente listée');
      const toasts = () => page.evaluate(() => document.body.innerText);

      await page.select('select', 'chef_chantier');
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
