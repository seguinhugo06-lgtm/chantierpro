# Prompt Claude Code — Correction des bugs V2 de ChantierPro

Copie-colle ce prompt dans Claude Code pour corriger tous les bugs identifiés lors des tests de la V2.

---

```
Tu es un développeur senior React/TypeScript. Je viens de tester la V2 de mon app ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS) déployée sur goofy-perlman.vercel.app.

Les corrections de bugs de l'audit initial (Bug #1 client-chantier, Bug #2 montants devis, Bug #3 validation) sont OK ✅.

Mais j'ai trouvé de NOUVEAUX bugs sur les features V2. Corrige-les un par un, dans l'ordre, en commitant après chaque correction.

---

## BUG V2-1 — HAUTE : Encodage Unicode cassé sur 3 pages (caractères accentués affichés en brut)

**Fichiers concernés :**
- `src/components/IADevisAnalyse.jsx`
- `src/components/CarnetEntretien.jsx`
- `src/components/SignatureModule.jsx`

**Problème :** Les caractères accentués français (é, è, ê, à, â, î, ô, ù) sont affichés sous forme d'échappements Unicode bruts au lieu d'être rendus correctement. Le texte visible dans le navigateur montre littéralement `\u00e9` au lieu de `é`.

**Exemples constatés :**

Page IA Devis :
- `"G\u00e9n\u00e9rez des estimations de travaux \u00e0 partir de photos"` → devrait être `"Générez des estimations de travaux à partir de photos"`
- `"g\u00e9n\u00e8rera automatiquement une estimation d\u00e9taill\u00e9e des travaux avec les prix du march\u00e9"` → devrait être `"générera automatiquement une estimation détaillée des travaux avec les prix du marché"`

Page Entretien :
- `"T\u00e2ches en retard"` → `"Tâches en retard"`
- `"T\u00e2ches ce mois"` → `"Tâches ce mois"`
- `"Cr\u00e9er un carnet"` → `"Créer un carnet"`

Page Signatures :
- `"Signature \u00e9lectronique"` → `"Signature électronique"`
- `"Sign\u00e9s"` → `"Signés"`
- `"Refus\u00e9s"` → `"Refusés"`
- `"Documents \u00e0 signer"` → `"Documents à signer"`
- `"Signatures r\u00e9centes"` → `"Signatures récentes"`
- `"Signatures s\u00e9curis\u00e9es"` → `"Signatures sécurisées"`

**Cause racine :** Les chaînes de caractères dans ces 3 fichiers JSX contiennent des séquences d'échappement JSON (`\u00XX`) au lieu des caractères UTF-8 natifs. C'est probablement dû à une génération de code qui a échappé les accents au lieu d'utiliser les caractères réels.

**Fix attendu :**
- Ouvrir chacun des 3 fichiers
- Faire un search & replace global de TOUTES les séquences `\uXXXX` par les caractères UTF-8 correspondants :
  - `\u00e9` → `é` (e accent aigu)
  - `\u00e8` → `è` (e accent grave)
  - `\u00ea` → `ê` (e accent circonflexe)
  - `\u00e0` → `à` (a accent grave)
  - `\u00e2` → `â` (a accent circonflexe)
  - `\u00ee` → `î` (i accent circonflexe)
  - `\u00f4` → `ô` (o accent circonflexe)
  - `\u00f9` → `ù` (u accent grave)
  - `\u00fb` → `û` (u accent circonflexe)
  - `\u00e7` → `ç` (c cédille)
  - `\u00c9` → `É` (E accent aigu majuscule)
  - `\u00c0` → `À` (A accent grave majuscule)
  - `\u2019` → `'` (apostrophe typographique)
  - `\u00ab` → `«` (guillemet ouvrant)
  - `\u00bb` → `»` (guillemet fermant)
- Vérifier qu'il n'y a AUCUNE séquence `\u00` restante dans ces fichiers
- IMPORTANT : Vérifier AUSSI tous les autres fichiers de composants V2 par précaution :
  - `src/components/BibliothequeOuvrages.jsx`
  - `src/components/CommandesFournisseurs.jsx`
  - `src/components/TresorerieModule.jsx`
  - `src/components/ExportComptable.jsx`

**Script de vérification rapide :**
```bash
grep -rn '\\u00' src/components/ --include="*.jsx" --include="*.tsx" --include="*.js"
```
S'il reste des occurrences, les remplacer aussi.

---

## BUG V2-2 — MOYENNE : Client affiché comme UUID tronqué dans la page Signatures

**Fichier :** `src/components/SignatureModule.jsx`

