/**
 * Texte lisible d'un corps d'e-mail HTML, pour l'aperçu de la feuille « Relancer » (audit UX du 20 oct. 2026) :
 * l'artisan voit ce qui partira, sans balises. Un paragraphe (ou un saut de ligne) par ligne ; les balises de mise en
 * forme dans une phrase (<strong>, <a>…) disparaissent sans laisser d'espace ; les entités d'echapperHtml (et
 * &nbsp;, &#nn;) sont rendues.
 *
 * @param {string} html
 * @returns {string}
 */
export function texteDeHtml(html) {
  if (!html) return '';
  const brut = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|li)>/gi, '\n')
    .replace(/<\/?(strong|b|em|i|span|a)(\s[^>]*)?>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return brut.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

export default texteDeHtml;
