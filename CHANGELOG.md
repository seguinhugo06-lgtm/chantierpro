# ChantierPro v21.2 - Build Fix

## Corrections
- Suppression des declarations en double dans Dashboard.jsx
- Encodage UTF-8 corrige
- isDark dans tous les composants
- Variables theme (cardBg, inputBg, etc.)

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v21.2-build-fix.zip
npm run build
git add . && git commit -m "v21.2 - Build fix" && git push
npx vercel --prod
```
