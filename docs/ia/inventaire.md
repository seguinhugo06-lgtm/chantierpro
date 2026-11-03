# Inventaire de l'IA dans Mallettico (3 nov. 2026)

Tout ce qui touche à l'IA dans le code, avec son état. Relevé fait sur `main` au commit `adbf08d`.

**En bref.** Un seul appel à un modèle existe : la fonction Edge `voice-intent`, qui sert la dictée. La dictée est complète côté app mais **masquée** (`FONCTIONS.ia = false`, décision D-07). Les « suggestions » sont des règles sans IA, et leur code n'est utilisé nulle part. Des tables `ai_*` existent en base sans être utilisées.

## 1. Ce qui fonctionne (mais est masqué)

| Élément | Où | État | Remarques |
|---|---|---|---|
| Fonction Edge `voice-intent` | `supabase/functions/voice-intent/index.ts` | Écrite ; en production : « à vérifier » (`docs/etat-production.md`) | Modèle `claude-haiku-4-5`, sortie JSON stricte (client, chantiers, document avec lignes, `incertitudes`). Prompt en français : « ne rien inventer », prix considérés HT. Contexte : 60 noms de clients et 80 libellés du catalogue. |
| Fenêtre de dictée | `src/components/voice/DicteeModal.jsx` | Complète, masquée | Trois étapes (parler → analyse → relecture). Saisie clavier possible. Crée client + chantier + devis en brouillon, annulable 20 s. |
| Reconnaissance vocale | `src/hooks/useDictation.js` | Fonctionne | Web Speech API du navigateur : gratuite, en `fr-FR`. Chrome et Android complets ; Safari et iOS partiels. Sur certains navigateurs (Chrome), l'audio part chez le fournisseur du navigateur. |
| Analyse de la dictée côté app | `src/lib/voiceIntent.js` | Fonctionne | En démo, une analyse **locale par motifs** (`analyseLocale`), sans IA. En réel, l'appel à `voice-intent`, sans repli local en cas d'échec. Rapprochement client, chantier et catalogue. |
| Quota de dictées | `src/lib/dicteeQuota.js`, `src/stores/subscriptionStore.js` | Fonctionne, contournable | Compteur dans le navigateur (`localStorage`). Gratuit : 10 par mois ; Artisan et Équipe : illimité. |

## 2. Les failles à corriger avant de rallumer quoi que ce soit

| Faille | Où | Gravité |
|---|---|---|
| **Le jeton n'est pas vérifié** : la fonction décode le JWT avec `atob` et lit seulement son `role`, sans vérifier la signature ni appeler `auth.getUser()`. N'importe qui peut forger un jeton et consommer les crédits. | `voice-intent/index.ts` l. 170-180 | Haute (coût) |
| **Aucun quota serveur** : le compteur est dans le navigateur. | `dicteeQuota.js` | Haute (coût) |
| **Aucun journal** : rien n'est écrit en base (ni l'usage en jetons, ni le coût). | `voice-intent/index.ts` | Moyenne |
| **Message d'erreur brut** renvoyé à l'app (`error.message`). | `voice-intent/index.ts` l. 247 | Faible |
| **Anthropic n'est pas déclaré** comme sous-traitant. Les CGU, la politique de confidentialité et les CGV ne parlent ni d'IA, ni de dictée, ni du micro. | `src/components/LegalPages.jsx`, `src/lib/cgu.js`, `src/lib/cgv.js` | Bloquant (RGPD) |

La session `cloud/ia-socle` traite le socle serveur (modèle, quota, coupure, mentions).

## 3. Ce que l'interrupteur `FONCTIONS.ia` masque

| Où | Quoi |
|---|---|
| `src/App.jsx` (en-tête) | Bouton « Dicter » |
| `src/App.jsx` (bas du fichier) | Montage de `DicteeModal` |
| `src/App.jsx` (aide) | Question de FAQ « IA Devis » : elle promet une analyse photo **qui n'a jamais existé** |
| `src/stores/subscriptionStore.js` | Lignes « dictée » dans la liste des plans |
| `src/components/chantiers/OngletTaches.jsx` | Libellé « Compléter (IA) » : aucune IA derrière (générateur de listes types) |
| `src/components/Changelog.jsx` | Entrée « IA Devis : analyse photo de chantier » : **fonction qui n'a jamais existé** |
| `src/components/landing/` | Page « dictée vocale » retirée du site |

Garde-fous déjà en place : `src/components/landing/__tests__/honnetete.test.js` interdit « IA » et « dictée » sur le site.

**À faire au rallumage** : supprimer (pas seulement masquer) la FAQ « IA Devis », l'entrée du journal des nouveautés et le libellé « Compléter (IA) ». Ils décrivent des fonctions qui n'existent pas.

## 4. Code mort

| Élément | Où | Remarque |
|---|---|---|
| Suggestions par règles | `src/lib/suggestions.js` (823 lignes) | « rule-based, no ML ». Aucun import. Lit et écrit `ai_suggestions`. |
| Suggestions d'actions | `src/lib/actionSuggestions.ts` (682 lignes) | Seul son test l'importe. |
| Permission `ia-devis` | `src/lib/permissions.js` | Utilisée nulle part. |

## 5. Base de données

| Table ou colonne | Migration | Utilisée ? |
|---|---|---|
| `ai_analyses` (entrée brute, réponse JSON, confiance, devis lié) | `015_devis_ia.sql` | Non |
| `ai_memory` (préférences, prix, habitudes par utilisateur) | `015_devis_ia.sql` | Non (seulement dans la liste de nettoyage de la migration 105) |
| `ai_suggestions` | `000`, `006`, policy fermée par `092` | Seulement par le code mort |
| `avis_google.ai_suggested_response`, `ai_response_status` | `020_notifications_campaigns.sql` | Non |

RLS de `ai_analyses` et `ai_memory` : `user_id = auth.uid()`. C'est le bon principe, mais à revoir pour le travail en équipe (`organization_id`). `ai_analyses` stocke l'**entrée brute** : si on la réutilise comme journal, il faut une durée de conservation, sinon on garde des dictées qui contiennent des données de clients.

## 6. Ce que le prototype ajoute (branche `cloud/ia-direction`)

| Fichier | Rôle |
|---|---|
| `src/lib/ia/contrat.js` | Contrat app ↔ fonction Edge : requête, réponse, erreurs, validation des paramètres contre les fiches envoyées |
| `src/lib/ia/simulateur.js` | Réponses simulées en démo (quatre demandes) |
| `src/lib/ia/preparer.js` | Transforme l'intention en proposition, à partir des données (mêmes calculs que les écrans) |
| `src/lib/ia/assistant.js` | Point d'entrée : démo → simulateur ; sinon → fonction Edge (`assistant`, nom provisoire) |
| `src/components/ia/AssistantIa.jsx`, `ResultatAssistant.jsx` | La fenêtre « Que voulez-vous faire ? » et les cartes de résultat |
| `src/App.jsx` | Bouton « Demander » dans l'en-tête et Ctrl+J, si `FONCTIONS.ia` ou en démo |
| `src/lib/ia/__tests__/assistant.test.js`, `scripts/parcours/assistant.cjs` | 20 tests unitaires, 2 parcours |
