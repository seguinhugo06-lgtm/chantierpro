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
| D-26 | 11/10/2026 | contact@mallettico.fr devient le compte démo (tests de bout en bout, vidéos) : ses données de test sont remplacées par un jeu fictif rejouable ; les e-mails des clients fictifs arrivent dans la boîte d'Hugo (adresses « + ») | Tester les envois réels (devis, signature, relances, paiement) sans écrire à personne d'autre ; un jeu crédible pour les vidéos. Décision d'Hugo (11 oct.), jeu relu par `juriste-btp` et `gardien-securite` | décidé |
| D-27 | 11/10/2026 | Le compte démo porte une identité manifestement fictive (« Élec Exemple — Julien Exemple EI », SIRET 00000000000000, code APE 4321A, assureurs génériques « (exemple) », adresses de rue « de l’Exemple », « Imaginaire »…) ; le réglage `donneesFictives` de sa fiche affiche un bandeau « Données fictives — démonstration » dans l'app et sur les pages publiques de signature et de paiement, et un filigrane « EXEMPLE » sur tous ses documents (les deux générateurs de PDF, mise en demeure, situations) ; une facture fictive ne se paie qu'avec une clé Stripe de test | Rien de ce qui est filmé ne laisse croire à une vraie entreprise ni à de vrais contrats d'assurance (C. conso. L121-2) ; votre identité réelle n'est pas encore utilisable. Décision d'Hugo (11 oct.), option `fictive` (Q-identite-demo), relue par `juriste-btp` et `gardien-securite` | décidé |
| D-25 | 10/10/2026 | Le pourcentage de la jauge « Profil complété » des Paramètres est la note de l'onglet Facture 2026 : ce qui bloque l'envoi, plus capital, RCS et n° de TVA intracommunautaire quand ils concernent l'entreprise. 100 % ne veut plus seulement dire « l'envoi n'est plus bloqué » (c'est l'étape « Configurer mon entreprise » de l'accueil qui le dit). Médiateur et coordonnées de l'assureur décennal sont listés, hors pourcentage | Les deux écrans affichaient deux notes pour le même profil, et la jauge disait 100 % à une société sans capital social (service-public F31808). Médiateur et assureur ne sont dus qu'aux clients particuliers, ce que l'app ne sait pas. Délégué par Hugo à Claude, sur recommandation de `juriste-btp` ; le contrôle d'envoi ne change pas (Q-capital-envoi reste ouverte) | décidé |

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

