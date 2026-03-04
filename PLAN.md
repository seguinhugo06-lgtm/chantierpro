# Plan : Redesign Module Chantiers

## Fichiers modifies
- `src/components/Chantiers.jsx` (2894 lignes) — modifications majeures
- `src/components/FABMenu.jsx` — remplace par un FAB contextuel chantier
- `src/components/chantiers/ChantierMap.jsx` — popups ameliores
- `src/lib/constants.js` — ajouter CHANTIER_STATUS_COLORS.darkBg/darkText

## 10 etapes d'implementation

### Etape 1 — Bande "Journee d'aujourd'hui" en page liste (L2200-2262)
**Quoi :** Remplacer le header simple "Chantiers" par une bande contextuelle
- Calculer chantiersAujourdhui = chantiers en_cours dont date_debut <= today <= date_fin
- Calculer tachesEnAttente = sum des taches non-done sur ces chantiers
- Afficher : "Aujourd'hui : N chantiers · N taches"
- Sous-lignes par chantier du jour : [Nom] · [Heure] · [Client] → bouton GPS
- Si 0 chantier : message + CTA creer
**Ou :** Avant la search bar (L2242), apres le header title

### Etape 2 — Nouveau filtre "Cette semaine" + cartes compactes (L2455-2650)
**Quoi :** Ajouter filtre "Cette semaine" dans les tabs
- Ajouter `{ key: 'cette_semaine', label: 'Cette semaine' }` aux filtres
- Logique : chantiers dont date_debut/date_fin chevauche la semaine courante
- Refaire les cartes de liste : compactes, 1 ligne
  - Nom (no truncate) · Badge statut couleur · Client · Dates · Barre avancement · Budget vs Depense
- Dropdown client + tri deja existants : garder
**Ou :** Section filtre (L2455) + section cartes (L2558)

### Etape 3 — Vue carte amelioree (ChantierMap.jsx)
**Quoi :** Enrichir les popups Leaflet
- Popup : Nom + badge statut + % avancement + bouton GPS + bouton "Ouvrir fiche"
- Overlay boutons filtre statut (En cours / Prospects) sur la carte
- Style markers plus visibles
**Ou :** `src/components/chantiers/ChantierMap.jsx`

### Etape 4 — Header detail sticky + navigation ← → (L254-402)
**Quoi :** Refaire le header de la page detail
- Titre sur 2 lignes si besoin (no truncate), font-bold
- Navigation ← → entre chantiers (avec preview nom du suivant/precedent)
- Status dropdown toujours visible
- Mobile : ultra-compact = nom + statut + ← →
- Header sticky : `sticky top-0 z-20`
**Ou :** Section header detail (L254-345)

### Etape 5 — Zone Client/Adresse above-the-fold (L404-460)
**Quoi :** Reorganiser pour que GPS soit toujours visible
- 50/50 desktop : Client (nom + tel tap-to-call + email) | Adresse + gros bouton GPS orange
- Mobile : empile, GPS en premier (above the fold)
- Bouton GPS : `w-full py-4` avec icone MapPin, texte "Ouvrir GPS", fond orange gradient
**Ou :** Section Client & Adresse (L404-460)

### Etape 6 — Widget Taches redesigne (L625-906)
**Quoi :** Refondre la section taches
- Si 0 taches : gros CTA "Generer mes taches avec l'IA" (Sparkles, orange, centre)
  - Grille 2 colonnes inline des types de projet (pas en modal) : renovation, sdb, cuisine, etc.
- Si taches existantes :
  - Donut avancement a gauche, liste a droite (desktop)
  - Mini-bouton IA pour regenerer/completer (en haut de section)
  - Champ "Ajouter une tache" toujours visible en bas
- Supprimer le TaskGeneratorModal en faveur du inline
**Ou :** Section taches (L625-906)

### Etape 7 — FAB flottant contextuel chantier (NOUVEAU)
**Quoi :** Creer un FAB specifique chantier dans Chantiers.jsx (pas FABMenu.jsx)
- Bouton principal : timer orange "Pointer" (Clock icon), 56x56px, fixed bottom-6 right-6
- Expand au clic : 4 sous-boutons en arc
  - Depense (Coins, rouge)
  - Photo (Camera, bleu)
  - Memo rapide (Mic, violet)
  - Lien signature (non, plutot : Notes/Memo)
- Visible seulement quand view !== null (page detail)
- Backdrop blur au clic
- Animation slide-up staggered (50ms delay entre chaque)
- z-50 pour etre au-dessus de tout
- Les actions appellent : setShowAddMO, setShowQuickMateriau, photo input, textarea memo
- Supprimer la section "Actions rapides" inline (L908-937) car remplacee par FAB
**Ou :** En bas du return de la page detail, position fixed

### Etape 8 — Bloc Finances condense + accordion (L960-1180)
**Quoi :** Remplacer la section finances dense par un resume compact
- Ligne resumee unique : Budget X EUR · Depense X EUR · Marge X% · pastille couleur sante
- Barre horizontale : vert (revenus) vs rouge (depenses) = % remplissage
- Boutons "+ Revenu" et "+ Depense" toujours visibles SOUS le resume
- Details depliables (accordion Chevron) pour les sous-sections :
  - Ajustements revenus
  - Ajustements depenses
  - Depenses materiaux
  - Main d'oeuvre
**Ou :** Section Finances (L960-1180)

### Etape 9 — Tabs reduits 5 max + badges (L1181-1198)
**Quoi :** Limiter a 5 tabs visibles, le reste en "Plus"
- Ordre : Taches / Photos / Finances / Situations / Messages
- Badge compteur sur Photos (nombre), Messages (nombre non-lus)
- Onglet "Plus" (MoreHorizontal icon) → dropdown : Notes, Documents, Rapports, Memos
- Taches passe en PREMIER tab (pas finances)
- Tab actif par defaut = 'taches' (pas 'finances')
**Ou :** Section onglets (L1181-1198)

### Etape 10 — Sync discret + polish final
**Quoi :**
- Supprimer toute banniere de sync permanente
- Point vert discret dans le header si sync en cours (indicateur 8px)
- Toast rouge en cas d'erreur reelle
- Verifier responsive complet
- Build + commit + deploy
**Ou :** Header detail + global

## Ordre d'execution
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Commit apres chaque etape. Build check apres chaque etape.
