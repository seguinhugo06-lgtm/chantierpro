# BatiGesti — Repositionnement "Artisan Sharp"

**Stratégie de simplification produit + offre, pour un SaaS de facturation BTP destiné aux artisans solo et petites équipes.**

Rédigé le 20 avril 2026 — à partir d'un audit du code (40 pages, 326 composants, 43 tables, 11 Edge Functions) et d'une analyse des concurrents directs.

---

## TL;DR

Tu as construit un Obat-bis : très complet, très ambitieux, mais trop large pour ta cible et pour le temps que tu veux y passer. Le marché des artisans solo et micro-équipes n'achète pas une suite complète — il achète **"je fais mon devis en 3 minutes, je facture en un clic, je touche mon acompte avant de commencer"**. C'est exactement là que Tolteck (28 000 clients, 25€/mois, centré devis-facture) écrase tout le monde pendant qu'Obat se perd dans la complexité à 59-79€.

La bonne stratégie pour toi : **couper franc 40% des features**, resserrer sur le trio **devis → acompte → facture**, automatiser le support et l'onboarding, et positionner le prix sous Tolteck (19-24€) avec une promesse plus nette. Pas "encore un logiciel BTP". Un **outil de cash-flow pour artisan solo**.

---

## 1. Diagnostic : ce que tu as construit, ce que tu ne vends pas

### Ce qui existe vraiment dans l'app

Le code raconte une histoire claire. Tu as un cœur solide (devis, factures, clients, chantiers, acomptes, signatures, relances automatiques, export FEC, 308 modèles de devis par métier), et autour, une accumulation de modules qui répondent chacun à un "ce serait bien d'avoir" : carnet d'entretien 10 ans, form builder custom, sous-traitants avec validation SIRET, geofencing GPS, commandes fournisseurs, pipeline Kanban, chat temps réel, site vitrine client, avis Google, contrats BTP. Au total, **40 pages / modules**, dont la majorité ne sera jamais ouverte par un plombier seul qui veut juste envoyer son devis depuis le camion.

La conséquence : ton app parle à trois personas en même temps (artisan solo / petite équipe / ETI), et du coup ne parle vraiment à personne. L'onboarding est noyé. Le pitch est dilué. Le support est étalé sur trop de surface. Et surtout, **chaque module est une dette de maintenance** — 43 tables Supabase, 9 intégrations externes (Stripe, Yousign, Twilio, SendGrid, GoCardless, Anthropic, Google Reviews, Supabase Realtime, Factur-X), 11 Edge Functions. Tu ne peux pas tenir ça tout seul en "travaillant peu".

### Ce qui cartonne déjà dans le code

Cinq choses valent de l'or et sont sous-exploitées dans ta comm :

1. **Les 308 modèles Express par métier** (29 corps de métier, prix marché 2024-2025). C'est un avantage énorme. Tolteck a des bibliothèques mais beaucoup moins structurées. À mettre au cœur de la promesse : "premier devis en 3 minutes, pas 3 heures".
2. **Le wizard acompte + échéancier** (% ou montants fixes, auto-facturation du solde). Personne n'en parle dans le secteur, et c'est littéralement le sujet n°1 des artisans (trésorerie).
3. **Signature électronique Yousign intégrée**. Sur les plans Artisan et + de la concurrence, c'est soit absent, soit une option payante. Mets-le dans ton plan de base, tu gagnes l'argument.
4. **Relances automatiques multi-canal** (email J+7, email+SMS J+15, mise en demeure). Tolteck n'a pas le suivi des paiements. C'est une différence majeure.
5. **Dashboard "pulse" quotidien** (CA, devis attendus, impayés, actions à faire). Le seul vrai écran à ouvrir le matin. Le reste de l'app devrait se cacher derrière.

Le reste est nice-to-have.

---

## 2. Le paysage concurrentiel (où tu joues vraiment)

### Benchmark chiffré

