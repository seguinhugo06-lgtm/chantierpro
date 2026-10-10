// Faux Supabase EN MÉMOIRE pour les parcours en mode « réel simulé » : les lignes écrites sont relues
// (un rechargement les retrouve), et un parcours peut faire refuser une écriture précise comme le
// ferait la base (RLS, contrainte). Repris de la recette du 9 oct. 2026 (audit-ui/recette/planning).
const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';
const UID = '11111111-1111-4111-8111-111111111111';
const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });

/**
 * @param {Object} initial  lignes de départ par table ({ clients: [...] })
 * @param {Function} [refuser]  (methode, table, requete) => réponse à renvoyer à la place de l'écriture, ou null
 */
function creerBase(initial = {}, { refuser = null } = {}) {
  const tables = { ...initial };
  const journal = []; // { m, table, q, corps }
  const reponse = (req, u) => {
    const m = req.method();
    const p = u.pathname;
    if (p === '/rest/v1/rpc/get_user_org_id') return json(ORG);
    if (p === '/auth/v1/user') return json({ id: UID, aud: 'authenticated', role: 'authenticated', email: 'test@exemple.fr' });
    if (p === '/rest/v1/organization_members') {
      const un = /pgrst\.object/.test(req.headers().accept || '');
      const membre = { id: 'm-1', user_id: UID, organization_id: ORG, role: 'owner', joined_at: '2026-01-01T00:00:00Z', equipe_member_id: null };
      return un ? json(membre) : json([membre]);
    }
    if (!p.startsWith('/rest/v1/') || p.includes('/rpc/')) return json([]);
    const table = p.split('/')[3];
    const unique = /pgrst\.object/.test(req.headers().accept || '');
    let corps = null;
    try { corps = JSON.parse(req.postData() || 'null'); } catch { corps = null; }
    const q = decodeURIComponent(u.search);
    journal.push({ m, table, q, corps });
    if (m !== 'GET' && refuser) {
      const r = refuser(m, table, { q, corps });
      if (r) return r;
    }
    const rows = tables[table] || (tables[table] = []);
    const idFiltre = (/[?&]id=eq\.([^&]+)/.exec(q) || [])[1];
    if (m === 'GET') {
      const r = idFiltre ? rows.filter((x) => x.id === idFiltre) : rows;
      return unique ? (r[0] ? json(r[0]) : json({ code: 'PGRST116', message: 'no rows' }, 406)) : json(r);
    }
    if (m === 'POST') {
      const lot = Array.isArray(corps) ? corps : [corps];
      const sortie = lot.map((x) => {
        const i = rows.findIndex((y) => y.id === x.id);
        const ligne = { created_at: new Date().toISOString(), ...(i >= 0 ? rows[i] : {}), ...x, organization_id: ORG, user_id: UID };
        if (i >= 0) rows[i] = ligne; else rows.push(ligne);
        return ligne;
      });
      return unique ? json(sortie[0], 201) : json(sortie, 201);
    }
    if (m === 'PATCH') {
      const i = rows.findIndex((y) => y.id === idFiltre);
      if (i < 0) return unique ? json({ code: 'PGRST116', message: 'no rows' }, 406) : json([]);
      rows[i] = { ...rows[i], ...corps };
      return unique ? json(rows[i]) : json([rows[i]]);
    }
    if (m === 'DELETE') {
      const i = rows.findIndex((y) => y.id === idFiltre);
      const supprimees = i >= 0 ? rows.splice(i, 1) : [];
      return json(supprimees);
    }
    return json([]);
  };
  return { tables, journal, reponse };
}

module.exports = { creerBase, ORG, UID, json };
