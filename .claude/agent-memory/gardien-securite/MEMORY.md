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

## Attestations d'entretien (relecture du 4 nov. 2026, branche cloud/metier-entretien, migration 113, non appliquée)

113 calque 104 (policies, REVOKE/GRANT, sceller/figer, refus par `refuser_rappels_ramonage` étendue) : jugé sain, aucune nouvelle fonction publique, liste de 092 juste.

| Faille | Gravité | Statut |
|---|---|---|
| Cron (ramonage l. 518, entretien l. 655 de send-scheduled-relances/index.ts) : une seule fiche entreprise par organisation, prise au hasard ; tout membre peut créer sa fiche dans l'organisation (policies 084 « Org members can insert entreprise ») avec envoi auto → rappels aux clients du patron sous son nom et son reply_to, rappel du patron marqué fait | MAJEURE | corrigée sur la branche (`fichesQuiEnvoient` : fiche du propriétaire seulement ; depuis la relecture locale, choisie parmi ses fiches valables — module actif, e-mail). Non déployée. Change aussi le ramonage en production : vérifier avant redéploiement que les fiches à envoi auto sont celles du propriétaire |
| Écriture d'app = ligne entière : un `rappel_fait_le` local périmé (null) efface la prise du cron → second e-mail (entretiens et ramonages) | MINEURE | corrigée pour `entretiens` (figer_entretien garde un `email_auto`) ; ouverte pour `ramonages` (figer_ramonage, migration à part) |
| Banc 113 : ne prouve pas qu'un jeton de ramonage marche encore avec la 113 ; l'appel visiteur est masqué par un appel serveur (l. 89) | MINEURE (preuve) | corrigée : appel serveur supprimé, refus relu dans la transaction du visiteur (commeAnonyme annule sa transaction : relire après coup ne voyait rien), pour l'entretien et le ramonage |
| figer_entretien laissait vider client_id / remplace_id et écrire updated_at (F1, F2 de 111) | MINEURE | corrigée (alignée sur 111, vérification 7 bis au banc) |
