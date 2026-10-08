---
paths:
  - "src/components/landing/**"
  - "src/components/onboarding/**"
  - "index.html"
  - "public/**"
---

# Site et textes commerciaux

- **Rien d'invérifiable** : pas d'avis, de témoignages, de statistiques d'usage, de « conforme », de « certifié », de prix barré qui n'ont pas de preuve dans le code ou les données. L'honnêteté est un argument du produit.
- Chiffres vérifiés réutilisables : 1 000+ articles et ouvrages BTP pré-chiffrés, 17 métiers de modèles, données hébergées en France (AWS eu-west-3 Paris), plan gratuit sans carte. Tout nouveau chiffre : citer d'où il vient en commentaire.
- Facture électronique : ne jamais écrire que Mallettico est « conforme 2026 » ; la conformité passe par une Plateforme Agréée.
- Prix : ceux de `subscriptionStore.js` (9,90 / 19,90 € HT), y compris dans le JSON-LD de `index.html`.
- IA : aucune mention tant que `FONCTIONS.ia` est faux (`src/lib/fonctions.js`).
- Pièges : dans les fichiers landing, le français est souvent échappé (`é`) dans les CHAÎNES JS ; dans le TEXTE JSX, utiliser de vrais caractères. Le site marketing n'apparaît qu'hors démo (`!isDemo`).
- Relecture : agent `juriste-btp` pour tout texte qui promet quelque chose.
