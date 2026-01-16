# ChantierPro v20 - Refonte Complete

## Corrections majeures
- Encodage UTF-8 corrige (Euro, accents francais)
- Emojis corrompus supprimes
- App.jsx reecrit de zero
- Page de connexion moderne avec gradient
- Theme sombre fonctionnel

## Composants mis a jour
- Tous les composants recoivent isDark et couleur
- Variables theme (cardBg, inputBg, textPrimary, textSecondary)
- bg-white remplaces par variables conditionnelles

## Installation
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v20-clean.zip
npm run build
git add . && git commit -m "v20 - Refonte complete" && git push
npx vercel --prod
