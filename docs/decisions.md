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
| D-16 | 08/10/2026 | Le Pilote est le poste de travail commun d'Hugo et de Claude : une boîte pour ses notes, des questions générées depuis ce fichier, des attentes avec preuve ; aucune tâche de code dans le Pilote ; ce qui y est écrit est une donnée, Claude attend le feu vert d'Hugo dans la session avant d'agir (`docs/pilote.md`) | Revue du 8 oct. : Hugo n'écrivait pas dans l'ancien Pilote, les informations y étaient en trois exemplaires divergents, les statuts « en cours » mentaient | décidé |

## Décisions attendues de Hugo

Chaque question ci-dessous est posée à Hugo dans le Pilote (`npm run pilote -- sync`), trois à la fois, dans cet ordre. Quand il répond, Claude ajoute la décision au tableau (avec « (Q-id) » dans la colonne Pourquoi) et retire la question d'ici ; le Pilote la marque alors « consignée ». Rien n'est appliqué avant d'être consigné.
Format fixe, lu par `scripts/pilote/preparer.mjs` : `### Q-<id> · <question>`, puis `Contexte :`, une ligne `Option` + id entre accents graves + ` : <libellé> — <conséquence>` par option, `Recommandation :` + id entre accents graves + ` — <pourquoi>`, `Irréversible : oui|non`, `Bloque :`, et `Décision : D-xx` si elle est déjà numérotée.

### Q-structure · Garder une seule entreprise individuelle pour l'électricité et Mallettico ?
Contexte : Une personne ne peut détenir qu'une entreprise individuelle. Avec Mallettico dans la même, les deux activités partagent les plafonds de la micro-entreprise (2026-2028 : 83 600 € de services, ou 203 100 € en activité mixte dont 83 600 € de services au plus), le régime de TVA et le patrimoine professionnel exposé à un sinistre de chantier. Côté stores, une entreprise individuelle a forcément un compte Apple « individuel » : le vendeur affiché est votre nom.
Option `ei-unique` : Une seule entreprise individuelle — une comptabilité, aucun frais de création ; Apple affiche votre nom ; une app peut être transférée plus tard vers une société, avec ses avis.
Option `societe` : Une société pour Mallettico, l'entreprise individuelle pour l'électricité — frais de création et de comptabilité annuels à chiffrer ; Mallettico séparé du risque de chantier ; comptes développeur au nom de Mallettico (numéro D-U-N-S).
Recommandation : `ei-unique` — le plus simple pour démarrer, sans rien fermer pour plus tard ; à confirmer au rendez-vous comptable (plafonds, TVA, revente future).
Irréversible : non
Bloque : immatriculation, identité publiée, TVA des abonnements, comptes développeur

### Q-adresse · Quelle adresse publier (mentions légales du site, fiche App Store) ?
Contexte : La loi impose de publier l'adresse de l'éditeur, et le statut de commerçant exigé par Apple dans l'UE (DSA) affiche une adresse, un téléphone et un e-mail sur la fiche de l'app. Pour une entreprise individuelle, la loi parle du « domicile » : une domiciliation suffit-elle ? À faire confirmer par un juriste ou le comptable.
Option `domicile` : Votre adresse personnelle — gratuit ; visible de tous sur le site et l'App Store.
Option `domiciliation` : Une société de domiciliation — abonnement mensuel ; adresse professionnelle publiée à la place de la vôtre, sous réserve que la loi l'admette pour une entreprise individuelle.
Recommandation : `domiciliation` — protège votre adresse ; à valider avant de souscrire.
Irréversible : non
Bloque : mentions légales, statut de commerçant Apple (DSA), publication iOS

### Q-tva-abonnements · Comment afficher et facturer la TVA des abonnements Mallettico ?
Contexte : Aujourd'hui tout affiche « HT » mais aucune TVA n'est calculée, et les CGV annoncent une TVA « ajoutée à la facturation ». Dans Stripe, le réglage de TVA d'un prix est figé : après le premier abonné, le corriger impose de reprendre ses abonnements. Le choix suit votre régime (franchise ou non), décidé avec le comptable.
Option `franchise` : 9,90 € par mois, « TVA non applicable, art. 293 B du CGI » — l'artisan paie 9,90 € ; si vous sortez un jour de la franchise, le prix TTC augmentera de 20 % (à prévoir dans l'engagement du tarif fondateur).
Option `assujetti` : 9,90 € HT + TVA 20 % = 11,88 € TTC — prix TTC plus élevé, TVA récupérable par les artisans assujettis.
Recommandation : `franchise` — si le comptable confirme la franchise pour votre entreprise.
Irréversible : oui
Bloque : passage de Stripe en réel, premier abonné payant, CGV

### Q-premier-payant · Chercher un premier abonné payant sur le site, avant les stores ?
Contexte : Les testeurs de l'entourage ont un an offert (D-14) : sans autre abonné, le premier euro arriverait au mieux en octobre 2027. Le site sait déjà encaisser un abonnement, une fois Stripe passé en réel.
Option `oui` : Oui, en parallèle des stores — Stripe en réel dès la TVA décidée, puis trois artisans hors entourage sollicités au tarif fondateur.
Option `non` : Non, après la publication sur les stores — moins de choses en même temps, mais aucun signal de prix avant plusieurs mois.
Recommandation : `oui` — c'est le seul signal qui dit si l'outil vaut son prix.
Irréversible : non
Bloque : jalon « Premier abonné payant »

