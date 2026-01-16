# ChantierPro v16 - Version Stable

## Corrections
- Encodage UTF-8 corrigé (é, è, à, ç, etc.)
- Support thème sombre (isDark) ajouté à tous les composants
- Variables thème (cardBg, inputBg, textPrimary, textSecondary, hoverBg)
- App.jsx avec icônes Lucide (sidebar)
- Emojis conservés dans les fichiers (pas de nettoyage agressif)

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v16-stable.zip
npm run build
npx vercel --prod
```
