// Rappel des sept jours après la facture tirée d'une attestation (ramonage ou entretien) : outils communs des parcours.
// Le texte est celui de juriste-btp (avis du lot 4 du 5 nov. 2026, point 11), copié mot pour mot ; un test
// (src/lib/__tests__/factureDAttestation.test.js) le compare à src/lib/factureDAttestation.js.
const SEPT_JOURS = 'Client particulier : si le contrat a été conclu chez lui (devis signé ou accord donné sur place), vous ne pouvez recevoir aucun paiement ni aucune contrepartie avant sept jours à compter de sa conclusion (code de la consommation, article L. 221-10), sauf travaux d’entretien ou de réparation urgents qu’il a expressément demandés, dans la limite des pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence. La facture peut être émise, mais n’en demandez pas le paiement avant cette date.';

/** Espaces et retours à la ligne ramenés à une espace : le texte d'une notification se compare sans la mise en page. */
const normaliser = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// Note chaque message affiché à partir de l'appel, même s'il en remplace un autre (une notification en remplace une autre)
const noterMessages = (page) => page.evaluate(() => {
  window.__messages = [];
  const lire = () => {
    const t = [...document.querySelectorAll('[role="status"][aria-live="polite"]')].map((e) => (e.innerText || '').trim()).filter(Boolean).join(' | ');
    if (t && window.__messages[window.__messages.length - 1] !== t) window.__messages.push(t);
  };
  new MutationObserver(lire).observe(document.body, { childList: true, subtree: true, characterData: true });
});
const messagesNotes = (page) => page.evaluate(() => window.__messages || []);

module.exports = { SEPT_JOURS, normaliser, noterMessages, messagesNotes };
