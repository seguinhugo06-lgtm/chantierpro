# Feuille de route — Mallettico

Le travail de **Claude** : cap, prochaines tâches (ids stables), ce qui attend une condition. Tenue à jour à chaque session ; le Pilote l'affiche en lecture seule (« Ce que Claude fera ensuite »).
Ce qui revient à **Hugo** vit ailleurs, sans doublon : ses actions techniques dans `docs/etat-production.md` (« En attente côté Hugo »), ses décisions dans `docs/decisions.md` (« Décisions attendues »), ses démarches personnelles dans le Pilote (`docs/pilote.md`).

## Cap

L'outil le plus simple et le plus fiable du cycle devis → facture → relance → encaissement, publié sur l'App Store et Google Play, testé un an par des artisans de l'entourage (D-05), avec un premier abonné payant dès que possible (question Q-premier-payant).

## Où on en est (8 octobre 2026)

- En production : interface sans défaut mesuré (88 combinaisons), compte (mot de passe oublié, suppression réelle), échecs de chargement visibles, chaîne d'abonnement réparée, certification TVA réduite, retours et codes testeurs, environnement de travail complet (D-15), Pilote comme poste de travail commun (D-16).
- Revue du 8 octobre (agents `verificateur`, `juriste-btp`, `ingenieur-mobile` + `redacteur-stores`, `critique-produit`, rapports dans `audit-ui/pilote/revue/` le jour même) : affirmations de conformité restantes retirées, faille des clés Stripe fermée par la migration 076 (à appliquer), et les tâches ci-dessous.
- Bloqué chez Hugo : migrations 071 → 076, redéploiements, décisions (voir le Pilote). Tant que 073 et 076 ne sont pas appliquées, deux failles restent ouvertes en production.

## Prochaines tâches (prêtes pour `/tache`)

Par ordre de valeur. Format fixe, lu par `scripts/pilote/preparer.mjs` : **[id] titre** — contexte. Critère : … Vérification : … Taille ….

