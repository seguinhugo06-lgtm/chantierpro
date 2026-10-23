# Cadrage — Parcours ramoneur (tâche `ramonage`, feuille de route 0 quater septies)

23 oct. 2026. Relu par le critique produit (verdict « plus petit ») et par juriste-btp (textes vérifiés sur Légifrance et le BOFiP le jour même). **À valider par Hugo avant tout code** (§ 8).

## 1. Le problème, avec sa preuve

Des amis ramoneurs d'Hugo (Sarlat) travaillent sur papier : une **fiche client** (identité, lieu, qualité, appareil, puis un tableau date / méthode / prix + n° de facture / prochain ramonage) et une **attestation de ramonage** numérotée et signée, remise au client. Hugo a photographié ces documents (hors dépôt, données d'un vrai client : rien n'en est recopié ici, données fictives seulement).

Gain visé : sur le téléphone, chez le client, le devis, l'attestation, la facture et le rappel de l'an prochain sans ressaisie, au lieu de trois papiers et d'un agenda. Dès la deuxième année, l'appareil et le prix sont déjà là.

Hypothèse, pas encore prouvée : ils l'utiliseront. **Mesure** : nombre d'attestations créées sur leurs comptes au bout de 4 semaines ; à zéro, pas de lot 2.

## 2. Ce qui existe déjà (code au 23 oct., commit 5a5a407e)

- Devis signé sur place au téléphone, avec la demande expresse d'exécution immédiate, la rétractation et la règle des sept jours avant tout paiement (`DevisPage.jsx`, `src/lib/retractation.js`, migrations 086 à 091) ; devis → facture sans ressaisie ; facture numérotée et figée par la base (101 à 103) ; TVA réduite et attestation du client (`mentionTvaReduite.js`).
- Envoi d'un PDF par e-mail au client (`sendDocumentEmail`) et partage du téléphone (`remettreFichier`) ; lien `sms:` déjà utilisé sur la fiche client.
- 8 modèles de devis de ramonage (`src/lib/data/modeles/ramonage.js`), mais pas dans l'éditeur actuel ; pas de Ramonage dans la bibliothèque `TRADE_LIBRARY` (« 17 métiers ») ; `getTaskTemplatesForMetier` ne reconnaît ni « ramonage » ni « ramoneur » ; l'inscription ne demande aucun métier (aucune colonne `metier`).

## 3. Ce que disent les textes (vérifié par juriste-btp le 23 oct. 2026)

Depuis le 1er octobre 2023, le ramonage est réglé par le **code de la santé publique, articles R. 1331-66 à R. 1331-78** (décret n° 2023-641 du 20 juillet 2023, renuméroté par le décret n° 2023-695 du 29 juillet 2023 ; l'arrêté du 20 juillet 2023 cite encore les anciens numéros : l'app cite toujours ceux du code).

