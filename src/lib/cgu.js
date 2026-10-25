/**
 * Version des conditions générales d'utilisation (CGU), une seule source pour l'app (case de l'inscription, fenêtre
 * d'acceptation, garde) et pour les parcours qui la vérifient.
 *
 * À relever quand le texte accepté change : l'acceptation est redemandée à chaque compte au document suivant (ou à
 * l'activation des envois automatiques). 25 oct. 2026 : un seul texte, celui de la page /cgu, affiché aussi par la
 * fenêtre d'acceptation (src/components/legal/TexteCgu.jsx, avis juriste du 24 oct., H1) ; article 2 (acceptation par
 * la case de l'inscription, 2e paragraphe retiré) et article 10 (texte H2) réécrits. Une hausse de prix ou une baisse de
 * droits demande en plus l'e-mail de préavis de 30 jours (procédure R3 de l'avis du 24 oct. 2026, tâche
 * « cgv-acceptation »).
 */
export const CGU_VERSION = '2026-10-25';

/** La date de cette version, telle que l'affichent la case de l'inscription et la fenêtre (« version du … »). */
export const CGU_VERSION_DATE = '25 octobre 2026';
