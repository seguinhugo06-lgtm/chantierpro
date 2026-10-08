# État de la production

**Source de vérité de ce qui tourne réellement.** Le dépôt ne décrit pas exactement la production (migrations appliquées à la main, fonctions déployées à la main) : ce fichier fait le lien.
Claude le lit au démarrage (hook) et le met à jour à chaque livraison ; Hugo le met à jour (ou le dit à Claude) quand il applique une migration, déploie une fonction ou change un réglage.

Dernière mise à jour : **8 oct. 2026**.

## En attente côté Hugo

Dans l'ordre. Chaque migration est aussi dans le Pilote (« À faire de votre côté »), avec son SQL complet et sa requête de contrôle : après l'avoir appliquée, collez le résultat du contrôle dans le Pilote, Claude le vérifie. 071 → 075 sont aussi dans `Documents/Mallettico/Migrations à appliquer — 7 oct 2026.sql` ; toutes passent au banc (`npm run banc:migrations`).

1. **Migration 071** — colonnes de facturation (requises par le webhook Stripe et par 074).
2. **Migration 072** — suppression de compte réelle (exigée par Apple).
3. **Migration 073** — URGENT, sécurité : tout utilisateur pouvait se passer lui-même en plan Équipe.
4. **Migration 074** — retours utilisateurs + codes testeurs.
5. **Migration 075** — URGENT, sécurité : deux tables lisibles par n'importe qui.
6. **Migration 076** — URGENT, sécurité : la clé Stripe secrète d'un artisan pouvait être lue par n'importe quel visiteur ; lancer d'abord la requête de contrôle (en tête du fichier) pour savoir si la faille est ouverte et combien de clés sont concernées.
   (Ordre numérique : c'est celui que le banc a testé.)
7. **Migration 077** — URGENT, sécurité : plafond d'envoi d'e-mails par compte (50 destinataires par 24 heures), à appliquer AVANT le redéploiement de `send-email`.
8. **Redéployer `send-email` et `send-lifecycle-email`** — URGENT, sécurité : aujourd'hui, un compte gratuit peut envoyer n'importe quel e-mail à n'importe qui depuis noreply@mallettico.fr, et même sans compte un e-mail « Mallettico » avec un lien au choix. Les nouvelles versions n'envoient qu'aux clients de l'utilisateur, à lui-même et à l'équipe (invitations : d'après la base), plafonnent le volume et n'acceptent que des PDF. APRÈS 077 (sans 077, le plafond reste inactif mais les devis partent). Commandes ci-dessous ; contrôle : connecté sur mallettico.fr, le bloc « contrôle » dans la console du navigateur doit afficher deux refus (403), puis un devis envoyé à un de vos clients (fiche à votre adresse) doit arriver.
9. **Redéployer deux fonctions Supabase** — `stripe-webhook` (`--no-verify-jwt`) puis `create-invoice-payment` (commandes ci-dessous), APRÈS 071 et 073, depuis un terminal ouvert dans le dépôt.
10. **Régler l'adresse du site dans Supabase** — Authentication › URL Configuration : Site URL `https://mallettico.fr` (et dans Redirect URLs) ; Authentication › Emails : modèle « Reset password » en français.
11. **Créer un code testeur** — dans l'éditeur SQL, après la migration 074 ; choisir un code long et imprévisible, le donner aux artisans de l'entourage.
12. **Fournir l'identité de l'éditeur** — après vos réponses aux questions sur la structure et l'adresse : nom suivi de « EI », SIREN, adresse, téléphone ; Claude les reporte dans les mentions légales (`COMPANY`, `src/components/LegalPages.jsx`).

