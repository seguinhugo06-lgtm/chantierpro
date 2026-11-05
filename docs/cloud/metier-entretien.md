# Rapport de la session cloud « metier-entretien » (4 nov. 2026)

Branche : `cloud/metier-entretien`, partie de `main` (`95dedf8`). Rien n'est appliqué ni déployé en production.

## 1. Ce qui est fait

**L'attestation d'entretien, pour trois appareils** (décision D-33) : chaudière (gaz, fioul, bois, granulés, charbon), pompe à chaleur ou climatisation, poêle ou insert à foyer fermé. Un seul parcours, comme le ramonage.

- **Activation** : Paramètres → Documents → Entretien. Interrupteur « J'entretiens des chaudières, pompes à chaleur ou poêles ». Éteint, rien ne change.
- **Fiche client, onglet « Entretien »** : les appareils entretenus, leur historique (date, numéro, prix, facture), la date conseillée du prochain entretien.
- **Saisie au téléphone** (plein écran, 375 px) :
  - commanditaire, adresse de l'installation, local ;
  - identification de l'appareil (marque, modèle, énergie, mode d'évacuation, n° de série, mise en service, puissance) ;
  - points contrôlés en cases, recopiés des annexes 1 des trois arrêtés, avec « Tout cocher » ;
  - mesures et appareils de mesure ;
  - chaudière : CO en ppm, qui choisit la phrase a, b ou c, avec l'alerte de l'article 3 à l'écran (10 à 50 ppm : informer l'usager ; 50 ppm ou plus : injonction de maintenir à l'arrêt) ; rendement, émissions et classe énergétique saisis par l'artisan ;
  - PAC : contrôle d'étanchéité ou « équipement soumis au règlement (UE) 2024/573 », fluide, défauts constatés, actions effectuées ;
  - poêle : plusieurs appareils dans la même attestation (« Ajouter un autre appareil entretenu »), points granulés et circuit hydraulique ;
  - conseils : les trois rubriques du tableau 11 pour la chaudière, les sujets de l'annexe 2 pour la PAC et le poêle ;
  - signature au doigt, reprise pour le même intervenant.
