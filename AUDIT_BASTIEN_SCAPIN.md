# AUDIT ERGONOMIQUE BASTIEN & SCAPIN
## ChantierPro - Rapport Complet

**Date:** 21 Janvier 2026
**Méthodologie:** Critères ergonomiques de Bastien & Scapin (INRIA, 1993)
**Scope:** Application complète (Dashboard, Devis, Chantiers, Clients, Planning, Settings)

---

## SYNTHÈSE EXÉCUTIVE

| Critère | Score | Niveau |
|---------|-------|--------|
| 1. Guidage | 14/20 | Acceptable |
| 2. Charge de travail | 15/20 | Bon |
| 3. Contrôle explicite | 18/20 | Excellent |
| 4. Adaptabilité | 18/20 | Excellent |
| 5. Gestion des erreurs | 11/20 | Insuffisant |
| 6. Homogénéité | 13/20 | Acceptable |
| 7. Signifiance | 16/20 | Bon |
| 8. Compatibilité | 14/20 | Acceptable |
| **TOTAL** | **119/160** | **74%** |

**Niveau global:** Bon (70-85%)

---

## CRITÈRE 1: GUIDAGE (14/20)

### 1.1 Incitation (13/20)

**Points forts:**
- Empty states pour nouveaux utilisateurs avec onboarding en 4 étapes
- Badges sur navigation (devis en attente, factures impayées)
- CommandPalette (⌘K) pour recherche globale

**Problèmes identifiés:**
| Problème | Sévérité | Fichier:Ligne |
|----------|----------|---------------|
| Pas de fil d'Ariane sur les pages profondes | HIGH | Dashboard.jsx:606 |
| Section événements disparaît si vide (return null) | LOW | Dashboard.jsx:891 |
| Aide contextuelle absente dans les sections | MEDIUM | Dashboard.jsx:680 |

**Recommandations:**
1. Ajouter breadcrumb "Dashboard > Détail CA" sur les vues modales
2. Remplacer `return null` par un empty state "Aucun événement prévu"
3. Ajouter icônes (?) help à côté des titres de section

### 1.2 Groupement/Distinction (14/20)

**Points forts:**
- KPIs groupés en grille cohérente
- Statuts avec codes couleurs (vert/bleu/rouge/gris)
- Sections visuellement délimitées avec bordures

**Problèmes identifiés:**
| Problème | Sévérité | Fichier:Ligne |
|----------|----------|---------------|
| Pipeline et Actions mélangés dans "Activité commerciale" | MEDIUM | Dashboard.jsx:675-841 |
| KPIs CA/Marge vs Encaissé/Attente non distingués | LOW | Dashboard.jsx:668-673 |
| 2 zones "À faire" créent confusion | HIGH | Dashboard (signalé) |

**Recommandations:**
1. Séparer "Vue Pipeline" (statuts) de "Actions urgentes" (tâches)
2. Grouper KPIs par thème (Santé financière | Trésorerie)

### 1.3 Feedback immédiat (15/20)

**Points forts:**
- Système de toast complet (success, error, warning, info)
- Toast store Zustand avec max 5 toasts simultanés
- Durée d'erreur prolongée (8s vs 3s)
- Promesse-based toast pour opérations async

**Problèmes identifiés:**
| Problème | Sévérité | Fichier:Ligne |
|----------|----------|---------------|
| Toast peu utilisé dans Dashboard (actions sans confirmation) | MEDIUM | Dashboard.jsx:1054 |
| Pas d'indicateur de chargement pour données async | MEDIUM | Dashboard.jsx (props) |
| Pas de feedback visuel sur clic (pulse/scale) | LOW | Dashboard.jsx:699 |

**Recommandations:**
1. Ajouter toast de confirmation après navigation
2. Implémenter skeleton/spinner pendant chargement données
3. Ajouter `active:scale-95` sur éléments cliquables

### 1.4 Lisibilité (14/20)