```bash
npx supabase functions deploy send-email --project-ref kofsbgxkrmryfetevetn
npx supabase functions deploy send-lifecycle-email --project-ref kofsbgxkrmryfetevetn
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref kofsbgxkrmryfetevetn
npx supabase functions deploy create-invoice-payment --project-ref kofsbgxkrmryfetevetn
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
| `main` | `2c8ec50` (8 oct. : affirmations de conformité retirées, migration 076 prête, Pilote poste de travail) | `npm run statut` : Vercel ×2 + CI verts (8 oct.) |
| Vercel | 2 projets (`chantierpro`, `seguinhugo06-lgtm-chantierpro`), déploiement auto sur `main` | statut GitHub |
| Domaine | `mallettico.fr` (DNS OVH) | 25 juil. |
| Service worker | sert l'ancienne version jusqu'à rechargement : ne jamais vérifier un déploiement en rechargeant le site | — |

## Base de données (Supabase `kofsbgxkrmryfetevetn`, AWS eu-west-3 Paris)

| Migrations | État | Remarque |
|---|---|---|
| 001 – 070 | supposées appliquées | 023-054 effacées du dépôt par `227534e`, récupérables par `git show 227534e^:supabase/migrations/<fichier>` |
| 071 | **à appliquer** | colonnes `cancel_at_period_end`, `current_period_*`, `billing_interval` |
| 072 | **à appliquer** | `supprimer_mon_compte()`, journal `comptes_supprimes` |
| 073 | **à appliquer** | policies `subscriptions`, déclencheur d'organisation, `get_org_subscription` fermée |
| 074 | **à appliquer** | tables `retours`, `codes_testeurs`, tâche planifiée `expirer-offres-testeurs` |
| 075 | **à appliquer** | `payment_links`, `portal_access_logs` fermées au public |
| 076 | **à appliquer** | `get_stripe_secret_for_user` (029, effacée du dépôt) et `get_stripe_config_for_user` (012) réservées au rôle serveur ; faille reproduite au banc avant 076 |
| 077 | **à appliquer** | `envois_email` (compteur sans adresse, fermé à l'API) et `reserver_envoi_email` (rôle serveur seul) : plafond d'envoi de `send-email` |

Quand une migration est appliquée : passer sa ligne à « appliquée le JJ/MM » ici. Le banc continue de la rejouer (le socle simule la production d'avant 071).

## Fonctions Edge

| Fonction | Déployée | Écart avec le dépôt |
|---|---|---|
| `send-email` | oui, ancienne version | **à redéployer après 077** : n'envoie plus qu'aux clients de l'utilisateur (lus sous RLS), à son adresse de compte et à contact@mallettico.fr ; 50 destinataires / 24 h par compte (secret facultatif `EMAIL_LIMITE_JOUR`) ; PDF seuls en pièce jointe ; `send_campaign` et `send_review_request` retirées. L'ancienne version en ligne reste un relais ouvert jusque-là |
| `send-lifecycle-email` | oui, ancienne version | **à redéployer** : relais ouvert même sans compte (clé publique). Nouvelle version : bienvenue au seul compte connecté, une fois (première connexion) ; invitation relue en base, par son auteur ; essai et paiement réservés au serveur ; tout est échappé |
| `send-scheduled-relances` | oui (cron) | — |
| `notify-signature` | oui | — |
| `subscription-billing` | oui | — |
| `stripe-webhook` | oui, ancienne version | **à redéployer** : répond désormais 500 en cas d'échec d'écriture (Stripe rejoue) |
| `create-invoice-payment` | oui, ancienne version | **à redéployer** : ne surtaxe plus jamais le client (1,7 % retiré) |
| `voice-intent` | à vérifier | IA masquée (`FONCTIONS.ia = false`) |

## Services externes

| Service | État | Remarque |
|---|---|---|
| Stripe | mode **test** (`sk_test_`) | passage en live = clé + secret de webhook ensemble (Hugo) |
| Resend | domaine `mallettico.fr` | e-mails transactionnels |
| Sentry | **inactif en production** : `VITE_SENTRY_DSN` absent, `captureException` se réduit à `console.error` (JavaScript servi, 8 oct.) | à activer après sa mention dans la politique de confidentialité (tâche `rgpd-soustraitance`) |
| GitHub Actions | « Vérifications » à chaque push ; « Santé hebdomadaire » le lundi | ouvre une issue en cas d'échec |
| Apple / Google | comptes développeur non créés | dépend de la structure juridique |
