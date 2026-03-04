# Audit Accessibilité & Cohérence — ChantierPro

Basé sur un deep dive complet de toutes les pages de l'application.

---

## PARTIE 1 — PROBLÈMES DE COHÉRENCE CONSTATÉS

### 1.1 Accents et encodage (CRITIQUE — trouvés sur 6+ pages)

Des accents manquants ont été trouvés en dur dans le code source. Ce n'est pas un bug d'affichage, c'est du texte écrit sans accents dans le JSX.

| Page | Texte incorrect | Texte correct |
|------|----------------|---------------|
| Sous-Traitants | `"documents expires"` | `"documents expirés"` |
| Sous-Traitants | `"conformite"` (sous-titre) | `"conformité"` |
| Sous-Traitants | `"eviter"` | `"éviter"` |
| Sous-Traitants | `"CONFORMITE"` | `"CONFORMITÉ"` |
| Sous-Traitants | `"Non recue"` | `"Non reçue"` |
| Sous-Traitants | `"CHANTIERS ASSIGNES"` | `"CHANTIERS ASSIGNÉS"` |
| Sous-Traitants | `"Aucun chantier assigne"` | `"Aucun chantier assigné"` |
| Sous-Traitants | `"Cree le"` | `"Créé le"` |
| Commandes | `"Gerez"` (sous-titre) | `"Gérez"` |
| Commandes | `"Telephone"` | `"Téléphone"` |
| Commandes | `"RECAPITULATIF"` | `"RÉCAPITULATIF"` |
| Commandes | `"Rechercher numero"` | `"Rechercher numéro"` |
| Commandes | `"Creez votre premiere"` | `"Créez votre première"` |
| Commandes | `"particulieres"` | `"particulières"` |
| Trésorerie | `"entrees"` (sous PROJECTION) | `"entrées"` |
| Trésorerie | `"Apercu"` (onglet) | `"Aperçu"` |
| Trésorerie | `"DATE PREVUE"` | `"DATE PRÉVUE"` |
| Trésorerie | `"Paye"` (statut) | `"Payé"` |
| Trésorerie | `"Prevu"` (statut) | `"Prévu"` |
| Trésorerie | `"depot"` | `"dépôt"` |
| Trésorerie | `"decennale"` | `"décennale"` |
| Trésorerie | `"vehicules"` | `"véhicules"` |
| Équipe | `"Ajouter mon premier employe"` | `"Ajouter mon premier employé"` |
| Administratif | `"Vérifie ta conformité"` | `"Vérifiez votre conformité"` (tutoiement incohérent) |

**Impact :** Crédibilité de l'app détruite. Un artisan qui voit des fautes d'orthographe ne fera pas confiance à l'outil pour ses documents professionnels.

### 1.2 Incohérences de vouvoiement/tutoiement

L'app utilise le vouvoiement partout ("Créez votre premier devis") SAUF dans la page Administratif > Conformité qui dit "Vérifie ta conformité réglementaire". C'est incohérent et doit être uniformisé au vouvoiement.

### 1.3 Incohérences visuelles entre pages

| Problème | Détail |
|----------|--------|
| **Empty states différents** | Certaines pages ont un empty state avec icône + description + bouton centré (Catalogue, Équipe), d'autres ont un simple texte (Commandes "Aucune commande trouvée"). Harmoniser. |
| **Position des boutons d'action** | Parfois en haut à droite (header), parfois FAB en bas à droite (bouton +), parfois les deux en même temps. Choisir un pattern et s'y tenir. |
| **Format des KPI cards** | Accueil a des cards colorées avec icônes. Sous-Traitants a des cards blanches avec texte en capitales. Commandes a encore un autre style. Il faut un composant `<KPICard>` réutilisable. |
| **En-têtes de page** | Certaines pages ont un en-tête avec icône + titre + sous-titre (Sous-Traitants, Commandes). D'autres n'ont que le titre (Planning). Harmoniser. |
| **Tabs/filtres** | Certaines pages utilisent des pill-buttons colorés (Catalogue: Tous/Plomberie/Électricité). D'autres des text tabs underline (Trésorerie: Aperçu/Prévisions/Historique). Harmoniser. |