- **Reprise de l'an dernier** : pour un appareil connu, l'identification, le lieu, les appareils de mesure et le prix sont repris. Jamais les points, les mesures ni les conseils. La date du dernier entretien et celle du dernier ramonage du client sont proposées.
- **L'attestation imprimée** : trois documents distincts, chacun avec son titre et son pied de page (« à conserver au moins deux ans » sauf la PAC, sans durée). Chaudière : tableaux 9, 10, 11 et 13, classe énergétique, phrase du CO mot pour mot. Numéro `ENT-AAAA-NNNNN` attribué par la base, contenu figé, « annule et remplace ». PDF, envoi par e-mail.
- **La facture** en un geste, au taux **proposé** : 10 % dans un logement de plus de deux ans, 5,5 % seulement si l'artisan coche « appareil éligible » (critères affichés), 20 % sinon. Jamais bloquant : l'artisan change le taux sur la facture. La ligne porte l'adresse de l'installation et « immeuble achevé depuis plus de deux ans ». La certification du client s'imprime déjà dans les deux générateurs (`mentionTvaReduite.js`) : aucun générateur de devis ou de facture n'a été modifié.
- **Le rappel** : date conseillée (12 mois, ou 24 mois pour une PAC) et échéance légale calculée (chaudière : 31 décembre de l'année suivante ; PAC : 2 ans ; poêle : 12 mois). Dans « À faire » sur l'accueil et sur la fiche, avec un SMS prêt. E-mail automatique si l'artisan l'active : même mécanisme que le ramonage (consentement, lien de désinscription sans compte, une fois par échéance, jamais en retard). La phrase « obligatoire » du juriste n'apparaît que si la puissance est connue et dans le champ (chaudière 4-400 kW, PAC 4-70 kW hors contrat de performance énergétique ; poêle à bois ou granulés).
- **Désinscription** : page publique `/rappel-entretien/{jeton}`. Elle réutilise la fonction publique du ramonage, étendue : aucune nouvelle fonction ouverte aux visiteurs. Un refus vaut pour tous les rappels de l'artisan (ramonage et entretien), et c'est dit au client.
- **Politique de confidentialité** : paragraphe « Rappels d'entretien » ajouté.
- **Migration 113** (`supabase/migrations/113_attestations_d_entretien.sql`) et ses vérifications (`scripts/banc/113.mjs`).
- **Fonction Edge** `send-scheduled-relances` : bloc des rappels d'entretien (`entretien.ts`). **Non déployée.**

### Preuves

| Commande | Résultat |
|---|---|
| `npx vitest run` (fichiers du lot) | 52 tests verts : `entretien.test.js` (33), `attestationEntretienHtml.test.js` (5), `rappelsEntretienServeur.test.js` (7), `rappelsRamonageServeur.test.js` (7, inchangé). Chaque règle a son contre-essai (ex. : échéance chaudière ≠ 12 mois ; chaque champ de l'annexe 5 retiré fait échouer ; puissance inconnue → pas d'article ; 5,5 % refusé au charbon ; fiche d'un ouvrier écartée) |
| `npm run banc:migrations` | **663 vérifications, tout vert** (17 pour 113 : numérotation, lecture par l'organisation, gel, annulation, CO exigé, client et facture de l'organisation, lien de désinscription entretien ET ramonage, rappel automatique non effaçable, départ d'un membre) |
| `npm run verifier` (standard) | vert sur `b8eecde` + modifications : 1268 tests, lint 0 erreur, smoke, build |
| `npm run verifier -- --complet` | sur `5f36ced` : tests, lint, smoke, build, banc verts ; parcours : 3 échecs, sans nom dans le journal, arrêtée là. Relancés seuls sur le commit final (`987cc79`, build du pre-push) : **172 parcours sur 172 verts**. Audit d'interface lancé seul : **0 défaut sur 80 combinaisons** (il n'ouvre pas les fenêtres de saisie ; elles sont couvertes par le parcours entretien). La chaîne complète n'a donc pas été enregistrée verte d'un seul tenant : à relancer par la session locale avant de livrer |
| pre-push (smoke + tests + build) | vert sur `987cc79` |
| `npm run parcours -- entretien` | **vert, 27 vérifications**, en démo à 375 px : activer → onglet Entretien en premier → à vide, le type d'appareil est demandé → chaudière gaz saisie → alerte CO à 30 ppm → aperçu avec la phrase b, les tableaux, la classe, NF X50-010 → numéro `ENT-2026-00001` → PDF produit (> 20 ko) → facture à 10 % avec « immeuble achevé depuis plus de deux ans » → horloge avancée de 340 jours : rappel dans « À faire », SMS avec l'article R. 224-41-7 et STOP, sans « obligatoire » |

Captures (dossier ignoré `audit-ui/`) : `entretien-attestation-375.png`, `entretien-rappel-375.png`, `entretien-attestation.pdf`.

## 2. Relectures

- **critique-produit** (avant le code) : recommandait de ne faire que la chaudière. J'ai gardé les trois appareils, comme le demande D-33, avec un seul moteur. Retenu de son avis : reprise de l'an dernier, alerte CO à l'écran, tableau 11 mot pour mot, dates préremplies, plusieurs poêles dans une attestation, rappel du devis préalable dans Paramètres. Son risque principal reste vrai : **aucun testeur chauffagiste n'est nommé**.
- **juriste-btp** : « non applicable en l'état » au premier passage (2 bloquants). **Tout est corrigé** : plus de référence COV inventée pour le charbon ; plus de case 5,5 % pour une chaudière au charbon ; tableau 10 et phrases des conseils mot pour mot ; refus « pour tous les rappels » dit sur la page et l'attestation ; O2 et CO2 exigés pour une chaudière automatique ; échéance légale affichée seulement quand l'obligation est certaine ; « climatisation » pour le froid seul ; accords et libellés. Non fait : une puissance par poêle (« si possible », non exigé).
- **gardien-securite** : migration 113 **applicable**. Corrigé : M1 (dans une organisation, seule la fiche entreprise du propriétaire envoie les rappels automatiques ; avant, une fiche créée par un ouvrier pouvait écrire aux clients sous son nom — **vrai aussi pour le ramonage en production**, corrigé dans le même code) ; m1 (un rappel envoyé par le serveur ne s'efface plus par une ligne relue avant l'envoi) ; m2 (vérifications ajoutées). Reste : m1 côté ramonage (même défaut dans `figer_ramonage`, à corriger par une migration à part).

## 3. Ce qui reste

1. **Session locale** : relire, livrer sur `main`, puis appliquer 113 (après 107-112 si elles passent avant), **puis** redéployer `send-scheduled-relances` (D-22). Dans cet ordre : la fonction lit la table `entretiens`. Noté dans `docs/etat-production.md`.
2. `figer_ramonage` : même garde que m1 pour les ramonages (petite migration à part).
3. Le journal des rappels d'entretien (`relance_executions`) ne suit pas un membre qui quitte l'équipe (105 ne connaît que `devis` et `ramonages`) : sans effet sur l'envoi, à ajouter dans une prochaine migration de 105.
4. Calcul automatique du rendement, des NOx et de la classe (tableaux 1, 2, 4, 5, 12) : pas avant la relecture du fac-similé du JO.
5. Normes NF X50-010 / 011 non lues : l'artisan décrit ses opérations en texte libre.
6. Contrat d'entretien au forfait (lot 9), devis en un geste depuis l'attestation.

## 4. Décisions pour Hugo

1. **Devis préalable** : comme pour le ramonage, le parcours ne fait pas le devis exigé avant une visite payée à l'acte chez un particulier (arrêté du 24 janv. 2017, art. 4). Le risque est rappelé dans Paramètres → Entretien. Garder ainsi, ou ajouter un « devis en un geste » (recommandé par le juriste, question 5) ?
2. **Un refus vaut pour tous les rappels** (ramonage et entretien) : c'est mon choix, le plus protecteur, et il est dit au client. À confirmer.
3. **Phrase « Vous restez libre de confier cet entretien au professionnel qualifié de votre choix »** dans l'e-mail quand l'obligation est citée : ajoutée (recommandée par le juriste, question 6). À confirmer.
4. **PAC sans attestation de capacité** : simple rappel à l'écran, jamais bloquant (recommandé, question 2).
5. **Testeur** : un chauffagiste ou un frigoriste réel pour essayer le parcours avant d'en parler.

## 5. Textes nouveaux soumis au juriste

Tous relus le 4 nov. (voir § 2) : libellés des points contrôlés (trois annexes 1), phrases du CO et devoir de l'article 3, tableaux 9, 10, 11, 13, phrases des conseils (PAC, poêle ; la mention « conformes aux recommandations de l'ADEME » n'est pas imprimée, ces recommandations n'ayant pas été lues), pieds de page, phrase d'attestation, information sur les rappels, e-mail et SMS de rappel, critères du 5,5 %, aides à l'écran (TVA, CO, attestation de capacité, devis préalable, foyer ouvert), page de désinscription, paragraphe de la politique de confidentialité.

## 6. Risques

- **Panne verte possible** : avant l'application de 113, la lecture de `entretiens` échoue en silence (erreur de schéma, comme prévu par `detecterEchecsChargement`) ; un artisan qui active le module verrait ses attestations refusées à l'enregistrement. **Ne pas livrer le front sans appliquer 113 le même jour.**
- La fonction Edge redéployée avant 113 : le bloc entretien écrirait une erreur de lecture par entreprise concernée (aucune tant que personne n'a activé l'envoi automatique), le reste continue.
- Réappliquer 104 un jour remettrait l'ancienne fonction de désinscription : les liens des rappels d'entretien répondraient « lien non reconnu ». Contrôle noté dans l'en-tête de 113.
- 15 jours ouvrés du poêle : comptés du lundi au vendredi sans jours fériés (alerte seulement, date limite plus prudente que la vraie).
- Environ 25 champs pour une chaudière : le temps de saisie réel n'est pas mesuré.

### Recoupements avec `cloud/retours`

`origin/main` n'avait rien de nouveau (fusion : « Already up to date »). `cloud/retours` touche des fichiers que je modifie aussi, dans d'autres zones :
- `src/components/ramonage/SaisieRamonage.jsx` : j'exporte `Choix`, `Section` et `Signature` (3 lignes) ; `cloud/retours` ajoute la case « Imprimer les conseils ». Fusion sans conflit attendue.
- `src/services/entrepriseService.js` : les deux branches ajoutent un réglage juste après `ramonageTarifs` (`ramonageConseils` d'un côté, les `entretien…` de l'autre) : **conflit textuel probable, à résoudre en gardant les deux**.
- `src/context/DataContext.jsx` : `cloud/retours` fait rendre `ECRITURE_EN_ATTENTE` (valeur vraie) à `modifierEnBase` ; mon code teste `!== false`, donc compatible.
- `src/lib/ramonage.js`, `src/components/settings/RamonageTab.jsx` : j'en importe seulement `lienSms`, `lienAppel`, `emetteurDe` et `Interrupteur`, que `cloud/retours` ne change pas.

## Résumé (10 lignes)

1. L'attestation d'entretien (chaudière, PAC/clim, poêle/insert) marche de bout en bout en démo à 375 px.
2. Activation dans Paramètres → Entretien ; onglet « Entretien » sur la fiche client.
3. Champs exigés par l'annexe de chaque arrêté, alerte CO, reprise de l'an dernier.
4. Numéro par la base, document figé, PDF, envoi, facture au taux proposé (10 / 5,5 / 20 %, jamais imposé).
5. Rappel à la bonne périodicité ; « obligatoire » avec son article seulement si la puissance le permet.
6. Migration 113 prête (banc : 663 vérifications vertes), non appliquée ; fonction Edge prête, non déployée.
7. Juriste et gardien : tous les bloquants et majeurs corrigés ; un défaut de sécurité du ramonage corrigé au passage.
8. Ordre en production : livrer, appliquer 113, puis redéployer `send-scheduled-relances`.
9. À décider par Hugo : devis préalable, refus valable pour tous les rappels, testeur chauffagiste.
10. Conflit probable avec `cloud/retours` dans `entrepriseService.js` (garder les deux réglages).

## Corrections de la relecture du 4 nov.

Session cloud de correction, le 4 nov. au soir. `origin/main` fusionné deux fois (`db82cf9`, `4ca8e62`). Conflits résolus en gardant les deux côtés : `entrepriseService.js` (`ramonageConseils` et les six réglages `entretien…`), `LegalPages.jsx` (dictée IA et rappels d'entretien), `docs/etat-production.md` (lignes 107, 108, 109, 113 et 114).

### Défauts de la relecture

| # | Point | Fait | Commit |
|---|---|---|---|
| 1 | Vérification complète sur la tête de branche | Relancée après `npm ci` : résultat ci-dessous | — |
| 2 | Appareils de mesure exigés pour un poêle | Exigés pour la chaudière et la PAC seulement : `manquants()`, CHECK conditionnel dans 113 (`entretiens_appareils_mesure`), champ « facultatif » à la saisie pour le poêle, plus de bloc « Mesures » vide sur l'attestation, aide de Paramètres corrigée. Tests et banc (4 bis) avec contre-essai | `25f9222`, `4bf7ea2` |
| 3 | Obligation dans l'e-mail d'une PAC ou d'un poêle | Limitée à la chaudière, côté app (`phraseObligation`) et côté serveur (`phraseObligationServeur`). Les formules du juriste pour la PAC et le poêle sont gardées en commentaire. Question posée à Hugo (`Q-entretien-obligation`). Test : aucun article dans l'e-mail d'une PAC ou d'un poêle | `25f9222`, `28da03f` |
| 4 | Lien `/rappel-entretien/{jeton}` sans preuve | Deux parcours en mode réel simulé dans `scripts/parcours/entretien.cjs` : rien ne part à l'ouverture, le refus part au bouton avec le jeton, « C'est noté » s'affiche ; contre-essai avec un jeton refusé : « Lien non reconnu » | `4bf7ea2` |
| 5 | Choix de la fiche qui envoie | `fichesQuiEnvoient` écarte d'abord les fiches archivées, sans module actif ou sans e-mail (`ficheValable`), puis choisit celle du propriétaire. `fichesSansEmail` remet « sans-email-entreprise » dans le rapport. Test avec contre-essai. `entreprise.created_at` : la colonne est déjà lue par les migrations 083, 086 et 108 et par `notify-signature`, mais elle n'a pas été vérifiée en production (pas d'accès) | `25f9222` |
| 6 | TVA proposée en franchise | `estFranchiseTva(entreprise)` est passé à `tauxPropose`. En franchise, la case « logement de plus de deux ans », la case 5,5 % et leur aide sont masquées, et le prix s'appelle « Prix (€) » | `4bf7ea2` |
| 7 | Banc 113 qui masquait l'appel visiteur | L'appel serveur est supprimé. Le refus est lu dans la transaction du visiteur, pour l'entretien et pour le ramonage. **Ce point a montré que l'ancien contrôle ne prouvait rien** : sans l'appel serveur, la lecture faite après coup tombait sur la transaction annulée. Mémoire du gardien mise à jour | `25f9222`, `4068503` |
| 8 | « Rappel noté » avant l'écriture | `suivreAvecEtat` (`src/lib/suiviRappel.js`) : la carte ne passe à « noté » qu'une fois l'écriture faite et reste telle quelle si elle échoue. Côté entretien ET côté ramonage. Test avec contre-essai | `4bf7ea2` |
| 9 | PAC air/air de plus de 12 kW | Critères ajoutés (texte exact du juriste) | `25f9222` |
| 10 | Secondes relectures et erratum 5 | juriste-btp et gardien-securite relancés (voir plus bas). Erratum 5 posé à Hugo (`Q-entretien-reseau`) | `28da03f` |

### Juriste-btp (10 points à corriger) et gardien-securite (figer_entretien)

- Juriste 1 à 9 : textes exacts appliqués dans `entretien.js` (5,5 % pour le poêle, la chaudière bois et la PAC air/air ; classe « Non déterminée » acceptée hors du cas gaz ou fioul de moins de 70 kW ; délais « établie… puis remise » et « remise »), `SaisieEntretien.jsx` (puissance, chaudières en réseau, mesure du CO, classe, alerte de délai) et `EntretienTab.jsx` (attestation de capacité). **Une adaptation** au point 9 : à cause de D-33, Paramètres dit que l'obligation n'est citée que pour une chaudière. Le texte complet du juriste est gardé en commentaire.
- Juriste 10 : modèle « Entretien PAC (au moins tous les deux ans) » ; ligne « Établissement et remise de l'attestation d'entretien (due à chaque entretien) » dans les deux modèles. Reste le même libellé « Entretien annuel PAC » dans le catalogue `src/lib/data/articles-btp-suite.js:315`, que le juriste n'a pas cité : non modifié.
- Gardien (`figer_entretien`) : `client_id`, `remplace_id` et `updated_at` sont figés comme dans 111, et `NEW.updated_at := now()`. Banc 6 quinquies : un compte ne vide ni le client ni l'attestation remplacée, et une seconde attestation de remplacement est refusée. Contre-essai : avec l'ancienne règle, 2 échecs au banc.

### Secondes relectures (4 nov., en cloud)

- **juriste-btp** : les deux écarts (obligation limitée à la chaudière dans Paramètres ; prix et TVA en franchise) sont jugés **OK**. La phrase d'obligation de la chaudière est conforme. Rien d'autre à corriger.
- **gardien-securite** : la 113 est **applicable**. La fonction est applicable après correction d'un **défaut important**, un reste de M1 : une fiche **sans organisation** lisait aussi les lignes que son auteur avait saisies dans l'organisation de son patron, et écrivait à ces clients sous son nom (ramonage aussi). **Corrigé** dans `833817a` : `dansPortee` ajoute `organization_id IS NULL`, avec un test et un contre-essai. Mineur laissé : la boucle de `index.ts` revérifie le module et l'e-mail, ce qui ne sert plus mais reste un filet de sécurité.

### Preuves

| Commande | Résultat |
|---|---|
| `npm ci` | fait |
| `npx vitest run` (fichiers entretien et rappels) | verts : `entretien.test.js` 35, `attestationEntretienHtml.test.js` 6, `rappelsEntretienServeur.test.js` 10, `suiviRappel.test.js` 3 |
| `npm run banc:migrations` | **785 vérifications, tout vert** |
| `npm run verifier -- --complet` sur `833817a` (avant la 2ᵉ fusion de main) | tests (1464), lint (0 erreur), smoke, build et banc **verts**. Les parcours ont été coupés par un redémarrage de la session |
| **`npm run verifier -- --complet` sur `c670f7b`** (tête fusionnée avec `origin/main`, dernier commit de code compris, arbre propre) | **tout vert** : tests 1464/1464, lint 0 erreur, smoke, build, banc, parcours navigateur (dont les deux nouveaux parcours du lien d'entretien), audit d'interface 0 défaut. Enregistré dans `audit-ui/derniere-verification.json` le 05/11 à 00 h 54 UTC. Le commit suivant (`a3637ad` et la suite) ne touche que ce rapport |
| 1ᵉʳ essai `--complet` sur `4bf7ea2` | parcours en échec : `dist/index.html` a été effacé pendant que d'autres agents tournaient en parallèle. Erreur d'environnement, pas de code ; relancé seul ensuite |

Les captures et le journal sont dans le dossier `audit-ui/` de la session cloud, pas dans le dépôt.

### Ce qui reste (session locale)

1. Fusion avec la branche d'intégration et les autres branches métier (conflits annoncés : `Settings.jsx`, `entrepriseService.js`, `DataContext.jsx`, `useSupabaseSync.js`, `LegalPages.jsx`, `etat-production.md`, mémoire du gardien), puis `npm ci`, `--complet`, parcours entretien et ramonage, banc.
2. Avant de redéployer `send-scheduled-relances`, vérifier en lecture seule en production : la colonne `entreprise.created_at`, et que les 2 fiches avec `ramonageEnvoiAuto` sont celles du propriétaire de leur organisation, **ou des fiches sans organisation dont les ramonages n'ont pas d'organisation** (correctif M1 bis : une fiche sans organisation ne lit plus que les lignes sans organisation).
3. Ordre D-22, le même jour : livrer le front, appliquer 113 (déjà corrigée : appareils de mesure, gel des liens), redéployer la fonction (`entretien.ts` dans le contrôle md5), passage à blanc.
4. Non fait ici, hors des corrections demandées :
   - le libellé « Entretien annuel PAC » du catalogue (`articles-btp-suite.js:315`) ;
   - la date « Version du 24 octobre 2026 » de la politique de confidentialité, qui change avec ce lot ;
   - les libellés « HT » sans franchise des autres écrans (tâche franchise-suite) ;
   - `figer_ramonage` (m1 côté ramonage, migration à part).

### Décisions d'Hugo (aucune appliquée)

- `Q-entretien-obligation` (nouvelle, dans `docs/decisions.md`) : écrire l'obligation avec son article dans le rappel d'une PAC ou d'un poêle ? En attendant, seulement pour la chaudière.
- `Q-entretien-reseau` (nouvelle, erratum 5) : chaudières en réseau dans un même local, une attestation pour l'ensemble ou une par chaudière ?
- Devis préalable (arrêté du 24 janv. 2017, art. 4) : garder le parcours sans devis, ou ajouter un « devis en un geste » (recommandé par le juriste) ? Avec, à défaut, l'avertissement des sept jours (L. 221-10) proposé par le juriste.
- Un refus de rappel vaut pour tous les rappels de l'artisan (ramonage et entretien) : à confirmer.
- La phrase « Vous restez libre de confier cet entretien au professionnel qualifié de votre choix » : à confirmer.
- PAC sans attestation de capacité : une simple information, jamais bloquante : à confirmer.
- Case « Logement achevé depuis plus de deux ans » cochée par défaut : la garder, ou exiger un choix ?
- Le 5,5 % sur simple déclaration de l'artisan et le rendement saisi à la main : à confirmer.
- Trouver un vrai chauffagiste ou frigoriste pour tester le parcours.

### Textes nouveaux soumis au juriste

Tous relus le 4 nov. au soir (seconde relecture : OK) : les dix corrections du juriste, appliquées mot pour mot ; la phrase de Paramètres limitée à la chaudière ; « Prix (€) » et « TVA non applicable (article 293 B du CGI) » en franchise ; l'aide des appareils de mesure (« exigées pour la chaudière et la pompe à chaleur, facultatives pour un poêle ou un insert »).

### Risques

- Le correctif M1 bis change aussi l'envoi des rappels de ramonage en production. Une fiche **sans organisation** dont les ramonages portent une organisation n'enverrait plus rien, sans erreur. D'où le point 2 ci-dessus.
- Avant l'application de 113, la base refuse les attestations et l'app lit une table absente : livrer le front et 113 le même jour.
- Ne jamais rejouer 104 après 113.

### Résumé (10 lignes)

1. Les 10 défauts de la relecture, les 10 corrections du juriste et le défaut `figer_entretien` du gardien sont appliqués.
2. Appareils de mesure facultatifs pour le poêle, dans l'app ET dans la 113 (pas encore appliquée).
3. L'obligation et son article ne sortent que dans le rappel d'une chaudière ; la question est posée à Hugo.
4. Le lien de désinscription de l'entretien a ses parcours en mode réel, avec un contre-essai.
5. Le banc prouve maintenant le refus fait par un visiteur. L'ancien contrôle ne le prouvait pas.
6. « Rappel noté » n'apparaît qu'après l'écriture, pour l'entretien comme pour le ramonage.
7. Seconde relecture : juriste OK. Gardien : un reste de M1 (fiche sans organisation), corrigé.
8. `npm run verifier -- --complet` vert sur la tête fusionnée avec `origin/main` (`c670f7b`).
9. Avant de redéployer : vérifier en production quelles fiches envoient les rappels de ramonage.
10. 9 décisions pour Hugo, dont 2 nouvelles (obligation PAC et poêle, chaudières en réseau).

## Décisions d'Hugo du 5 nov. (lot 4)

Session cloud de correction du 5 nov. 2026, sur la branche locale `corr4-metier-entretien`, partie de `origin/cloud/metier-entretien` à `c2c9b499`. Rien n'est fusionné ni poussé ; `main` n'est pas fusionné ; la production, les secrets, `CLAUDE.md` et `.claude/` ne sont pas touchés. Les décisions D-38 d'Hugo (« OK pour tout ») sont appliquées sans être rouvertes. Cette section remplace les passages plus haut qui disent que l'obligation ne sort que pour la chaudière ou que les décisions restent ouvertes. Les tests qui citent les formules du juriste les lisent dans `docs/metiers/avis-juriste-2026-11-04-entretien.md` : ce fichier doit rester à ce chemin. Commits : `a42d3fb6` (1), `f6049069` (5), `a8ea545a` (4), `7a0341aa` (3), `87c05356` (1 et 6), `c4ab6aee` (2), `05c6bf63` (point 10 de la v3), `dae7c947` (parcours), `3516ed4f` (mappage du devis).

### Résumé

1. Les 10 défauts de la v3, les 10 corrections du juriste et le défaut `figer_entretien` sont bien dans le code, texte par texte. Un point n'était pas fait et ne dépendait d'aucune décision : le libellé « Entretien annuel PAC » du catalogue, corrigé.
2. Décision 1 : la phrase d'obligation est rétablie pour la PAC (visite + 2 ans) et le poêle, côté app, serveur et Paramètres, avec les formules de l'avis lues par les tests.
3. Décision 2 : « Faire le devis de la visite » sur l'attestation crée un brouillon par `addDevis` et l'ouvre dans l'éditeur ; la facture rappelle les sept jours chez un particulier.
4. Décision 3 : le refus vaut pour tous les rappels (déjà le cas), prouvé par un test sur les quatre chemins ; les écrans du ramonage le disent maintenant.
5. Décision 4 : aide des chaudières en réseau avec la citation de R. 224-20. Décision 5 : la case du logement n'est plus cochée d'avance, ni à l'écran, ni à la synchronisation, ni en base. Décision 6 : l'attestation de capacité reste une information.
6. Sur les sources de la v3, les 6 fichiers de tests écrits ou modifiés ici échouent 34 fois sur 93 ; sur ma tête, 93 sur 93.

### Contrôle des corrections v3

| Point de la consigne v3 | État | Preuve |
|---|---|---|
| 1. Vérification sur la tête de branche | fait par la v3 ; rejoué ici au niveau standard | Rapport l. 137 : `--complet` sur `c670f7b`, et seuls des commits de rapport suivent (`git diff --stat c670f7b c2c9b499` : ce rapport seul). Le `--complet` sur l'assemblage reste à la session locale. Mes résultats : plus bas. |
| 2. Appareils de mesure facultatifs pour un poêle | fait | `src/lib/entretien.js:557` (`manquants`), `supabase/migrations/113_attestations_d_entretien.sql:99` (CHECK conditionnel), `SaisieEntretien.jsx:296` (champ facultatif), `attestationEntretienHtml.js:199` (pas de bloc « Mesures » vide), `EntretienTab.jsx:94` (aide), banc 4 bis (`scripts/banc/113.mjs:75`), tests `entretien.test.js` et `attestationEntretienHtml.test.js:23` |
| 3. Obligation de l'e-mail limitée à la chaudière | fait en v3, **levé par la décision 1** | voir la décision 1 |
| 4. Lien `/rappel-entretien/{jeton}` | fait | `scripts/parcours/entretien.cjs:228` (rien ne part à l'ouverture, le refus part au bouton avec le jeton, « C’est noté ») et `:252` (jeton refusé : « Lien non reconnu »), mode réel simulé ; rejoués : verts |
| 5. Fiche qui envoie les rappels | fait | `supabase/functions/send-scheduled-relances/entretien.ts:174-199` (`ficheValable` d'abord, puis la fiche du propriétaire ; `fichesSansEmail`), `index.ts:519` et `:663`, test « une fiche du propriétaire inutilisable… » avec contre-essai |
| 6. TVA proposée en franchise | fait | `SaisieEntretien.jsx:50` (`estFranchiseTva`), `:408` et `:412` (cases masquées), `:422-423` (« Prix (€) »), `actionsEntretien.js` (`donneesFacture` passe `franchise`) |
| 7. Banc 113 : appel visiteur non masqué | fait | `scripts/banc/113.mjs:111-133` (`refusVisiteur` : lu dans la transaction du visiteur, pour l'entretien ET le ramonage). Mémoire du gardien (`.claude/agent-memory/gardien-securite/MEMORY.md:32-35`) à jour ; lue, non modifiée (`.claude/` interdit) |
| 8. « Rappel noté » avant l'écriture | fait | `src/lib/suiviRappel.js`, `RappelEntretien.jsx:24-25`, `RappelRamonage.jsx:32-33`, `suiviRappel.test.js` (contre-essai : écriture refusée) |
| 9. PAC air/air de plus de 12 kW | fait | `src/lib/entretien.js:430-431` (`criteres55`) |
| 10. Secondes relectures, erratum 5 | fait | rapport l. 124-127 ; l'erratum 5 est tranché par Hugo (décision 4) |
| Juriste 1 (poêle 5,5 %) | fait | `entretien.js:434` |
| Juriste 2 (chaudière bois 5,5 %) | fait | `entretien.js:426` |
| Juriste 3 (PAC air/air 5,5 %) | fait | `entretien.js:431` |
| Juriste 4 (classe énergétique) | fait | `entretien.js:65` (`CLASSES`), `:568` (`manquants`), `SaisieEntretien.jsx:352` (aide) |
| Juriste 5 (aides de puissance) | fait | `entretien.js:395` et `:402` (constantes, voir la décision 4) ; `SaisieEntretien.jsx:196` et `:287` |
| Juriste 6 (aide du CO) | fait | `SaisieEntretien.jsx:305` |
| Juriste 7 (délai de l'attestation) | fait | `entretien.js:29`, `:37`, `:44` ; `SaisieEntretien.jsx:391` |
| Juriste 8 (attestation de capacité) | fait | `EntretienTab.jsx:96` |
| Juriste 9 (texte de Paramètres) | adapté en v3, **rétabli par la décision 1** | `entretien.js:405` (`AIDE_OBLIGATION_RAPPEL`), `EntretienTab.jsx:86` |
| Juriste 10 (modèles) | fait pour les modèles ; **le catalogue ne l'était pas** : fait ici | `src/lib/data/modeles/chauffage.js:220`, `:225`, `:234` ; `src/lib/data/articles-btp-suite.js:315` (commit `05c6bf63`, test `modelesEntretien.test.js`) |
| Gardien : `figer_entretien` | fait | `113…sql:192-232` (`client_id`, `remplace_id` et `updated_at` figés), banc 6 quinquies (`113.mjs:155`) |

Contrôle des textes de la consigne v3 : un script jetable cherche, dans `src/` et `supabase/functions/`, chaque chaîne « correction exacte » de la consigne ; les dix y sont (à la lecture du point 9 près, levé par la décision 1). Les autres « non faits » de la v3 ne dépendent pas de moi : date de la politique de confidentialité (le jour de la livraison), libellés « HT » (tâche franchise-suite), `figer_ramonage` (autre migration).

### Décisions appliquées

**1. Obligation écrite dans le rappel de la PAC et du poêle** (`a42d3fb6`, `87c05356`)
- App : `src/lib/entretien.js:378` (`phraseObligation`) et `:362` (`dateEnLettres`). Serveur : `supabase/functions/send-scheduled-relances/entretien.ts:104` (`phraseObligationServeur`), `:79` et `:89` (même date en lettres, visite + 2 ans). Paramètres › Entretien : `entretien.js:405`, `EntretienTab.jsx:86`.
- Formules du § 4.5 de l'avis, caractères du fichier de l'avis (apostrophes droites) pour la PAC et le poêle ; la chaudière est inchangée (apostrophes typographiques). La PAC donne « au plus tard le {visite + 2 ans} » en toutes lettres (« 4 novembre 2028 ») ; jamais la date conseillée comme échéance. Les conditions restent `obligationConnue` (PAC de 4 à 70 kW connue, hors contrat de performance ; poêle à bois ou à granulés, ni « autre biomasse » ni hydraulique). L'e-mail garde « Vous restez libre de confier cet entretien… » quand l'obligation est citée.
- Tests : `entretien.test.js` (PAC 4-70 kW connue → la formule lue dans l'avis ; puissance inconnue, 3 kW, 80 kW, contrat de performance → rien ; poêle → la formule ; « autre biomasse » ou hydraulique → rien ; 29 février ; chaudière inchangée), `rappelsEntretienServeur.test.js` (e-mail PAC et poêle avec la formule et le libre choix, jamais « obligatoire » ni dans l'objet ; même règle et même phrase que l'app sur 13 cas ; visite lue à l'heure de Paris), `entretienReglages.test.jsx` (Paramètres).
- Contre-essai : 8 tests rouges avant la modification (sortie vitest), verts après ; le test des réglages échoue avec l'ancien `EntretienTab.jsx`.

**2. « Faire le devis de la visite »** (`c4ab6aee`)
- Bouton sur l'attestation, à côté de « Faire la facture », derrière `canPerform('devis', 'create')` : `FicheEntretien.jsx:91` (`faireDevis`) et `:164`. Il appelle `addDevis(donneesDevis(...))` : la création de devis existante de `DataContext` (numéro, limite du plan, conditions d'utilisation), aucun nouveau chemin d'enregistrement.
- `donneesDevis` : `src/components/entretien/actionsEntretien.js:95` ; la ligne : `src/lib/entretien.js:635` (`ligneDevisVisite`). Brouillon daté du jour, valable 30 jours (ou la validité de l'entreprise), le client, une ligne au forfait « Entretien de … — appareil — installation : adresse » (et « immeuble achevé depuis plus de deux ans » si la case est cochée et le taux réduit), au tarif de Paramètres › Entretien s'il existe, **sinon sans prix** (le prix du dernier entretien n'est pas repris, comme le dit la fiche), au taux proposé par les règles de l'entretien (10 %, 5,5 % déclaré, 20 % sans la case, aucun en franchise). Il n'est jamais envoyé.
- Ouverture dans l'éditeur habituel : `OngletEntretien.jsx:161` → `ouvrirDevis({ editer: id })` (App.jsx, commentaire de `ouvrirDevis`) → `DevisPage.jsx:451` (nouvelle branche de `demande`). Sans `ouvrirDevis`, repli sur la fiche du devis.
- Sept jours : `FicheEntretien.jsx:80` ; texte `entretien.js:656-658` (`avertissementSeptJours` : client particulier seulement). Le texte du ramonage « s'il existe déjà sur main » n'existe pas (le ramonage n'a qu'une phrase dans Paramètres) : c'est le texte proposé par le juriste, mot pour mot, en notification d'avertissement de 9 s ; l'erreur « lien non enregistré » garde la place si les deux s'appliquent.
- Paramètres › Entretien : la dernière phrase du paragraphe « devis préalable » (« Le parcours entretien ne fait pas ce devis ») n'était plus vraie ; elle dit maintenant que le bouton prépare le devis. La partie légale est inchangée.
- Tests : `devisVisiteEntretien.test.js` (le devis porte le client, l'adresse et la ligne ; un autre client, une autre adresse ou un autre appareil donnent un autre devis ; tarif ou sans prix ; taux ; brouillon, 30 jours, jamais envoyé ; pas de numéro ni de date de visite passée ; un forfait ; sept jours : texte et condition particulier ; ce que le mappage envoie à la table `devis` ; câblage du bouton), `entretienReglages.test.jsx`. Contre-essai : 11 tests rouges avant (le douzième, sur le mappage, a été écrit ensuite, avec le commit `3516ed4f`). Parcours : étapes 7 (sept jours) et 9 (ouverture de l'attestation, bouton, éditeur sur « Modifier devis » avec Marie Dupont, la ligne et l'adresse, brouillon `DEV-…` stocké à 10 %), captures `audit-ui/entretien-fiche-devis-375.png` et `entretien-devis-375.png`.

**3. Un refus de rappel vaut pour tous les rappels** (`7a0341aa`)
- Vérifié : le refus est une seule date sur la fiche du client (`clients.rappels_refuses_le`), posée par le lien de n'importe quel rappel (113 : `refuser_rappels_ramonage` reconnaît les deux jetons ; banc 6 et 6 bis), lue par les quatre chemins (`ramonage.js` et `entretien.js` dans l'app, `ramonage.ts` et `entretien.ts` au serveur). Gardé tel quel.
- Les écrans du ramonage le sous-disaient, sur une action irréversible (« ne recevra plus de rappel de ramonage », « a refusé les rappels de ramonage ») : les trois textes sont maintenant communs (`src/lib/suiviRappel.js`) et employés par les deux onglets et les deux saisies. Le parcours ramonage attend la nouvelle ligne.
- Tests : `refusRappels.test.jsx` (avec le refus, aucun des quatre rappels ne sort ; sans, les quatre sortent ; un autre client n'est pas touché ; la page publique le dit pour les deux sujets ; les écrans de l'artisan emploient les mêmes textes). Contre-essai : les deux tests de texte étaient rouges avant ; les tests de données passaient déjà (c'était déjà le cas).

**4. Chaudières en réseau dans un même local** (`a8ea545a`)
- `src/lib/entretien.js:394-402` (constantes), `SaisieEntretien.jsx:196` et `:287`. L'aide de la puissance d'une chaudière dit qu'elles forment une seule chaudière, une seule attestation pour l'ensemble, la somme des puissances, et cite R. 224-20, 1°, alinéa 2, mot pour mot (lu dans l'avis par le test). L'aide de la PAC est celle de la relecture (R. 224-42, 1°). Un poêle n'affiche plus le libellé « chaudières en réseau ».
- Tests : `entretien.test.js` (4). Contre-essai : rouges avant (constantes absentes).

**5. Case « logement achevé depuis plus de deux ans »** (`f6049069`)
- Jamais cochée d'avance, même reprise de l'an dernier : `entretien.js:511`. Elle était aussi « vraie » par défaut ailleurs : la synchronisation envoyait « vrai » si la valeur manquait (`src/hooks/useSupabaseSync.js`, `=== true` maintenant) et la colonne avait `DEFAULT true` (`113…sql:82`, `DEFAULT false` ; 113 n'est pas appliquée, la table est modifiée sur place). Sans la case : 20 %, aucune mention.
- Tests : `entretien.test.js` (brouillon, taux, ligne de facture, reprise, synchronisation) ; banc 4 ter (`113.mjs:83`) ; parcours entretien (case décochée à l'ouverture, cochée par l'artisan, facture à 10 % avec la mention). Contre-essai : 4 tests rouges avant ; banc avec l'ancien défaut `true` : 1 échec sur 786.
- Une attestation refaite (« annule et remplace ») garde le choix de l'attestation annulée : c'est son propre document, pas une case cochée d'avance.

**6. PAC sans attestation de capacité saisie** (`87c05356`)
- Vérifié et gardé : `manquants()` ne prend pas l'entreprise et ne demande jamais l'attestation ; l'écran ne montre qu'une note (`SaisieEntretien.jsx`, sans `role="alert"`) ; le champ de Paramètres est facultatif.
- Tests : `entretien.test.js` (une PAC au R32 au contrôle d'étanchéité déclaré s'enregistre ; contre-essai : ce qui bloque reste l'étanchéité et le fluide), `entretienReglages.test.jsx` (champ « facultatif »).

Points tranchés par Claude, non modifiés : la phrase « Vous restez libre… » reste dans l'e-mail quand l'obligation est citée (testé pour les trois appareils) ; le 5,5 % reste proposé sur la déclaration de l'artisan et le rendement saisi à la main.

### Textes nouveaux « À relire par le juriste »

1. **Aide de la puissance d'une chaudière** (`entretien.js:400`) : « Plusieurs chaudières en réseau dans un même local forment une seule chaudière (article R. 224-20, 1°, alinéa 2, du code de l’environnement) : faites une seule attestation pour l’ensemble, avec la somme de leurs puissances. Décrivez les autres chaudières du réseau dans les observations. » La citation qui suit est mot pour mot celle de l'erratum 5 ; le reste, dont le renvoi aux observations, est de moi. Le nombre d'attestations d'un réseau est le choix d'Hugo (une pour l'ensemble), que le texte d'origine ne tranche pas.
2. **Avertissement des sept jours** (`entretien.js:656`) : texte proposé par le juriste dans la relecture du 4 nov., repris mot pour mot (« article L221-10 » sans point, comme chez lui) ; seule la durée d'affichage (9 s) est de moi.
3. **Case « logement achevé depuis plus de deux ans »** (`SaisieEntretien.jsx:410`) : « À cocher par vous, à chaque attestation. Cochée : la facture est proposée à 10 % et le dit. Sinon : 20 %, sans cette mention. Vous pourrez changer la TVA sur la facture. »
4. **Paramètres › Entretien, devis préalable** (`EntretienTab.jsx:103`) : la phrase ajoutée « Sur une attestation, « Faire le devis de la visite » prépare ce devis pour la prochaine visite : vous le complétez dans l’éditeur, puis vous l’envoyez. » ; le reste du paragraphe est inchangé.
5. **Ligne du devis de la visite** (`entretien.js:635`) : « Entretien de … — appareil — installation : adresse — immeuble achevé depuis plus de deux ans » (la dernière partie seulement si la case est cochée et le taux réduit), au forfait. Même construction que la ligne de la facture, sans le numéro ni la date de la visite.
6. **Écrans du ramonage et de l'entretien sur le refus** (`suiviRappel.js`) : « … ne recevra plus aucun rappel, ni de ramonage ni d’entretien (ni SMS proposé, ni e-mail automatique). Ce refus ne s’annule pas. » ; « Ce client a refusé les rappels le … (ramonage et entretien). » ; « Noté sur sa fiche : ni e-mail automatique, ni SMS proposé, pour aucun rappel (ramonage et entretien). »
7. **Format de la date de la PAC** : « au plus tard le 4 novembre 2028 » en toutes lettres (la chaudière écrit « 31 décembre 2027 »). Les formules de l'avis ne donnent pas de format pour `{date de la visite + 2 ans}`.

### Ce qui n'a pas été fait, et pourquoi

- **SMS de rappel d'une PAC ou d'un poêle** : sans phrase d'obligation. L'avis ne donne la formule du SMS que pour la chaudière (`texteSms`, inchangé) ; rien n'est inventé. À demander au juriste si Hugo veut l'étendre.
- **Bouton sur la carte de l'appareil** (onglet Entretien) : le bouton est sur l'attestation seulement, comme le dit la fiche en premier choix. Pour un rappel qui arrive, la carte de l'appareil serait un accès plus court (un toucher de moins) ; même fonction `faireDevis`, à ajouter si Hugo le veut.
- **Parcours en mode réel simulé du bouton « Faire le devis de la visite »** : non écrit. Le parcours joue le bouton en démo ; l'écriture réelle est celle de `addDevis` (la création de l'éditeur) et un test lit ce que le mappage envoie à la table `devis`. Le mode démo cache les pannes du mode réel : à constater au premier essai réel (le brouillon doit apparaître dans la liste des devis, numéroté par la base).
- **Sept jours sur la facture d'un ramonage** : la fiche dit « comme pour le ramonage (D-30) », mais le ramonage n'a pas cette notification (seulement la phrase de Paramètres › Ramonage). Non ajoutée au ramonage : hors fiche.
- **Reprise de l'an dernier de la case « appareil éligible au 5,5 % »** (`entretien.js`, `nouveauBrouillon`) : reste reprise. La décision 5 ne vise que le logement ; le 5,5 % « sur déclaration de l'artisan » est un point tranché, mais une case reprise est aussi une case cochée d'avance : à confirmer par Hugo ou le juriste.
- **`docs/decisions.md`** : non modifié (D-38 à consigner par la session locale ; `Q-entretien-obligation` devient « trois appareils », `Q-entretien-reseau` « ensemble », et les questions du devis, du refus, de la phrase « libre », de la PAC, de la case et du 5,5 % sont tranchées). **`docs/etat-production.md`** : non modifié, la ligne 113 dit 785 vérifications (16 dans `113.mjs`) ; c'est 786 (17) avec le banc 4 ter.
- **`docs/metiers/*.md`**, politique de confidentialité (date de version), `figer_ramonage`, libellés « HT » : hors fiche, comme dans le rapport précédent.

### Commandes lancées et résultats

| Commande | Résultat |
|---|---|
| `git fetch origin`, `git checkout -B corr4-metier-entretien origin/cloud/metier-entretien`, `npm ci` | fait |
| `npx vitest run` (fichiers entretien, rappels, refus, devis, modèles, réglages) | verts |
| `npm run banc:migrations` | **786 vérifications, tout vert** (785 + 4 ter) ; contre-essai avec `DEFAULT true` : 1 échec sur 786 |
| `npm run build`, `npm run parcours -- entretien` | **3 parcours verts** : 35 vérifications pour le premier (27 avant), 4 et 1 pour les liens |
| `npm run parcours -- ramonage` | **17 parcours verts** |
| Contre-essai global | les sources de la v3 remises (`checkout` de `c2c9b499` sur les fichiers de code) : **34 échecs sur 93** dans les 6 fichiers de tests de ce lot ; sources restaurées, 93 sur 93, arbre propre |
| `npm run verifier` (standard) sur `3516ed4f` (dernier commit de code ; seul ce rapport était modifié) | **vert** : tests 1512 par passage (normal, Martinique, Nouméa), lint 0 erreur (244 avertissements existants), smoke, build. Une première passe sur `dae7c947`, arbre propre, était verte aussi (1511 tests) |

Le commit qui suit `3516ed4f` ne touche que ce rapport. Non lancé : `npm run verifier -- --complet` (parcours complets, audit d'interface), réservé à la session locale sur l'assemblage ; les parcours de cette branche (`entretien`, `ramonage`) ont été rejoués seuls.
