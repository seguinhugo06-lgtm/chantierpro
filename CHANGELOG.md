# ChantierPro v18.3 - Corrections Complètes

## Corrections v18.3
- Suppression des paramètres en double (couleur dans Planning et Chantiers)
- Ajout de couleur à DevisPage dans App.jsx
- Correction des props passés à Planning (setEvents, updateChantier)
- Correction des props passés à Clients (setClients, onSubmit, setSelectedChantier)
- Correction des props passés à Equipe (setPointages)

## Thème sombre
- Variables thème dans tous les composants
- Tous les bg-white convertis en ${cardBg}
- Modals et onglets avec thème sombre

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v18.3-complete.zip
npm run build
git add . && git commit -m "v18.3 - Corrections complètes" && git push
npx vercel --prod
```
