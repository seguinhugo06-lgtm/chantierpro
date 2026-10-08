# Journal des décisions

Une décision = une entrée datée : ce qui a été décidé, pourquoi, ce que ça implique. On n'efface pas : on ajoute une entrée qui remplace (« Remplace D-… »).
Avant de rouvrir un sujet, lire ici s'il a déjà été tranché. Statut : **décidé** · **proposé** (attend Hugo) · **remplacé**.

| N° | Date | Décision | Pourquoi | Statut |
|---|---|---|---|---|
| D-01 | 08/06/2026 | Produit ultra-simple centré sur devis → facture → relance → encaissement ; couper les modules coûteux ou à risque juridique | Rentable à bas prix, gérable seul, cessible | décidé |
| D-02 | 19/07/2026 | Honnêteté : aucune affirmation invérifiable (avis, statistiques, « conforme »), prix de référence réels uniquement | Valeur du produit ; risque de pratique commerciale trompeuse | décidé |
| D-03 | 30/07/2026 | Facture électronique : intégrer une Plateforme Agréée par API (pas devenir PA) ; rien coder sans leur documentation réelle | Devenir PA est hors de portée ; éviter le code « qui a l'air branché » | décidé |
| D-04 | 30/07/2026 | Migrations appliquées à la main par Hugo dans l'éditeur SQL ; jamais `supabase db push` | Historique des migrations désynchronisé de la production | décidé |
| D-05 | 07/10/2026 | Objectif : app publiée sur l'App Store et Google Play, testée un an par des artisans de l'entourage | — | décidé |
| D-06 | 07/10/2026 | Application native avec **Capacitor** (le site React embarqué + modules natifs) | Réutilise 100 % du code ; Apple refuse un simple site emballé → fonctions natives (partage de fichiers, photos, notifications) | décidé |
| D-07 | 07/10/2026 | IA masquée (`FONCTIONS.ia = false`) jusqu'à : quota serveur, sous-traitant déclaré, saisie clavier corrigée | Pas prête ; coût variable | décidé |
| D-08 | 07/10/2026 | Tarif fondateur 9,90 € / 19,90 € HT par mois, garanti tant que l'abonnement reste actif | Engagement public envers les premiers clients | décidé |
| D-09 | 07/10/2026 | Jamais de frais de carte répercutés au client | Interdit (C. mon. fin. L112-12) | décidé |
| D-10 | 07/10/2026 | Livraison sur `main` sans redemander, **à condition** que `npm run verifier` soit vert sur le commit livré (garde-fou automatique) | Hugo ne doit pas être le goulot ; la rigueur remplace l'accord au cas par cas | décidé |
| D-11 | 07/10/2026 | Chaque session Claude travaille dans un worktree créé depuis `origin/main` | Une session sur un vieux worktree a travaillé sur du code périmé | décidé |
| D-12 | 07/10/2026 | Identifiant de l'app : `fr.mallettico.app` | Définitif une fois publié | **proposé** |
| D-13 | 07/10/2026 | Achats dans les apps : option C (aucun achat dans l'app, abonnement sur le site) recommandée, sinon A (achats intégrés via RevenueCat) | Commission Apple/Google, règles 3.1.1 / 3.1.3 | **proposé** |
| D-14 | 07/10/2026 | Codes testeurs « un an offert » sans Stripe (table `codes_testeurs`) plutôt que des coupons Stripe | Pas de carte demandée aux testeurs ; fin automatique | décidé |
| D-15 | 08/10/2026 | Environnement de travail : règles par domaine, agents spécialisés, skills de rituel, hooks (contexte, lint, garde de livraison), parcours navigateur et banc de migrations en CI | Rendre la qualité automatique plutôt que dépendante de la vigilance | décidé |

## Décisions attendues de Hugo (bloquantes pour les stores)

1. Structure juridique (une seule entreprise individuelle par personne : électricité et Mallettico partageraient le SIREN en nom propre).
2. TVA des abonnements (`tax_behavior` Stripe, irréversible après le premier abonné).
3. Domiciliation (adresse publiée).
4. Achats dans les apps (D-13).
5. Type de comptes développeur : personnel (test fermé Google 12 testeurs × 14 jours) ou organisation (D-U-N-S).