**Points forts:**
- Police minimum respectée (14px+)
- Contraste mode clair/sombre bien géré
- Touch targets 44px via CSS global

**Problèmes identifiés:**
| Problème | Sévérité | Fichier:Ligne |
|----------|----------|---------------|
| Zone montant € trop petite sur mobile | HIGH | (signalé) |
| Textes truncate sans tooltip | LOW | Dashboard.jsx:882 |
| Scroll conteneur caché (max-h-[320px]) | MEDIUM | Dashboard.jsx:1045 |

---

## CRITÈRE 2: CHARGE DE TRAVAIL (15/20)

### 2.1 Brièveté (15/20)

**Nombre de clics par tâche:**
| Tâche | Clics actuels | Objectif | Status |
|-------|---------------|----------|--------|
| Créer un devis | 7-10 | 5-6 | ⚠️ |
| Ajouter un client | 3-4 | 2-3 | ✅ |
| Créer un chantier | 5-7 | 4-5 | ✅ |
| Envoyer facture | 5-7 | 4-5 | ⚠️ |

**Points forts:**
- FAB menu avec 5 actions rapides
- CommandPalette (⌘K) excellente
- Valeurs par défaut: TVA (10%), validité (30j)
- Auto-focus sur modales
- Raccourci Enter pour valider

**Problèmes identifiés:**
| Problème | Sévérité | Impact |
|----------|----------|--------|
| Pas de raccourcis ⌘D, ⌘C, ⌘H | MEDIUM | +2-3 clics |
| Pas de "Dupliquer devis" | HIGH | +4-5 clics |
| Clients récents non mémorisés | MEDIUM | +2-3 clics |
| 2 wizards différents (FAB vs Page) | MEDIUM | Confusion |

### 2.2 Densité informationnelle (15/20)

**Points forts:**
- Sections collapsibles dans modales
- Pagination des listes longues
- Responsive cards sur mobile

