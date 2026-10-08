# État de la production

**Source de vérité de ce qui tourne réellement.** Le dépôt ne décrit pas exactement la production (migrations appliquées à la main, fonctions déployées à la main) : ce fichier fait le lien.
Claude le lit au démarrage (hook) et le met à jour à chaque livraison ; Hugo le met à jour (ou le dit à Claude) quand il applique une migration, déploie une fonction ou change un réglage.

Dernière mise à jour : **8 oct. 2026**.

## En attente côté Hugo

Dans l'ordre. Chaque action est aussi dans le Pilote (« À faire de votre côté »), avec sa commande et son contrôle. Migrations 071 → 078 : appliquées et vérifiées le 8 oct. (voir le tableau plus bas).

1. **Redéployer `send-email` et `send-lifecycle-email`** — URGENT, sécurité : tant que l'ancienne version tourne, un compte gratuit peut envoyer n'importe quel e-mail à n'importe qui depuis noreply@mallettico.fr, et même sans compte un e-mail « Mallettico » avec un lien au choix. La migration 077 (plafond) est en place. Commandes ci-dessous, depuis un dossier À JOUR du dépôt ; contrôle : connecté sur mallettico.fr, le bloc « contrôle » dans la console du navigateur doit afficher deux refus (403), puis créez un client dont l'e-mail est votre adresse avec « +client » avant le @ (ex. prenom.nom+client@gmail.com) et envoyez-lui un devis : il doit arriver ; enfin la seconde requête de contrôle de 077 doit compter au moins 1 envoi.
2. **Faire tourner la clé Stripe exposée** — avant la migration 076, une clé Stripe d'artisan active (celle de Paramètres › Finance › Paiements, probablement la vôtre) était lisible par un visiteur : dans Stripe, Développeurs › Clés API › Faire tourner la clé ; puis la remplacer dans Mallettico, et dans le secret `STRIPE_SECRET_KEY` des fonctions Supabase si c'est la même ; contrôle : collez la date « Créée le » de la nouvelle clé secrète et les 4 derniers caractères que Stripe affiche (jamais la clé entière).
3. **Fournir l'identité de l'éditeur** — nom suivi de « EI », SIREN (après l'immatriculation), adresse personnelle (décision du 8 oct.), téléphone ; Claude les reporte dans les mentions légales (`COMPANY`, `src/components/LegalPages.jsx`).
4. **Coller le nouvel e-mail « mot de passe oublié »** — dans Supabase, Authentication › Emails › Reset Password : sujet « Réinitialiser votre mot de passe Mallettico », corps = tout le contenu de `supabase/templates/recuperation.html` (logo et bouton orange ; le logo est servi par mallettico.fr depuis la livraison du 8 oct.) ; contrôle : faites « Mot de passe oublié » sur mallettico.fr avec votre adresse, l'e-mail doit montrer le logo et le bouton « Choisir un nouveau mot de passe » ; collez son sujet.
5. **Coller le nouvel e-mail de confirmation d'inscription** — dans Supabase, Authentication › Emails › Confirm signup : sujet « Confirmez votre adresse e-mail Mallettico », corps = tout le contenu de `supabase/templates/confirmation.html` ; contrôle : inscrivez-vous sur mallettico.fr avec votre adresse suivie de « +essai » avant le @, l'e-mail doit montrer le logo et le bouton « Confirmer mon adresse » ; collez son sujet.

```bash
npx supabase functions deploy send-email --project-ref kofsbgxkrmryfetevetn
npx supabase functions deploy send-lifecycle-email --project-ref kofsbgxkrmryfetevetn
```

Contrôle de `send-email` et `send-lifecycle-email` (connecté sur mallettico.fr, console du navigateur : F12 › Console, coller puis Entrée) :

```js controle
// Deux essais d'envoi à une adresse qui n'est pas un client (example.com : aucune boîte ne peut le recevoir).
const t = JSON.parse(localStorage.getItem('sb-kofsbgxkrmryfetevetn-auth-token')).access_token;
const essai = async (fn, corps) => { const r = await fetch('https://kofsbgxkrmryfetevetn.supabase.co/functions/v1/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(corps) }); return fn + ' : ' + r.status + ' ' + (await r.json()).error; };
[await essai('send-email', { action: 'send_email', to: 'pas-un-client@example.com', subject: 'Contrôle', text: 'Contrôle' }), await essai('send-lifecycle-email', { type: 'payment_failed', to: 'pas-un-client@example.com' })].join('\n')
// attendu : « send-email : 403 Envoi refusé : pas-un-client@example.com n'est l'adresse d'aucun de vos clients… »
//           « send-lifecycle-email : 403 Réservé au serveur »
// (200 = ancienne version encore en ligne ; 401 = pas connecté sur ce navigateur)
```

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

Quand une migration est appliquée : passer sa ligne à « appliquée le JJ/MM » ici. L'historique Supabase (`supabase_migrations.schema_migrations`) ne contient que 000-001 puis les migrations appliquées par le connecteur à partir de 071 : ne jamais lancer `db push`. Le banc continue de la rejouer (le socle simule la production d'avant 071).

## Fonctions Edge

| Fonction | Déployée | Écart avec le dépôt |
|---|---|---|
| `send-email` | oui, ancienne version | **à redéployer après 077** : n'envoie plus qu'aux clients de l'utilisateur (lus sous RLS), à son adresse de compte et à contact@mallettico.fr ; 50 destinataires / 24 h par compte (secret facultatif `EMAIL_LIMITE_JOUR`) ; PDF seuls en pièce jointe ; `send_campaign` et `send_review_request` retirées. L'ancienne version en ligne reste un relais ouvert jusque-là |
| `send-lifecycle-email` | oui, ancienne version | **à redéployer** : relais ouvert même sans compte (clé publique). Nouvelle version : bienvenue au seul compte connecté, une fois (première connexion) ; invitation relue en base, par son auteur ; essai et paiement réservés au serveur ; tout est échappé |
| `send-scheduled-relances` | oui (cron) | — |
| `notify-signature` | oui | — |
| `subscription-billing` | oui | — |
| `stripe-webhook` | v18, redéployée le 08/10 par Hugo depuis `main` (vérifié) | — |
| `create-invoice-payment` | v23, redéployée le 08/10 par Hugo depuis `main` (vérifié) | — |
| `voice-intent` | à vérifier | IA masquée (`FONCTIONS.ia = false`) |

## Services externes

| Service | État | Remarque |
|---|---|---|
| Stripe | mode **test** (`sk_test_`) | passage en live = clé + secret de webhook ensemble (Hugo) |
| Resend | domaine `mallettico.fr` | e-mails transactionnels |
| Sentry | **inactif en production** : `VITE_SENTRY_DSN` absent, `captureException` se réduit à `console.error` (JavaScript servi, 8 oct.) | à activer après sa mention dans la politique de confidentialité (tâche `rgpd-soustraitance`) |
| GitHub Actions | « Vérifications » à chaque push ; « Santé hebdomadaire » le lundi | ouvre une issue en cas d'échec |
| Apple / Google | comptes développeur non créés | dépend de la structure juridique |
