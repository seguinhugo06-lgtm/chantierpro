---
name: revue
description: Revue multi-expert du travail en cours sur Mallettico — répartit le diff entre les agents spécialisés concernés (sécurité, juridique, mobile, vérification), en parallèle, puis consolide leurs constats en une liste priorisée.
argument-hint: "[base, par défaut origin/main]"
---

# Revue du travail en cours

```!
git fetch -q origin main
git diff --stat origin/main...HEAD
git status --short
```

1. Déterminer les domaines touchés d'après les fichiers :
   - `supabase/`, policies, auth, `src/services/`, paiements → `gardien-securite`
   - `src/lib/devisHtmlBuilder.js`, `DevisPage.jsx`, `mentionTvaReduite.js`, `LegalPages.jsx`, `landing/`, `index.html` → `juriste-btp`
   - `src/components/`, `src/index.css`, `src/lib/natif.js`, `capacitor.config.json` → `ingenieur-mobile`
   - toujours → `verificateur`
2. Lancer ces agents **en parallèle** (outil Agent, un appel par agent dans le même message), chacun avec : le diff concerné (`git diff origin/main...HEAD -- <chemins>`), le but de la tâche, et la consigne de rendre ses constats classés.
3. Consolider : dédoublonner, classer (bloquant / à corriger / suggestion), garder les preuves (fichier:ligne, sortie, capture).
4. Corriger les bloquants (ou les présenter à Hugo s'ils demandent une décision), revérifier.
