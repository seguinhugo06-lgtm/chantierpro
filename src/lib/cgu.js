/**
 * Version des conditions générales d'utilisation (CGU), une seule source pour l'app (case de l'inscription, fenêtre
 * d'acceptation, garde) et pour les parcours qui la vérifient.
 *
 * À relever quand le texte accepté change : l'acceptation est redemandée à chaque compte au document suivant (ou à
 * l'activation des envois automatiques). 28 oct. 2026 : article 1, 2e paragraphe (« l'utilisation vaut acceptation »)
 * retiré, l'article 2 porte seul la règle d'acceptation (avis juriste du 28 oct.). 25 oct. 2026 : un seul texte, celui
 * de la page /cgu, affiché aussi par la fenêtre d'acceptation (src/components/legal/TexteCgu.jsx, avis juriste du 24
 * oct., H1) ; article 2 (acceptation par la case de l'inscription, 2e paragraphe retiré) et article 10 (texte H2)
 * réécrits. Une hausse de prix ou une baisse de droits demande en plus l'e-mail de préavis de 30 jours (procédure R3 de
 * l'avis du 24 oct. 2026, tâche « cgv-acceptation »).
 */
import { FONCTIONS } from './fonctions';

// 3 nov. 2026 : quand FONCTIONS.ia est allumé, l'article 7 porte une puce sur la dictée vocale et l'article 11 la
// clause de sous-traitance (textes de juriste-btp, docs/cloud/ia-socle.md) : la version change d'elle-même, et
// l'acceptation est redemandée. LE JOUR DE L'ALLUMAGE, remplacer « 2026-11-03 » et « 3 novembre 2026 » par la date
// réelle (avis du juriste : on n'accepte pas en janvier une « version du 3 novembre ») ; un test le rappelle.
export const CGU_VERSION = FONCTIONS.ia ? '2026-11-03' : '2026-10-28';

/** La date de cette version, telle que l'affichent la case de l'inscription et la fenêtre (« version du … »). */
export const CGU_VERSION_DATE = FONCTIONS.ia ? '3 novembre 2026' : '28 octobre 2026';