### 1.4 Bouton FAB (Floating Action Button) incohérent

Le bouton "+" orange en bas à droite apparaît sur TOUTES les pages, mais :
- Sur certaines pages, il fait la même chose que le bouton "+ Nouveau" en haut à droite → doublon
- Sur d'autres pages, il n'est pas clair ce qu'il crée (Accueil: il fait quoi ?)
- Sur les pages où il n'y a rien à créer (Export Compta), il ne devrait pas apparaître

**Recommandation :** Retirer le FAB. Garder uniquement le bouton "+ Nouveau" dans le header, sauf sur mobile où le FAB peut remplacer le bouton header.

### 1.5 Sidebar trop longue

Avec 17 items, le sidebar nécessite un scroll vertical. Sur un écran 768px de haut, les derniers items (Équipe, Administratif, Paramètres) ne sont pas visibles sans scroller. C'est un problème d'utilisabilité majeur.

---

## PARTIE 2 — PROBLÈMES D'ACCESSIBILITÉ

### 2.1 CRITIQUE — Attribut `lang` sur `<html>`

Vérifier que `<html lang="fr">` est bien présent. Sans cela, les screen readers liront le contenu en anglais, rendant l'app inutilisable pour les utilisateurs malvoyants.

**Fichier :** `index.html`
```html
<!-- VÉRIFIER que c'est bien : -->
<html lang="fr">
```

### 2.2 CRITIQUE — Contrastes de couleurs

