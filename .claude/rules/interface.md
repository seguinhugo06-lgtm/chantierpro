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
- Mode sombre : prop `isDark` + variables (`cardBg`, `inputBg`, `textPrimary`…), **jamais** les classes `dark:` de Tailwind. Couleur d'accent : prop `couleur` en `style` inline (`${couleur}15` pour une teinte).
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
