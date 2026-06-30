# Review Visuelle — BatiGesti (Production)

**Date** : 2026-03-25
**URL** : batigesti.fr
**Compte** : Hugo Elec (seguin.hugo06)
**Méthode** : Navigation manuelle sur Chrome, captures d'écran de chaque module

---

## 1. DASHBOARD (Accueil)

### Constat visuel

Le Dashboard confirme intégralement le diagnostic posé dans `principes-redesign-ux.md`. En scrollant du haut vers le bas, on traverse :

1. **Header** — "Bonjour, seguin.hugo06" + score profil 6/10 + dots de progression
2. **Banner rouge** — "2 factures en retard · Total 653€"
3. **Banner jaune** — "Conformité 67%" avec bouton "Compléter" (texte cassé : `Compl\u00e9ter`)
4. **KPI duo** — "À encaisser 653€" + "Ce mois 0€" (seulement 2 métriques, texte fantôme quasi-invisible)
5. **ACTIONS PRIORITAIRES** — 5 items (2 factures retard + 3 devis sans réponse 45-77j) + "Voir tout (15)" + "Tout relancer (7)"
6. **Devis en attente** — Colonne droite, 5 lignes (3 223€, 3 223€, 55€, 0€, 120€)
7. **Entonnoir de conversion** — 4 barres (Créés 32 → Envoyés 13 → Signés 6 → Facturés 2)
8. **Mémos du jour** — 7 items (checkboxes non cochées)
9. **Activité récente** — 4 entrées (chantier démarré, brouillons créés)
10. **Devis IA / Devis Express** — 2 cards promotionnelles côte à côte
11. **Actions rapides** — Nouveau devis, Nouveau chantier, Nouveau client
12. **Clients** — 9 Total, 5 Actifs, 0 Ce mois
13. **Équipe** — 1 membre (Thomas Morel, Plombier)
14. **Catalogue** — 3 articles (Plomberie, Vitrerie, Carrelage)
15. **Résumé mensuel** — CA 0€ (-100%), Mois précédent 13 807€, CA prévisionnel 9 494€

**Total : 15 zones distinctes, ~5 scrolls complets pour tout voir.**

### Problèmes critiques observés

- **KPIs fantômes** : les valeurs "Ce mois 0€" et "vs 12 807€ mois dernier" sont en texte quasi-transparent, presque illisibles
- **Bug d'encodage** : le bouton "Compléter" sur le banner Conformité affiche `Compl\u00e9ter` au lieu du caractère accentué
- **Colonne gauche vide** : après l'Entonnoir de conversion et l'Activité récente, toute la moitié gauche est vide pendant que la droite empile encore 5 widgets
- **Devis IA/Express** : positionnés en bas après 3 scrolls — personne ne les voit là, ils devraient être sur la page Devis
- **Actions rapides redondantes** : "Nouveau devis/chantier/client" dupliquent le bouton "+ Nouveau" du header global
- **Score profil 6/10** : les dots violets en haut à droite ne sont pas cliquables visuellement, pas d'indication qu'on peut agir

### Alignement avec le wireframe cible

| Zone wireframe | État actuel | Verdict |
|---|---|---|
| Header compact 56px | ✅ Existe mais affiche l'email brut au lieu du prénom | À corriger |
| Notification Strip unique | ❌ 2 banners séparés (rouge + jaune) au lieu d'un seul | À fusionner |
| KPI Strip 4 métriques | ❌ 2 métriques seulement, texte fantôme | À refaire |
| Actions du jour max 3 | ❌ 5 items + "Voir tout (15)" | À limiter |
| Dashboard Grid 2x2 | ❌ Pas de grid, empilement vertical de 8+ widgets | À restructurer |

---

## 2. DEVIS & FACTURES

### Constat visuel

- **KPI strip** en haut : CA encaissé 0€, En cours 5, Conversion 54.5%, À encaisser 653.40€ — bien structuré
- **Banner profil** : "Profil incomplet — Ajoutez vos infos pour des devis professionnels" — ce banner ne devrait pas être ici, il appartient aux Settings
- **Filtres** : tabs status (Tous 32, Brouillons, Envoyés, Signés, Facturés, Rejetés) — bonne navigation
- **Grille cards** : 3 colonnes, chaque devis avec client, montant, statut badge coloré, date

### Points positifs
- Les 4 KPIs horizontaux sont exactement le pattern visé par le redesign
- Les cards devis sont lisibles avec une bonne hiérarchie (client > montant > status)
- Le tri/filtre fonctionne bien visuellement