### Q-capital-envoi · Bloquer l'envoi d'une société qui n'a pas saisi son capital social ?
Contexte : Une société doit porter sa forme juridique et le montant de son capital social sur ses factures (service-public F31808). Depuis le 10 oct. 2026, l'onglet Facture 2026 le compte « obligatoire » pour une société, et les deux PDF l'impriment s'il est saisi ; mais l'envoi part sans lui (il n'est pas dans `src/lib/profilLegal.js`), comme pour le RCS et le n° de TVA intracommunautaire (relecture juridique du 10 oct. 2026).
Option `bloquer` : ajouter capital, RCS et n° de TVA intracommunautaire au contrôle d'envoi, pour qui est concerné — colle au texte ; une société incomplète ne peut plus envoyer avant de les saisir.
Option `signaler` : garder le signalement (onglet Facture 2026, jauge des Paramètres) — rien ne change ; le risque reste sur l'artisan.
Recommandation : `bloquer` — mentions obligatoires, saisies une fois en une minute, et la règle « qui est concerné » existe déjà (`src/lib/mentionsFacture.js`).
Irréversible : non
Bloque : rien (contrôle d'envoi des devis et factures)

### Q-invitation-adresse · N'accepter une invitation d'équipe qu'avec l'adresse invitée ?
Contexte : Aujourd'hui, quiconque détient le lien d'une invitation rejoint l'équipe avec le rôle prévu, quelle que soit l'adresse de son compte (`accept_invitation`). Un lien transféré par erreur, ou un téléphone partagé sur lequel l'invité a commencé son inscription sans la finir, suffit (relecture gardien-securite du 11 oct. 2026, MOYEN). L'app oublie l'invitation à son expiration et à la déconnexion, mais pas si personne n'était connecté.
Option `exiger` : migration — l'invitation n'est acceptée que par un compte à l'adresse invitée ; sinon « Cette invitation a été envoyée à une autre adresse : connectez-vous avec celle-ci ». Un invité qui veut utiliser une autre adresse doit être réinvité.
Option `laisser` : le lien reste la seule clé, valable 7 jours ; rien ne change.
Recommandation : `exiger` — c'est la règle habituelle des invitations, et réinviter prend dix secondes.
Irréversible : non
Bloque : rien (sécurité des équipes)

### Q-retractation-anterieurs · Ouvrir « Renoncer au contrat ici » aux devis signés en ligne avant le 19 juin 2026 ?
Contexte : Depuis le 19 juin 2026, un contrat conclu par la page de signature doit offrir la rétractation en ligne (C. conso. L221-21, D221-5) ; les contrats antérieurs restent sous l'ancien droit, sans cette obligation, mais leur délai court encore (prolongé de 12 mois faute d'avis complet, L221-20). La migration 086 applique le minimum légal : bouton pour les devis signés depuis le 19 juin seulement ; les plus anciens gardent leur droit par lettre ou e-mail (relecture juriste-btp du 12 oct. 2026).
Option `minimum` : seulement depuis le 19 juin 2026 — le droit du client reste entier ; pas de bouton affichant une date limite en 2027 sur des chantiers souvent terminés.
Option `tous` : aussi les plus anciens encore dans leur délai prolongé — plus commode pour le client, mais une date de fin en 2027 apparaît au nom de l'artisan sans qu'il l'ait choisi.
Recommandation : `minimum` — ce que la loi exige, rien que l'artisan découvrirait après coup.
Irréversible : non
Bloque : rien (déjà appliqué en `minimum`)

### Q-regularisation-avis · Envoyer l'avis et le formulaire aux clients des devis signés sans eux ?
Contexte : Les devis signés par des particuliers avant le 12 oct. 2026 ne portaient pas le formulaire type : leur délai de rétractation est prolongé de 12 mois (L221-20). Envoyer maintenant l'avis complet et le formulaire le ramène à 14 jours après leur réception (L221-20, 2e alinéa). En production, hors compte démo : 7 devis signés en ligne par des particuliers, dont 1 depuis le 19 juin, et 2 signés sur place, sur 2 comptes (relevé du 12 oct. 2026).
Option `envoyer` : un e-mail par client concerné, depuis l'app, avec l'avis et le formulaire — sécurise les artisans ; demande un e-mail clair qui ne semble pas inviter à se rétracter.
Option `laisser` : rien — le risque reste : un client peut se rétracter jusqu'à un an après, sans rien devoir pour les travaux faits.
Recommandation : `envoyer` — quelques e-mails, et un risque d'un an qui disparaît ; à relire par juriste-btp avant l'envoi.
Irréversible : oui
Bloque : rien

### Q-petite-entreprise · Une case « petite entreprise hors de son métier » sur la fiche client ?
Contexte : Un professionnel d'au plus 5 salariés qui signe hors établissement, pour des travaux sans rapport avec son activité principale (un boulanger qui fait refaire l'électricité de sa boutique), a les mêmes droits qu'un particulier (C. conso. L221-3) : avis, formulaire, 14 jours, pas de paiement avant 7 jours. L'app ne le sait pas : elle le traite en professionnel (relecture juriste-btp du 12 oct. 2026).
Option `case` : une case sur la fiche client (« entreprise de 5 salariés au plus, travaux hors de son activité ») qui le traite comme un particulier pour la rétractation — conforme ; une question de plus pour l'artisan.
Option `rien` : l'artisan imprime lui-même ces mentions s'il le sait — rien ne change ; le risque reste sur l'artisan.
Recommandation : `case` — rare mais coûteux (contrat annulable, travaux non dus), et une case suffit.
Irréversible : non
Bloque : rien

### Q-suppression-retractation · Refuser la suppression du compte pendant un délai de rétractation en cours ?
Contexte : Supprimer son compte efface la page de signature des clients, donc le bouton « renoncer au contrat ici » qu'un particulier ayant signé en ligne doit garder pendant tout son délai (C. conso. L221-21, D221-5). Depuis le 16 oct. 2026, la page « Supprimer mon compte » et la fenêtre de suppression avertissent ; rien ne bloque (relecture juriste-btp du 16 oct. 2026).
Option `refuser` : la suppression est refusée tant qu'un devis signé en ligne par un particulier a moins de 14 jours, avec la date à partir de laquelle elle sera possible — protège l'artisan d'un manquement ; il attend au plus deux semaines.
Option `avertir` : l'avertissement actuel suffit — l'artisan décide ; le risque reste sur lui.
Recommandation : `refuser` — le cas est rare, l'attente courte, et l'obligation pèse sur l'artisan.
Irréversible : non
Bloque : rien