| Élément | Problème | WCAG |
|---------|----------|------|
| **Texte gris clair sur fond blanc** | Les sous-titres et placeholders utilisent des classes Tailwind comme `text-gray-400` ou `text-gray-300` sur fond blanc. Le ratio de contraste est ~2.5:1, bien en dessous du minimum WCAG AA de 4.5:1. | Fail AA |
| **Texte orange sur fond blanc** | Les montants en orange (`text-orange-500` = #F97316 sur blanc) ont un ratio de ~3:1. Insuffisant pour du texte normal. | Fail AA |
| **Badges "Non conforme" rouge** | Le texte rouge sur fond blanc peut avoir un contraste insuffisant selon la nuance utilisée. | À vérifier |
| **Statuts "Prévu" orange** | Texte orange sur fond blanc dans les tableaux de Trésorerie. | Fail AA |
| **Texte blanc sur boutons orange** | Texte blanc (#FFF) sur orange (#F97316) = ratio ~2.9:1. Insuffisant. | Fail AA |

**Solutions :**
- `text-gray-400` → `text-gray-600` minimum pour les sous-titres
- `text-orange-500` → `text-orange-700` ou utiliser des badges avec fond coloré
- Boutons orange : utiliser `bg-orange-600` au lieu de `bg-orange-500`, ou passer le texte en noir

### 2.3 CRITIQUE — Labels de formulaires manquants

Observé dans plusieurs formulaires :
- **Commandes > Nouvelle commande** : Les champs de la ligne de commande (Description, Ref., quantité, prix) n'ont pas de `<label>` visible ni d'`aria-label`. Un screen reader dirait juste "input text".
- **Recherche** : Les barres de recherche utilisent des `placeholder` comme seul indicateur, pas de `<label>` ou `aria-label`.
- **Catalogue > Filtres** : Les dropdowns de filtre n'ont pas de label associé.

**Solution pour chaque input :**
```jsx
// ❌ INCORRECT
<input placeholder="Rechercher..." />

// ✅ CORRECT
<label htmlFor="search" className="sr-only">Rechercher</label>
<input id="search" placeholder="Rechercher..." aria-label="Rechercher" />
```

### 2.4 MAJEUR — Navigation clavier

| Problème | Détail |
|----------|--------|
| **Modales** | Les modales (détail sous-traitant, modification ouvrage) ne piègent pas le focus. En tabbant, l'utilisateur peut sortir de la modale et interagir avec les éléments derrière. |
| **Fermeture modale** | Le bouton "✕" de fermeture n'est probablement pas focusable ou n'a pas d'aria-label. |
| **Sidebar** | Les items du sidebar ne sont pas dans un `<nav aria-label="Navigation principale">`. |
| **Tabs** | Les tabs (Trésorerie, Administratif) n'utilisent probablement pas `role="tablist"`, `role="tab"`, `role="tabpanel"` et la navigation par flèches. |
| **Dropdown menus** | Les filtres dropdown ne sont probablement pas navigables au clavier (Escape pour fermer, flèches pour naviguer). |

### 2.5 MAJEUR — Hiérarchie des headings

Observé :
- Certaines pages passent de `<h1>` directement à du texte sans `<h2>`/`<h3>`
- Les titres de sections (KPIs, tableaux) utilisent des `<div>` avec des classes de style au lieu de vrais headings
- Les cards de KPI n'ont pas de heading sémantique — un screen reader ne peut pas naviguer par sections

**Correction :**
```jsx
// ❌ INCORRECT
<div className="text-lg font-bold">Récapitulatif des prix</div>

// ✅ CORRECT
<h2 className="text-lg font-bold">Récapitulatif des prix</h2>
```

### 2.6 MAJEUR — Images et icônes

- Les icônes Lucide React sont probablement sans `aria-label` et sans `role="img"`. Un screen reader les ignore, mais s'ils sont les seuls indicateurs d'action (icône poubelle, icône modifier), l'utilisateur ne sait pas ce que fait le bouton.
- Le logo entreprise (avatar "MR") n'a probablement pas d'`alt` ou d'`aria-label`.

**Solution :**
```jsx
// ❌ INCORRECT - bouton icône sans label
<button onClick={onDelete}><Trash2 className="w-4 h-4" /></button>

// ✅ CORRECT
<button onClick={onDelete} aria-label="Supprimer cet élément">
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</button>
```

### 2.7 MINEUR — Skip navigation

Il n'y a probablement pas de lien "Skip to main content" au début de la page. Un utilisateur clavier doit tabber à travers tous les 17 items du sidebar avant d'atteindre le contenu principal.

**Solution :**
```jsx
// En tout premier élément du body :
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-2 focus:rounded">
  Aller au contenu principal
</a>

// Et sur le main :
<main id="main-content" tabIndex={-1}>
  {/* contenu de la page */}
</main>
```

### 2.8 MINEUR — Annonces dynamiques

Quand un devis est créé, un client ajouté, ou une action réussie, il y a probablement un toast visuel. Mais les screen readers ne le perçoivent pas sans `role="alert"` ou `aria-live="polite"`.

**Solution :**
```jsx
<div role="alert" aria-live="polite" className="toast">
  Devis créé avec succès
</div>
```

### 2.9 MINEUR — `<title>` de page dynamique

Vérifier que le `<title>` change à chaque navigation :
- `/` → "Accueil — ChantierPro"
- `/devis` → "Devis & Factures — ChantierPro"
- `/clients` → "Clients — ChantierPro"

Sans ça, un utilisateur de screen reader ne sait pas sur quelle page il se trouve.

### 2.10 MINEUR — Responsive / Zoom

Vérifier que l'app reste utilisable à 200% de zoom (obligation WCAG). Les tableaux (Trésorerie, Commandes) risquent de déborder.

---

## PARTIE 3 — PROBLÈMES FONCTIONNELS

### 3.1 Workflow Devis → Facture incomplet

Le pipeline devis montre : Brouillon → Envoyé → Signé → Facturé. Mais :
- Il n'y a pas de confirmation quand on clique "Facturer" — une facture est-elle réellement créée ?
- La numérotation des factures (FAC-YYYY-NNNNN) est-elle gérée séparément des devis ?
- Peut-on créer une facture sans passer par un devis ? (certains artisans facturent directement)

### 3.2 Données de démo incohérentes

- Le **Score Santé** est à 40/100 mais les raisons ne sont pas toujours claires
- La **Trésorerie** montre des sorties de 11 400€ mais un solde à 0€ — c'est une projection ou le réel ?
- Les **échéances administratives** montrent "TVA T4 2025 : J+17" (en retard) — c'est alarmant pour un nouveau utilisateur qui pourrait croire que c'est SES échéances

### 3.3 Chantiers — Avancement bloqué à 0%

Les chantiers montrent 0% d'avancement et "0/0 tâches". L'artisan ne sait pas comment faire avancer le pourcentage. Il faut soit :
- Lier l'avancement aux tâches (si 3/6 tâches faites → 50%)
- Permettre de modifier le % manuellement

### 3.4 Signatures — Nom client partiel

La page Signatures affiche "Dupont" au lieu de "Dupont Jean" (nom complet). Le prénom est perdu quelque part dans le join de données.

### 3.5 Export Compta — Bouton grisé sans explication

Le bouton "Télécharger l'export" est grisé quand il n'y a pas d'écritures. OK, mais il n'y a pas de tooltip ou de message expliquant pourquoi. L'artisan peut penser que la fonctionnalité est cassée.

### 3.6 Planning — Pas de création d'événement visible

Le planning montre un calendrier vide. Le bouton "+ Événement" existe mais il n'est pas évident comment l'utiliser pour un artisan qui veut noter un rendez-vous client.

### 3.7 Mode sombre — Contraste dégradé

Le mode sombre ("Sombre" dans le footer sidebar) risque d'aggraver les problèmes de contraste. Les textes gris clair sur fond gris foncé ont souvent un ratio insuffisant.

---

## PROMPT CLAUDE CODE — CORRECTIONS ACCESSIBILITÉ & COHÉRENCE

```
Tu es un développeur senior React/TypeScript spécialisé en accessibilité web (WCAG 2.1 AA). Tu travailles sur ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS).

OBJECTIF : Rendre l'app conforme WCAG 2.1 AA et corriger toutes les incohérences.

## PRIORITÉ 1 — HTML de base (index.html)

### 1.1 Vérifier lang="fr"
Dans `index.html`, s'assurer que :
```html
<html lang="fr">
```

### 1.2 Titre dynamique
Installer react-helmet-async (ou utiliser useEffect) pour changer le title à chaque page :
```bash
npm install react-helmet-async
```

Dans le layout principal ou chaque page :
```jsx
import { Helmet } from 'react-helmet-async';

// Dans chaque composant de page :
<Helmet>
  <title>Devis & Factures — ChantierPro</title>
</Helmet>
```

Titres par page :
- `/` → "Accueil — ChantierPro"
- `/devis` → "Devis & Factures — ChantierPro"
- `/chantiers` → "Chantiers — ChantierPro"
- `/clients` → "Clients — ChantierPro"
- `/planning` → "Planning — ChantierPro"
- `/catalogue` → "Catalogue — ChantierPro"
- `/finances` → "Finances — ChantierPro"
- `/parametres` → "Paramètres — ChantierPro"
- `/tarifs` → "Tarifs — ChantierPro"

### 1.3 Skip Navigation
Ajouter en premier enfant du body/App :
```jsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-orange-500"
>
  Aller au contenu principal
</a>
```

Et wrapper le contenu principal :
```jsx
<main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
  {children}
</main>
```

## PRIORITÉ 2 — Corriger TOUS les accents

Faire un search & replace global dans le codebase :

```bash
# Trouver tous les fichiers avec des accents manquants
grep -rn "conformite\b" src/
grep -rn "Gerez\b" src/
grep -rn "Creez\b" src/
grep -rn "Telephone\b" src/
grep -rn "RECAPITULATIF\b" src/
grep -rn "Apercu\b" src/
grep -rn "PREVUE\b" src/
grep -rn "Prevu\b" src/
grep -rn "Paye\b" src/
grep -rn "vehicules\b" src/
grep -rn "decennale\b" src/
grep -rn "depot\b" src/
grep -rn "particulieres\b" src/
grep -rn "premiere\b" src/
grep -rn "numero\b" src/
grep -rn "employe\b" src/
grep -rn "expires\b" src/
grep -rn "eviter\b" src/
grep -rn "assigne\b" src/
grep -rn "Verifie ta\b" src/
grep -rn "\\\\u00" src/  # unicode escaped characters
```

Corriger chaque occurrence trouvée. Utiliser les bonnes lettres françaises : é, è, ê, ë, à, â, ç, ô, ù, û, ü, î, ï.

Aussi corriger le tutoiement :
- "Vérifie ta conformité réglementaire" → "Vérifiez votre conformité réglementaire"

## PRIORITÉ 3 — Contraste des couleurs

### 3.1 Sous-titres et texte secondaire
Remplacer globalement dans les composants :
```
text-gray-400 → text-gray-600  (pour texte sur fond blanc)
text-gray-300 → text-gray-500  (pour texte sur fond blanc)
```

ATTENTION : ne pas modifier les classes dans un contexte dark mode. Vérifier chaque remplacement.

### 3.2 Texte orange
Pour les montants et valeurs importantes en orange :
```
text-orange-500 → text-orange-700  (sur fond blanc, ratio 4.6:1 ✓)
```

Ou mieux, utiliser un badge avec fond :
```jsx
// Au lieu de :
<span className="text-orange-500">32,50 €</span>

// Utiliser :
<span className="text-orange-900 bg-orange-100 px-2 py-0.5 rounded font-medium">32,50 €</span>
```

### 3.3 Boutons orange
```
bg-orange-500 text-white → bg-orange-600 text-white  (ratio 4.5:1 ✓)
```

Ou utiliser du noir sur orange :
```
bg-orange-500 text-gray-900  (ratio 7.8:1 ✓✓)
```

### 3.4 Mode sombre
Vérifier que le dark mode utilise des couleurs avec un contraste suffisant :
```
dark:text-gray-400 → dark:text-gray-300  (sur dark:bg-gray-900)
```

## PRIORITÉ 4 — Labels de formulaires

### 4.1 Barres de recherche
Trouver tous les `<input>` avec `placeholder="Rechercher..."` et ajouter :
```jsx
<div className="relative">
  <label htmlFor="search-{page}" className="sr-only">Rechercher</label>
  <input
    id="search-{page}"
    type="search"
    placeholder="Rechercher..."
    aria-label="Rechercher"
  />
</div>
```

### 4.2 Formulaires de création
Pour chaque formulaire (Nouveau devis, Nouveau client, Nouvelle commande, etc.), vérifier que CHAQUE input a un `<label>` associé via `htmlFor`/`id` OU un `aria-label`.

Cas spécifiques :
- Lignes de commande (table inline) : chaque cellule d'input doit avoir `aria-label="Description de la ligne 1"`, `aria-label="Quantité ligne 1"`, etc.
- Filtres dropdown : `aria-label="Filtrer par type"`, `aria-label="Filtrer par statut"`
- Date pickers : `aria-label="Date de début"`, `aria-label="Date de fin"`

### 4.3 Boutons d'icônes
Trouver tous les `<button>` qui ne contiennent qu'une icône (pas de texte visible) et ajouter `aria-label` :

```jsx
// Bouton supprimer
<button aria-label="Supprimer" onClick={...}>
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</button>

// Bouton modifier
<button aria-label="Modifier" onClick={...}>
  <Pencil className="w-4 h-4" aria-hidden="true" />
</button>

// Bouton fermer
<button aria-label="Fermer" onClick={...}>
  <X className="w-4 h-4" aria-hidden="true" />
</button>

// Bouton téléphone
<button aria-label="Appeler le client" onClick={...}>
  <Phone className="w-4 h-4" aria-hidden="true" />
</button>

// Bouton notification
<button aria-label="Notifications" onClick={...}>
  <Bell className="w-4 h-4" aria-hidden="true" />
</button>
```

## PRIORITÉ 5 — Navigation sémantique

### 5.1 Sidebar
```jsx
<nav aria-label="Navigation principale">
  <ul role="list">
    {sidebarItems.map(item => (
      <li key={item.path}>
        <NavLink
          to={item.path}
          aria-current={isActive ? 'page' : undefined}
          className={...}
        >
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </li>
    ))}
  </ul>
</nav>
```

### 5.2 Tabs (Trésorerie, Administratif, Paramètres)
```jsx
<div role="tablist" aria-label="Sections de la trésorerie">
  <button
    role="tab"
    id="tab-apercu"
    aria-selected={activeTab === 'apercu'}
    aria-controls="panel-apercu"
    tabIndex={activeTab === 'apercu' ? 0 : -1}
    onClick={() => setActiveTab('apercu')}
  >
    Aperçu
  </button>
  {/* ... autres tabs ... */}
</div>

<div
  role="tabpanel"
  id="panel-apercu"
  aria-labelledby="tab-apercu"
  tabIndex={0}
  hidden={activeTab !== 'apercu'}
>
  {/* contenu du panel */}
</div>
```

Ajouter la navigation par flèches :
```jsx
const handleKeyDown = (e, index) => {
  if (e.key === 'ArrowRight') {
    const next = (index + 1) % tabs.length;
    tabRefs[next].current.focus();
  }
  if (e.key === 'ArrowLeft') {
    const prev = (index - 1 + tabs.length) % tabs.length;
    tabRefs[prev].current.focus();
  }
};
```

### 5.3 Modales
```jsx
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';

      // Piéger le focus
      const handleTab = (e) => {
        if (e.key === 'Tab') {
          const focusables = modalRef.current.querySelectorAll(
            'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
        if (e.key === 'Escape') onClose();
      };

      document.addEventListener('keydown', handleTab);
      return () => {
        document.removeEventListener('keydown', handleTab);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} tabIndex={-1} className="relative ...">
        <h2 id="modal-title">{title}</h2>
        <button onClick={onClose} aria-label="Fermer">
          <X aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
```

## PRIORITÉ 6 — Headings sémantiques

Vérifier chaque page et s'assurer de la hiérarchie :

```
<h1> Titre de la page (un seul par page)
  <h2> Section principale
    <h3> Sous-section
```

Exemple pour la page Trésorerie :
```jsx
<h1 className="text-2xl font-bold">Trésorerie</h1>

<section aria-labelledby="kpi-heading">
  <h2 id="kpi-heading" className="sr-only">Indicateurs clés</h2>
  {/* KPI cards */}
</section>

<section aria-labelledby="chart-heading">
  <h2 id="chart-heading">Flux de trésorerie</h2>
  {/* Chart */}
</section>

<section aria-labelledby="table-heading">
  <h2 id="table-heading" className="sr-only">Détail des mouvements</h2>
  {/* Table with tabs */}
</section>
```

## PRIORITÉ 7 — Toasts et notifications

Créer un composant Toast accessible :

```jsx
function Toast({ message, type = 'success' }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg
        ${type === 'success' ? 'bg-green-700 text-white' : ''}
        ${type === 'error' ? 'bg-red-700 text-white' : ''}
        ${type === 'warning' ? 'bg-yellow-700 text-white' : ''}
      `}
    >
      {message}
    </div>
  );
}
```

## PRIORITÉ 8 — Tableaux accessibles

Les tableaux de données (Trésorerie, Commandes) doivent avoir :

```jsx
<table aria-label="Mouvements de trésorerie">
  <thead>
    <tr>
      <th scope="col">Date prévue</th>
      <th scope="col">Description</th>
      <th scope="col">Type</th>
      <th scope="col">Montant</th>
      <th scope="col">Statut</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>4 févr. 2026</td>
      <td>Loyer local / dépôt</td>
      <td><span aria-label="Sortie d'argent">Sortie</span></td>
      <td>-1 800 €</td>
      <td><span aria-label="Statut : Payé">Payé</span></td>
    </tr>
  </tbody>
</table>
```

## PRIORITÉ 9 — Harmoniser les composants visuels

### 9.1 Composant KPICard réutilisable
Créer `src/components/ui/KPICard.jsx` :
```jsx
function KPICard({ icon: Icon, label, value, color = 'orange', sublabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-5 h-5 text-${color}-500`} aria-hidden="true" />}
        <span className="text-sm text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="text-sm text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}
```

Remplacer toutes les implémentations custom de KPI cards par ce composant.

### 9.2 Composant EmptyState réutilisable
Créer `src/components/ui/EmptyState.jsx` :
```jsx
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-orange-500" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && (
        <button onClick={onAction} className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-700 transition">
          + {actionLabel}
        </button>
      )}
    </div>
  );
}
```

### 9.3 Composant PageHeader réutilisable
```jsx
function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-orange-600" aria-hidden="true" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
```

## PRIORITÉ 10 — Retirer le FAB redondant

Supprimer le bouton "+" flottant en bas à droite sur desktop. Le garder uniquement en mobile (`md:hidden`) comme alternative au bouton header.

```jsx
// Desktop : bouton dans le header
<button className="hidden md:flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl">
  + Nouveau
