/**
 * Imprime un document HTML complet depuis une iframe cachée et sans script (`sandbox` sans `allow-scripts`).
 *
 * Avant (relecture `gardien-securite` du 10 oct. 2026) : `window.open('')` puis `document.write(html)` ouvrait
 * une fenêtre à l'origine de l'app ; un texte resté non échappé dans le document (désignation, nom…) pouvait
 * y exécuter un script avec la session de l'utilisateur. Ici, aucun script du document ne s'exécute.
 *
 * @param {string} html document HTML complet
 * @returns {Promise<void>} résolue quand la boîte d'impression a été ouverte
 */
export function imprimerHtml(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    // allow-same-origin : l'app appelle print() sur le cadre ; allow-modals : la boîte d'impression
    iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    let retire = false;
    const retirer = () => { if (!retire) { retire = true; iframe.remove(); } };
    iframe.addEventListener('load', () => {
      try {
        const w = iframe.contentWindow;
        w.addEventListener('afterprint', () => setTimeout(retirer, 500), { once: true });
        w.focus();
        w.print();
        setTimeout(retirer, 60000); // navigateurs sans « afterprint »
        resolve();
      } catch (err) {
        retirer();
        reject(err);
      }
    }, { once: true });
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  });
}

export default imprimerHtml;