### Q-suppression-email · Comment traiter une demande de suppression reçue par e-mail ?
Contexte : La page publique « Supprimer mon compte » (exigée par Google Play) dit depuis le 16 oct. 2026 : « Nous vérifions que la demande vient bien de vous. Si un abonnement payant est en cours, nous le résilions. Si d'autres membres utilisent votre équipe, nous vous demandons d'abord de confirmer qu'ils perdront l'accès à l'espace de l'entreprise. » C'est vous qui le ferez (portail Stripe, puis suppression du compte) ; la page promet aussi une réponse sous un mois (RGPD art. 12), l'app « sous 72 h » (`src/services/suppressionCompte.js`).
Option `ok` : ce texte vous convient — rien à changer ; tenir le délai annoncé.
Option `autre` : vous préférez une autre procédure — dites laquelle, la page sera réécrite.
Recommandation : `ok` — c'est ce qu'attend Google, et les cas seront rares.
Irréversible : non
Bloque : rien

### Q-suppression-traces · Combien de temps garder la trace des comptes supprimés, et la fiche client Stripe ?
Contexte : `comptes_supprimes` garde un identifiant et une date sans durée annoncée ni purge ; Stripe garde la fiche client (nom, e-mail) avec les factures d'abonnement (10 ans). La CNIL recommande aussi de supprimer les comptes inactifs après une durée annoncée (relecture juriste-btp du 16 oct. 2026).
Option `5ans` : trace 5 ans (prescription, C. civ. art. 2224), fiche Stripe gardée avec les factures, pas de règle d'inactivité pour l'instant — simple ; à écrire dans la politique de confidentialité.
Option `autre` : d'autres durées, ou une règle d'inactivité (par exemple 3 ans sans connexion, avec un e-mail avant).
Recommandation : `5ans` — couvre les litiges sans garder plus que nécessaire.
Irréversible : non
Bloque : rien

### Q-lien-hors-etablissement · Une signature par le lien juste après votre visite : bloquer les paiements sept jours ?
Contexte : Si le client signe par le lien en votre présence chez lui, ou juste après votre visite, le contrat est « hors établissement » (C. conso. L221-1, I, 2°) : aucun paiement avant la fin du délai de sept jours (L221-10, délit L242-7). L'app ne bloque aujourd'hui que les devis signés sur place sur votre téléphone ; elle ne sait pas si une signature par le lien a suivi une visite (relecture juriste-btp du 17 oct. 2026).
Option `avertir` : dans la fenêtre d'acompte d'un devis de particulier signé par le lien depuis moins de 8 jours, un avertissement (« Si votre client a signé par le lien en votre présence chez lui, ou juste après votre visite… aucun paiement avant le JJ/MM ») — rien n'est bloqué ; vous jugez.
Option `bloquer` : traiter toute signature par le lien d'un particulier comme hors établissement — le plus prudent ; toutes les signatures à distance attendent sept jours.
Recommandation : `avertir` — la plupart des signatures par le lien sont vraiment à distance.
Irréversible : non
Bloque : rien

### Q-paiement-recu-sept-jours · Un paiement réellement reçu pendant les sept jours : refuser de l'enregistrer ?
Contexte : Depuis le 17 oct. 2026, « Encaisser » refuse d'enregistrer un paiement pendant le délai de L221-10 (devis signé sur place par un particulier). Si un client a quand même payé (chèque, virement), il ne peut être enregistré qu'après la date : vos comptes sont en retard d'autant (relectures juriste-btp et gardien-securite du 17 oct. 2026).
Option `refuser` : garder le refus — rappelle la règle ; le paiement s'enregistre après la date (ou se rembourse).
Option `avertir` : l'enregistrer avec un avertissement (« paiement reçu pendant le délai de sept jours : à rembourser si le client le demande, article L242-9 ») — comptes justes ; la règle n'est plus qu'un rappel.
Recommandation : `avertir` — un paiement reçu est un fait comptable ; le cacher fausse la trésorerie et les relances.
Irréversible : non
Bloque : rien