- **R. 1331-70** : ramoner, c'est nettoyer « par action mécanique directe » la paroi intérieure du conduit pour en éliminer suies et dépôts et « assurer la vacuité du conduit sur toute sa longueur », raccordement compris ; souches et accessoires sont vérifiés ; feu et explosifs interdits. → **Méthodes** : « Mécanique manuelle (hérisson, écouvillon) » ou « Mécanique rotative » ; « Produit chimique utilisé en complément » n'est qu'une case à cocher (un produit chimique seul ne fait pas un ramonage).
- **R. 1331-71** : au moins tous les douze mois ; un arrêté pris sur L. 1311-2 (règlement sanitaire départemental, arrêté municipal) peut en imposer davantage, dont un pendant la période de chauffe ; appareils collectifs : six mois. Les règlements départementaux qui imposent deux ramonages par an restent applicables. Celui de la Dordogne (arrêté préfectoral du 27 février 1984) est introuvable en ligne ; s'il suit le règlement type, c'est deux par an pour le bois. → **L'app ne fixe aucune fréquence** : « dans 12 mois » proposé, « dans 6 mois » en un geste, date libre, alerte non bloquante au-delà de douze mois.
- **R. 1331-73** : le ramonage est à l'initiative de l'occupant, sauf clause du bail → qualité du client (propriétaire, locataire, autre).
- **R. 1331-75** : l'attestation est remise dans les quinze jours ouvrés ; elle « précise notamment le ou les conduits de fumée ramonés et atteste notamment de la vacuité du conduit sur toute sa longueur » ; le commanditaire la garde au moins deux ans pour les agents de contrôle. → **La vacuité est le constat du professionnel**, choisi par lui à chaque attestation, jamais pré-rempli : « assurée » ou « non assurée » (les mots du texte ; pas « conforme », qui se lirait « installation conforme »).
- **R. 1331-77** : au ramonage d'un appareil à combustible solide, le professionnel conseille l'usager non professionnel (améliorations, rendement selon le combustible, intérêt d'un remplacement ; détail à l'annexe 2 de l'arrêté). → bloc **« Conseils donnés »** exigé pour le bois, les granulés et le charbon.
- **L'entretien annuel des poêles et inserts** (R. 1331-67 et -68, arrêté annexes 1 et 3) est une autre obligation, avec sa propre attestation : hors de cette tâche, et l'attestation de ramonage le dit pour un foyer fermé.
- **Devis obligatoire** (arrêté du 24 janvier 2017, art. 4 et annexe 1, qui cite le « ramonage », sans seuil de montant) : un devis détaillé avant toute prestation ; conclu chez le client, c'est un contrat hors établissement (C. conso. L. 221-1), avec rétractation, demande expresse pour commencer tout de suite (L. 221-25) et **aucun paiement avant sept jours** (L. 221-10). Exclus : les clients professionnels et les contrats d'entretien à forfait. → **Le parcours commence par le devis**, avec la mécanique existante.
- **Rappel** = prospection directe (code des postes et des communications électroniques, L. 34-5), permise envers un client pour le même service si l'information et le droit de refuser sont donnés au recueil des coordonnées et dans chaque message (RGPD art. 21).
- **TVA** : « Travaux de ramonage et élimination de suie et de dépôts corrosifs : 10 % » (BOI-ANNX-000210, § 20) dans un logement de plus de deux ans ; le mécanisme existant suffit.

## 4. Le parcours (téléphone, 375 px)

Activé par **Paramètres → Ramonage → « J'effectue des ramonages »** : rien ne change pour les autres artisans.

1. **Fiche client → onglet « Ramonage »** : ses appareils (d'après leur dernier passage) et, sous chacun, l'historique : date, méthode, prix, n° de facture, prochain ramonage. Bouton « Nouveau ramonage ».
2. **Le devis d'abord** : « Nouveau ramonage » ouvre un devis pré-rempli (client, ligne « Ramonage — appareil », prix du dernier passage), que le client signe sur le téléphone avec la demande expresse, par le chemin habituel. Client professionnel : on peut passer cette étape.
3. **L'attestation**, un seul écran, à partir du devis signé :
   - appareil (reprendre un appareil du client ou en décrire un nouveau : type, combustible, conduit, un seul champ « Précisions » pour la marque, le modèle ou « autre », pièce et étage, adresse si différente) ; seuls l'appareil, le conduit et le prix sont repris du dernier passage, jamais les constats ;
   - date et heure (maintenant), qualité du client, nom de l'intervenant ;
   - méthode, case « produit chimique en complément » ; raccordement ramoné ou sans objet ;
   - **vacuité : assurée / non assurée** (obligatoire, précision si non assurée) ; les autres constats, facultatifs et non imprimés s'ils sont vides : état du conduit, tubage, dépôts, bistre, trappe et pied de conduit, souche et accessoires, joints de l'appareil (« observé ») ;
   - observations et recommandations (un seul texte) ; conseils donnés (choix rapides + texte) pour un combustible solide ;
   - prochain ramonage conseillé avant le … (12 mois par défaut, 6 mois en un geste) ;
   - signature : tracée la première fois, reprise ensuite, « Refaire » en un geste.

   Un **aperçu** avant d'enregistrer, puis « Enregistrer » : la base attribue le numéro `RAM-AAAA-NNNNN` et **l'attestation ne se modifie plus**. Une erreur se corrige par « Annuler (erreur de saisie) » puis « Refaire à partir de celle-ci » : nouvelle attestation qui « annule et remplace » l'ancienne.
4. **Après l'enregistrement** : « Voir / partager le PDF », « Envoyer au client » (e-mail avec le PDF, comme un devis), **« Faire la facture »** (la facture du devis signé, sans ressaisie, avec l'échéance après sept jours pour un particulier chez lui).
5. **Rappel** : à partir de « prochain ramonage − 30 jours » (délai réglable), le client apparaît dans « À faire » sur l'accueil et sur sa fiche : « Ramonage à prévoir avant le … », avec **« SMS »** (texte pré-rempli, envoyé depuis le téléphone), **« Appeler »**, **« Ne plus rappeler »** (refus noté sur le client). Toucher « SMS » ou « Appeler » marque le rappel comme fait, avec « Annuler ».

## 5. Les textes imprimés (proposés par juriste-btp, revus avec lui avant de livrer)

- **Titre** : « Attestation de ramonage » ; sous-titre « N° RAM-2026-00001 — article R. 1331-75 du code de la santé publique ».
- **Phrase, vacuité assurée** : « Je soussigné(e) {intervenant}, pour {entreprise}, atteste avoir procédé le {date} au ramonage, par action mécanique directe, du ou des conduits désignés ci-dessus et avoir assuré la vacuité du conduit sur toute sa longueur. »
- **Phrase, vacuité non assurée** : « … du ou des conduits désignés ci-dessus. La vacuité du conduit sur toute sa longueur n'a pas pu être assurée : {précision}. »
- **Foyer fermé à combustible solide** : « Cette attestation porte sur le ramonage. Elle ne vaut pas attestation d'entretien de l'appareil (articles R. 1331-67 et R. 1331-68 du code de la santé publique). »
- **Conseils** : « Ces conseils sont donnés à titre indicatif : aucun investissement proposé n'est obligatoire. »
- **Pied** (au lieu de « à transmettre à votre assurance », inexact) : « À conserver au moins deux ans et à présenter aux agents chargés du contrôle qui la demandent (article R. 1331-75 du code de la santé publique). Votre assureur habitation peut aussi vous la demander, notamment après un sinistre. »
- **Information sur les rappels**, paragraphe séparé, sur l'attestation et l'e-mail d'envoi : « {Entreprise} pourra vous contacter avant votre prochain ramonage. Vous pouvez le refuser dès maintenant en le disant à votre ramoneur, ou à tout moment en répondant STOP à un rappel. »
- **SMS de rappel** : « Bonjour, votre ramonage est à prévoir avant le {date}. {Entreprise}, {téléphone}, qui a ramoné votre conduit le {date du dernier}. Pour ne plus recevoir de rappel, répondez STOP. » Jamais « obligatoire », « avis », ni ton administratif.
- Identité du professionnel : nom imprimé (avec « EI »), adresse, téléphone, e-mail, SIRET, assurance RC pro (assureur et n°), lus dans les Paramètres.

## 6. Données (migration 104, banc, gardien-securite)

**Une seule table, `ramonages`** (une ligne = une attestation), `user_id` + `organization_id`, RLS par organisation comme les devis, contrôle d'organisation (084), index :
- liens : `client_id`, `devis_id` (devis signé de la même organisation, sinon refus ; vide pour un client professionnel), `appareil_ref` (relie les passages d'un même appareil), `remplace_id` ;
- `numero` attribué par la base sous verrou (série par organisation et par année, unique), la proposition de l'app ignorée ;
- copie à la saisie de ce qui est imprimé : client et adresse d'intervention, qualité, appareil, combustible, conduit, précisions, localisation ;
- `realise_le` (date et heure), `intervenant_nom`, `methode`, `complement_chimique`, `raccordement`, `constats` (JSON, vacuité obligatoire), `observations`, `conseils` (JSON), `prochain_avant`, `nb_dans_annee`, `signature` ;
- **figée dès l'insertion** par la base ; seuls changent ensuite `annulee_le` + `annulation_motif` (une fois) et `rappel_fait_le` ; suppression refusée.

Sur `clients` : `rappels_refuses_le` (refus des rappels, daté).
Réglages de l'entreprise (`settings_json.reglages`, sans colonne) : `ramonageActif`, `ramonageRappelJours` (30).
Hors connexion : la création attend le réseau pour recevoir son numéro (l'app le dit) ; mode démo : repli `localStorage`, données fictives.

## 7. Critère d'acceptation et vérification

**Critère** (375 px, démo et compte réel simulé) : le ramoneur active le module ; crée un client ; « Nouveau ramonage » prépare le devis, signé sur place ; il remplit l'attestation (nouvel appareil), la base attribue `RAM-2026-00001` ; le PDF porte toutes les mentions du § 5 et se télécharge et s'envoie ; « Faire la facture » donne la facture du devis sans ressaisie ; la fiche client montre l'appareil et son historique ; horloge avancée à « prochain − 30 jours » : le rappel apparaît sur la fiche et dans « À faire », le SMS pré-rempli s'ouvre, puis le rappel disparaît ; l'attestation ne se modifie plus ; un compte sans le module ne voit aucun changement.

**Vérification** : tests unitaires (dates du prochain ramonage et du rappel, nombre dans l'année, contenu de l'attestation, vacuité obligatoire, conseils exigés pour le bois) ; banc de la migration 104 (autre compte, visiteur, numéros consécutifs, contenu figé, suppression refusée, devis d'une autre organisation refusé) ; parcours navigateur dédié `ramonage` ; `npm run verifier -- --complet` vert ; relectures gardien-securite, juriste-btp (PDF, SMS), ingenieur-mobile, verificateur.

## 8. Décisions demandées à Hugo

1. **Devis avant chaque ramonage** (obligatoire pour un particulier) : « Nouveau ramonage » prépare le devis, signé sur le téléphone par le chemin habituel (recommandé). Conséquence à dire à tes amis : chez un particulier, pas de paiement avant sept jours ; la facture le porte.
2. **Rappel** : lot 1 par SMS pré-rempli et appel, depuis le téléphone (recommandé) ; e-mail et envoi automatique au lot 2, seulement si tes amis le demandent après quelques semaines.
3. **Bibliothèque** : le métier Ramonage dans `TRADE_LIBRARY` (le site passerait à « 18 métiers »), les tâches de chantier et le choix du métier à l'inscription vont à la tâche 4 quaterdecies (recommandé) : le parcours n'en a pas besoin, le devis est pré-rempli par la fiche.
4. **Attestation d'entretien des poêles et inserts** : au lot suivant si tes amis la demandent (recommandé).

Questions à poser à tes amis (elles ne bloquent pas le lot 1) : une attestation par conduit ou par visite ? du réseau chez les clients ? comment préviennent-ils leurs clients aujourd'hui ? font-ils déjà un devis, et comment sont-ils payés ?

## 9. Hors de cette tâche

E-mail et envoi automatique des rappels ; plusieurs ramonages sur une facture ; attestation d'entretien ; appareils collectifs (l'aide le dit) ; tournées, photos ; bibliothèque et métier à l'inscription (4 quaterdecies).

Taille : M à L (une à deux sessions), au-delà du plafond d'heures de la ligne directrice ; un seul lot jusqu'au retour des amis.
