# ChantierPro v21.4 - Encodage 100% Corrige

## Corrections Encodage
- TOUS les caracteres corrompus corriges (0 restant)
- Accents francais: a, e, e, c, etc.
- Symboles: EUR, x (multiplication), oe
- Double encodage UTF-8 corrige

## Fonctionnalites
- Theme sombre (bouton dans sidebar)
- Notifications fonctionnelles
- Mode Demo complet
- Page de connexion moderne

## Installation
```bash
cd ~/Documents/chantierpro-app
rm -rf src/
unzip -o ~/Downloads/chantierpro-v21.4-final.zip
npm run build
git add . && git commit -m "v21.4 - Encodage 100% corrige" && git push
npx vercel --prod
```

## Note
La connexion normale necessite Supabase configure.
Utilisez le mode Demo pour tester (bouton en bas de la page de connexion).