1. **[email-relais] Fermer l'envoi d'e-mails libre** — `send-email` accepte de tout compte connecté, même gratuit, un expéditeur, un sujet, un contenu, des pièces jointes et des destinataires quelconques, depuis noreply@mallettico.fr : hameçonnage possible et vrais devis en indésirables. Restreindre aux clients de l'utilisateur et à lui-même, plafonner par jour, retirer `send_campaign` s'il ne sert pas ; redéploiement par Hugo. Critère : un essai d'envoi à une adresse qui n'est pas un client est refusé, un devis à un client part. Vérification : `gardien-securite`, essai réel après redéploiement. Taille M.
2. **[devis-mentions] Mentions manquantes des devis** — rubrique déchets (C. env. L541-21-2-3), pour le dépannage chez un particulier « devis gratuit ou payant » et « vous pouvez conserver les pièces remplacées » (arrêté du 24 janv. 2017), médiateur aussi sur la page de signature (`devisHtmlBuilder.js`), assurance et mention « EI », dans les DEUX générateurs. Critère : un devis de rénovation et un devis de dépannage affichent ces mentions dans l'aperçu et sur la page de signature. Vérification : tests, parcours `documents`, `juriste-btp`. Taille M.
3. **[fiche-comptable] Fiche du rendez-vous comptable** — une page dans `Documents/Mallettico/` : structure (Q-structure), régime de TVA de l'électricité, TVA des abonnements (Q-tva-abonnements), « système de caisse » (art. 286 du CGI) pour « marquer payée » et le paiement en ligne, versement libératoire, ACRE (60 jours), RCS éventuel pour l'édition de logiciel. Critère : chaque question a ses options et leurs conséquences, sourcées. Vérification : `juriste-btp`. Taille S.
4. **[masquer-casse] Masquer ce qui est cassé en mode réel** — l'onglet Garanties des chantiers terminés et le bouton « Vue garanties » (les services sont mal appelés, `Chantiers.jsx:313`), et le paiement en ligne des factures si Hugo répond « masquer » à Q-paiement-factures. Critère : en mode réel simulé, aucun de ces accès n'apparaît. Vérification : parcours `reel: true`. Taille S.
5. **[alerte-relances] Alerte si les relances s'arrêtent** — `relance_cron_runs` est écrite mais lue nulle part ; un second job chaque matin envoie un e-mail à Hugo si aucune exécution depuis 26 h ou si la dernière a échoué. Critère : au banc, une exécution manquante déclenche l'alerte. Vérification : `/migration`, banc, requête de contrôle. Taille S-M.
6. **[suppression-web] Page publique « Supprimer mon compte »** — Google l'exige en plus de la suppression dans l'app : `/supprimer-mon-compte`, sans connexion, chemin dans l'app, ce qui est supprimé ou conservé, demande par e-mail. Critère : la page s'ouvre sans connexion et la politique de confidentialité y renvoie. Vérification : sonde à 375 px. Taille S.
7. **[portail-stripe] Portail Stripe ouvert sans blocage** — `BillingDashboard.jsx:81` et `:107` l'ouvrent par `window.open` après un `await` (bloqué par Safari, hors du navigateur système dans l'app) : passer par `ouvrirLienExterne`. Critère : aucun `window.open` vers Stripe dans `src/`. Vérification : smoke + revue. Taille S.
8. **[referentiel-depannage] Dépannage et IRVE dans le Référentiel** — les lignes déplacement, main-d'œuvre à l'heure et dépannage ne sont que dans l'éditeur de devis, pas dans le Référentiel importé par le Catalogue ; la borne (1 150 €) n'y porte aucun avertissement IRVE. Critère : le Catalogue importé contient ces lignes et la borne signale « installateur qualifié IRVE au-delà de 3,7 kW ». Vérification : test sur `articles-btp.js`. Taille S.
9. **[tva-situation] Mention TVA réduite sur les factures de situation** — `buildSituationFactureHtml` (`devisHtmlBuilder.js:513`) met 10 % par défaut sans la certification du client. Critère : une facture de situation à 10 % affiche la certification. Vérification : test + parcours. Taille S.
10. **[cgv-b2b] CGV et CGU cohérentes** — service réservé aux professionnels, rétractation (retirer ou garder comme geste), mention TVA réelle, conservation et export des données à la résiliation, engagement du tarif fondateur (D-08), pénalités de retard et indemnité de 40 €. Après Q-tva-abonnements et l'identité. Critère : aucune contradiction entre CGV, site et code. Vérification : `juriste-btp`. Taille M.
11. **[rgpd-soustraitance] Sous-traitance des données des artisans** — accord de sous-traitance (RGPD art. 28) annexé aux CGU, registre des traitements, liste des sous-traitants alignée sur le code, puis Hugo active Sentry (`VITE_SENTRY_DSN` dans les deux projets Vercel). Critère : la liste publiée correspond aux services réellement appelés. Vérification : `juriste-btp` + `gardien-securite`. Taille M.
12. **[parcours-devis] Parcours de création d'un devis complet** — le chemin le plus utilisé n'a pas de parcours. Critère : le parcours crée un devis (client, lignes du catalogue, TVA 10 %), et retrouve lignes et mention TVA dans l'aperçu. Vérification : `npm run parcours -- devis`. Taille M.
13. **[mentions-2027] Quatre mentions de la réforme sur les factures** — SIREN du client, catégorie de l'opération, option pour les débits, adresse de livraison si différente : obligatoires pour les TPE sur les factures émises à partir du 1er sept. 2027 (CGI ann. II art. 242 nonies A), dans les DEUX générateurs et le Factur-X. Critère : une facture à un professionnel les affiche dans l'aperçu, le PDF et le XML. Vérification : test + parcours `documents` + `juriste-btp`. Taille M.
14. **[photos-stockage] Photos de chantier hors de la fiche** — une photo prise depuis la fiche chantier est enregistrée en taille réelle, en texte, dans la fiche (`Chantiers.jsx:354`). Critère : une photo de 4 Mo est stockée compressée et la fiche ne garde que son adresse ; les photos existantes sont reprises. Vérification : parcours `reel: true`. Taille M.
15. **[menus-aria] Menus sans attributs ARIA** — `aria-haspopup` / `aria-expanded` sur les menus faits main (accessibilité, et pour que l'audit les ouvre). Critère : l'audit ouvre plus de menus et reste à 0 défaut. Vérification : `npm run verifier -- --complet`. Taille M.
16. **[hors-ligne] Mode hors ligne sur chantier** — constater ce qui se passe sans réseau et corriger ce qui ment. Critère : un devis créé hors ligne apparaît après le retour du réseau, et l'artisan voit à chaque instant s'il est enregistré. Vérification : parcours `reel: true` avec panne puis retour. Taille M-L.

## Application native (attend une condition)

Conditions : macOS à jour (≥ 15.6 pour Xcode 26 ; le Xcode proposé aujourd'hui demande macOS Tahoe 26.6), Xcode, Android Studio, et les réponses à Q-appid, Q-achats-apps, Q-comptes-dev.
- **[natif-plateformes]** `npx cap add ios android`, icônes et écran de démarrage depuis le logo vectoriel (`@capacitor/assets`), module splash-screen installé, démarrage vérifié sur simulateur et émulateur (`ingenieur-mobile`).
- **[natif-autorisations]** phrases d'autorisation en français dans Info.plist (appareil photo, photos, micro, reconnaissance vocale, position) et AndroidManifest, manifeste de confidentialité `PrivacyInfo.xcprivacy` — sans elles l'app plante à la première photo.
- **[natif-sansachat]** si Q-achats-apps = `c` : dans l'app, ni prix, ni bouton d'achat, ni code testeur, ni bandeau d'essai ; ouverture directe sur connexion ; test qui échoue si un composant d'achat est rendu en natif ; le site inchangé.
- **[natif-notifications]** devis signé, paiement reçu, relance envoyée — après les clés APNs et Firebase créées par Hugo ; rien de sensible dans le texte.
- **[natif-liens]** liens universels pour les retours d'e-mail seulement (`/reset-password`, confirmation), jamais `/devis/signer`, `/pay`, `/portal` ; `.well-known` servi en JSON malgré la réécriture de `vercel.json`.
- **[natif-photos]** module Camera (compression, galerie) — amélioration une fois les autorisations faites.
- **[natif-fiches]** textes et captures des stores (`redacteur-stores`), sans prix ni abonnement si voie C.
- **[natif-confidentialite]** brouillons « Sécurité des données » (Google, exigé dès le test fermé) et étiquettes Apple, alignés sur le code ; lien vers la politique dans Réglages.
- **[natif-examinateur]** compte de démonstration réaliste (entreprise clairement fictive, plan Artisan), notes d'examen en français et en anglais.

## Plus tard (avec déclencheur)

- **IA (dictée)** — après les stores (D-07) : saisie clavier, quota serveur, Anthropic déclaré sous-traitant avec écran de consentement (Apple 5.1.2(i), Google juillet 2026), puis `FONCTIONS.ia = true`.
- **Mesure d'activation (PostHog)** — après les stores ; consentement ou mesure strictement anonyme, sous-traitant déclaré.
- **E-reporting et transmission par une Plateforme Agréée** — après les échanges avec trois plateformes (fin janvier 2027 au plus tard) ; inclut les données d'encaissement et les factures d'abonnement de Mallettico lui-même.
- **Prévenance avant la fin d'une offre testeur** — un e-mail un mois avant (D-14) : avant octobre 2027.
- **Parcours de lancement dans Mallettico** — pas avant 10 artisans actifs, puis `critique-produit`.

## Idées non engagées (à passer par `critique-produit` avant tout code)

SIRET vérifié et profil rempli par l'API Sirene ; attestation décennale déposée qui remplit les mentions ; champ « signé chez le client » qui empêche un acompte ou un lien de paiement avant 7 jours (C. conso. L221-10) ; alerte de qualification selon le métier ; vitrine générée.

## Règles des stores qui décident de l'architecture (vérifiées le 8 oct. 2026)

- **Apple 4.2** : un site emballé est refusé ; aucune liste officielle de fonctions suffisantes. Notifications, appareil photo, partage natif et hors ligne aident, sans garantie.
- **Apple 5.1.1(v)** : suppression du compte depuis l'app ; **Google** exige en plus une page web publique de demande de suppression.
- **Paiements** : voir Q-achats-apps (3.1.1, 3.1.3(f) ; dans l'UE depuis le 1er oct. 2026, lien externe à 10 % sur 7 jours).
- **Apple, entreprise individuelle** : compte individuel, nom légal affiché ; **DSA** : adresse, téléphone et e-mail publiés sur la fiche dans l'UE, immatriculation demandée.
- **Google, compte personnel** : 12 testeurs inscrits 14 jours consécutifs, vérification sur un téléphone Android physique, « Sécurité des données » remplie dès le test fermé ; accès à la production examiné en 7 jours environ.
- **Outils** : Capacitor 8 exige Xcode 26 ; Apple refuse les builds plus anciens depuis le 28 avril 2026 ; Android Studio 2025.2.1 ou plus, cible Android 16 (API 36).

## Règles de travail

Dans `CLAUDE.md`, `docs/organisation.md` et `.claude/rules/`. Livraison sur `main` sans redemander si `npm run verifier` est vert sur le commit exact (D-10) ; SQL appliqué par Hugo seul (D-04).
