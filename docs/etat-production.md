# État de la production

**Source de vérité de ce qui tourne réellement.** Le dépôt ne décrit pas exactement la production (migrations appliquées à la main, fonctions déployées à la main) : ce fichier fait le lien.
Claude le lit au démarrage (hook) et le met à jour à chaque livraison ; Hugo le met à jour (ou le dit à Claude) quand il applique une migration, déploie une fonction ou change un réglage.

Dernière mise à jour : **8 oct. 2026**.

## En attente côté Hugo

Dans l'ordre. Chaque action est aussi dans le Pilote (« À faire de votre côté »), avec sa commande et son contrôle. Migrations 071 → 078 : appliquées et vérifiées le 8 oct. (voir le tableau plus bas).

1. **Faire tourner la clé Stripe exposée** — avant la migration 076, une clé Stripe d'artisan active (celle de Paramètres › Finance › Paiements, probablement la vôtre) était lisible par un visiteur : dans Stripe, Développeurs › Clés API › Faire tourner la clé ; puis la remplacer dans Mallettico, et dans le secret `STRIPE_SECRET_KEY` des fonctions Supabase si c'est la même ; contrôle : collez la date « Créée le » de la nouvelle clé secrète et les 4 derniers caractères que Stripe affiche (jamais la clé entière).
2. **Fournir l'identité de l'éditeur** — nom suivi de « EI », SIREN (après l'immatriculation), adresse personnelle (décision du 8 oct.), téléphone ; Claude les reporte dans les mentions légales (`COMPANY`, `src/components/LegalPages.jsx`).
3. **Coller le nouvel e-mail « mot de passe oublié »** — dans Supabase, Authentication › Emails › Reset Password : sujet « Réinitialiser votre mot de passe Mallettico », corps = tout le contenu de `supabase/templates/recuperation.html` (logo et bouton orange ; le logo est servi par mallettico.fr depuis la livraison du 8 oct.) ; contrôle : faites « Mot de passe oublié » sur mallettico.fr avec votre adresse, l'e-mail doit montrer le logo et le bouton « Choisir un nouveau mot de passe » ; collez son sujet.
4. **Coller le nouvel e-mail de confirmation d'inscription** — dans Supabase, Authentication › Emails › Confirm signup : sujet « Confirmez votre adresse e-mail Mallettico », corps = tout le contenu de `supabase/templates/confirmation.html` ; contrôle : inscrivez-vous sur mallettico.fr avec votre adresse suivie de « +essai » avant le @, l'e-mail doit montrer le logo et le bouton « Confirmer mon adresse » ; collez son sujet.
5. **Vérifier les taux de vos fiches Équipe** — jusqu'au 9 oct., une fiche enregistrée sans taux recevait 45 €/h « facturé » et 28 €/h « coût » inventés ; en production, les 2 personnes enregistrées (2 entreprises) ont exactement ces valeurs. Dans Équipe › la personne › Modifier, saisissez son vrai taux de facturation et son vrai coût horaire chargé (ou videz-les) ; le bilan des chantiers compte désormais le coût chargé. Contrôle : collez « fait » une fois les fiches revues (aucun montant à coller).

## Code (front)

| Élément | État | Vérifié |
|---|---|---|
| `main` | `2632066` (8 oct. : organisations et invitations fermées dans le dépôt — la migration 078 et la 072 corrigée attendent Hugo ; l'écran Équipe ne dit plus « fait » quand la base refuse) | `npm run statut` : Vercel ×2 + CI verts (8 oct.) |
| Vercel | 2 projets (`chantierpro`, `seguinhugo06-lgtm-chantierpro`), déploiement auto sur `main` | statut GitHub |
| Domaine | `mallettico.fr` (DNS OVH) | 25 juil. |
| Service worker | sert l'ancienne version jusqu'à rechargement : ne jamais vérifier un déploiement en rechargeant le site | — |

## Base de données (Supabase `kofsbgxkrmryfetevetn`, AWS eu-west-3 Paris)

| Migrations | État | Remarque |
|---|---|---|
| 001 – 070 | supposées appliquées | 023-054 effacées du dépôt par `227534e`, récupérables par `git show 227534e^:supabase/migrations/<fichier>` |
| 071 | appliquée le 08/10 par Claude (connecteur Supabase), contrôlée | colonnes `cancel_at_period_end`, `current_period_*`, `billing_interval` |
| 072 | appliquée le 08/10 par Claude, version corrigée comprise, contrôlée | `supprimer_mon_compte()`, journal `comptes_supprimes` ; corrigée le 8 oct. (réattribution limitée aux organisations dont le partant est membre, jamais les réglages de paiement) |
| 073 | appliquée le 08/10 par Claude, contrôlée (plus de policy UPDATE) | policies `subscriptions`, déclencheur d'organisation, `get_org_subscription` fermée |
| 074 | appliquée le 08/10 par Claude, contrôlée (tâche nocturne 3 h 17) | tables `retours`, `codes_testeurs`, tâche planifiée `expirer-offres-testeurs` |
| 075 | appliquée le 08/10 par Claude, contrôlée (`payment_links` n'existe pas en production) | `payment_links`, `portal_access_logs` fermées au public |
| 076 | appliquée le 08/10 par Claude, contrôlée (avant : 1 clé active exposée) | `get_stripe_secret_for_user` (029, effacée du dépôt) et `get_stripe_config_for_user` (012) réservées au rôle serveur ; faille reproduite au banc avant 076 |
| 077 | appliquée le 08/10 par Claude, contrôlée | `envois_email` (compteur sans adresse, fermé à l'API) et `reserver_envoi_email` (rôle serveur seul) : plafond d'envoi de `send-email` |
| 078 | appliquée le 08/10 par Claude, contrôlée (avant : aucun faux patron ; après : les 7 policies attendues) | `invitations` et `organization_members` : toutes les policies remplacées (gérants seuls ; plus de lecture par un visiteur ni d'inscription libre), `accept_invitation` pour le compte connecté (`auth.uid()`), `revoke_invitation` vérifiée, `get_invitation_by_token` réduite ; production constatée le 8 oct. identique à 035/039/041 ; faille reproduite au banc avant 078 |
| 079 | appliquée le 08/10 par Claude (D-22) après la livraison ba81218, contrôlée : avant 61 lignes sans organisation, après 0 ; déclencheur sur 34 tables ; verrou présent, fermée aux visiteurs ; totaux inchangés (rien d'effacé) ; le client de contrôle réapparaît dans la requête de l'app | une ligne enregistrée sans organisation reçoit celle de son auteur (déclencheur sur 34 tables) et les lignes orphelines sont rattachées (relevé du 8 oct. : catalogue 31/34, échanges 13/23, prévisions 8/8, clients 3/12, contrats 2/2, réglages de trésorerie 2/2, équipe 1/2, profil d'entreprise 1/4 — invisibles dans l'app) ; `create_default_org` : une seule organisation même avec des appels simultanés, réservée au compte lui-même. Relue par `gardien-securite` : non bloquant |
| 080 | appliquée le 10/10 par Claude (D-22), contrôlée | colonnes perdues à l'enregistrement (recette du 9 oct.) : `pointages.approuve` / `verrouille` / `manuel` / `signe_le`, `equipe.decennale_assureur`, `devis.avoir_source_id` (FK vers `devis`, ON DELETE SET NULL) / `avoir_type` / `avoir_motif` / `avoir_motif_detail` / `date_envoi`. Additive seulement. Relue par `gardien-securite` : sûre. Appliquée le 10/10 par Claude (D-22) après la livraison eeed5fa, contrôlée : 10 colonnes, FK `devis_avoir_source_id_fkey` ON DELETE SET NULL, 0/2/34 lignes inchangées |
| 081 | appliquée le 10/10 par Claude (D-22) après la livraison 1144682, contrôlée : sur une vraie facture, `payable` et `reste_du` (574,20 €) renvoyés ; `id` / `user_id` nuls pour un visiteur, présents pour le rôle serveur ; filtre d'organisation présent (faille du faux avoir fermée) | `get_facture_for_payment` renvoie aussi `montant_credite`, `recu`, `reste_du`, `payable` : une facture annulée par avoir, un brouillon, un avoir ou une facture soldée ne sont plus payables ; avoirs et paiements enregistrés déduits. Signature et droits inchangés |
| 082 | appliquée le 10/10 par Claude (D-22) après la livraison 80133b0, contrôlée : `anon` et `authenticated` n'exécutent plus les 3 fonctions (`service_role` oui), `search_path` fixé ; appel réel avec la clé publique : « permission denied » (401) | `portal_accept_devis`, `portal_refuse_devis`, `get_client_by_portal_token` (007) : plus exécutables par un visiteur ni un compte connecté (un ancien collaborateur pouvait faire passer un devis « accepté » sans signature avec un jeton de portail) ; `search_path` fixé. Le portail est éteint dans l'app |

Quand une migration est appliquée : passer sa ligne à « appliquée le JJ/MM » ici. L'historique Supabase (`supabase_migrations.schema_migrations`) ne contient que 000-001 puis les migrations appliquées par le connecteur à partir de 071 : ne jamais lancer `db push`. Le banc continue de la rejouer (le socle simule la production d'avant 071).

## Fonctions Edge

| Fonction | Déployée | Écart avec le dépôt |
|---|---|---|
| `send-email` | v17, redéployée le 08/10 par Hugo depuis `main` ; contrôlée par Claude avec le compte de contrôle : 403 pour une adresse qui n'est pas un client, 200 pour un client, compteur de 077 passé de 0 à 1 | — n'envoie qu'aux clients de l'utilisateur (lus sous RLS), à son adresse de compte et à contact@mallettico.fr ; 50 destinataires / 24 h par compte (secret facultatif `EMAIL_LIMITE_JOUR`) ; PDF seuls en pièce jointe |
| `send-lifecycle-email` | v24, redéployée le 08/10 par Hugo depuis `main` ; contrôlée : 401 « Authentification requise » sans compte, 403 « Réservé au serveur » pour un compte connecté | — bienvenue au seul compte connecté, une fois ; invitation relue en base, par son auteur ; essai et paiement réservés au serveur ; tout est échappé |
| `send-scheduled-relances` | v18, redéployée le 10/10 par Claude (D-22) depuis 1144682 ; contrôlée : démarre, 401 sans secret | relance le reste dû (paiements et avoirs de l'organisation déduits), pénalités et 40 € pour un professionnel seulement, jamais un avoir ni une facture soldée (`regles.ts`, testé) ; à constater au prochain passage nocturne (`relance_cron_runs`) |
| `notify-signature` | v12, redéployée le 10/10 par Claude (D-22) depuis 809ad57 ; contrôlée : 404 « devis introuvable » pour un jeton inconnu | nom du signataire et numéro échappés dans l'e-mail « Devis signé » (un lien d'hameçonnage passait dans un e-mail authentifié par Mallettico) |
| `subscription-billing` | oui | — |
| `stripe-webhook` | v18, redéployée le 08/10 par Hugo depuis `main` (vérifié) | — |
| `create-invoice-payment` | v25, redéployée le 10/10 par Claude (D-22) depuis 1144682 ; contrôlée : 404 « Token invalide » pour un jeton inconnu | refuse une facture non payable (annulée par avoir, brouillon, soldée), part du reste dû de la base (081), soldée sur le reçu réel |
| `voice-intent` | à vérifier | IA masquée (`FONCTIONS.ia = false`) |

## Services externes

| Service | État | Remarque |
|---|---|---|
| Stripe | mode **test** (`sk_test_`) | passage en live = clé + secret de webhook ensemble (Hugo) |
| Resend | domaine `mallettico.fr` | e-mails transactionnels |
| Sentry | **inactif en production** : `VITE_SENTRY_DSN` absent, `captureException` se réduit à `console.error` (JavaScript servi, 8 oct.) | à activer après sa mention dans la politique de confidentialité (tâche `rgpd-soustraitance`) |
| GitHub Actions | « Vérifications » à chaque push ; « Santé hebdomadaire » le lundi | ouvre une issue en cas d'échec |
| Apple / Google | comptes développeur non créés | dépend de la structure juridique |
