// Faux window.claude pour essayer le Pilote hors de claude.ai : base en mémoire, mêmes appels que la vraie.
(function () {
  const docs = new Map(); // chemin -> données
  const ecouteurs = new Set();
  const notifier = () => setTimeout(() => ecouteurs.forEach((f) => f()), 0);
  let n = 0;
  const enfants = (coll) => [...docs.keys()].filter((k) => k.startsWith(coll + '/') && !k.slice(coll.length + 1).includes('/'));
  function refDoc(chemin) {
    return {
      id: chemin.split('/').pop(),
      collection: (nom) => refColl(chemin + '/' + nom),
      async set(d) { docs.set(chemin, JSON.parse(JSON.stringify(d))); notifier(); },
      async update(d) { if (!docs.has(chemin)) throw new Error('not_found'); docs.set(chemin, Object.assign({}, docs.get(chemin), JSON.parse(JSON.stringify(d)))); notifier(); },
      async delete() { docs.delete(chemin); notifier(); },
      onSnapshot(ok) {
        const f = () => ok({ exists: docs.has(chemin), data: () => docs.get(chemin), metadata: {} });
        ecouteurs.add(f); f(); return () => ecouteurs.delete(f);
      },
    };
  }
  function refColl(chemin, tri, lim) {
    const lire = () => {
      let l = enfants(chemin).map((k) => ({ id: k.split('/').pop(), data: () => docs.get(k) }));
      if (tri) l.sort((a, b) => String(a.data()[tri[0]]).localeCompare(String(b.data()[tri[0]])) * (tri[1] === 'desc' ? -1 : 1));
      if (lim) l = l.slice(0, lim);
      return l;
    };
    return {
      doc: (id) => refDoc(chemin + '/' + id),
      orderBy: (c, d) => refColl(chemin, [c, d || 'asc'], lim),
      limit: (k) => refColl(chemin, tri, k),
      async add(d) { const id = 'auto' + (++n); docs.set(chemin + '/' + id, JSON.parse(JSON.stringify(d))); notifier(); return refDoc(chemin + '/' + id); },
      onSnapshot(ok) { const f = () => ok({ docs: lire() }); ecouteurs.add(f); f(); return () => ecouteurs.delete(f); },
    };
  }
  const db = { doc: refDoc, collection: refColl };
  const user = { id: async () => 'u_test', isOwner: () => true };
  window.__fauxDocs = docs;
  window.__semer = (chemin, d) => { docs.set(chemin, d); notifier(); };
  window.claude = { use: async (nom) => (nom === 'db' ? db : nom === 'user' ? user : null) };
})();
