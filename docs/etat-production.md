# État de la production

**Source de vérité de ce qui tourne réellement.** Le dépôt ne décrit pas exactement la production (migrations appliquées à la main, fonctions déployées à la main) : ce fichier fait le lien.
Claude le lit au démarrage (hook) et le met à jour à chaque livraison ; Hugo le met à jour (ou le dit à Claude) quand il applique une migration, déploie une fonction ou change un réglage.

Dernière mise à jour : **8 oct. 2026**.

## En attente côté Hugo

Dans l'ordre. Fichier prêt : `Documents/Mallettico/Migrations à appliquer — 7 oct 2026.sql` (un bloc à la fois ; chaque bloc commence par sa requête de vérification ; testé au banc : `npm run banc:migrations`).

1. **Migration 071** — colonnes de facturation (requises par le webhook Stripe et par 074).
2. **Migration 072** — suppression de compte réelle (exigée par Apple).
3. **Migration 073** — URGENT, sécurité : tout utilisateur pouvait se passer lui-même en plan Équipe.
4. **Migration 074** — retours utilisateurs + codes testeurs.
5. **Migration 075** — URGENT, sécurité : deux tables lisibles par n'importe qui.
   (Ordre numérique : c'est celui que le banc a testé.)
6. Redéployer `stripe-webhook` (`--no-verify-jwt`) puis `create-invoice-payment` (commandes ci-dessous), APRÈS 071 et 073.
7. Supabase › Authentication › URL Configuration : Site URL `https://mallettico.fr` (+ dans Redirect URLs) ; modèle d'e-mail « Reset password » en français.
8. Créer un code testeur (requête en tête du bloc 074).
9. Identité de l'éditeur (structure, SIRET, adresse) → `COMPANY` dans `src/components/LegalPages.jsx`.

```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref kofsbgxkrmryfetevetn
npx supabase functions deploy create-invoice-payment --project-ref kofsbgxkrmryfetevetn
```

## Code (front)

| Élément | État | Vérifié |
|---|---|---|
| `main` | `63d79d1` + commits de l'environnement du 8 oct. | `npm run statut` (Vercel ×2 + CI) |
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

Quand une migration est appliquée : passer sa ligne à « appliquée le JJ/MM » ici. Le banc continue de la rejouer (le socle simule la production d'avant 071).

## Fonctions Edge

| Fonction | Déployée | Écart avec le dépôt |
|---|---|---|
| `send-email` | oui | — (exige un rôle authenticated) |
| `send-lifecycle-email` | oui | — |
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
| Sentry | actif si `VITE_SENTRY_DSN` est défini sur Vercel | à confirmer |
| GitHub Actions | « Vérifications » à chaque push ; « Santé hebdomadaire » le lundi | ouvre une issue en cas d'échec |
| Apple / Google | comptes développeur non créés | dépend de la structure juridique |
