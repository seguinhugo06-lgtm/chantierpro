/**
 * theme — racine du thème de l'app (refonte du 9 oct. 2026).
 *
 * `App.jsx` pose sur <html> :
 *   - data-theme="clair|sombre" (d'après isDark) → palette neutre de src/styles/theme.css ;
 *   - les variables d'accent tirées de la couleur de l'entreprise, chacune garantie lisible :
 *       --accent        la couleur choisie, assombrie s'il le faut pour porter du texte blanc (≥ 5:1), et en
 *                       sombre éclaircie s'il le faut pour se voir sur le fond (≥ 3:1) : boutons pleins,
 *                       onglet actif, barres, teintes ;
 *       --sur-accent    le texte posé sur --accent : toujours blanc ;
 *       --accent-texte  la couleur comme texte sur la surface du thème (≥ 4,5:1).
 *   Charte « Glacier vif » (choix d'Hugo, 19 oct. 2026), tirée du logo : sans couleur d'entreprise, ou avec
 *   l'ancien orange par défaut (#f97316, jamais choisi en connaissance de cause), l'accent est le bleu nuit
 *   du logo (#12336F). La tuile vedette (dégradé glacier, src/styles/theme.css) est fixe.
 * Les primitives de ui/ lisent ces variables (classes bg-accent-fort, text-accent-texte…) :
 * plus besoin de passer isDark ni couleur, et toujours aucune classe `dark:`.
 * Les valeurs sont des triplets « r g b » pour que Tailwind gère l'opacité (bg-accent/10).
 */

const ANCIEN_DEFAUT = '#f97316'; // orange par défaut jusqu'au 19 oct. 2026, enregistré sur les fiches jamais personnalisées
const NUIT = [18, 51, 111]; // #12336F, bleu nuit du logo : l'accent par défaut
const SURFACE_CLAIRE = [255, 255, 255];
const SURFACE_SOMBRE = [20, 33, 58]; // #14213A, la surface des cartes en sombre
const FOND_SOMBRE = [11, 19, 36]; // #0B1324, le fond de page en sombre
const BLANC = [255, 255, 255];

function versRgb(hex) {
  const h = String(hex || '').trim().replace('#', '');
  const plein = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(plein)) return null;
  return [0, 2, 4].map((i) => parseInt(plein.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Rapport de contraste WCAG entre deux couleurs [r, g, b]. */
export function contraste(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function versTsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return [h / 6, s, l];
}

function depuisTsl([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/**
 * Fait varier la luminosité (teinte et saturation conservées) jusqu'à atteindre `cible`
 * contre `fond`. sens = -1 assombrit, +1 éclaircit.
 */
function ajuster(rgb, fond, sens, cible = 4.5) {
  if (contraste(rgb, fond) >= cible) return rgb;
  const [h, s, l0] = versTsl(rgb);
  for (let l = l0; l >= 0 && l <= 1; l += sens * 0.01) {
    const essai = depuisTsl([h, s, l]);
    if (contraste(essai, fond) >= cible) return essai;
  }
  return sens < 0 ? [0, 0, 0] : [255, 255, 255];
}

const triplet = (rgb) => rgb.join(' ');
const versHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

// La couleur de l'entreprise ; sans couleur lisible, ou avec l'ancien orange par défaut, le bleu nuit du logo
function couleurDeBase(couleur) {
  const rgb = versRgb(couleur);
  return !rgb || triplet(rgb) === triplet(versRgb(ANCIEN_DEFAUT)) ? NUIT : rgb;
}

// Aplat : la couleur assombrie (teinte gardée) jusqu'à porter du texte blanc ; 5:1 plutôt que 4,5 pour garder de la
// marge au survol (hover:brightness-95, opacity-90). En sombre, éclaircie si elle se perd sur le fond (< 3:1, ex. le
// bleu nuit) tant que le blanc reste lisible dessus.
function plein(brut, sombre) {
  const fonce = ajuster(brut, BLANC, -1, 5);
  if (!sombre || contraste(fonce, FOND_SOMBRE) >= 3) return fonce;
  const [h, s, l0] = versTsl(fonce);
  for (let l = l0; l <= 1; l += 0.01) {
    const essai = depuisTsl([h, s, l]);
    if (contraste(BLANC, essai) < 4.5) break;
    if (contraste(essai, FOND_SOMBRE) >= 3) return essai;
  }
  return fonce;
}

/**
 * Couleur d'un aplat qui porte du texte blanc, pour le code qui pose encore la couleur de l'entreprise en style
 * (`style={{ background }}`). Les documents imprimés et les e-mails gardent la couleur brute de l'entreprise.
 * @param {string} couleur hex ; absente, illisible ou ancien orange par défaut : le bleu nuit
 * @param {boolean} [sombre]
 * @returns {string} hex #rrggbb
 */
export function couleurPleine(couleur, sombre = false) {
  return versHex(plein(couleurDeBase(couleur), sombre));
}

/**
 * Variables CSS de l'accent pour une couleur d'entreprise et un thème.
 * @param {string} couleur hex (#rrggbb ou #rgb) ; absente, illisible ou ancien orange par défaut : le bleu nuit.
 * @param {boolean} sombre
 * @returns {Record<string, string>}
 */
export function variablesAccent(couleur, sombre = false) {
  const brut = couleurDeBase(couleur);
  const texte = sombre ? ajuster(brut, SURFACE_SOMBRE, +1) : ajuster(brut, SURFACE_CLAIRE, -1);
  return {
    '--accent': triplet(plein(brut, sombre)),
    '--sur-accent': triplet(BLANC),
    '--accent-texte': triplet(texte),
  };
}

/** Pose data-theme et les variables d'accent sur un élément racine (document.documentElement). */
export function appliquerTheme(racine, { sombre = false, couleur } = {}) {
  if (!racine) return;
  racine.dataset.theme = sombre ? 'sombre' : 'clair';
  racine.style.colorScheme = sombre ? 'dark' : 'light';
  for (const [nom, valeur] of Object.entries(variablesAccent(couleur, sombre))) {
    racine.style.setProperty(nom, valeur);
  }
}
