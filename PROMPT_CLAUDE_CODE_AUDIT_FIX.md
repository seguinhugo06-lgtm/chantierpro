# Prompt Claude Code — Correction des 14 bugs de l'audit ChantierPro

Copie-colle ce prompt dans Claude Code pour corriger tous les bugs identifiés.

---

```
Tu es un développeur senior React/TypeScript. Je viens de réaliser un audit complet de mon app ChantierPro (React 18, Vite 5, Supabase, Zustand, Tailwind CSS).

Voici les 14 bugs trouvés, classés par priorité. Corrige-les un par un, dans l'ordre, en commitant après chaque correction.

---

## BUG #1 — CRITIQUE : Client non lié au chantier lors de la création

**Fichier :** `src/components/Chantiers.jsx`
**Problème :** Dans la fonction de création de chantier (vers ligne 1717-1725), le formulaire utilise `clientId` (camelCase) mais le DataContext et Supabase attendent `client_id` (snake_case). Le mapping existe pour les éditions (ligne ~1733-1734 dans handleEditChantier) mais PAS pour la création.
**Résultat :** Tous les chantiers créés affichent "Sans client" même quand un client est sélectionné.

**Fix attendu :**
- Dans la fonction de création de chantier, ajouter le mapping `client_id: formData.clientId || formData.client_id` avant d'appeler `addChantier()`
- S'assurer que le DataContext reçoit `client_id` en snake_case
- Vérifier aussi que le dropdown client peuple bien le bon champ du formulaire

---

## BUG #2 — HAUTE : Totaux des lignes de devis affichés à 0,00€

**Fichier :** `src/components/DevisPage.jsx`
**Problème :** Dans la vue détail/preview du devis (pas le mode édition), les lignes utilisent `l.montant` qui vaut 0 ou undefined quand les données viennent de Supabase. Le montant n'est pas recalculé à partir de `quantite * prixUnitaire`.
**Résultat :** Chaque ligne affiche "0.00€" dans la colonne Total, alors que le total en bas de page est correct.

**Fix attendu :**
- Dans le rendu des lignes du preview (vers ligne ~1463-1470), remplacer `l.montant || 0` par `(l.montant || (l.quantite || 0) * (l.prixUnitaire || 0))`
- OU mieux : ajouter un useMemo qui recalcule les montants des lignes quand `selected` change
- Aussi vérifier s'il y a une ligne fantôme en première position (avec PU HT = 0.00€ et Total = 0.00€) — si c'est un header de section, il devrait être rendu différemment

---

## BUG #3 — HAUTE : Aucun message d'erreur de validation sur les formulaires

**Fichier :** `src/components/Clients.jsx`
**Problème :** La fonction `submit` (ligne ~51) fait `if (!form.nom) return;` — un return silencieux sans aucun retour visuel (pas de toast, pas de bordure rouge, pas de message).
**Fichier additionnel :** `src/lib/validation.js` — contient un `clientSchema` avec des règles (nom requis, email validé, téléphone formaté) qui n'est JAMAIS importé ni utilisé nulle part.

**Fix attendu :**
- Importer `clientSchema` et la fonction `validate` depuis `src/lib/validation.js` dans Clients.jsx
- Avant le submit, appeler `validate(form, clientSchema)` et stocker les erreurs dans un state `errors`
- Afficher les erreurs sous chaque champ (bordure rouge + texte rouge)
- Afficher un toast "Veuillez corriger les erreurs" si la validation échoue
- Appliquer le même pattern aux autres formulaires (Chantiers, DevisPage)

---

## BUG #4 — HAUTE : Validation insuffisante côté formulaires

**Fichier :** `src/lib/validation.js`
**Problème :** Le schéma de validation est défini (ligne ~201-205) mais n'est importé nulle part dans l'app. C'est du code mort.

**Fix attendu :**
- S'assurer que validation.js exporte bien `validate(data, schema)` et les schémas
- Intégrer la validation dans TOUS les formulaires de création/édition :
  - `Clients.jsx` → `clientSchema`
  - `Chantiers.jsx` → créer un `chantierSchema` (nom requis, budget > 0)
  - `DevisPage.jsx` → créer un `devisSchema` (client requis, au moins 1 ligne)

---

## BUG #5 — MOYENNE : Clients dupliqués dans tous les dropdowns

**Fichier :** `src/context/DataContext.jsx`
**Problème :** La fonction `addClient` (ligne ~253-281) fait un update optimiste (ajoute le client localement) puis sauvegarde dans Supabase. Si la page est rechargée entre temps, ou si le sync rejoue, le client peut apparaître en double.

**Fix attendu :**
- Dans `setClients`, avant d'ajouter, vérifier qu'il n'existe pas déjà un client avec le même ID : `setClients(prev => prev.some(c => c.id === newClient.id) ? prev : [...prev, newClient])`
- Dans la fonction de chargement depuis Supabase (`loadData` ou `loadFromSupabase`), dédupliquer par ID : `const unique = [...new Map(clients.map(c => [c.id, c])).values()]`
- Optionnel : ajouter une contrainte UNIQUE sur (nom, email, user_id) côté Supabase

---

## BUG #6 — MOYENNE : Progression à 100% pour un chantier neuf

**Fichier :** `src/components/Chantiers.jsx`
**Problème :** La fonction `calculateSmartProgression` (ligne ~18-48) retourne une valeur incorrecte pour les chantiers neufs sans tâches ni données.

**Fix attendu :**
- Quand un chantier n'a aucun signal (pas de tâches, pas de dépenses, pas de temps pointé), retourner 0% au lieu de la valeur du champ `avancement`
- Vérifier que les nouveaux chantiers sont initialisés avec `avancement: 0`

---

## BUG #7 — MOYENNE : Spam de logs "[Sync] Back online" (10+ fois par page)

**Fichier :** `src/hooks/usePWA.js` (ligne ~89-102) et `src/registerSW.js` (ligne ~212-235)
**Problème :** `setupOnlineSync` est appelé dans un `useEffect` dont la dépendance `syncHandlers` est recréée à chaque render. Chaque appel ajoute un event listener `online` sans supprimer le précédent.

**Fix attendu :**
- Dans `usePWA.js`, mémoiser `syncHandlers` avec `useMemo` ou `useCallback`
- S'assurer que le `useEffect` retourne le cleanup function de `setupOnlineSync` (qui fait `removeEventListener`)
- Dans `registerSW.js`, le `setupOnlineSync` retourne déjà une cleanup — vérifier qu'elle est bien utilisée

---

## BUG #8 — MOYENNE : Updates optimistes sans rollback

**Fichier :** `src/context/DataContext.jsx`
**Problème :** Les fonctions `addClient`, `addChantier`, `addDevis` etc. mettent à jour l'état local immédiatement puis tentent la sauvegarde Supabase. En cas d'erreur, le catch (ligne ~273-276) log l'erreur mais ne supprime PAS l'entité de l'état local.

**Fix attendu :**
- Dans le catch de chaque fonction add*, ajouter un rollback :
  ```js
  catch (error) {
    console.error('Error saving to Supabase:', error);
    // Rollback optimistic update
    setClients(prev => prev.filter(c => c.id !== newClient.id));
    toast.error('Erreur de sauvegarde. Veuillez réessayer.');
  }
  ```
- Appliquer ce pattern à toutes les fonctions CRUD (addClient, addChantier, addDevis, etc.)

---

## BUG #9 — MOYENNE : Pattern N+1 dans les stats clients

**Fichier :** `src/components/Clients.jsx`
**Problème :** `getClientStats` (ligne ~44-48, appelé ligne ~660) filtre les tableaux devis et chantiers pour CHAQUE client à chaque render. O(n*m) sans mémoisation.

**Fix attendu :**
- Créer un `useMemo` qui pré-calcule une Map `clientId → stats` :
  ```js
  const clientStatsMap = useMemo(() => {
    const map = new Map();
    devis.forEach(d => {
      const cid = d.clientId || d.client_id;
      if (!map.has(cid)) map.set(cid, { devisCount: 0, chantierCount: 0, ca: 0 });
      map.get(cid).devisCount++;
      if (d.statut === 'accepte') map.get(cid).ca += d.montantTTC || 0;
    });
    chantiers.forEach(ch => {
      const cid = ch.clientId || ch.client_id;
      if (map.has(cid)) map.get(cid).chantierCount++;
    });
    return map;
  }, [devis, chantiers]);
  ```

---

## BUG #10 — MOYENNE : Event listeners sync non nettoyés

**Fichier :** `src/hooks/usePWA.js` et `src/registerSW.js`
**Problème :** Lié au bug #7 — les event listeners s'accumulent car le cleanup n'est pas toujours appelé.

**Fix attendu :**
- Couplé avec le fix du bug #7 :
  ```js
  useEffect(() => {
    const cleanup = setupOnlineSync(syncHandlers);
    return cleanup; // CRUCIAL : retourner la fonction de nettoyage
  }, [syncHandlers]); // syncHandlers doit être mémorisé
  ```

---

## BUG #11 — MOYENNE : Nommage incohérent camelCase/snake_case

**Fichiers :** `src/hooks/useSupabaseSync.js`, `src/components/Chantiers.jsx`, `src/context/DataContext.jsx`
**Problème :** L'app mélange `clientId` et `client_id`, `dateDebut` et `date_debut`, `budgetPrevu` et `budget_estime`, etc. C'est la cause racine du Bug #1.

**Fix attendu :**
- Standardiser en camelCase côté client (React)
- Laisser `useSupabaseSync.js` gérer TOUTE la conversion camelCase ↔ snake_case
- Créer des fonctions helper `toSnakeCase(obj)` et `toCamelCase(obj)` utilisées systématiquement
- Supprimer les doublons comme `client_id: x, clientId: x` dans handleEditChantier

---

## BUG #12 — MOYENNE : Composants trop volumineux (2000+ lignes)

**Fichiers :** `src/components/DevisPage.jsx` (2548 lignes), `Chantiers.jsx` (2370 lignes), `Equipe.jsx` (2294 lignes)
**Problème :** Logique métier, UI et gestion d'état dans un seul fichier. Difficile à maintenir et tester.

**Fix attendu :** (à faire progressivement, pas obligé de tout faire maintenant)
- Extraire les hooks custom : `useDevisForm`, `useChantierForm`, `useClientStats`
- Extraire les sous-composants : `DevisPreview`, `DevisEditor`, `DevisLineItem`, `ChantierCard`, `ChantierForm`
- Garder le composant principal comme orchestrateur

---

## BUG #13 — BASSE : Console.log excessifs en production

**Fichiers :** `src/registerSW.js`, `src/hooks/useSupabaseSync.js`, `src/context/DataContext.jsx`
**Problème :** Des dizaines de `console.log` avec emojis (🔐, 📥, ✅) en production. Fuite d'info (user IDs loggés).

**Fix attendu :**
- Créer un `src/lib/logger.js` :
  ```js
  const isDev = import.meta.env.DEV;
  export const logger = {
    debug: (...args) => isDev && console.log(...args),
    info: (...args) => isDev && console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };
  ```
- Remplacer tous les `console.log` par `logger.debug` ou `logger.info`
- Garder `console.error` et `console.warn` tels quels
- Ne JAMAIS logger les user IDs en production

---

## BUG #14 — BASSE : Pas de trim() sur les inputs texte

**Fichier :** `src/components/Clients.jsx` (ligne ~491-497) et tous les formulaires
**Problème :** "Jean " et "Jean" sont deux clients différents.

**Fix attendu :**
- Dans chaque fonction submit, ajouter un trim sur les champs texte :
  ```js
  const cleanForm = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  );
  ```
- Appliquer avant la validation et avant la sauvegarde

---

## INSTRUCTIONS GÉNÉRALES

- Corrige les bugs dans l'ordre (1 → 14)
- Commite après chaque fix avec un message clair : `fix(#N): description courte`
- Ne casse pas les fonctionnalités existantes
- Teste mentalement chaque fix (est-ce que ça casse le mode demo ? le mode offline ?)
- Pour les bugs 11 et 12 (refactoring), tu peux les noter comme TODO si c'est trop lourd à faire maintenant
- Priorise : bugs 1, 2, 3 sont les plus urgents
```
