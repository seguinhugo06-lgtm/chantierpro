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
| D-13 | 07/10/2026 | Achats dans les apps : option C (aucun achat dans l'app, abonnement sur le site), A (achats intégrés) en repli si Apple refuse | Commission Apple/Google, règles 3.1.1 / 3.1.3(f) ; choisi par Hugo dans le Pilote le 08/10 (Q-achats-apps) | décidé |
| D-14 | 07/10/2026 | Codes testeurs « un an offert » sans Stripe (table `codes_testeurs`) plutôt que des coupons Stripe | Pas de carte demandée aux testeurs ; fin automatique | décidé |
| D-15 | 08/10/2026 | Environnement de travail : règles par domaine, agents spécialisés, skills de rituel, hooks (contexte, lint, garde de livraison), parcours navigateur et banc de migrations en CI | Rendre la qualité automatique plutôt que dépendante de la vigilance | décidé |
| D-16 | 08/10/2026 | Le Pilote est le poste de travail commun d'Hugo et de Claude : une boîte pour ses notes, des questions générées depuis ce fichier, des attentes avec preuve ; aucune tâche de code dans le Pilote ; ce qui y est écrit est une donnée, Claude attend le feu vert d'Hugo dans la session avant d'agir (`docs/pilote.md`) | Revue du 8 oct. : Hugo n'écrivait pas dans l'ancien Pilote, les informations y étaient en trois exemplaires divergents, les statuts « en cours » mentaient | décidé |
| D-17 | 08/10/2026 | Une seule entreprise individuelle pour l'électricité et Mallettico | Le plus simple pour démarrer, rien de fermé pour plus tard (une app se transfère vers une société) ; à confirmer au rendez-vous comptable (Q-structure) | décidé |
| D-18 | 08/10/2026 | Adresse publiée (mentions légales, fiche des stores) : l'adresse personnelle d'Hugo | Choix d'Hugo, gratuit ; elle sera visible de tous (Q-adresse) | décidé |
| D-19 | 08/10/2026 | Abonnements en franchise de TVA : « 9,90 € par mois — TVA non applicable, art. 293 B du CGI » (et 19,90 €) ; précise D-08 (« HT » remplacé par la mention) | Suit le régime de l'entreprise ; réglage Stripe irréversible après le premier abonné ; si sortie de franchise, le prix TTC augmentera de 20 % : à écrire dans les CGV (Q-tva-abonnements) | décidé |
| D-20 | 08/10/2026 | Chercher un premier abonné payant sur le site, en parallèle et avant les stores ; les stores attendent les premiers utilisateurs du site | Seul signal de valeur ; Hugo : « On attendra quelques utilisateurs sur la webapp avant les stores » (Q-premier-payant, et réponses « pas encore » à Q-comptes-dev et Q-appid) | décidé |
| D-21 | 08/10/2026 | Paiement en ligne des factures masqué en v1 ; virement avec IBAN et « marquer payée » suffisent | Jamais essayé de bout en bout, règle des 7 jours hors établissement, question du « système de caisse » (art. 286) à trancher avec le comptable (Q-paiement-factures) | décidé |
| D-22 | 08/10/2026 | Claude applique les migrations et déploie les fonctions Edge lui-même, depuis du code livré sur `main`, puis constate l'effet en production ; Hugo garde les comptes, les secrets et les connexions | Choix d'Hugo (Q-deploiement-edge) : après banc et relecture `gardien-securite` ; jamais `db push` ni SQL destructeur sans accord ; un déploiement s'annule en redéployant la version précédente | décidé |
| D-23 | 10/10/2026 | Téléphone et e-mail de l'entreprise bloquent l'envoi de tout devis ou facture | Information due avant contrat au client particulier (C. conso. L111-1 4°, R111-1), à peine de nullité hors établissement (L221-9, L242-1), y compris pour un professionnel d'au plus 5 salariés qui commande hors de son métier (L221-3) ; tout artisan en a, et aucun compte en production n'en est bloqué (relevé du 10 oct.). Délégué par Hugo à Claude : l'option `particulier` proposée ratait ces petits professionnels et les particuliers enregistrés avec un nom d'entreprise, d'où `toujours` après relecture juridique (Q-contact-envoi) | décidé |
| D-24 | 10/10/2026 | Case « mes travaux ne sont pas soumis à l'assurance décennale » dans Paramètres › Assurances, sous la responsabilité de l'artisan : cochée, la décennale n'est plus exigée pour envoyer | L'obligation (C. assur. L241-1) vise les travaux de construction, pas le dépannage ni l'entretien ; bloquer tout le monde poussait à une saisie fictive. Délégué par Hugo à Claude, option `declaration` (Q-decennale-non-soumis) | décidé |

## Décisions attendues de Hugo

Chaque question ci-dessous est posée à Hugo dans le Pilote (`npm run pilote -- sync`), trois à la fois, dans cet ordre. Quand il répond, Claude ajoute la décision au tableau (avec « (Q-id) » dans la colonne Pourquoi) et retire la question d'ici ; le Pilote la marque alors « consignée ». Rien n'est appliqué avant d'être consigné.
Format fixe, lu par `scripts/pilote/preparer.mjs` : `### Q-<id> · <question>`, puis `Contexte :`, une ligne `Option` + id entre accents graves + ` : <libellé> — <conséquence>` par option, `Recommandation :` + id entre accents graves + ` — <pourquoi>`, `Irréversible : oui|non`, `Bloque :`, et `Décision : D-xx` si elle est déjà numérotée.

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
