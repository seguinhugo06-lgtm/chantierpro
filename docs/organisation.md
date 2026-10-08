# Organisation du travail sur Mallettico

Comment Hugo et Claude (avec ses agents spécialisés) font avancer Mallettico sans régression. À lire une fois ; `CLAUDE.md` en est le résumé opérationnel.

## 1. Qui fait quoi

| Qui | Rôle | Ne fait pas |
|---|---|---|
| **Hugo** | Décide (produit, prix, juridique, comptes) ; utilise l'app sur ses chantiers et note les frictions ; applique les migrations SQL ; déploie les fonctions Edge ; tient les comptes (Stripe, Apple, Google, Supabase) ; teste sur ses téléphones | — |
| **Claude (session principale)** | Chef d'orchestre : cadre la tâche, implémente, vérifie, fait relire par les bons agents, livre, met à jour la documentation et le Pilote | Saisir des identifiants ; appliquer du SQL en production ; décider à la place d'Hugo d'un sujet de la liste « Décisions attendues » |
| **Agents spécialisés** (`.claude/agents/`) | Regard d'expert sur un domaine, à la demande de la session principale | Livrer ; modifier hors de leur mission |

### L'équipe d'agents

| Agent | Quand l'appeler | Ce qu'il rend |
|---|---|---|
| `verificateur` | Avant toute livraison, ou pour prouver qu'un changement marche | Verdict vérifié (commandes, parcours navigateur, captures), avec les « pannes vertes » débusquées |
| `gardien-securite` | Migration, policy, fonction Edge, auth, paiement, données personnelles | Failles classées par gravité, avec scénario d'exploitation et correctif |
| `juriste-btp` | Devis, factures, TVA, mentions légales, textes marketing ou CGV | Écarts au droit sourcés, texte corrigé |
| `architecte-donnees` | Toute modification de schéma, RLS, RPC | Migration idempotente + vérifications au banc |
| `ingenieur-mobile` | Affichage téléphone, Capacitor, fichiers, liens, stores techniques | Défauts mesurés à 375 px, écarts natifs |
| `redacteur-stores` | Fiches App Store / Google Play, déclarations de confidentialité, notes à l'examinateur | Textes prêts à coller, alignés sur le code |
| `analyste-terrain` | Retours utilisateurs, journal de terrain du Pilote, idées | Problèmes triés (gravité × fréquence), tâches avec critère d'acceptation |
| `critique-produit` | Nouvelle demande de fonctionnalité, ou doute sur le périmètre | Avis franc (faire / ne pas faire / plus petit), version minimale utile |

## 2. Où vit chaque information

| Quoi | Où | Tenu par |
|---|---|---|
| Règles du projet (la « constitution ») | `CLAUDE.md` + `.claude/rules/*.md` (chargées selon les fichiers touchés) | Claude, validé par l'usage |
| Cap, phases, prochaines tâches | `docs/feuille-de-route.md` | Claude |
| Ce qui tourne réellement en production | `docs/etat-production.md` | Claude à chaque livraison ; Hugo quand il applique / déploie |
| Décisions et leurs raisons | `docs/decisions.md` | Claude, décisions d'Hugo |
| Droit et métier BTP (sourcé) | `docs/metier-btp.md` | `juriste-btp` |
| Suivi personnel d'Hugo, journal de terrain | Pilote (artefact, base privée `data/users/me/pilote`) | Hugo ; Claude y écrit les avancées |
| Apprentissages de Claude | mémoire automatique (hors dépôt) + `.claude/agent-memory/` (par agent, dans le dépôt) | Claude et les agents |
| Mesures | `audit-ui/` (ignoré par git) : rapports d'audit, captures, dernière vérification | outils |

## 3. Le cycle d'une tâche (`/tache`)

1. **Cadrer** : le problème (avec sa preuve), le critère d'acceptation **observable** (« l'artisan voit… », « la requête renvoie… »), la vérification prévue. Une demande de fonctionnalité passe d'abord par `critique-produit`.
2. **Explorer** : lire le code concerné, `docs/etat-production.md` si la production est en jeu, le journal de terrain si c'est un irritant d'usage.
3. **Implémenter** : petits commits en anglais (`feat:`, `fix:`…). Le hook de lint signale immédiatement les erreurs.
4. **Vérifier** selon la matrice ci-dessous. Une vérification se constate (sortie de commande, parcours, capture), elle ne se suppose pas.
5. **Faire relire** par l'agent du domaine (sécurité, juridique, données, mobile).
6. **Livrer** (`/livrer`) : `npm run verifier` vert sur le commit → `git push origin HEAD:main` (le garde-fou refuse sinon) → `npm run statut` (Vercel ×2 + CI).
7. **Consigner** : `docs/etat-production.md`, feuille de route, Pilote, et la mémoire si une leçon est apprise.

### Matrice de vérification

| Le changement touche… | Minimum avant de dire « fait » |
|---|---|
| Logique pure (calcul, format) | test unitaire + `npm run verifier` |
| Affichage | `npm run verifier -- --complet` (audit d'interface 0 défaut) + `node scripts/sonde.cjs <page> 375` sur la page touchée |
| Parcours critique (devis, facture, paiement, compte) | un parcours dans `scripts/parcours/` le couvre et passe |
| Schéma, policy, RPC | `npm run banc:migrations` avec des vérifications d'EFFET (ce qu'un utilisateur peut / ne peut pas faire) + `gardien-securite` |
| Fonction Edge | relecture `gardien-securite` ; déploiement par Hugo, noté dans `docs/etat-production.md` |
| Devis / factures / textes légaux | `juriste-btp` + les deux générateurs de PDF vérifiés |
| Mode réel (Supabase) | parcours `reel: true` (faux Supabase contrôlé) ; le mode démo ne suffit pas |

## 4. Rituels

| Quand | Quoi |
|---|---|
| Début de session | Le hook affiche l'état ; `/debut` pour l'orientation complète (retard sur main, attentes Hugo, journal de terrain, prochaine tâche) |
| Fin de session | `/fin` : documentation, Pilote, mémoire, rien de non commité |
| Chaque semaine (lundi, automatique) | CI « Santé hebdomadaire » : audit complet, parcours, banc, dépendances vulnérables → issue GitHub si quelque chose casse |
| Chaque semaine (avec Hugo) | `analyste-terrain` sur les retours et le journal ; arbitrage des priorités |
| Avant une soumission aux stores | `redacteur-stores` + `ingenieur-mobile` + `juriste-btp` ; checklist de la phase 3 de la feuille de route |

## 5. Comment demander quelque chose à Claude

- « `/tache` les photos de chantier ne se compressent pas sur Android » — boucle complète, jusqu'à la livraison.
- « `/debut` » au début d'une séance de travail ; « `/fin` » avant de partir.
- « Note dans le journal : le PDF est illisible en plein soleil » — Claude l'ajoute au journal de terrain du Pilote.
- « J'ai appliqué la migration 073 » — Claude met à jour `docs/etat-production.md` et vérifie ce qui en dépend.
- Une idée : la dire telle quelle ; `critique-produit` la challenge avant tout code.

## 6. Ce qui remonte toujours à Hugo

Décisions de la liste de `docs/decisions.md` ; tout ce qui demande un compte, un identifiant ou un paiement ; l'application d'une migration ; un changement de prix ou de promesse commerciale ; une action irréversible sur des données réelles.
