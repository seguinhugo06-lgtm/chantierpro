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
- Une facture émise ne se modifie ni ne se supprime : avoir (verrou en base, 093 ; son contenu imprimé — lignes, lots, remise, TVA, échéance, conditions, objet, notes, acompte, client, chantier, motif d'avoir — est figé, la valeur envoyée ignorée, 103 ; l'identité de l'émetteur reste relue sur la fiche : tâche `facture-identite-figee`). Numérotation continue : la base attribue le numéro d'une facture ou d'un avoir à l'enregistrement, à la suite de sa série (celle du SIREN de l'entreprise qui émet, 102 ; préfixe FAC ou AV selon la nature ; année), sous verrou, et contrôle l'entreprise qui émet (101), figée une fois la pièce émise (102) ; le numéro calculé par l'app n'est qu'une proposition : toujours reprendre celui de la ligne enregistrée. La base refuse un numéro en double dans l'organisation (098). Un encaissement ne s'efface pas : il se corrige par une écriture négative motivée (098). Une facture n'est « payée » que si ses paiements la soldent : la base refuse le statut sinon (099) ; enregistrer le paiement d'abord, puis le statut. Ni avoir ni encaissement sur un brouillon de facture : il se corrige directement, ou s'émet d'abord ; un avoir cite une facture émise de la même entreprise (100).
- `LegalPages.jsx` : identité de l'éditeur dans `COMPANY` — un champ inconnu reste `null` (non affiché) ou « en cours », **jamais** une valeur fictive. Hébergement vérifié : AWS eu-west-3 (Paris).
- Vérifier : test unitaire du bloc + parcours `documents` (aperçu réel) + `juriste-btp` si le texte change.
