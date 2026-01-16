# ChantierPro v18.2 - Thème Sombre Stable

## Corrections
- Repartir des fichiers originaux pour éviter les corruptions
- Ajout propre de isDark et variables thème
- Remplacements simples et sûrs (pas de regex complexes)
- Tous les bg-white convertis en ${cardBg} conditionnel
- Modals avec thème sombre
- Onglets avec thème sombre

## Variables thème dans tous les composants:
- cardBg: fond des cartes
- inputBg: fond des inputs
- textPrimary: texte principal
- textSecondary: texte secondaire
- hoverBg: hover states
- btnSecondary: boutons secondaires

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v18.2-stable.zip
npm run build
git add . && git commit -m "v18.2 - Thème sombre stable" && git push
npx vercel --prod
```
