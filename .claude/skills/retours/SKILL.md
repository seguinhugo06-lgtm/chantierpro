---
name: retours
description: Trie les retours des artisans et le journal de terrain d'Hugo en problèmes priorisés et en tâches prêtes, puis met à jour la feuille de route et propose les réponses aux utilisateurs.
disable-model-invocation: true
---

# Tri des retours

1. **Rassembler** :
   - journal de terrain du Pilote : outil ArtifactData, artefact `https://claude.ai/artifact/Esz8pN474Q1FDsbHDyaB1Q`, collection `data/users/me/pilote/frictions` ;
   - table `retours` de Supabase : Claude n'y a pas accès (pas d'identifiants). Demander à Hugo un export si besoin : dans l'éditeur SQL, `SELECT created_at, type, message, page, statut, contexte FROM retours WHERE statut IN ('nouveau','lu','en_cours') ORDER BY created_at;` puis coller le résultat ;
   - ce qu'Hugo a dit dans la conversation.
2. Confier le tout à l'agent `analyste-terrain` ; les idées qu'il retient passent par `critique-produit`.
3. Mettre à jour `docs/feuille-de-route.md` (section des prochaines tâches) avec les tâches retenues, triées.
4. Donner à Hugo : le tableau trié, les tâches proposées, et le SQL pour répondre aux utilisateurs (`UPDATE retours SET statut = '…', reponse = '…' WHERE id = '…';`), réponses courtes et honnêtes.