### Problèmes
- Banner "profil incomplet" = pollution contextuelle (relève des Settings)
- Les cards pourraient avoir plus de padding (p-3 actuel → p-5 visé)

---

## 3. CHANTIERS

### Constat visuel

- **Banner contextuel** : "Aujourd'hui · 1 chantier" avec date
- **Barre de recherche** + filtres status (Tous, En cours, Terminé, En pause, En attente)
- **5 cards chantier** : nom, client, dates, barre de progression, montant, badge status
- **Layout propre** : une seule colonne, pas de surcharge

### Points positifs
- C'est le module le plus propre visuellement
- La barre de progression (%) sur chaque card est claire
- Un seul niveau d'information, pas de zones empilées

### Problèmes
- Les barres de progression sont très petites (6px de haut environ)
- Pas de KPI strip en haut (contrairement au wireframe cible qui prévoit "X chantiers actifs, Y en attente")

---

## 4. CLIENTS

### Constat visuel

- **4 KPI cards** en haut : Total clients, Actifs, Nouveaux ce mois, CA moyen
- **Barre de recherche** + filtres status
- **Grille 3 colonnes** : 7 cards clients avec nom, email, téléphone, CA, badge status

### Points positifs
- Le layout KPI strip + grille est exactement le pattern "Header → Metrics → Content" visé
- Les cards sont aérées et lisibles

### Problèmes
- Les KPI cards ont des hauteurs variables selon le contenu
- Certaines cards clients ont des données incomplètes (emails "seguin" sans domaine)

---

## 5. TÂCHES & PLANNING

### Constat visuel

- **Vue semaine** avec grille calendrier (Lun-Dim)
- **1 membre** affiché : Thomas Morel
- **Interface très vide** avec peu de données

### Problèmes
- La grille calendrier prend énormément de place pour peu d'information
- Pas de KPI strip (heures planifiées, capacité restante, etc.)

---

## 6. ÉQUIPE

### Constat visuel

- **5 tabs visibles** + menu "..." — conforme au wireframe cible
- **Hero métrique** : heures de la semaine avec visualisation
- **1 card employé** : Thomas Morel, Plombier, avec métriques Facturé/Coût/Ce mois

### Points positifs
- Le pattern 5 tabs + overflow "..." est déjà implémenté — c'est le modèle pour les autres modules
- La card employé est claire avec une bonne hiérarchie

### Problèmes
- Le hero "heures de la semaine" prend beaucoup de place verticale pour une seule métrique

---

## 7. CATALOGUE

### Constat visuel

- **Header** : "Catalogue (3)" + boutons Upload/Download/Scanner + "Référentiel BTP 2000+" + "+ Ajouter"
- **5 tabs** : Articles 3, Fournisseurs 6, Mouvements 8, Packs 2, Inventaire + menu "..."
- **5 KPI cards** : Articles catalogue 3, Valeur stock 4.5k€, Marge moy 39%, Stock bas 0, Favoris 0
- **Filtres catégorie** : Tous, Plomberie, Électricité, Maçonnerie, Carrelage, Peinture, Menuiserie, Matériaux, Isolation, Main d'o... (tronqué)
- **Tri** : Nom, Prix, Stock, Marge, Utilisé
- **Banner onboarding** : "Votre catalogue est presque vide" + Référentiel BTP + Importer CSV
- **Table** : Article, Vente, Achat, Marge — 3 articles listés

### Points positifs
- Les tabs avec compteurs sont très bien — c'est informatif
- Le KPI strip 5 cards est clair
- Le banner d'onboarding est contextuel et utile

### Problèmes
- **5 KPI cards** débordent — "Stock bas 0" et "Favoris 0" n'apportent pas de valeur quand ils sont à zéro (devrait masquer ou fusionner)
- **Filtres catégorie** : "Main d'o..." tronqué — la barre de filtres horizontale n'a pas de scroll visible ou d'indication de troncature
- **6 boutons dans le header** : Upload, Download, Scanner (icônes sans label), Référentiel BTP, + Ajouter — trop d'actions simultanées
- La table n'a que 3 articles mais la structure est bonne pour un catalogue rempli

---

## 8. FINANCES

### Constat : ERREUR

La page Finances affiche une **erreur complète** : "Oups, quelque chose s'est mal passé" avec les options Réessayer / Recharger la page / Accueil.

**Action requise** : investiguer l'erreur (probablement un problème de données ou de composant). La page est inaccessible en production.

---

## 9. MARKETING & RÉPUTATION

### Constat visuel