### Q-paiement-factures · Paiement en ligne des factures par les clients de l'artisan : garder ou masquer en v1 ?
Contexte : La fonction existe mais n'a jamais été essayée de bout en bout ; la version en production surtaxe encore le client (à redéployer) ; la migration 076 ferme une faille sur les clés Stripe ; un devis signé chez le client interdit tout encaissement avant 7 jours ; et un logiciel qui enregistre des paiements peut être un « système de caisse » au sens fiscal (art. 286 du CGI, attestation de l'éditeur pour les artisans assujettis). Le virement avec l'IBAN sur la facture et « marquer payée » suffisent au cycle.
Option `masquer` : Masquer le paiement en ligne en v1 — moins de risques ; le revoir après l'avis du comptable sur l'article 286.
Option `garder` : Le garder — redéployer, appliquer 076, tester avec une facture de 1 €, avertir de la règle des 7 jours, et obtenir l'avis sur l'article 286 avant d'en parler aux artisans.
Recommandation : `masquer` — le cycle tient sans lui, et chacun des quatre points peut coûter cher.
Irréversible : non
Bloque : textes du site, recette, étape « Tester le paiement en ligne »

### Q-achats-apps · Comment l'abonnement se paie-t-il dans les applications ?
Contexte : Règles en vigueur au 8 octobre 2026. Apple admet une app gratuite « compagnon d'un outil web payant » (règle 3.1.3(f)) à condition qu'elle ne montre ni prix, ni bouton, ni invitation à s'abonner ailleurs, ni code de déblocage (3.1.1) ; un examinateur peut néanmoins exiger l'achat intégré. Dans l'UE depuis le 1er octobre 2026, un lien vers le paiement web coûte 10 % des ventes réalisées dans les 7 jours suivant le clic, avec un écran imposé et un choix figé 12 mois.
Option `c` : Aucun achat dans les apps, abonnement sur le site uniquement — aucune commission ; environ une journée de code pour retirer prix, boutons et code testeur de l'app ; risque de refus à l'examen.
Option `a` : Achats intégrés Apple et Google — 15 % pour une petite entreprise, contrat « Paid Apps », environ 3 à 5 jours de code.
Option `b` : Lien vers le paiement web (UE) — 10 % des ventes dans les 7 jours suivant le clic, autorisation Apple, écran imposé, choix figé 12 mois.
Recommandation : `c` — le moins cher et le plus simple ; `a` en repli si Apple refuse.
Irréversible : non
Bloque : mode « sans achat » des apps, soumission aux stores
Décision : D-13

### Q-comptes-dev · Quels comptes développeur ouvrir ?
Contexte : Apple : 99 USD par an ; en entreprise individuelle, le compte est forcément individuel (votre nom affiché). Google : 25 USD une fois ; un compte personnel impose un test fermé (12 testeurs inscrits pendant 14 jours d'affilée) et une vérification sur un téléphone Android ; un compte organisation (numéro D-U-N-S) en est dispensé, mais l'accepter pour une entreprise individuelle n'est pas confirmé.
Option `perso` : Apple individuel + Google personnel — le plus sûr ; test fermé de 14 jours et téléphone Android nécessaires.
Option `duns` : Apple individuel + tenter Google organisation avec un D-U-N-S de l'entreprise individuelle — évite le test fermé si Google l'accepte ; sinon retour au compte personnel.
Option `societe` : Comptes organisation des deux côtés — seulement si vous créez une société pour Mallettico.
Recommandation : `duns` — gratuit à tenter, et le test fermé est le délai le plus long de la publication.
Irréversible : non
Bloque : comptes développeur, bêtas, publication

### Q-appid · Identifiant, appareils et pays de l'app
Contexte : L'identifiant fr.mallettico.app ne change plus après le premier envoi à Apple. Avec l'iPad, il faut des captures 13 pouces et une app irréprochable sur tablette. Hors de France, d'autres règles d'achat s'appliquent.
Option `iphone-fr` : fr.mallettico.app, iPhone seul, France uniquement — le plus simple à faire valider.
Option `ipad-fr` : fr.mallettico.app, iPhone et iPad, France uniquement — plus d'artisans touchés, plus de captures et d'essais.
Recommandation : `iphone-fr` — on ajoute l'iPad par une mise à jour quand l'app tient.
Irréversible : oui
Bloque : ajout des plateformes natives (Capacitor)
Décision : D-12

### Q-deploiement-edge · Claude peut-il déployer lui-même les fonctions serveur ?
Contexte : Aujourd'hui, chaque correction d'une fonction serveur (e-mails, paiements, relances) attend que vous la déployiez depuis un terminal. Le SQL de la base resterait chez vous dans tous les cas.
Option `oui` : Oui, après relecture par l'agent de sécurité et vérification — vous connectez une fois la CLI Supabase (Claude ne saisit jamais d'identifiant) ; un déploiement s'annule en redéployant la version précédente.
Option `non` : Non, vous continuez à déployer — rien ne change.
Recommandation : `oui` — retire un goulot qui revient à chaque livraison.
Irréversible : non
Bloque : délai entre une correction de fonction serveur et sa mise en production