| Acteur | Prix HT/mois | Clients | Positionnement | Force | Faiblesse |
|---|---|---|---|---|---|
| **Tolteck** | 19€ (engagement) / 25€ (souple) | ~28 000 | Le "simple et bien" | Simplicité, offline, support humain, 4,8/5 Google | Pas de suivi paiement, pas de chiffrage avancé, pas d'acomptes fluides |
| **Obat** | 25€ → 79€ | ~20 000-31 000 | La suite BTP complète | Bibliothèques énormes, onboarding humain 6j/7 | Perçu cher, montée en complexité, hausses de prix critiquées |
| **Henrri** | Gratuit (1 devis/mois) / ~15€ | Gros volume | L'entrée de gamme généraliste | Prix | Pas BTP-spécifique, pas d'acomptes BTP, pas de Factur-X carré |
| **Axonaut** | 29,99€ → 69,99€ | 10 000+ | CRM+facture généraliste | Large surface fonctionnelle | Pas pensé artisan, trop CRM |
| **Mediabat / Batappli / Codial / EBP** | 25€ → 80€+ | Legacy | Desktop historique BTP | Installés, fidèles | Interface datée, pas mobile-first |
| **ArtisanSmart** | 29€ | Nouveau | Mobile-first Factur-X | Moderne, algo de prix | Peu connu |
| **Costructor, ProBâtiment, Khosmos** | 19-35€ | Petits | Challengers | Prix, design | Moins de traction |

### Lectures du marché

**Le milieu du tableau est saturé.** À 25-30€/mois avec "devis+facture+chantier", il y a Tolteck, ArtisanSmart, Costructor, Khosmos, et tous se ressemblent. Se battre là, c'est se battre sur la fiche de feature et le SEO.

**Les deux positions gagnantes sont les extrêmes.** Tolteck gagne en bas ("simple, pas cher, ça marche"). Obat gagne en haut ("la Rolls, tout compris, onboarding humain"). Il y a un trou **entre Henrri (trop généraliste) et Tolteck (trop axé devis pur)** pour un produit qui dirait : *"devis + facture + acompte + encaissement, fait pour l'artisan seul, moins cher que Tolteck parce que 100% automatisé."*

**Pain points artisans récurrents** (consolidés depuis forums/avis) : (1) "je perds des soirées à refaire des devis sous Excel" ; (2) "je commence les chantiers sans acompte et je cours après le solde" ; (3) "j'oublie de relancer" ; (4) "le logiciel a trop de boutons, je ne sais pas où cliquer" ; (5) "j'ai peur de la conformité Factur-X qui arrive et je ne sais pas si mon outil sera prêt".

Le trio **devis-acompte-relance** coche 3 de ces 5 douleurs. La conformité coche la 5e. La simplicité coche la 4e. Tu as déjà tout. Il faut juste le vendre comme ça.

---

## 3. Le positionnement proposé

### Promesse en une phrase

> **"Faites votre devis, encaissez votre acompte, facturez le solde. Le reste, on s'en occupe."**

### Angle de pitch

Pas "logiciel de gestion BTP". Pas "suite tout-en-un". Le pitch : **"L'outil qui transforme un devis signé en argent sur votre compte, en 3 clics."** Tu parles cash-flow, pas admin.

Sous-titre possible pour la landing : *"Devis en 3 minutes. Acompte encaissé avant le chantier. Relance auto quand le client traîne. Pensé pour artisans seuls et petites équipes."*

### Trois preuves à marteler partout

1. **"Premier devis en 3 minutes"** — grâce aux 308 modèles par métier. Chronomètre en vidéo dans la landing.
2. **"Acompte encaissé avant la première heure de chantier"** — le flow devis signé → lien de paiement Stripe → acompte reçu est quasi unique dans le marché.
3. **"Vous ne relancez plus jamais personne"** — relances automatiques J+7 email, J+15 email+SMS, mise en demeure. À mettre au niveau du plan d'entrée.

Ces trois preuves doivent être le H1, les 3 sections suivantes, les 3 captures d'écran, les 3 témoignages, les 3 questions du mail d'onboarding. Répétition.

---

