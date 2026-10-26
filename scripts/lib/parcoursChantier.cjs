// Gestes communs aux parcours des chantiers, des tâches et du planning (ouvrir une fiche, un onglet, écouter les messages).
// Les fichiers de scripts/parcours/ exportent une liste de parcours : ces aides vivent donc ici.

/** Ouvre la fiche d'un chantier de la liste (carte « Ouvrir le chantier <nom> »). */
async function ouvrirFiche(page, attendre, nom) {
  await page.evaluate((n) => {
    const b = document.querySelector(`button[aria-label^="Ouvrir le chantier ${n}"]`);
    if (!b) throw new Error(`chantier « ${n} » introuvable`);
    b.click();
  }, nom);
  await attendre(1000);
}

/** Passe à un onglet de la fiche. */
async function ongletFiche(page, attendre, nom) {
  const ok = await page.evaluate((n) => {
    const t = [...document.querySelectorAll('[role="tablist"] [role="tab"]')].find((x) => (x.innerText || '').trim().startsWith(n));
    t?.click();
    return !!t;
  }, nom);
  if (!ok) throw new Error(`onglet « ${nom} » introuvable`);
  await attendre(500);
}

/** Noms des onglets de la fiche (sans leur compteur). */
function nomsOnglets(page) {
  return page.evaluate(() => [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((t) => t.innerText.replace(/\s+\d+$/, '').trim()));
}

/** Les notifications qui passent, une par une (une notification en remplace une autre) : window.__messages. */
async function ecouterMessages(page) {
  await page.evaluate(() => {
    window.__messages = [];
    const lire = () => {
      const t = [...document.querySelectorAll('[role="status"][aria-live="polite"]')].map((e) => (e.innerText || '').trim()).filter(Boolean).join(' | ');
      if (t && window.__messages[window.__messages.length - 1] !== t) window.__messages.push(t);
    };
    new MutationObserver(lire).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

/** Clique le premier bouton visible dont le texte est exactement `texte` (hors fenêtre si `dansFenetre` est faux). */
function cliquerBouton(page, texte, { dansFenetre = false } = {}) {
  return page.evaluate((t, fenetre) => {
    const racine = fenetre ? document.querySelector('[role="dialog"]') : document;
    const b = [...(racine?.querySelectorAll('button') || [])].find((x) => x.innerText.replace(/\s+/g, ' ').trim() === t && x.getBoundingClientRect().width > 0);
    b?.click();
    return !!b;
  }, texte, dansFenetre);
}

/** Texte de la zone de contenu de l'app (sans l'en-tête ni le menu), espaces compactés. */
function texteContenu(page) {
  return page.evaluate(() => (document.querySelector('#main-content')?.innerText || '').replace(/\s+/g, ' ').trim());
}

module.exports = { ouvrirFiche, ongletFiche, nomsOnglets, ecouterMessages, cliquerBouton, texteContenu };
