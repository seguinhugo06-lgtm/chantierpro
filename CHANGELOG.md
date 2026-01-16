# ChantierPro v19.1 - Corrections Encodage

## Corrections majeures
- Tous les caractères français corrigés (é, è, à, ç, etc.)
- Symbole Euro (€) corrigé partout
- Emojis corrompus supprimés
- Accents dans les labels corrigés

## Améliorations interface
- Page de connexion redesignée
- Sidebar avec ombre et séparateurs
- Notifications fonctionnelles avec dropdown
- Menu Nouveau avec dropdown

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v19.1-encoding-fixed.zip
npm run build
git add . && git commit -m "v19.1 - Encodage corrigé" && git push
npx vercel --prod
```
