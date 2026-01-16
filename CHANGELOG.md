# ChantierPro - Changelog v14.1

## ✅ Thème Sombre - Support Complet

### Composants refaits avec support thème sombre complet:
- ✅ **App.jsx** - Prop `isDark` passée à tous les composants
- ✅ **Dashboard.jsx** - Déjà fonctionnel
- ✅ **Catalogue.jsx** - Refonte complète avec icônes Lucide
- ✅ **Clients.jsx** - Cards, formulaires et détails
- ✅ **Equipe.jsx** - Pointage, chronomètre, validation
- ✅ **Planning.jsx** - Calendrier et événements
- ✅ **Settings.jsx** - 6 onglets avec thème complet
- ✅ **DevisPage.jsx** - Variables thème ajoutées
- ✅ **Chantiers.jsx** - Variables thème ajoutées

### Corrections encodage UTF-8
Tous les caractères français sont correctement encodés (é, è, à, ç, œ, etc.)

### Variables de thème utilisées

```javascript
const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';
const textPrimary = isDark ? 'text-white' : 'text-slate-900';
const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
```

## 📦 Installation

```bash
# Extraire l'archive
unzip chantierpro-v14.1-dark-theme.zip

# Copier dans votre projet
cp -r src/* /votre-projet/src/

# Rebuild
npm run build && vercel --prod
```
