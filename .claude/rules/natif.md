---
paths:
  - "src/lib/natif.js"
  - "src/lib/urlPublique.js"
  - "capacitor.config.json"
  - "src/registerSW.js"
  - "ios/**"
  - "android/**"
---

# Application native (Capacitor 8)

- Le site React est embarqué tel quel ; tout ce qui diffère entre site et app passe par `src/lib/natif.js` (`estNatif`, `remettreFichier`, `ouvrirLienExterne`) et `src/lib/urlPublique.js`. Les modules Capacitor sont importés dynamiquement, en natif seulement.
- Interdits dans l'app : `<a download>` (ne fait rien), `window.location` / `window.open` vers un site externe (s'ouvre DANS l'app), `window.location.origin` dans un lien envoyé (vaut `localhost`), service worker (désactivé dans `registerSW.js`). Le smoke bloque les téléchargements directs.
- Plateformes pas encore ajoutées : `npx cap add ios` / `android` nécessitent Xcode et Android Studio (Hugo). Ensuite : `npm run build && npx cap sync`, icônes et écran de démarrage depuis le logo vectoriel.
- `appId` `fr.mallettico.app` : définitif une fois publié (décision D-12, à confirmer avant `cap add`).
- Exigences des stores : fonctions natives réelles (Apple 4.2), suppression de compte dans l'app (5.1.1(v)), aucun achat avant la décision D-13, déclarations de confidentialité alignées sur le code (agent `redacteur-stores`).
- Restent à faire en natif : liens universels / App Links (`.well-known`, identifiant d'équipe Apple et empreinte Android), notifications push (APNs / Firebase), appareil photo, bouton retour (fait : retour à l'accueil puis sortie).