**Problèmes:**
- Dashboard chargé (KPIs + Pipeline + Actions + Agenda + Rentabilité)
- Scroll masqué dans containers (pas d'indicateur "plus de contenu")

---

## CRITÈRE 3: CONTRÔLE EXPLICITE (18/20)

### 3.1 Actions explicites (19/20)

**Points forts:**
- Toutes les suppressions demandent confirmation (ConfirmModal)
- 3 variantes de confirmation (danger, warning, info)
- Aucune action automatique destructive

**Composants vérifiés:**
- Planning.jsx: Suppression événement ✅
- Clients.jsx: Suppression client ✅
- Chantiers.jsx: Suppression pointage/photo ✅
- DevisPage.jsx: Suppression document ✅

### 3.2 Contrôle utilisateur (17/20)

**Points forts:**
- Fermeture modale: Escape + backdrop + bouton X
- Focus trap et restauration du focus
- Annulation disponible sur tous les formulaires

**Problèmes:**
| Problème | Sévérité |
|----------|----------|
| Bouton retour navigateur non fonctionnel (SPA state-based) | MEDIUM |
| Pas de système Undo global | LOW |

---

## CRITÈRE 4: ADAPTABILITÉ (18/20)

### 4.1 Flexibilité (18/20)

**Points forts:**
- Mode sombre complet avec 9 propriétés de thème
- 8 couleurs d'accent personnalisables
- Settings en 6 onglets (Identité, Légal, Assurance, Banque, Documents, Rentabilité)
- Persistance localStorage

### 4.2 Prise en compte de l'expérience (18/20)

**Novices:**
- Onboarding 4 étapes (Splash → Tour → Setup → Complete)
- SmartTooltip avec "J'ai compris" et mémorisation
- HelpCenter avec articles organisés
- ProgressTracker avec achievements

**Experts:**
- CommandPalette (⌘K) Spotlight-style
- ShortcutsHelp (⌘/) avec 50+ raccourcis
- VoiceJournal pour notes rapides
- FAB menu toujours accessible

**Multi-chemins vérifiés:**
- Créer devis: FAB / ⌘K / Page / Template
- Ajouter client: Page / ⌘K / Modal rapide / Pendant devis
- Navigation: Sidebar / ⌘K / Breadcrumbs

---

## CRITÈRE 5: GESTION DES ERREURS (11/20) ⚠️

### 5.1 Protection contre les erreurs (10/20)

**PROBLÈME MAJEUR:** Framework de validation existe mais non utilisé

| Fichier | Validation disponible | Validation utilisée |
|---------|----------------------|---------------------|
| lib/validation.js | ✅ Complet (email, phone FR, SIRET, IBAN) | - |
| ClientForm.jsx | - | ❌ Seulement `required` HTML |
| QuickClientModal.jsx | - | ❌ Seulement `nom.trim()` |
| DevisWizard.jsx | - | ❌ Seulement `clientId` + `lignes.length` |
| Catalogue form | - | ❌ `nom && prix` sans type check |

**Problèmes:**
- Email accepté sans validation format
- Téléphone accepté sans pattern français
- Montants négatifs possibles
- Pas de validation temps réel (seulement au submit)

### 5.2 Qualité des messages d'erreur (12/20)

**Messages analysés:**
- ✅ "Nom et prix requis" - Clair
- ✅ "Sélectionnez un client" - Actionnable
- ⚠️ "Erreur de synchronisation" - Générique, pas de solution
- ⚠️ "Erreur de lecture" - Technique, manque contexte

**Manquant:**
- Messages inline sous les champs
- Exemples de format ("Téléphone: 06 12 34 56 78")
- Suggestions de correction

### 5.3 Correction des erreurs (11/20)

**Problèmes critiques:**
- Formulaire se ferme sur erreur → données perdues
- Pas de focus sur le champ en erreur
- Pas de préservation des données après validation échouée
- Pas de draft localStorage pour formulaires longs

---

## CRITÈRE 6: HOMOGÉNÉITÉ/COHÉRENCE (13/20)

### Incohérences visuelles

| Élément | Variante 1 | Variante 2 | Fichiers |
|---------|-----------|-----------|----------|
| Bouton primaire | `style={{background: couleur}}` | `bg-emerald-500` | DevisPage, Chantiers |
| Icône éditer | Edit2 | Edit3 | GanttView vs Planning |
| Icône signature | PenTool | Pen | DevisPage vs SignaturePad |
| Statut FACTURE | indigo (constants) | green (UI) | constants.js vs DevisPage:1026 |

### Incohérences terminologiques

| Action | Variantes trouvées |
|--------|-------------------|
| Sauvegarder | "Créer" / "Enregistrer" / "Ajouter" / "Valider" |
| Nouveau | "Nouveau X" / "Ajouter X" / "+ X" |
| Annuler | "Annuler" / icône X / "Fermer" |

### Incohérences structurelles

- Modales: Certaines inline (`fixed inset-0`), d'autres via Modal component
- Espacement boutons: `pt-4`, `mt-6`, `pt-6 border-t` (variable)

---

## CRITÈRE 7: SIGNIFIANCE DES CODES (16/20)

### Points forts

- Vocabulaire BTP approprié: Devis, Facture, Acompte, Chantier
- Boutons en français avec verbes d'action
- Icônes Lucide sémantiquement correctes
- Couleurs intuitives (vert=OK, rouge=danger, bleu=info)

### Problèmes

| Terme | Problème | Suggestion |
|-------|----------|------------|
| "Acompte facturé" | Ambiguë | "Acompte encaissé" |
| "MO" | Acronyme non expliqué | "Coût du travail" |
| "Factur-X 2026" | Jargon technique | "Norme facture électronique" |
| "h" (heures) | Confusion possible avec hauteur | "heures" en toutes lettres |

---

## CRITÈRE 8: COMPATIBILITÉ (14/20)

### Mobile (13/20)

**Points forts:**
- ResponsiveTable: cards sur mobile, tables sur desktop
- Breakpoints cohérents (sm, md, lg)
- Touch targets 44px via CSS global

**Problèmes:**
| Problème | Sévérité |
|----------|----------|
| DevisPage tables scroll horizontal sur < 768px | HIGH |
| Boutons acompte (20%, 30%...) = 24px | HIGH |
| Boutons tabs = 32px | MEDIUM |
| Bouton fermer X = 24px | MEDIUM |

### Workflow métier (15/20)

**Flux Devis → Facture → Paiement:**
- ✅ Conversion devis → facture: 2-3 clics
- ✅ Génération lien paiement avec QR code: instantané
- ✅ Partage email/SMS intégré
- ⚠️ Pas de relance automatique (15/30 jours)
- ⚠️ Pas de vérification stock avant facturation

### Intégrations (14/20)

**Supportées:**
- Pennylane, Indy, Qonto, Stripe
- Export CSV/FEC
- QR Code paiement

**Problèmes:**
- Credentials API en localStorage (non sécurisé)
- Pas de webhook Stripe (polling manuel)
- PDF multi-TVA non géré (bug)

---

## TOP 10 PROBLÈMES CRITIQUES

| # | Problème | Critère | Priorité |
|---|----------|---------|----------|
| 1 | Validation forms non implémentée | 5. Erreurs | P0 |
| 2 | Données perdues après erreur form | 5. Erreurs | P0 |
| 3 | Touch targets < 44px (acompte, tabs) | 8. Compat | P0 |
| 4 | Dashboard 2 zones "À faire" | 1.2 Groupement | P1 |
| 5 | Pas de "Dupliquer devis" | 2.1 Brièveté | P1 |
| 6 | Bouton retour navigateur cassé | 3.2 Contrôle | P1 |
| 7 | Statut FACTURE couleur incohérente | 6. Homogénéité | P2 |
| 8 | Terminologie save incohérente | 6. Homogénéité | P2 |
| 9 | PDF multi-TVA bug | 8. Compat | P2 |
| 10 | Pas de messages d'erreur inline | 5.2 Erreurs | P2 |

---

## PLAN D'ACTION

### Sprint 1: Erreurs & Touch (P0) - 2 semaines

1. **Implémenter validation temps réel**
   - Utiliser lib/validation.js dans tous les formulaires
   - Ajouter erreurs inline sous chaque champ
   - Focus automatique sur premier champ en erreur

2. **Préserver données après erreur**
   - Ne pas fermer modal sur erreur validation
   - Garder état formulaire intact
   - Ajouter draft localStorage pour formulaires longs

3. **Corriger touch targets**
   - Boutons acompte: `min-h-[44px]`
   - Boutons tabs: `py-3` minimum
   - Bouton fermer: `p-3` minimum

### Sprint 2: Guidage & Brièveté (P1) - 2 semaines

4. **Fusionner zones "À faire" Dashboard**
5. **Ajouter "Dupliquer devis"**
6. **Implémenter routing URL** (React Router)
7. **Mémoriser clients récents**

### Sprint 3: Homogénéité (P2) - 1 semaine

8. **Standardiser bouton primaire** → Button component partout
9. **Unifier terminologie** → "Enregistrer" pour save
10. **Corriger couleur statut FACTURE** → indigo partout
11. **Fix PDF multi-TVA**

### Sprint 4: Polish - 1 semaine

12. **Ajouter breadcrumbs** pages profondes
13. **Indicateurs scroll** containers
14. **Relance automatique** factures

---

## MÉTRIQUES CIBLES

| Métrique | Actuel | Cible |
|----------|--------|-------|
| Score global | 119/160 (74%) | 144/160 (90%) |
| Critère 5 (Erreurs) | 11/20 | 17/20 |
| Touch targets conformes | ~70% | 100% |
| Temps création devis | 7-10 clics | 5-6 clics |
| Validation temps réel | 0% | 100% |

---

*Rapport généré automatiquement - Audit Bastien & Scapin ChantierPro*
