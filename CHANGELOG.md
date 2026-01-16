# ChantierPro v18 - Thème Sombre Complet

## Corrections majeures

### Thème sombre
- Variables thème dans TOUS les composants: cardBg, inputBg, textPrimary, textSecondary, hoverBg, btnSecondary
- Tous les `bg-white` remplacés par `${cardBg}` conditionnel
- Tous les `bg-slate-100` remplacés par `${btnSecondary}` conditionnel
- Tous les textes avec classes conditionnelles
- Onglets avec thème sombre
- Modals avec thème sombre

### Composants corrigés
- Dashboard.jsx ✓
- DevisPage.jsx ✓  
- Chantiers.jsx ✓
- Planning.jsx ✓
- Clients.jsx ✓
- Equipe.jsx ✓
- Catalogue.jsx ✓

### Encodage
- Plus de mojibake (ðŸ, â, etc.)
- UTF-8 propre (é, è, à, €, etc.)

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v18-dark-theme.zip
npm run build
git add . && git commit -m "v18 - Thème sombre complet" && git push
npx vercel --prod
```
