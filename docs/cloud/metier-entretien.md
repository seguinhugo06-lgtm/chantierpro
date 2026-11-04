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
