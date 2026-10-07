# Feuille de route — Mallettico sur l’App Store et Google Play

Établie le 7 octobre 2026 à partir de mesures sur le code, le build et le poste de travail ; à tenir à jour à chaque session.
Le suivi personnel d’Hugo (statuts, notes, journal de terrain) vit dans l’outil **Pilote** : https://claude.ai/artifact/Esz8pN474Q1FDsbHDyaB1Q — l’état y est privé (`data/users/me/pilote`, journal dans `.../frictions`) et lisible par Claude via ArtifactData.

## Objectif

Une application **nickel** — sans menu qui sort de l’écran ni information qui se chevauche — publiée sur l’App Store et Google Play, que des artisans de l’entourage testent pendant un an.

## Ce qui a été mesuré le 7 octobre

| Sujet | Constat | Preuve |
|---|---|---|
| Production | À jour (`078f984`) ; IA masquée par `FONCTIONS.ia = false` | statut GitHub « success » des deux projets Vercel |
| Interface | 28 défauts réels sur les 14 pages atteignables : 0 sur ordinateur (1440 px), 15 sur tablette (768 px), 13 sur téléphone (375 px). Environ six causes. 8 pages n’ont pas pu être auditées (redirigées). | `node scripts/audit-ui.cjs` → `audit-ui/rapport.md` |
| Application native | Aucun runtime natif (ni Capacitor, ni Cordova) ; une seule icône, en SVG | `package.json`, `public/` |
| Téléchargements | 21 fichiers téléchargent par des liens de navigateur — **ne marche pas dans une app iOS** | grep `download` / `createObjectURL` / `.save(` |
| Sorties vers Stripe | 10 endroits (checkout, portail) à ouvrir dans le navigateur système | grep `window.location` / `window.open` |
| Liens d’e-mail | Aucun `redirectTo` : confirmation et réinitialisation ne peuvent pas rouvrir une app | grep `redirectTo` |
| Notifications push | Aucune | grep `PushManager` |
| Suppression de compte | **Cassée** (RPC `delete_user_data` absente, table `articles` inexistante) — exigée par Apple (5.1.1(v)) | `Settings.jsx`, historique `227534e` |
| Mot de passe oublié | **Inexistant** (toast « écrivez au support ») | aucun `resetPasswordForEmail` |
| Identité de l’éditeur | **Fictive** (SIRET `123 456 789 00012`) — bloque la politique de confidentialité exigée par les stores | `src/components/LegalPages.jsx` |
| Poste de travail | Ni Xcode complet, ni simulateur, ni Android Studio, ni Java ; CLI Supabase non connectée | `xcode-select -p`, `java -version` |
| Instructions Claude | `CLAUDE.md` périmé (BatiGesti, migrations 001-054, règles absentes) — remplacé par la version préparée | — |

## Règles des stores qui décident de l’architecture

- **Apple 4.2 (fonctionnalité minimale)** : un site emballé est refusé. Il faut des fonctions natives au cœur de l’usage → notifications (devis signé, paiement reçu), appareil photo de chantier, partage natif des PDF, hors-ligne.
- **Apple 5.1.1(v)** : suppression du compte depuis l’app, obligatoire.
- **Paiements (Apple 3.1.1 / 3.1.3, Google Paiements)** : décision à prendre (voir plus bas) avant d’ajouter le moindre bouton d’achat dans les apps.
- **Google, comptes personnels créés après nov. 2023** : test fermé de **12 testeurs pendant 14 jours consécutifs**, usage réel vérifié depuis 2026. Les comptes organisation (entité + D-U-N-S) en sont exemptés.

## Décisions qui n’appartiennent qu’à Hugo (bloquantes)