## 4. Audit produit : couper, polir, cacher

### À COUPER (à supprimer ou archiver — maintenance élevée pour un ROI utilisateur faible)

- **Geofencing GPS sur chantiers** — permission Android casse-pied, usage <10%, doublon avec pointage manuel. Supprime les hooks `useGeofencing`.
- **Form builder custom** — monolithique, redéveloppement lourd, dupliqué par Typeform/JotForm. Si un utilisateur a vraiment besoin, lien Typeform externe. Supprime la table + pages.
- **Contrats BTP modèles légaux** — conformité légale évolue, c'est un métier à part entière. Sors un PDF guide à télécharger, c'est 100x moins de maintenance.
- **Carnet d'entretien 10 ans** — très niche (neuf vs rénovation), peu utilisé, complexité de notif récurrentes. Archiver.
- **Chat équipe temps réel** (Supabase Realtime) — l'artisan solo n'en a pas besoin et la petite équipe utilise WhatsApp. Coût Realtime significatif. Archiver.
- **Site vitrine client intégré** — c'est un produit à part (Jimdo, Wix, Framer font ça). Mauvais positionnement. Supprime ou ne l'inclus dans aucun plan (extrêmement niche).
- **Portfolio commandes fournisseurs** — utile en ETI, pas en artisan solo. Cacher ou couper.
- **Avis Google sync** — sympa mais pas différenciant et friction OAuth. Documenter comme "lien externe" à la place.
- **Pipeline Kanban prospects** — Tolteck et Obat l'ont déjà. Trop "CRM". Cacher par défaut, voire supprimer.

Impact estimé : **-15 à -18 pages**, **-8 à -12 tables**, **-3 à -4 Edge Functions**, **-2 intégrations externes** (Google Reviews peut sauter, Realtime si tu coupes le chat). C'est autant de bugs et de tickets support que tu ne traites plus.

### À POLIR (c'est le cœur de ta promesse, investis tout ton temps ici)

