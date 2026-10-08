// Menus et modales : dans l'écran, et couvrant l'écran (pas enfermés par un ancêtre transformé).
const dansEcran = `
  const W = innerWidth, H = innerHeight;
  return [...document.querySelectorAll('.absolute, .fixed, [role="dialog"], [role="menu"]')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 30 && getComputedStyle(el).display !== 'none'; })
    // « à cheval » sur un bord : un panneau entièrement hors écran (menu latéral replié) est voulu.
    .filter((el) => { const r = el.getBoundingClientRect(); return (r.right > W + 1 && r.left < W - 1) || (r.left < -1 && r.right > 1); })
    .map((el) => String(el.className).slice(0, 60));
`;
const fondPleinEcran = `
  const fonds = [...document.querySelectorAll('.fixed.inset-0')].filter((el) => getComputedStyle(el).position === 'fixed');
  return fonds.map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
`;
const evaluer = (page, code) => page.evaluate((c) => (new Function(c))(), code);

module.exports = [
  {
    nom: 'menu « Nouveau » de l’en-tête dans l’écran (768 px)',
    async executer({ ouvrir, cliquer, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 768 });
      await cliquer(page, 'Créer nouveau');
      verifier((await evaluer(page, dansEcran)).length === 0, 'aucun panneau ne sort de l’écran');
      const item = await page.evaluate(() => {
        const menu = document.querySelector('button[aria-label="Créer nouveau"]').parentElement;
        const b = [...menu.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Nouveau devis');
        const r = b?.getBoundingClientRect();
        return r ? { gauche: r.left, droite: r.right } : null;
      });
      verifier(item && item.gauche >= 0 && item.droite <= 768, `« Nouveau devis » du menu visible en entier (${JSON.stringify(item)})`);
    },
  },
  {
    nom: 'menu « Plus d’actions » du catalogue : dans l’écran, fond plein écran (375 px)',
    async executer({ ouvrir, cliquer, verifier }) {
      const { page } = await ouvrir({ page: 'catalogue', largeur: 375 });
      await cliquer(page, "Plus d'actions");
      verifier((await evaluer(page, dansEcran)).length === 0, 'aucun panneau ne sort de l’écran');
      const fonds = await evaluer(page, fondPleinEcran);
      verifier(fonds.length > 0 && fonds.every((f) => f.l === 0 && f.t === 0 && f.w === 375 && f.h === 812),
        `le fond du menu couvre exactement l’écran (${JSON.stringify(fonds)})`);
    },
  },
];
