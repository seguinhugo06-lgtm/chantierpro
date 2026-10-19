# Fin de l'ancien code de thème et de couleurs — conception

19 oct. 2026. Demande d'Hugo : « règle tous les soucis d'ancien code, tout doit être nouveau code, et les couleurs doivent être appliquées partout ». Hugo a demandé d'avancer sans autre question ; les choix marqués **(choix de Claude)** sont à relire.

## Constat (mesuré le 19 oct., `audit-ui/atteignables.json`)

La refonte du 9 oct. a créé un thème par jetons (`src/styles/theme.css`, `src/components/ui/`) et la charte « Glacier vif » du 19 oct. passe par ces jetons. Mais l'ancien code pose encore ses couleurs à la main :
- `isDark ? '<classes sombres>' : '<classes claires>'` (≈ 1 800 ternaires, dont les variables `cardBg`, `textPrimary`, `textMuted`, `inputBg`, `borderColor`…) ;
- la couleur brute de l'entreprise en style (`style={{ background: couleur }}`, `color: couleur`, teintes `${couleur}15`) : ≈ 1 000 ;
- l'orange en dur (`bg-orange-500`, `text-orange-600`, `#f97316`…) : ≈ 700.

Conséquences visibles : boutons orange vif à texte blanc (2,8:1) à côté des boutons bleu nuit, gris de l'ancien sombre (slate) au lieu du bleu-noir de la charte, contrastes non garantis.

343 fichiers sur 463 sont atteignables depuis `src/main.jsx` ; ils portent ≈ 4 600 occurrences. 51 fichiers jamais importés en portent ≈ 900 (code mort : **non migré**, listé pour Hugo ; règle du projet : on ne supprime pas du code mort sans décision).

## Objectifs

- Tout écran affiché n'utilise que les jetons : `bg-fond|surface|surface-2`, `border-bord|bord-fort`, `text-encre|encre-2|encre-3`, `bg-accent text-sur-accent`, `text-accent-texte`, `bg-accent/NN`, tons (`bg-{ton}-fond text-{ton}-texte`), primitives `src/components/ui/`.
- Le mode sombre et la couleur de l'entreprise s'appliquent partout d'eux-mêmes ; contrastes garantis par les jetons.
- Un test empêche le retour de l'ancien code dans les fichiers atteignables.

## Non-objectifs

- Aucun changement de fonctionnement ni de texte ; pas de refonte de mise en page (seulement les couleurs, fonds, traits, encres).
- Le code mort (jamais importé) n'est pas migré.
- Retirer la prop `isDark` / `couleur` des signatures des composants : non (elle peut rester acceptée et inutilisée) — cela toucherait tous les appelants sans bénéfice visible. **(choix de Claude)**

## Anti-objectifs

- Changer la couleur d'un **document imprimé ou d'un e-mail** : ils gardent la couleur brute de l'entreprise (générateurs HTML : `src/lib/*Builder*.js`, `src/lib/emailSender.js`, `src/lib/relanceUtils.js`, le générateur intégré de `DevisPage.jsx` — chaînes HTML —, `rapportChantierPdf.js`, `reportPdfBuilder.js`, `miseEnDemeureBuilder.js`).
- Toucher au site public (`src/components/landing/`) : il est refait par le plan `2026-10-19-site-refonte`.
- Casser un parcours ou faire monter l'audit d'interface au-dessus de 0 défaut.

## Correspondances (choix de Claude, d'après les valeurs claires)

| Ancien (côté clair) | Jeton |
|---|---|
| `bg-white` | `bg-surface` |
| `bg-slate-50`, `bg-gray-50` | `bg-fond` |
| `bg-slate-100`, `bg-gray-100` | `bg-surface-2` |
| `border-slate-100|200`, `border-gray-200` | `border-bord` |
| `border-slate-300`, `border-gray-300` | `border-bord-fort` |
| `text-slate-900|800`, `text-gray-900`, `text-[#1a1a1a]` | `text-encre` |
| `text-slate-700|600`, `text-gray-700|600` | `text-encre-2` |
| `text-slate-500|400`, `text-gray-500|400` | `text-encre-3` |
| `hover:bg-slate-50|100`, `hover:bg-gray-50|100` | `hover:bg-surface-2` |
| `placeholder-slate-400` | `placeholder:text-encre-3` |
| `bg-orange-500|600`, `bg-[#f97316]` | `bg-accent` (+ `text-sur-accent` si le texte était blanc) |
| `text-orange-500|600|700` | `text-accent-texte` |
| `bg-orange-50|100` | `bg-accent/10` |
| `border-orange-200|300` | `border-accent/30` |
| `ring-orange-500`, `focus:ring-orange-500` | `ring-accent`, `focus:ring-accent` |
| `style={{ background: couleur }}` | `bg-accent` (+ `text-sur-accent`) |
| `style={{ color: couleur }}` | `text-accent-texte` |
| `${couleur}NN` en fond | `bg-accent/{NN en %}` |

Une classe sans correspondance (couleur de sens : vert, rouge, ambre, bleu…) reste telle quelle, ou passe à un ton (`succes`, `danger`, `alerte`, `info`) si elle signale un statut.

## Vérification

Par lot : lint 0 erreur, tests, build, captures clair et sombre à 375 et 1440 px des écrans touchés (`node scripts/sonde.cjs`), audit d'interface. À la fin : `npm run verifier -- --complet`, test de non-retour à 0 sur les fichiers atteignables (hors exceptions listées), captures avant/après pour Hugo.