- **Header** : "Marketing & Réputation" + description
- **5 tabs** : Dashboard, Avis & Réputation, Campagnes, Acquisition, Visibilité
- **4 KPI cards** : Note moyenne 4.5★, Avis total 12, Taux réponse 67%, Score réputation 8.2/10
- **Actions rapides** : Demander des avis, Créer une campagne, Voir les avis — 3 cards CTA

### Points positifs
- Layout très propre : Header → Tabs → KPIs → Actions
- Exactement le pattern "Header → Metrics → Content" visé
- Espace blanc généreux, pas de surcharge
- C'est le module le mieux conçu visuellement

### Problèmes
- Mineur : beaucoup d'espace vide en bas (mais c'est préférable au scroll infini)

---

## 10. PARAMÈTRES

### Constat visuel

- **Header** : "Paramètres" + badge "Profil complété 57%"
- **6 tabs** : Mon entreprise, Documents, Finance, Équipe, Intégrations, Avancé
- **Sous-tabs** : Identité, Légal, Assurances, Banque
- **Contenu** : Logo & Couleur (8 pastilles de couleur), Informations entreprise (formulaire)

### Points positifs
- Le badge "57% complété" en haut à droite est clair et motivant
- Les 8 pastilles de couleur pour le thème sont bien faites (checkmark sur la sélection active)
- Le formulaire est propre

### Problèmes
- **6 tabs + sous-tabs** = 2 niveaux de navigation (Mon entreprise a 4 sous-tabs) — potentiellement confusant
- Le badge 57% pourrait inclure les étapes manquantes directement

---

## Synthèse globale

### Ce qui fonctionne bien (à conserver)
1. **Sidebar de navigation** : icônes + labels au hover, bien structurée par sections
2. **Header global** : Recherche ⌘K, dark mode toggle, notifications, + Nouveau — complet sans surcharger
3. **Pattern KPI strip** sur Devis, Clients, Catalogue, Marketing — cohérent et lisible
4. **Pattern tabs** sur Équipe (5 + ...) et Catalogue — modèle pour les autres modules
5. **Cards avec badges colorés** : les statuts devis/chantiers/clients sont clairs

### Ce qui doit changer (priorités)

| Priorité | Problème | Modules touchés |
|---|---|---|
| 🔴 P0 | Dashboard : 15 zones → 5 zones (mega prompt) | Dashboard |
| 🔴 P0 | Finances : page en erreur | Finances |
| 🔴 P0 | Bug encodage `\u00e9` dans bouton Conformité | Dashboard |
| 🟠 P1 | KPIs fantômes (texte quasi-invisible) | Dashboard |
| 🟠 P1 | Banner profil sur page Devis (mauvais contexte) | Devis |
| 🟠 P1 | Devis IA/Express enterrés en bas du Dashboard | Dashboard |
| 🟡 P2 | Filtres catégorie tronqués ("Main d'o...") | Catalogue |
| 🟡 P2 | Trop de boutons header Catalogue (6) | Catalogue |
| 🟡 P2 | Planning très vide, pas de KPIs | Planning |
| 🔵 P3 | Padding cards (p-3 → p-5) | Global |
| 🔵 P3 | Settings : 2 niveaux de tabs | Settings |

### Score visuel par module

| Module | Score /10 | Commentaire |
|---|---|---|
| Marketing | 9/10 | Modèle à suivre — clean, aéré, structuré |
| Clients | 7.5/10 | Bon pattern KPI + grid |
| Devis | 7/10 | KPIs OK mais banner intrusif |
| Chantiers | 7/10 | Propre mais manque de KPIs |
| Catalogue | 6.5/10 | Bien structuré mais surchargé en header |
| Équipe | 6.5/10 | Bon pattern tabs, hero trop vertical |
| Paramètres | 6/10 | Fonctionnel, 2 niveaux de nav |
| Planning | 5/10 | Vide, pas de KPIs, grille surdimensionnée |
| Dashboard | 3/10 | 15 zones, scroll infini, KPIs invisibles |
| Finances | 0/10 | Erreur — page inaccessible |

### Conclusion

Le mega prompt `mega-prompt-redesign-dashboard.md` est parfaitement calibré par rapport à ce qui est observé en production. Les problèmes documentés dans l'audit code (15+ sections, empilement vertical, widgets redondants) sont confirmés visuellement. La page Marketing montre que le bon pattern existe déjà dans l'app — il faut l'appliquer au Dashboard et aux autres modules.

**Prochaine étape** : exécuter le mega prompt pour restructurer le Dashboard, puis appliquer le même pattern aux modules scorés < 7/10.