1. **Structure juridique** (une seule entreprise individuelle par personne ; société pour Mallettico ?) — décide le type de comptes développeur, l’identité publiée, la TVA des abonnements.
2. **TVA des abonnements** — irréversible après le premier abonné (`tax_behavior` Stripe).
3. **Domiciliation** — l’adresse publiée.
4. **Paiement dans les apps** — A : achats intégrés Apple/Google (15 %, via RevenueCat) ; B : lien vers le web dans l’UE (Apple : 12 à 20 % + écran imposé) ; C : apps sans aucun achat, abonnement uniquement sur le site (zone d’interprétation : vérifier le texte en vigueur avant soumission). Recommandation de départ : C si possible, sinon A.
5. **Type de comptes développeur** — personnel (nom d’Hugo, test fermé de 14 jours) ou organisation (« Mallettico », D-U-N-S, pas de test fermé).

## Répartition du travail

### Ce que seul Hugo peut faire

| Quoi | Pourquoi Claude ne peut pas | Quand |
|---|---|---|
| Démarrer une **nouvelle** session de code sur `Documents/chantierpro-app` (son worktree part du dernier `main`) ; ne plus utiliser la session « elegant-pike » | Claude ne peut ni ouvrir de session, ni déplacer la sienne, ni écrire dans la copie principale depuis un vieux worktree (vérifié le 7 oct.) | Avant tout |
| Installer Xcode (App Store) et Android Studio, accepter les licences | Comptes et téléchargements personnels | Dès maintenant (téléchargements longs) |
| `npx supabase login` puis `npx supabase link --project-ref kofsbgxkrmryfetevetn` | Connexion à votre compte | Avant les fonctions serveur |
| `/mcp` → autoriser GitHub et Sentry | Autorisation OAuth | Avant les sessions longues |
| Les cinq décisions ci-dessus | Ce sont des choix d’entreprise | Au plus tôt |
| Créer et payer les comptes Apple Developer (99 $/an) et Google Play (25 $) ; D-U-N-S si société | Paiement et identité | Après la structure |
| Exécuter les migrations SQL dans l’éditeur Supabase (071 puis toutes les suivantes) | Interdit d’appliquer en production à la place d’Hugo | À chaque migration fournie |
| Clé APNs (Apple) et projet Firebase (Google) | Comptes personnels | Avant les notifications |
| Signer et envoyer les builds (Xcode, Play Console), remplir les formulaires de confidentialité, soumettre, répondre aux examinateurs | Identifiants et comptes | Publication |
| Tester sur ses vrais téléphones ; recruter les testeurs (≥ 14 sur Android si compte personnel) | Appareils et relations | Bêta |
| Fournir l’identité réelle de l’éditeur | Information personnelle | Avant la publication |

### Ce que Claude fait (sessions autonomes)

Chaque tâche a une **commande à copier** dans le Pilote (bouton « Copier la demande pour Claude »). Ordre recommandé :

**Phase 0 — Fondations (½ jour)**
1. Installer `CLAUDE.md`, cette feuille de route et `scripts/audit-ui.cjs` dans le dépôt ; `audit-ui/` dans `.gitignore`.
2. Liste d’autorisations des commandes sûres (`.claude/settings.json`) — tests, lint, build, smoke, audit, git status/diff/log/add/commit ; jamais push ni `db push`.

**Phase 1 — App nickel sur le web (≈ 4 à 6 jours)**
3. Corriger l’interface par cause commune jusqu’à 0 défaut à l’audit sur les 6 pages du quotidien, puis les autres.
4. Suppression de compte réelle (RPC + Storage + échec bruyant).
5. Réinitialisation du mot de passe.
6. Échecs de chargement visibles (fin des « 0 résultat » qui mentent).
7. Outil de retours utilisateurs (table `feedback`, e-mail, statut visible).
8. Chaîne d’abonnement : webhook 500 en échec, portail débloqué, retour de paiement, bug d’équipe.
9. Mention TVA réduite sur devis et factures ; articles électricien (déplacement, horaire, dépannage) ; identité réelle dès qu’Hugo la fournit ; retrait des affirmations fausses (« conforme 2026 », prix barré, frais de 1,7 %).
10. Offre « un an offert » pour les testeurs.

