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
  - **Statuts** : `src/lib/statuts.js`, un statut = un mot et un ton, partout. L'orange (l'accent) n'est jamais un statut : il signale l'action ou la sélection. **Un seul bouton plein par écran.**
  - **Texte** : 12 px au moins ; tailles `text-xs`, `sm`, `base`, `lg`, `2xl`, `4xl` ; chiffres en `tabular-nums`. Montants avec `formatMoney` de `src/lib/formatters.js`, arrondis à l'euro dans les tuiles.
  - **Cliquet** : `src/lib/__tests__/plafondsDesign.test.js` empêche de réintroduire du texte sous 12 px, la palette `gray` ou des classes `dark:`.
- Code existant (en cours de migration) : prop `isDark` + variables (`cardBg`, `inputBg`, `textPrimary`…), **jamais** les classes `dark:` de Tailwind ; accent par la prop `couleur` en `style` inline (`${couleur}15` pour une teinte). En touchant un module, le passer sur les jetons.
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
