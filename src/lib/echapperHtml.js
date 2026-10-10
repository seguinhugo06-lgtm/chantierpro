/**
 * Échappe un texte saisi (nom de client, désignation, numéro…) avant de l'insérer dans du HTML : sans cela,
 * « <img src=x onerror=…> » tapé dans un nom s'exécutait dans l'aperçu, et cassait les e-mails
 * (recette du 9 oct. 2026). Même règle que `echapperHtml` côté fonctions Edge (supabase/functions/_shared).
 */
export function echapperHtml(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default echapperHtml;

/**
 * Couleur insérée dans un `style` : seulement « #rgb », « #rrggbb » ou « #rrggbbaa », sinon la couleur par
 * défaut. Une couleur d'entreprise arbitraire pouvait fermer la balise <style> du document envoyé au client.
 */
export function couleurCss(valeur, defaut = '#f97316') {
  return typeof valeur === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(valeur.trim()) ? valeur.trim() : defaut;
}
