# Audit UX Complet - ChantierPro

**Date**: Février 2026
**Version testée**: localhost:5173 (mode démo)
**Testeur**: Audit automatisé Claude

---

## Résumé Exécutif

ChantierPro est une application de gestion BTP bien conçue avec une identité visuelle cohérente (palette orange). Cependant, plusieurs problèmes d'UX, de wording et d'accessibilité ont été identifiés qui pourraient impacter l'expérience utilisateur, particulièrement pour les artisans novices en technologie.

### Score Global: **7/10**

| Catégorie | Score | Commentaire |
|-----------|-------|-------------|
| UI Design | 8/10 | Cohérent, moderne, bonne utilisation des couleurs |
| UX/Ergonomie | 6/10 | Plusieurs bugs et frictions identifiés |
| Wording | 6/10 | Jargon technique, incohérences |
| Accessibilité | 5/10 | Contraste, taille cibles tactiles à améliorer |
| Responsive | 7/10 | Bon mais sidebar fixe problématique |

---

## 1. Dashboard (Accueil)

### ✅ Points Positifs
- Message de bienvenue personnalisé "Bonjour, Martin"
- Bonne hiérarchie visuelle avec les cartes KPI
- Section "À faire aujourd'hui" utile et actionnable
- Alertes météo pour les chantiers (innovation intéressante)

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Badge "72%" sur carte "À ENCAISSER" non expliqué | 🟡 Moyen | Ajouter tooltip "72% de l'objectif mensuel atteint" |
| "-100% vs mois dernier" alarmant | 🟠 Important | Afficher "Début de mois" ou masquer si < 5 jours |
| Texte "~37j de travail restants" tronqué | 🟡 Moyen | Utiliser "37 jours restants" ou ajuster la taille |
| "Âge moyen: ~15j" format technique | 🟢 Mineur | Écrire "environ 15 jours" |
| Graphique avec chute brutale en février | 🟡 Moyen | Afficher projection ou moyenne mobile |
| Espace vide excessif dans "À faire aujourd'hui" | 🟢 Mineur | Centrer les cartes ou ajouter contenu |

### 💡 Suggestions Wording
- "À ENCAISSER" → "Factures à encaisser"
- "Taux conversion" → "Taux de signature"
- "Voir détails" → "Voir tout"

---

## 2. Devis & Factures

### ✅ Points Positifs
- Vue d'ensemble claire avec compteurs Devis/Factures
- Système de badges pour statuts (Brouillon, Envoyé, Signé, Payé)
- Filtres et tri fonctionnels
- Actions rapides (Relancer, Voir, Convertir)

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Code document affiché 2 fois (titre + sous-titre) | 🟢 Mineur | Afficher uniquement dans le titre |
| Badge "À relancer" orange = confusion avec "En attente" | 🟡 Moyen | Utiliser rouge ou icône distincte |
| Formatage montants incohérent | 🟢 Mineur | Uniformiser: "39 120,00 €" partout |
| Icônes d'action petites (< 44px) | 🟠 Important | Augmenter taille pour accessibilité tactile |
| Pas de prévisualisation au survol | 🟡 Moyen | Ajouter preview PDF au hover |

### 💡 Suggestions Wording
- "1 en attente de réponse" → "1 devis en attente de réponse client"
- "Convertir" → "Créer facture"

---

## 3. Chantiers

### ❌ BUGS CRITIQUES (détaillés dans document séparé)

| Bug | Sévérité | Impact |
|-----|----------|--------|
| Bouton "Voir les X autres tâches" cassé | 🔴 Critique | Impossible de voir toutes les tâches |
| Zone de clic tâche = toute la ligne | 🔴 Critique | Tâches cochées par accident |
| Tâches complétées disparaissent | 🟠 Important | Pas d'historique visible |

### ✅ Points Positifs
- Génération automatique de tâches par type de chantier
- Catégorisation par phases (Préparation, Second œuvre...)
- Vue d'ensemble financière du chantier

### 💡 Voir document détaillé: `PROMPT-AMELIORATION-TACHES.md`

---

## 4. Planning

