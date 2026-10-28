---
paths:
  - "src/components/**"
  - "src/App.jsx"
  - "src/index.css"
  - "src/hooks/useKeepInViewport.js"
  - "tailwind.config.js"
---

# Interface

- Mobile d'abord : un artisan utilise l'app sur son téléphone, sur un chantier, parfois en plein soleil et avec des gants. Cibles tactiles ≥ 44 px, texte ≥ 12 px, contrastes francs.
- **Socle de la refonte (9 oct. 2026) — tout nouveau code l'utilise** :
  - **Thème** : `App.jsx` pose `data-theme="clair|sombre"` et l'accent sur `<html>` (`src/lib/theme.js`). Les jetons sont dans `src/styles/theme.css`, avec leurs classes Tailwind :
    - fonds et traits : `bg-fond`, `bg-surface`, `bg-surface-2`, `border-bord`, `border-bord-fort` ;
    - textes : `text-encre`, `text-encre-2`, `text-encre-3` ;
    - accent : `bg-accent` + `text-sur-accent`, et `text-accent-texte` pour l'accent écrit en texte ;
    - tons : `bg-{ton}-fond` / `text-{ton}-texte`, avec ton = neutre, info, succes, alerte ou danger ;
    - élévations : `shadow-e1` / `e2` / `e3`.

    Les jetons ne demandent ni `isDark` ni `couleur`.
  - **Composants** (`src/components/ui/`) :
    - `Bouton` / `BoutonIcone` ;
    - `Carte` ;
    - `Pastille` / `PastilleStatut` ;
    - `TuileChiffre` ;
    - `EnTetePage` / `TitreSection` ;
    - `LigneListe` / `GroupeListe` / `Avatar` ;
    - `Onglets` / `Segmente` ;
    - `Champ` ;
    - `EtatVide` ;
    - les filtres (`Filtres.jsx`).

    Ils sont tous visibles sur la page cachée `/styleguide`. Pour les tokens exportés pour Figma : `npm run jetons` (`design/tokens/`).
  - **Statuts** : `src/lib/statuts.js`, un statut = un mot et un ton, partout. L'accent n'est jamais un statut : il signale l'action ou la sélection. **Un seul bouton plein par écran.**
  - **Charte « Glacier vif » (choix d'Hugo, 19 oct. 2026, tirée du logo)** :
    - **accent** : la couleur de l'entreprise ; sans couleur, ou avec l'ancien orange par défaut `#f97316`, le **bleu nuit du logo** `#12336F` ; toujours assombri pour porter du **texte blanc** (≥ 5:1) et, en sombre, éclairci pour se voir sur le fond (≥ 3:1) (`src/lib/theme.js`) ; plus jamais de texte noir sur un aplat ;
    - **tuile vedette** (`TuileChiffre heros`) : dégradé glacier fixe (`bg-degrade-vedette`, `text-vedette-libelle|valeur|contexte`, `border-vedette-bord`) et un point orange du logo ;
    - **orange du logo** `#EE7B20` (`bg-signature`) : décoratif seulement (point, liseré, lueur) — jamais de texte dessus ni en texte sur fond clair (2,8:1) ;
    - neutres légèrement bleutés (`--fond` `#F7FAFD`, `--bord` `#E1EBF3`) ; sombre bleu-noir (`#0B1324`, cartes `#14213A`) ; boutons `Bouton` en **pilule** ;
    - ancien code qui pose la couleur en style : `couleurPleine(couleur, isDark)` pour un aplat ; les documents imprimés et les e-mails gardent la couleur brute de l'entreprise (tâche `charte-suite`).
  - **Texte** : 12 px au moins ; tailles `text-xs`, `sm`, `base`, `lg`, `2xl`, `4xl` ; chiffres en `tabular-nums`. Montants avec `formatMoney` de `src/lib/formatters.js`, arrondis à l'euro dans les tuiles.
  - **Cliquet** : `src/lib/__tests__/plafondsDesign.test.js` empêche de réintroduire du texte sous 12 px, la palette `gray` ou des classes `dark:`.
- **Plus d'ancien code de couleurs dans les écrans (28 oct. 2026)** : le cliquet `src/lib/__tests__/ancienCode.plafond.json` est à 0 (ternaires `isDark` de couleur, couleur d'entreprise en style, teintes `${couleur}15`, classes orange) et `node scripts/migration/fichiers.mjs` le mesure ; tout nouveau code passe par les jetons. Les props `isDark` et `couleur` restent dans les signatures. Exceptions : générateurs de documents et d'e-mails, pages publiques de l'artisan une fois sa couleur connue (avant : attente neutre `text-encre-3`). Jamais de classe `dark:`.
- Tableaux : `th { position: relative }` (`src/index.css`) garde un `span.sr-only` dans son défilement ; l'audit d'interface compte les libellés qui en sortent (`libellesHorsDefilement`).
- Icônes : `lucide-react` uniquement. Textes en français, sans jargon.
- **Élément `position: fixed` enfermé** : un ancêtre avec `transform`, `filter`, `backdrop-filter`, `perspective` ou `will-change` devient son bloc conteneur. Conséquences vécues : modales et fonds « plein écran » limités à la page. Donc :
  - animations d'entrée en `backwards`, jamais `forwards` avec un transform ;
  - un flou d'arrière-plan se pose sur un calque (`absolute inset-0 -z-10`), pas sur le parent des menus ;
  - les modales passent par `src/components/ui/Modal.jsx` (portail vers `document.body`) ou `createPortal`.
- Menus déroulants en `absolute` : `useKeepInViewport(ref, ouvert)` les recale dans l'écran.
- Barres d'onglets : défilement horizontal (`overflow-x-auto scrollbar-hide`), bouton « … » hors du défilement.
- Zones sûres (encoche, barre d'accueil) : `env(safe-area-inset-*)`, déjà posées sur l'en-tête, le menu latéral, le contenu et la barre d'onglets.
- Fichiers et liens externes : `remettreFichier()` / `ouvrirLienExterne()` de `src/lib/natif.js` (voir la règle « natif »).
- Vérifier : `npm run build` puis `node scripts/sonde.cjs <page> 375 --capture=audit-ui/x.png` et `npm run verifier -- --complet` (audit d'interface à 0 défaut sur 375 / 768 / 1024 / 1440).
- Une modale se teste avec des sélecteurs limités à `[role=dialog]` (des boutons homonymes existent derrière).