### Q-accuse-plafond · L'accusé de rétractation hors du plafond quotidien d'e-mails ?
Contexte : Chaque compte a un plafond d'envois par 24 h (50 par défaut, migration 077), contre les relais d'e-mails. L'accusé de réception d'une rétractation, obligatoire (D221-5), compte dans ce plafond : un artisan qui l'a atteint ne peut plus l'envoyer, et les essais automatiques échouent (relecture juriste-btp du 17 oct. 2026 ; à voir avec gardien-securite).
Option `exempter` : l'accusé ne compte plus dans le plafond (un par rétractation, déjà dédoublonné) — l'obligation légale passe toujours ; un abus reste borné par le nombre de rétractations.
Option `garder` : il reste dans le plafond — rien ne change ; rare en pratique.
Recommandation : `exempter` — un seul accusé par rétractation, et c'est une obligation de l'artisan.
Irréversible : non
Bloque : rien

### Q-exemplaire-lien · Signature par le lien en votre présence : demander l'accord pour l'e-mail ?
Contexte : Si un client signe par le lien chez lui en votre présence (ou juste après votre visite), le contrat est « hors établissement » (C. conso. L221-1, I, 2°) : son exemplaire est dû sur papier signé par les deux ou, avec son accord, par e-mail (L221-9). Depuis le 17 oct. 2026, la page de signature lui envoie son exemplaire par e-mail sans lui demander cet accord, comme pour un contrat à distance (relecture juriste-btp du 17 oct. 2026 ; même logique que Q-lien-hors-etablissement).
Option `phrase` : avant la signature, la page annonce « Votre exemplaire signé vous sera envoyé par e-mail, à l'adresse {email}. » — le client est prévenu ; rien ne change pour lui.
Option `case` : une case « J'accepte de recevoir mon exemplaire par e-mail » sur la page, conservée comme sur place — l'accord se prouve ; une case de plus pour tous les clients.
Recommandation : `phrase` — la plupart des signatures par le lien sont vraiment à distance, où l'e-mail ne demande pas d'accord.
Irréversible : non
Bloque : rien

### Q-suppression-devis-signe · Un devis signé ne se supprime plus : garder ce refus ?
Contexte : Depuis le 17 oct. 2026 (migration 091), un devis signé, sur place ou par le lien, ne se supprime plus dans l'app ni par l'API : on l'annule, ou un avenant le modifie. Sans ce refus, supprimer puis réinsérer le même devis signé permettait de changer après coup la demande expresse ou l'accord pour l'e-mail (relecture gardien-securite du 17 oct. 2026). La suppression du compte efface toujours tout.
Option `garder` : le refus reste — la preuve du contrat ne disparaît pas ; un devis signé par erreur s'annule.
Option `permettre` : la suppression d'un devis signé revient — un devis d'essai signé disparaît de la liste ; le contournement revient.
Recommandation : `garder` — un contrat signé est une preuve (et une pièce à conserver), l'annulation suffit pour le retirer des listes actives.
Irréversible : non
Bloque : rien

### Q-penalites-particulier · Quelles conditions de retard imprimer sur un devis ou une facture de particulier ?
Contexte : Tous les devis et factures impriment « Taux de la BCE majoré de 10 points (art. L441-10 C. com.) » et l'indemnité de 40 € « due entre professionnels ». L441-10 ne vise que les débiteurs professionnels ; pour un particulier, ce sont les intérêts au taux légal à compter de la mise en demeure (C. civ. art. 1231-6). Retirer une mention demande une décision (relecture juriste-btp du 17 oct. 2026, C5).
Option `adapter` : pour un client particulier, « Retard de paiement : intérêts au taux légal à compter de la mise en demeure (art. 1231-6 du Code civil) », sans la ligne des 40 € ; inchangé pour un professionnel — chaque document dit la règle qui s'applique à son client.
Option `garder` : la même mention pour tous — rien ne change ; un particulier lit des pénalités qui ne le visent pas.
Recommandation : `adapter` — la fiche client sait déjà si c'est un particulier (`estClientParticulier`), et les relances suivent déjà cette règle.
Irréversible : non
Bloque : la tâche `penalites-particulier`