**Phase 2 — Application native (≈ 5 à 8 jours, après installation de Xcode et Android Studio)**
11. Capacitor (iOS + Android), service worker désactivé en natif, zones sûres, bouton retour Android, icônes et écran de démarrage depuis le logo vectoriel.
12. PDF et exports → fichier + feuille de partage natifs (21 fichiers).
13. Sorties Stripe dans le navigateur système ; liens universels / App Links pour les e-mails.
14. Notifications push (devis signé, paiement reçu, relance envoyée).
15. Appareil photo natif (6 points de prise de photo).

**Phase 3 — Publication (Claude prépare, Hugo soumet)**
16. Fiches des stores (textes, captures réelles, icônes) dans `Documents/Mallettico/Stores/`.
17. Brouillons des déclarations de confidentialité Apple et Google, alignés sur le code.
18. Notes pour l’examinateur et compte de démonstration.

**Phase 4 — Remettre l’IA (après les stores)**
19. Saisie clavier de la dictée (espaces avalés) ; quota de dictées côté serveur ; Anthropic déclaré comme sous-traitant ; dictée validée sur un vrai compte ; puis `FONCTIONS.ia = true`.

## Règles pour les sessions autonomes

- Une tâche à la fois, de la commande à la vérification : tests, lint, build, smoke, et l’audit d’interface quand l’affichage change. Une tâche n’est finie que lorsque son critère est **observé**.
- Commiter par tâche (message en anglais, préfixe conventionnel) ; **ne pas pousser** sans l’accord d’Hugo.
- Travailler dans le worktree de la session, après avoir vérifié qu’il contient le dernier `origin/main` ; livrer par `git push origin HEAD:main` puis remettre la copie principale à jour (`git -C /Users/hugoseguin/Documents/chantierpro-app pull --ff-only`).
- Toute migration : écrite, jamais appliquée ; fournir le SQL et la requête de contrôle, et le noter dans le Pilote.
- Après une tâche, mettre à jour l’étape correspondante du Pilote (statut, note) via ArtifactData sur `data/users/me/pilote`.
- Lire le journal de terrain (`data/users/me/pilote/frictions`) avant de proposer des correctifs : ce sont les vrais problèmes vécus sur chantier.

## Référence de l’audit d’interface (7 octobre 2026)

Mesuré avec `scripts/audit-ui.cjs` sur le build de démo. **28 défauts** sur les 14 pages atteignables, regroupés par cause :

| Cause | Où | Défauts |
|---|---|---|
| Le menu **« Nouveau »** de l’en-tête déborde de 50 px à droite | toutes les pages, 768 px | 14 |
| Textes qui se chevauchent avec les **libellés de 10 px de la barre d’onglets mobile** (`span.text-[10px].mt-0.5.truncate`) — le contenu passe sous la barre ou ses libellés débordent | devis, catalogue (3 chacune), changelog, plan, planning, 375 px | 9 |
| Menu **« Plus d’actions »** du catalogue : sort de 2 358 px vers le bas et 168 px à gauche | catalogue, 375 px | 1 |
| Menus **« Plus d’onglets »** qui débordent à droite (59 et 75 px) | catalogue 375 px, équipe 768 px | 2 |
| Menu **« Paramètres trésorerie »** : 212 px à gauche | finances, 375 px | 1 |
| Menu **« Options de création »** : 66 px à gauche | devis, 375 px | 1 |

Aucune page ne défile horizontalement, et rien n’est cassé sur ordinateur.

Limites de la mesure : seuls les déclencheurs marqués `aria-haspopup` / `aria-expanded` et visibles à l’écran sont ouverts (12 au plus par page) — les menus sans ces attributs ne sont pas testés, et il faudra les ajouter (accessibilité) pour qu’ils le soient. Pages non atteintes (redirigées par les droits ou routes anciennes) : admin, analytique, billing, export, ouvrages, pricing, profil, signatures — à auditer en les ouvrant par la navigation.
