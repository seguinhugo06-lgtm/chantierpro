---
name: verifier
description: Lance la chaîne de vérification de Mallettico (rapide, standard ou complète) et interprète le résultat ; en cas d'échec, isole la cause. À utiliser avant de dire qu'un changement est fini et avant toute livraison.
argument-hint: "[rapide|complet]"
allowed-tools: Bash(npm run verifier*) Bash(node scripts/verifier.mjs*)
---

# Vérification

Niveau demandé : « $ARGUMENTS » (vide = standard).
- `rapide` : tests, lint, smoke — pendant le travail.
- standard : + build — minimum avant de livrer.
- `complet` : + banc de migrations, parcours navigateur, audit d'interface (0 défaut) — exigé si l'affichage, une migration ou un parcours critique a changé.

Lancer :
- `npm run verifier -- --rapide`, `npm run verifier`, ou `npm run verifier -- --complet` (le complet dure ~10 min : le lancer en arrière-plan et faire autre chose).

Interpréter :
- Tout vert → le dire avec le niveau et le commit vérifié. Le résultat est enregistré (`audit-ui/derniere-verification.json`) : c'est lui qu'exige le garde-fou de livraison, sur un arbre propre.
- Échec → lire la sortie, isoler la cause (test ciblé `npx vitest run <fichier>`, `npm run parcours -- <nom>`, `node scripts/audit-ui.cjs <page> <largeur>`, sonde), corriger à la cause, relancer. Ne jamais affaiblir un contrôle pour le faire passer.
- Audit d'interface : un défaut se confirme sur la capture (`audit-ui/captures/`) avant d'être corrigé ou classé faux positif ; un faux positif se corrige dans l'audit, avec un commentaire.