### ✅ Points Positifs
- Vue mois et semaine disponibles
- Légende couleurs pour types d'événements
- Intégration météo sur les chantiers
- Alerte "Pluie prévue, prévoir bâches" très utile

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Vue mois trop dense (beaucoup d'événements/jour) | 🟡 Moyen | Limiter à 2-3 événements + "+X autres" |
| Texte tronqué ("Rénovation appartement Dub...") | 🟡 Moyen | Tooltip au survol avec nom complet |
| Pas de différenciation weekends | 🟢 Mineur | Fond gris léger pour Sam/Dim |
| Label "+2 autres" en orange = confusion | 🟡 Moyen | Utiliser gris ou autre couleur |
| Vue semaine: label "Chantier" répétitif | 🟢 Mineur | Masquer si l'icône suffit |
| Accessibilité: couleurs seules distinguent les types | 🟠 Important | Ajouter patterns ou icônes pour daltoniens |

### 💡 Suggestions Wording
- "Semaine du 2 févr." → "Semaine du 2 février 2026"
- "RDV Client" → "Rendez-vous client"

---

## 5. Clients

### ✅ Points Positifs
- Design carte moderne et lisible
- Avatars avec initiales colorées
- Accès rapide téléphone/email
- Stats chantiers/devis/factures par client

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Icônes stats (🏠📄📋) non expliquées | 🟡 Moyen | Ajouter légende ou tooltips |
| CA affiché "2 337,5€" vs "—" incohérent | 🟢 Mineur | Afficher "0 €" au lieu de "—" |
| Couleurs avatars aléatoires | 🟢 Mineur | Utiliser logique (initiales → couleur) |
| Pas d'indicateur statut client | 🟡 Moyen | Ajouter badge "Actif/Prospect/Ancien" |
| Adresses risquent d'être tronquées sur mobile | 🟡 Moyen | Tronquer avec "..." et tooltip |

### 💡 Suggestions Wording
- "Ajout rapide" → "Nouveau client rapide"
- Légende: 🏠 Chantiers | 📄 Devis | 📋 Factures

---

## 6. Catalogue

### ✅ Points Positifs
- Section favoris pour accès rapide
- Catégories métier pertinentes
- Calcul automatique de la marge
- Interface tableau claire

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Marge "—" pour main d'œuvre (achat = 0€) | 🟡 Moyen | Afficher "100%" ou "N/A" |
| Unités incohérentes ("/m²" vs "· m²") | 🟢 Mineur | Uniformiser le format |
| Pas de couleur pour marges bonnes/mauvaises | 🟡 Moyen | Vert > 30%, Orange 15-30%, Rouge < 15% |
| "Référentiel BTP" terme technique | 🟢 Mineur | "Catalogue BTP standard" ou tooltip explicatif |
| Étoile favori peu visible | 🟢 Mineur | Étoile jaune remplie vs grise vide |

### 💡 Suggestions Wording
- "Manuel" → "Ajouter article"
- "Stock" → "Gestion des stocks"

---

## 7. Équipe & Heures

### ✅ Points Positifs
- Suivi des heures en temps réel
- Validation des pointages
- GPS pour localisation
- Historique accessible

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| Badge "En ligne" ambigu | 🟡 Moyen | Clarifier: "Application connectée" ou "1 employé en ligne" |
| "0h" vs "0.0h" format incohérent | 🟢 Mineur | Uniformiser à "0h" sans décimale si entier |
| "À valider avant export" technique | 🟡 Moyen | "Validez ces pointages pour pouvoir exporter" |
| Badge "Nouveau" sur GPS distrayant | 🟢 Mineur | Retirer après 30 jours ou clic |
| Point rouge sur "Validation" peu visible | 🟡 Moyen | Utiliser badge avec nombre (2) |

### 💡 Suggestions Wording
- "Saisie groupée" → "Pointer plusieurs employés"
- "Pointage" → "Feuilles de temps"

---

## 8. Paramètres

### ✅ Points Positifs
- Organisation en onglets claire
- Indicateur de complétion du profil
- Palette de couleurs personnalisable
- Export comptable intégré

### ❌ Problèmes Identifiés

| Problème | Sévérité | Recommandation |
|----------|----------|----------------|
| "Profil complet 7%" barre invisible | 🟡 Moyen | Agrandir la barre de progression |
| "500KB" format technique | 🟢 Mineur | Écrire "500 Ko" en français |
| Bouton "Export comptable" vert ≠ palette orange | 🟢 Mineur | Harmoniser couleurs |
| 7 onglets = beaucoup sur mobile | 🟡 Moyen | Regrouper ou accordion sur mobile |
| "10000" sans séparateur | 🟢 Mineur | Formater "10 000 €" |
| Pas de légende "* obligatoire" | 🟡 Moyen | Ajouter légende sous le titre |

### 💡 Suggestions Wording
- "Sélectionner..." → "Choisir votre statut juridique"
- "Capital (optionnel)" → "Capital social (facultatif)"

---

## 9. Accessibilité

### 🔴 Problèmes Critiques

| Problème | WCAG | Recommandation |
|----------|------|----------------|
| Cibles tactiles < 44px (icônes, boutons) | 2.5.5 | Minimum 44x44px pour tous les éléments cliquables |
| Couleurs seules pour différencier (planning) | 1.4.1 | Ajouter formes/patterns pour daltoniens |
| Contraste insuffisant sur textes gris clair | 1.4.3 | Ratio minimum 4.5:1 |
| Focus non visible sur certains éléments | 2.4.7 | Outline visible au focus clavier |

### 🟡 Améliorations Suggérées

- Ajouter `aria-label` aux icônes sans texte
- Implémenter navigation clavier complète
- Ajouter mode "contraste élevé"
- Tester avec lecteur d'écran (VoiceOver/NVDA)

---

## 10. Responsive / Mobile

### Observations

La sidebar reste fixe et visible même sur petits écrans, ce qui peut réduire l'espace de contenu. Recommandations:

| Breakpoint | Recommandation |
|------------|----------------|
| < 1024px (Tablet) | Sidebar collapsible avec hamburger menu |
| < 768px (Mobile) | Bottom navigation bar (5 icônes principales) |
| < 375px (Small) | Simplifier les cartes dashboard, 1 colonne |

### Éléments à Vérifier

- [ ] Tableaux: scroll horizontal ou cards empilées
- [ ] Graphiques: redimensionnement ou simplification
- [ ] Formulaires: inputs pleine largeur
- [ ] Modals: full-screen sur mobile
- [ ] Touch targets: minimum 44px partout

---

## 11. Wording Global

### Règles de Cohérence à Appliquer

| Actuel | Recommandé | Raison |
|--------|------------|--------|
| "Voir détails" / "Voir tout" | "Voir tout" | Uniformité |
| "~15j" / "environ 15 jours" | "15 jours" | Simplicité |
| "500KB" | "500 Ko" | Français |
| Dates: "2 févr." / "2 février" | "2 février" | Lisibilité |
| "N/A" / "—" / vide | "—" | Uniformité |

### Ton de Voix

L'application utilise un ton professionnel mais parfois trop technique. Pour des artisans du BTP:
- Éviter le jargon IT ("export", "import", "sync")
- Préférer des verbes d'action clairs ("Envoyer", "Créer", "Modifier")
- Utiliser des confirmations rassurantes ("Devis envoyé avec succès !")

---

## 12. Priorités d'Implémentation

### 🔴 Urgent (Sprint 1)
1. Corriger bug "Voir les X autres tâches" (Chantiers)
2. Corriger zone de clic tâches (Chantiers)
3. Augmenter taille cibles tactiles à 44px minimum

### 🟠 Important (Sprint 2)
4. Ajouter section "Tâches terminées" (Chantiers)
5. Améliorer accessibilité couleurs (Planning)
6. Uniformiser formatage montants et dates

### 🟡 Amélioration (Sprint 3)
7. Refonte responsive avec bottom nav mobile
8. Tooltips explicatifs sur icônes/badges
9. Mode contraste élevé
10. Révision wording complète

---

## Conclusion

ChantierPro est une application prometteuse avec une bonne base technique et visuelle. Les corrections prioritaires concernent les bugs critiques dans la gestion des tâches et l'accessibilité tactile. Une passe de polish sur le wording et la cohérence améliorera significativement l'expérience utilisateur.

**Prochaine étape recommandée**: Implémenter les corrections de `PROMPT-AMELIORATION-TACHES.md` puis ce rapport d'audit.

---

*Rapport généré automatiquement - Février 2026*
