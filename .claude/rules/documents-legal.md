---
paths:
  - "src/lib/devisHtmlBuilder.js"
  - "src/components/DevisPage.jsx"
  - "src/components/DevisComposer.jsx"
  - "src/components/DevisWizard.jsx"
  - "src/lib/mentionTvaReduite.js"
  - "src/lib/facturx*.js"
  - "src/lib/templates/**"
  - "src/components/LegalPages.jsx"
---

# Devis, factures et textes légaux

- **Deux générateurs de PDF** : `src/lib/devisHtmlBuilder.js` (page de signature, envoi) ET le générateur inline de `DevisPage.jsx` (aperçu et impression que l'artisan voit). Toute évolution du rendu touche LES DEUX ; un bloc commun va dans `src/lib/` (modèle : `mentionTvaReduite.js`, testé dans `src/lib/__tests__/`).
- Un texte réglementaire est copié **mot pour mot** depuis sa source officielle (BOFiP, Légifrance), source citée en commentaire. Référence : `docs/metier-btp.md`. En cas de doute : agent `juriste-btp`.
- Mentions déjà produites : identité et SIRET, EI, assurances (décennale, RC pro), TVA non applicable 293 B (micro), certification TVA réduite 10 % / 5,5 %, garanties, rétractation (devis), pénalités et indemnité de 40 €, médiateur si renseigné. Ne pas en retirer sans décision.
- Une facture émise ne se modifie ni ne se supprime : avoir. Numérotation continue (RPC atomique côté base).
- `LegalPages.jsx` : identité de l'éditeur dans `COMPANY` — un champ inconnu reste `null` (non affiché) ou « en cours », **jamais** une valeur fictive. Hébergement vérifié : AWS eu-west-3 (Paris).
- Vérifier : test unitaire du bloc + parcours `documents` (aperçu réel) + `juriste-btp` si le texte change.
