# Mémoire de gardien-securite

Failles trouvées et leur statut. « Corrigée » = dans le dépôt ; « appliquée » = constatée en production (voir `docs/etat-production.md`).

## Organisations, membres, invitations (relecture du 8 oct. 2026, tâche `org-invitations`)

Production constatée par Hugo le 8 oct. : policies et fonctions = 035 + 039 + 041 (effacées du dépôt par 227534e), toutes les fonctions SECURITY DEFINER exécutables par `anon`. Le socle du banc (`scripts/banc/socle.mjs`) reproduit cet état.

| Faille | Gravité | Statut |
|---|---|---|
| Visiteur lit toutes les invitations en attente et leur jeton ; `revoke_invitation` appelable par un visiteur | CRITIQUE | corrigée par 078, non appliquée |
| Tout compte s'inscrit `owner` dans n'importe quelle organisation (policy INSERT de 041), puis lit et modifie ses données via les policies de 038 | CRITIQUE | corrigée par 078, non appliquée |
| Tout membre change les rôles ou retire le propriétaire ; tout membre crée des invitations (même `owner`) | ÉLEVÉE | corrigée par 078, non appliquée |
| `accept_invitation(p_token, p_user_id)` inscrit un compte arbitraire | ÉLEVÉE | corrigée par 078 (`auth.uid()`, `p_user_id` gardé optionnel pour l'app en cache), non appliquée |
| Intrusion antérieure qui survit (faux `owner` impossible à retirer, patron rétrogradé) | ÉLEVÉE | corrigée par 078 (rôle `owner` = `organizations.owner_id`, déclencheur), non appliquée |
| 072 réattribuait au patron les lignes d'un compte supprimé glissées dans son organisation, clé Stripe comprise | ÉLEVÉE | corrigée dans 072 le 8 oct. (membre seulement, jamais paiement/banque), non appliquée |
| Policies 038 sans rôle : `readonly` supprime les clients, ouvrier change l'IBAN ou la clé Stripe du patron ; tout compte écrit l'`organization_id` d'un autre | ÉLEVÉE | ouverte → tâche `org-droits` |
| `user_org_ids`, `get_user_role`, `is_org_member`, `get_user_org_id`, `create_default_org` à `p_user_id` libre, exécutables par `anon`, sans `search_path` | MOYENNE | ouverte → tâche `org-fonctions` |
| Limite de membres du plan seulement côté client | MOYENNE (revenu) | ouverte → tâche `equipe-plafond` |

Pièges appris :
- Ne pas retirer à `anon` le SELECT sur `organization_members` : des policies d'autres tables (066, 067, 068, 073) y font une sous-requête ; sans le droit, un visiteur aurait une erreur au lieu de zéro ligne.
- Le banc réaccorde tous les droits de table après les migrations (`banc-migrations.mjs`) : un droit par colonne ne se vérifie qu'après un rejeu de la migration dans les vérifications (voir `scripts/banc/078.mjs`).
- Une policy qui refuse une écriture ne lève pas d'erreur (0 ligne) : l'app doit relire les lignes modifiées (`.select()`), sinon elle annonce un succès.

## Comptes rendus d'électricité, migration 111 (relecture du 4 nov. 2026, branche `cloud/metier-electricien`, `12547fc`)

Jamais appliquée. Banc vert (665 vérifications). Applicable : rien de critique ni de moyen.

| Faille | Gravité | Statut |
|---|---|---|
| F1 `figer_compte_rendu` laisse un compte connecté vider `client_id`, `chantier_id`, `remplace_id` à volonté (casse « annule et remplace », libère l'index unique) ; inutile : l'action ON DELETE SET NULL s'exécute en propriétaire de la table et passe déjà la garde `current_user` | FAIBLE | ouverte (même design que 104) |
| F2 `updated_at` réécrivable par le client, jamais remis à `now()` à la mise à jour | FAIBLE | ouverte (idem 104) |
| F3 `signature`, `mesures`, textes sans borne de taille | FAIBLE | ouverte |
| F4 rôle `readonly`/ouvrier crée, annule, lie une facture (pas de `mon_role_organisation`) | FAIBLE | ouverte → tâche `org-droits` |
| F5 `regimeTva` (mentionTvaReduite.js) : marque gardée si la désignation change (seul un changement de taux l'efface) ; comparaison `Number(l.tva)` sur `doc.lignes` (et non sur les montants de `tvaDetails`) → certification 278-0 bis A supprimée à tort. Pas exploitable par un tiers (lignes écrites par les membres, jamais imprimée) | FAIBLE (fiscal) | ouverte |

Sain : RLS par organisation (salarié sorti 0 ligne), REVOKE ALL + GRANT S/I/U, aucune DELETE, `anon` rien ; `sceller` SECURITY DEFINER search_path fixé, non exécutable, numéro sous verrou consultatif par série/année Paris ; contrôles chantier/client/facture/remplacé dans la série (pas d'oracle : même message pour inconnu et étranger) ; découverte par 105 (index unique sur expression ignoré) et 072 ; HTML du PDF échappé, signature validée `data:image`, iframes `sandbox=""` ; `updateItem` en `.select().single()`.