</button>

// Mobile : FAB
<button
  className="md:hidden fixed bottom-4 right-4 w-14 h-14 bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center z-40"
  aria-label="Créer un nouvel élément"
>
  <Plus className="w-6 h-6" aria-hidden="true" />
</button>
```

## VÉRIFICATION FINALE

Après toutes les corrections, effectuer les tests suivants :

1. **Test clavier** : Naviguer dans toute l'app avec Tab uniquement. Chaque élément interactif doit être atteignable et visible (outline de focus).

2. **Test screen reader** : Utiliser VoiceOver (Mac) ou NVDA (Windows) sur chaque page. Vérifier que le contenu est annoncé correctement.

3. **Test contraste** : Utiliser l'extension "Contrast Checker" ou l'outil intégré dans Chrome DevTools pour vérifier que TOUS les textes passent WCAG AA (4.5:1 pour texte normal, 3:1 pour grand texte).

4. **Test zoom** : Mettre le navigateur à 200% de zoom. Vérifier que tout le contenu reste lisible et accessible.

5. **Test responsive** : Vérifier à 320px, 375px, 768px, 1024px, 1440px.

6. **Lighthouse** : Viser un score Accessibility > 90.
```

---

## RÉSUMÉ DES CORRECTIONS

| Priorité | Catégorie | Items | Effort |
|----------|-----------|-------|--------|
| P1 | HTML de base (lang, title, skip nav) | 3 | 30 min |
| P2 | Accents et orthographe | ~25 corrections | 1h |
| P3 | Contraste couleurs | ~15 classes à modifier | 1h |
| P4 | Labels de formulaires | ~30 inputs | 2h |
| P5 | Navigation sémantique (nav, tabs, modales) | 5 composants | 3h |
| P6 | Headings sémantiques | 7 pages | 1h |
| P7 | Toasts accessibles | 1 composant | 30 min |
| P8 | Tableaux accessibles | 3 tableaux | 1h |
| P9 | Harmonisation composants | 3 composants UI | 2h |
| P10 | FAB redondant | 1 composant | 30 min |

**Temps total estimé : ~12h de développement**