**Problème :** Dans la section "Documents à signer", le devis DEV-2026-00001 affiche `"Client 49c571"` (un fragment d'UUID) au lieu du nom réel du client `"Dupont Jean"`.

**Cause probable :** Le composant affiche directement le `client_id` (ou une troncature de celui-ci) au lieu de résoudre le nom du client via une jointure ou un lookup dans le contexte.

**Fix attendu :**
- Trouver l'endroit dans SignatureModule.jsx où le nom du client est affiché à côté du numéro de devis
- Au lieu d'afficher `client_id` ou un substring de l'UUID, faire un lookup du nom du client :
  - Option 1 : Utiliser le DataContext pour récupérer les clients et faire un `.find(c => c.id === devis.client_id)?.nom`
  - Option 2 : Si le devis a déjà un champ `clientNom` ou `client_nom`, l'utiliser directement
- Afficher `"Dupont Jean"` au lieu de `"Client 49c571"`
- Vérifier que le même pattern est utilisé partout où un client est référencé dans ce composant

---

## BUG V2-3 — BASSE : Accents manquants dans certains labels de la sidebar et titres

**Fichier :** Composant sidebar/navigation principal (probablement `src/components/Sidebar.jsx` ou `src/App.jsx` ou `src/components/Layout.jsx`)

**Problème :** Certains labels dans la navigation et les titres de page n'ont pas d'accents :
- `"Tresorerie"` dans le titre de page → devrait être `"Trésorerie"`
- `"Entrees prevues"` → `"Entrées prévues"`
- `"Sorties prevues"` → `"Sorties prévues"`

**Fix attendu :**
- Rechercher toutes les occurrences de textes français sans accents dans les composants V2
- Les corriger pour avoir les bons accents
- Vérification : `grep -rn "Tresorerie\|Entrees\|prevues\|recurrentes" src/components/`

---

## BUG V2-4 — BASSE : Accents manquants dans les labels KPI de Sous-Traitants et Commandes

**Fichiers :**
- `src/components/SousTraitantsModule.jsx`
- `src/components/CommandesFournisseurs.jsx`

**Problème :** Certains textes dans les KPI cards et labels n'ont pas d'accents :
- Sous-Traitants : `"Informations generales"` → `"Informations générales"`, `"Informations legales"` → `"Informations légales"`, `"Corps de metier"` → `"Corps de métier"`, `"Non renseignee"` → `"Non renseignée"`, `"Non conforme"` → OK
- Commandes : `"Montant engage"` → `"Montant engagé"`, `"Aucune commande trouvee"` → `"Aucune commande trouvée"`, `"Livrees"` → `"Livrées"`, `"Annulees"` → `"Annulées"`

**Fix attendu :**
- Corriger tous les labels sans accents dans ces composants
- Attention : ne PAS toucher aux noms de variables/clés JavaScript, seulement les textes visibles par l'utilisateur (dans les JSX, les strings affichées)

---

## BUG V2-5 — BASSE : Labels accents manquants dans Trésorerie

**Fichier :** `src/components/TresorerieModule.jsx`

**Problème :** Plusieurs labels et textes de la page Trésorerie n'ont pas d'accents :
- `"ENTREES PREVUES"` → `"ENTRÉES PRÉVUES"`
- `"SORTIES PREVUES"` → `"SORTIES PRÉVUES"`
- `"Factures impayees"` → `"Factures impayées"`
- `"Charges recurrentes + previsions"` → `"Charges récurrentes + prévisions"`
- `"Solde cumule"` → `"Solde cumulé"`
- `"6 mois affiches"` → `"6 mois affichés"`

**Fix attendu :**
- Corriger tous les textes visibles sans accents
- Vérifier la section Aperçu/Prévisions/Historique aussi

---

## VÉRIFICATION FINALE

Après toutes les corrections, exécuter :

```bash
# 1. Vérifier qu'il ne reste aucun \u00XX dans les composants
grep -rn '\\u00' src/components/ --include="*.jsx" --include="*.tsx"

# 2. Vérifier les textes français courants sans accents
grep -rn '"[A-Z]*[a-z]*ee[s]*"' src/components/ --include="*.jsx" | grep -v node_modules
grep -rn 'Tresorerie\|generales\|legales\|metier\|prevues\|recurrentes\|impayees\|trouvee\|Livrees\|Annulees' src/components/ --include="*.jsx"

# 3. Build et vérifier qu'il n'y a pas d'erreurs
npm run build

# 4. Lancer le dev server et vérifier visuellement les 3 pages IA Devis, Entretien, Signatures
npm run dev
```

---

## RÉSUMÉ DES FICHIERS À MODIFIER

| Priorité | Fichier | Bug |
|----------|---------|-----|
| HAUTE | `src/components/IADevisAnalyse.jsx` | V2-1 : Unicode encoding |
| HAUTE | `src/components/CarnetEntretien.jsx` | V2-1 : Unicode encoding |
| HAUTE | `src/components/SignatureModule.jsx` | V2-1 : Unicode encoding + V2-2 : Client UUID |
| BASSE | `src/components/SousTraitantsModule.jsx` | V2-4 : Accents manquants |
| BASSE | `src/components/CommandesFournisseurs.jsx` | V2-4 : Accents manquants |
| BASSE | `src/components/TresorerieModule.jsx` | V2-3 + V2-5 : Accents manquants |
| CHECK | `src/components/BibliothequeOuvrages.jsx` | Vérifier par précaution |
| CHECK | `src/components/ExportComptable.jsx` | Vérifier par précaution |
```