- **Devis** — wizard ultra-rapide : sélection métier → template → édition lignes → envoi. Doit tenir en 3 écrans max. Ajouter "dupliquer dernier devis client". Mettre l'acompte comme étape visible du wizard, pas un onglet caché.
- **Acompte** — UX wizard dédiée avec visualisation cash-flow (bar bleue "acompte reçu", bar grise "solde attendu"). Après signature du devis, génère automatiquement la facture d'acompte et un lien de paiement Stripe envoyé au client.
- **Signature électronique** — flow "envoyer pour signature + lien de paiement" en 1 bouton. Une fois signé + payé, notification push à l'artisan "✅ Vous pouvez démarrer le chantier, l'acompte de 1 234 € est sur votre compte".
- **Relances automatiques** — dashboard dédié "Qui dois-je relancer aujourd'hui" (0 par défaut, car c'est auto). Templates d'e-mail éditables. Statut visible : "Relance 1 envoyée le 12/04, ouverte par client".
- **Dashboard "Ma journée"** — un seul écran d'accueil, 4 chiffres (CA du mois, devis à signer, factures impayées, acomptes attendus) + 3 actions "à faire maintenant". Le reste se masque.

### À CACHER par défaut (restent dispo sur plan équipe, mais hors du parcours principal)

Planning Gantt, pointage équipe, trésorerie 12 mois, sous-traitants, catalogue articles, stocks, IA devis (déjà solide mais à garder comme bonus), formulaires de réception chantier, garanties. Tout ça reste dans le code mais **n'apparaît que si l'utilisateur active "Mode équipe"** dans les paramètres ou est sur le plan Équipe. Sur le plan solo (ta cible principale), il ne voit que : Dashboard, Devis, Factures, Clients, Paramètres. Cinq items. Pas douze.

---

## 5. Nouvelle offre & pricing

### Principe : une promesse par plan, pas une liste de features

**Plan Solo — 19 € HT/mois** *(engagement annuel)* / 24 € sans engagement

Cible : auto-entrepreneurs, artisans seuls, micro-entreprises BTP.
Promesse : *"Votre devis en 3 minutes, votre acompte avant le chantier."*
Inclus : devis + factures + acomptes illimités, 20 clients actifs, signature électronique illimitée, relances email automatiques, lien de paiement Stripe, export FEC pour expert-comptable, Factur-X conforme, 308 modèles métier, 5 IA devis/mois.
Exclus : SMS, équipe, pointage, planning, trésorerie, stocks, sous-traitants.

**Plan Artisan — 34 € HT/mois** *(engagement annuel)* / 39 € sans engagement

Cible : artisan + 1-3 ouvriers, entreprise qui commence à structurer.
Promesse : *"Tout Solo + votre petite équipe sur un planning."*
Ajoute : clients illimités, relances SMS (100/mois), planning simple (pas Gantt, juste un calendrier), pointage mobile de 3 personnes max, 20 IA devis/mois, catalogue articles simple, multi-utilisateurs (3 max).
Exclus : trésorerie avancée, sous-traitants, Factur-X avancé multi-schémas.

**Plan Équipe — 59 € HT/mois** *(annuel)* / 69 € sans engagement

Cible : petite entreprise BTP 4-10 personnes.
Promesse : *"Tout Artisan + trésorerie + sous-traitants + analytique."*
Ajoute : utilisateurs illimités (jusqu'à 10), trésorerie 12 mois, sous-traitants, commandes fournisseurs, analytique premium, IA devis illimitée, SMS illimités, support prioritaire (délai < 4h ouvrées), migration depuis ancien logiciel offerte.

### Lecture stratégique du pricing

À 19 € HT sur Solo, tu passes *sous* Tolteck (19€ aussi en annuel mais 25€ en souple, à surveiller), tu passes très loin sous Obat (25€ minimum, 39€ la version "utilisable"), et tu restes au-dessus de Henrri (qui n'est pas une vraie concurrence, trop généraliste).

Sur Équipe à 59 €, tu te bats contre Obat à 59-79€. Ton argument : **moins de surface, donc moins de friction d'adoption, même résultat sur le cœur métier**.

### Le plan gratuit : à virer

Aujourd'hui tu as un plan gratuit (5 devis/mois, 10 clients, etc.). Conseil fort : **bascule-le en essai gratuit 14 jours** sans carte requise, sur le plan Solo complet. Raisons : (1) les utilisateurs gratuits coûtent cher en support et conversion ; (2) Tolteck et Obat n'ont pas de free tier et ça ne les empêche pas d'avoir 30 000 clients ; (3) ton positionnement "outil qui fait gagner du temps et de l'argent" est décrédibilisé par un free tier.

Exception acceptable : un "mode invité" qui permet de **générer un seul devis sans compte** (demo publique), pour convertir via SEO. Ça fait du trafic et de la démo sans créer de compte fantôme.

### Tactiques pricing

- **Engagement annuel remisé de ~20%** (standard SaaS). Met en avant.
- **Mois offerts en cas de migration** depuis un concurrent (2 mois gratuits si on importe leur base client). Faible coût, gros effet sur le switch.
- **Affilié / parrainage** : 1 mois offert par filleul actif. Les artisans se parlent en MJPM, en fédérations, sur Facebook.
- **TVA 20% affichée clairement** — artisans solo n'ont pas tous la TVA récupérable, affiche TTC sur la landing (24 €, 41 €, 71 €) plutôt que HT pour ne pas créer de mauvaise surprise. Tolteck et Obat parlent en HT, toi tu peux casser le code en affichant TTC : plus honnête.

---

## 6. Le pitch : nouvelle landing en 6 sections

### Section 1 — Hero

**H1 :** "Votre devis signé. Votre acompte encaissé. Avant le premier coup de marteau."
**Sous-titre :** "Le logiciel de devis-facture pour artisans qui veulent être payés en avance, pas en retard."
**CTA :** "Essai gratuit 14 jours — sans carte bancaire"
Vidéo 30s : chrono à côté, un plombier qui fait un devis, le chrono affiche 2:47. Le devis part par mail. Le client signe sur son téléphone. Un virement arrive. "Et vous ? Vous commencez quand ?"

### Section 2 — Les 3 promesses

Trois cartes, trois icônes. Chaque carte = une preuve.
1. *Devis en 3 minutes* — capture d'écran du wizard avec les 308 modèles.
2. *Acompte avant chantier* — capture du flow signature → paiement.
3. *Relances auto* — capture du dashboard avec "0 à relancer aujourd'hui".

### Section 3 — Démonstration "moment de vérité"

Un gif animé (pas une vidéo) de 15s : on crée un devis → on envoie → on voit le client signer → l'acompte tombe → on facture. Boucle. Rien d'autre sur cette section.

### Section 4 — Pour qui

Trois personas avec photo + nom + 1 phrase :
- Pierre, plombier-chauffagiste solo, Bourges.
- Samira, peintre-décoratrice, 2 ouvriers, Lyon.
- Karim, entreprise de maçonnerie 6 personnes, Marseille.
Chacun dit une phrase précise sur ce qu'il a gagné (temps, argent, tranquillité).

### Section 5 — Pricing

Trois colonnes, TTC, engagement annuel mis en avant. Pas de "à partir de" : prix affichés en grand. Tableau comparatif bref dessous (avec une colonne "Tolteck" et "Obat" et "BatiGesti" pour positionnement explicite — agressif mais honnête).

### Section 6 — FAQ + conformité

Les 6 questions qu'un artisan se pose vraiment : "Factur-X c'est compris ?", "Je peux importer mes clients ?", "Si j'arrête, mes données ?", "Combien de temps pour tout mettre en place ?", "Et si j'ai un bug ?", "Mon expert-comptable va pouvoir récupérer le FEC ?". Réponses en 2-3 lignes, pas de jargon.

---

## 7. Plan "app qui tourne toute seule"

C'est la vraie contrainte que tu as posée : **tu veux travailler peu**. Voici comment on y arrive.

### Onboarding automatique (zero-touch)

- À l'inscription, email de bienvenue avec lien vidéo de 2 minutes (tu l'enregistres une fois, c'est fini).
- Wizard in-app en 4 étapes : (1) ajouter ton SIRET, (2) choisir ton métier, (3) envoyer ton premier devis d'exemple à toi-même, (4) connecter Stripe pour les acomptes. C'est tout. Pas de configuration TVA avancée, pas de paramétrage comptable, pas de customization template.
- Après 48h sans premier devis créé : email automatique "Besoin d'aide pour votre premier devis ?" avec lien vers un Loom pré-enregistré.
- Après 7 jours sans activité : email "Une question nous pose problème ? Répondez à ce mail". C'est un trigger qui te force à répondre mais pas avant.

### Support passif

- **Centre d'aide autonome** : 15-20 articles clés, pas 100. Le top 20 des questions couvrent 80% des tickets (Pareto). Investis une semaine à les écrire bien. Rédige-les toi, pas un prestataire.
- **Chatbot GPT sur le helpdesk** avec accès aux articles : répond 80% des questions sans humain. Outils : Crisp IA, Intercom Fin, ou un webhook Claude API sur ton stack existant. Coût : 0,01 à 0,10 € par conversation, contre 10 minutes de ton temps.
- **Tickets asynchrones uniquement** : pas de chat live. Email only. Tu réponds 2 fois par jour (matin + fin d'après-midi), créneaux fixes. Ça te protège le flow.
- **Statut system page** automatique (Upptime sur GitHub Pages, gratuit) : si Supabase tombe, le client voit "problème connu, en cours" sans t'écrire.

### Facturation automatique côté toi (collecte SaaS)

- Stripe Billing sur le plan annuel, prélèvement CB ou SEPA. Pas de facturation manuelle, pas de relances à faire côté toi.
- Dunning auto Stripe (3 tentatives, puis suspension compte). 0 intervention.
- Factures émises par Stripe, pas par toi. Expert-comptable reçoit tout par email chaque mois.

### Monitoring passif

- **Sentry** pour les erreurs JS/backend (déjà en place). Alertes seulement si > 10 erreurs en 1h (filtres à configurer).
- **Uptime** (BetterStack free ou Upptime) sur batigesti.fr + API Supabase.
- **Stripe Atlas** dashboard MRR : checke une fois par semaine, pas par jour.
- **Intercom/Crisp** : 1 notif par jour "résumé des tickets" plutôt que chaque ticket.

### Marketing automatique

- **SEO long-tail** sur "modèle devis [métier]" (plombier, peintre, électricien...). Génère 29 pages (une par métier) avec un modèle téléchargeable et un CTA "créer ce devis dans BatiGesti". C'est du taff 1x, ça ramène du trafic passif pendant 3 ans.
- **Template gallery publique** : une page par template, indexée Google. 308 pages. Ça prend 2 weeks-ends à bien structurer, ensuite ça trône sur la SERP.
- **Partenariats fédérations** (CAPEB, FFB, BTP CFA) : 1 email bien fait à chaque syndicat, tu obtiens 1 sur 5. Ça te met sur leur annuaire.
- **Pas de pub payante au début** : ROI incertain, friction, ne tourne pas "toute seule". Tu verras à 200 clients.

### Ce que tu t'interdis (sinon tu retombes dans le piège)

- Pas de nouvelle feature pendant 6 mois — seulement polish et bug fix.
- Pas de roadmap publique (sinon les utilisateurs te demandent des features).
- Pas de "plan entreprise sur mesure" (trou noir à temps).
- Pas de webinaire récurrent.
- Pas de démo live 1:1 (tu enregistres une démo, tu envoies un lien).

---

## 8. Feuille de route 30-60-90 jours

### 30 premiers jours — Couper et positionner

- Supprimer ou cacher les 9 modules "à couper" listés plus haut. Archiver tables, commenter routes, retirer du menu. Tester que le build passe.
- Refondre le menu principal en 5 items (Dashboard, Devis, Factures, Clients, Paramètres) pour le plan Solo.
- Refondre la landing avec les 6 sections du §6. Headline, 3 promesses, démo gif, personas, pricing, FAQ.
- Refondre la page pricing avec 3 plans (19 / 34 / 59 €), TTC, annuel mis en avant, free tier transformé en essai 14j.
- Mettre en place Stripe Billing pour collecter automatiquement + dunning.
- Écrire 20 articles d'aide sur le centre support.

### 60 jours — Polir le cœur

- Wizard devis 3 écrans (métier → template → édition) pour que le premier devis tienne en 3 minutes montre en main.
- UX acompte + flow "envoyer pour signature + paiement" en 1 bouton.
- Dashboard "Ma journée" sur l'écran d'accueil.
- 29 pages SEO "modèle devis [métier]" avec fichier à télécharger.
- Chatbot Claude sur le centre d'aide.
- Vidéo d'onboarding 2 minutes enregistrée.

### 90 jours — Générer du volume

- Campagne parrainage (1 mois offert) + page dédiée.
- Prise de contact des 5 principales fédérations BTP (CAPEB en priorité).
- Template gallery publique indexable Google.
- 3 études de cas clients (vidéo courte, 2 minutes chacune).
- Mise en place Sentry alerting + uptime + status page publique.
- Objectif qualitatif : support < 30 min/jour. Si tu dépasses, reviens au plan et trouve le point qui fuit.

---

## 9. Risques et angles morts

**Risque 1 — Couper fait peur.** Tu vas te dire "si un client aime le planning Gantt, je ne veux pas le perdre". Souviens-toi : un client qui a acheté pour le Gantt n'est pas ton client cible. Il est sur Obat dans 6 mois parce que tu ne développes pas le Gantt. Tu perds peu de vrai CA et tu gagnes de la clarté.

**Risque 2 — Le marché regarde les features, pas la promesse.** Sur les comparateurs SEO, les lecteurs cochent des cases. Si tu retires le planning, tu perds des cases. Parade : sur la landing, garde un tableau "Fonctionnalités détaillées" qui liste tout, mais ne le mets pas au centre du pitch. Le pitch reste la promesse. Les cases sont la preuve.

**Risque 3 — Tolteck a 28 000 clients et 10 ans d'avance.** Tu n'essaies pas de le tuer. Tu prends 1-2% du marché sur un angle différent (cash-flow / acompte). 2 000 clients × 19 € × 12 mois = 456 k€ ARR. Largement suffisant pour une équipe d'une personne.

**Risque 4 — Factur-X et e-invoicing 2026/2027.** Contrainte réglementaire, obligation de conformité. À prendre au sérieux comme argument de vente : "BatiGesti est prêt pour Factur-X, votre Excel ne l'est pas". À mettre dans la FAQ landing.

**Risque 5 — Tu manques de témoignages.** Le secteur achète sur la preuve (avis Google, bouche à oreille). Dès 20 clients, investis 1 semaine à récolter 10 vrais témoignages filmés au téléphone. Sans ça, la landing ne convertit pas.

---

## 10. Questions ouvertes pour toi

Trois décisions que je ne peux pas prendre à ta place et qui vont peser.

1. **Est-ce que tu gardes "BatiGesti" comme nom ?** Le nom est correct mais un peu générique. Un nom plus centré sur la promesse (type "Devize", "Acompto", "Paydi") pourrait rendre le pitch plus net. Pas urgent mais à penser.
2. **Tu veux rester seul ou embaucher 1 personne support dans 6 mois ?** Ça change le plan "app qui tourne seule" — si tu embauches, tu peux être moins radical sur les coupes.
3. **Plan annuel avec paiement en 1 fois (12 mois d'un coup, ~230 €) ou mensuel prélevé ?** L'annuel en 1 fois améliore ton cash-flow mais augmente le frottement de vente. Les artisans préfèrent souvent le mensuel. À arbitrer selon ton besoin de trésorerie perso.

---

## Annexes

### Liste des modules à couper (rappel)

Geofencing GPS · Form builder custom · Contrats BTP modèles · Carnet d'entretien 10 ans · Chat équipe temps réel · Site vitrine client · Commandes fournisseurs (sauf plan Équipe) · Avis Google sync · Pipeline Kanban

### Liste des intégrations à garder vs couper

Garder : Stripe (paiement et billing), Yousign (signature), SendGrid (email), Anthropic (IA devis), Supabase (DB + auth + storage).
Couper ou différer : Twilio SMS (plan Artisan+ seulement), GoCardless SEPA (plan Équipe seulement), Google Reviews (supprimer), Supabase Realtime (supprimer si on coupe le chat).

### Sources concurrentielles

- [ArtisanSmart — Comparatif 2026](https://artisansmart.fr/blog/comparatif-logiciel-artisan-2026/)
- [Independant.io — Top 11 logiciels devis-factures 2026](https://independant.io/logiciel-devis-facture-batiment/)
- [Tool-advisor — Avis Tolteck](https://tool-advisor.fr/logiciel-facturation/comparatif/tolteck/)
- [Outilios — Avis Tolteck](https://outilios.fr/avis-tolteck/)
- [Tool-advisor — Avis Obat](https://tool-advisor.fr/logiciel-facturation/comparatif/obat/)
- [Independant.io — Avis Obat](https://independant.io/avis/obat/)
- [Axonaut — Top 20 logiciels BTP](https://axonaut.com/blog/logiciel-btp/)
- [Payflo — Meilleurs logiciels artisan BTP](https://payflo.fr/blog/meilleurs-logiciels-gestion-artisan-btp-guide-complet/)
- [Qonto — Top 7 logiciels devis BTP](https://qonto.com/fr/blog/gestion-entreprise/btp-construction/logiciel-devis-facture-batiment)
- [Tolteck — Guide logiciels facturation 2026](https://www.tolteck.com/fr-fr/meilleurs-logiciels-de-facturation-pour-artisans-du-batiment-guide-pratique-2026/)
