---
paths:
  - "src/components/landing/**"
  - "src/components/onboarding/**"
  - "index.html"
  - "public/**"
---

# Site et textes commerciaux

- **Rien d'invérifiable** : pas d'avis, de témoignages, de statistiques d'usage, de « conforme », de « certifié », de prix barré qui n'ont pas de preuve dans le code ou les données. L'honnêteté est un argument du produit.
- Chiffres vérifiés réutilisables : 1 000+ articles et ouvrages BTP pré-chiffrés, 17 métiers de modèles, base de données hébergée à Paris (Supabase, AWS eu-west-3 — le site est servi par Vercel et les e-mails par Resend : ne pas écrire « données hébergées en France »), plan gratuit sans carte. Tout nouveau chiffre : citer d'où il vient en commentaire.
- Facture électronique : ne jamais écrire que Mallettico est « conforme » ; la conformité passe par une Plateforme Agréée. Ni « archivage 10 ans » (les CGV suppriment les données 30 jours après la résiliation), ni « scellé SHA-256 », ni « EN 16931 » sans fichier validé, ni « conformes RGPD » : dire ce qui existe (export, suppression du compte).
- Prix : ceux de `subscriptionStore.js` (9,90 / 19,90 € HT), y compris dans le JSON-LD de `index.html`.
- IA : aucune mention tant que `FONCTIONS.ia` est faux (`src/lib/fonctions.js`).
- Pièges : dans les fichiers landing, le français est souvent échappé (`é`) dans les CHAÎNES JS ; dans le TEXTE JSX, utiliser de vrais caractères. Le site marketing n'apparaît qu'hors démo (`!isDemo`) : le build de `npm run verifier` (sans `.env`) l'élimine à la compilation. Pour vérifier qu'un texte a disparu ou est présent dans le site public, chercher dans `audit-ui/dist-reel/` (build « réel simulé » des parcours), jamais dans `dist/`.
- Relecture : agent `juriste-btp` pour tout texte qui promet quelque chose.
