/**
 * featuresContent — le contenu des pages de fonctionnalités : /fonctionnalites (cartes), /fonctionnalites/:slug (une
 * page par fonction) et /ressources (galerie). Les pages ne font que le mettre en forme.
 *
 * RÈGLE (refonte du site, tâche 7, 20 oct. 2026) : chaque affirmation se vérifie dans `src/` ; une fonction éteinte
 * (`src/lib/fonctions.js`) n'apparaît pas ; une limite vient de `PLANS` ; aucune fonction n'est dite réservée à un plan
 * (décision D-29 : seules des limites distinguent les plans). Les preuves sont en commentaire, au plus près du texte ;
 * le tableau complet (gardé, reformulé, retiré) est dans le rapport de la tâche 7.
 * Retirés à la relecture, faute de preuve ou parce que faux : la page de la saisie à la voix (FONCTIONS.ia éteint),
 * le format de facture électronique PDF et XML (aucun fichier validé, règle marketing), les situations de travaux
 * (FONCTIONS.facturesSituation éteint), les fonctions annoncées comme réservées au plan Équipe (rien n'est
 * verrouillé), le lien « valable 30 jours » (il vit jusqu'à la fin de validité du devis, migration 083), les
 * projections « à 30, 60 et 90 jours » (la projection porte sur six mois), les exports « compatibles » avec deux
 * logiciels de comptabilité nommés (les exports réels sont FEC, CSV et Excel), la bibliothèque de 600 ouvrages en
 * 11 lots (page `ouvrages` sans entrée dans le menu), « plus de 500 articles par métier » (523 articles en tout, pour
 * 15 métiers), les congés (enregistrés sur l'appareil seulement, `mallettico_conges`), les « statuts personnalisés »
 * et les « rappels automatiques » du planning (le rappel d'un rendez-vous est enregistré, rien ne le déclenche), le
 * nombre de « widgets » de l'accueil, le glisser-déposer annoncé en anglais, la comparaison avec un jeu de
 * construction de marque, les vidéos et guides « bientôt disponibles ».
 *
 * Captures : `public/site/*.webp`, produites par `scripts/site-captures.cjs` avec l'identité manifestement fictive
 * « Élec Exemple » (D-27) ; ordinateur 2880 × 1800, téléphone 1170 × 2532 (dimensions vérifiées par
 * `__tests__/featuresContent.test.js`).
 */

import { PLANS, PLAN_ORDER } from '../../stores/subscriptionStore';

const ORDI = { largeur: 2880, hauteur: 1800 };
const TEL = { largeur: 1170, hauteur: 2532, telephone: true };

/** Les captures de l'application, une par vue (textes de remplacement : ce que la capture montre). */
export const CAPTURES = {
  accueil: { src: '/site/ordi-accueil.webp', ...ORDI, alt: "L'accueil de Mallettico sur ordinateur : le montant à encaisser, les devis à relancer et le brouillon à finir." },
  devis: { src: '/site/ordi-devis-lots.webp', ...ORDI, alt: 'L\'éditeur de devis : le lot « Mise aux normes du tableau électrique », ses lignes chiffrées et le total TTC.' },
  facture: { src: '/site/ordi-facture.webp', ...ORDI, alt: 'Une facture de solde payée en partie : le montant reçu, le reste dû, et le document avec ses totaux.' },
  signature: { src: '/site/signature.webp', ...ORDI, alt: 'La page de signature que reçoit le client : le devis complet et le bouton « Signer ce devis ».' },
  relances: { src: '/site/ordi-relances.webp', ...ORDI, alt: 'Les réglages des relances : le scénario des devis à J+7, J+15 et J+30, et l\'envoi automatique en option.' },
  chantier: { src: '/site/ordi-chantier.webp', ...ORDI, alt: "Un chantier : l'itinéraire, l'appel au client, les messages « en route », « arrivé », « fini » et le pointage des heures." },
  catalogue: { src: '/site/ordi-catalogue.webp', ...ORDI, alt: 'Le catalogue : les articles favoris avec leur prix, la marge moyenne et les articles en stock bas.' },
  clients: { src: '/site/ordi-clients.webp', ...ORDI, alt: 'La liste des clients : ce qui est encaissé, en cours, et les devis à relancer.' },
  planning: { src: '/site/ordi-planning.webp', ...ORDI, alt: 'Le planning du mois : les chantiers jour par jour, avec les vues mois, semaine, jour et agenda.' },
  equipe: { src: '/site/ordi-equipe.webp', ...ORDI, alt: "La page Équipe : les heures pointées de la semaine, les pointages à valider et le coût de chaque personne." },
  tresorerie: { src: '/site/ordi-tresorerie.webp', ...ORDI, alt: "Les finances : le solde du jour, le seuil d'alerte et les factures à encaisser." },
  telAccueil: { src: '/site/tel-accueil.webp', ...TEL, alt: "L'accueil de Mallettico sur téléphone : le montant à encaisser, les devis à relancer et le brouillon à finaliser." },
};

/**
 * Les collaborateurs que chaque plan permet d'inviter, lus dans `PLANS` (`limits.equipe`, qui ne compte pas le
 * titulaire : subscriptionStore.js:24-28), regroupés quand plusieurs plans ont la même limite :
 * « vous + 1 collaborateur avec les plans Gratuit et Artisan, vous + 10 collaborateurs avec le plan Équipe ».
 */
export function collaborateursParPlan(plans = PLANS, ordre = PLAN_ORDER) {
  const groupes = [];
  for (const id of ordre) {
    const plan = plans[id];
    const n = plan?.limits?.equipe;
    if (!Number.isFinite(n) || n < 0) continue;
    const groupe = groupes.find((g) => g.n === n);
    if (groupe) groupe.noms.push(plan.name);
    else groupes.push({ n, noms: [plan.name] });
  }
  return groupes
    .map(({ n, noms }) => {
      const qui = noms.length > 1 ? `les plans ${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}` : `le plan ${noms[0]}`;
      return `vous + ${n} collaborateur${n > 1 ? 's' : ''} avec ${qui}`;
    })
    .join(', ');
}

export const FEATURES_CONTENT = {
  // Éditeur : src/components/DevisComposer.jsx ; documents : src/components/DevisPage.jsx ; PDF : src/lib/devisHtmlBuilder.js
  'devis-factures': {
    slug: 'devis-factures',
    label: 'Devis et factures',
    badge: 'Cœur de métier',
    title: 'Le devis se monte par lots, la facture suit sans ressaisie',
    // Bibliothèque des 17 métiers (trade-library.js), lots et sous-totaux (DevisComposer.jsx:429, 789), métré (:1271),
    // TVA par ligne (:1189-1190), aperçu « Ce que votre client recevra » (:1509), lien de signature dans l'e-mail
    // (emailSender.js:106-114), factures d'acompte et de solde tirées du devis (DevisPage.jsx:1396, 1515-1518)
    tagline:
      "Un éditeur plein écran : les lots types des 17 métiers, des lots avec sous-totaux, le métré, la TVA par ligne. L'aperçu montre le document que recevra votre client ; il signe en ligne, et le devis devient une facture sans rien ressaisir.",
    capture: CAPTURES.devis,
    metaDescription:
      "Devis et factures pour artisans du bâtiment : lots avec sous-totaux, métré, TVA par ligne, aperçu du document avant envoi, signature en ligne, factures d'acompte et de solde tirées du devis.",
    steps: [
      // Bibliothèque : DevisComposer.jsx:1322-1460 et « Parcourir les 17 métiers chiffrés » (:1649) ; modèles perso
      // « Vos modèles » (:1378) ; favoris et récents (:279-293)
      { title: "Partez d'un lot ou d'un modèle", text: "Les lots types des 17 métiers de la bibliothèque, vos propres modèles, ou une page blanche. Vos articles favoris et récents sont proposés en premier." },
      // Unités (:35, 12 unités), lots (:429, 789), métré (:1271), TVA pour tout le devis (:824-826) ou par ligne (:1189-1190)
      { title: 'Composez vos lignes', text: "Recherche dans votre catalogue, lots repliables avec sous-totaux, métré (longueur × largeur × hauteur, chutes en %), 12 unités, TVA par ligne ou pour tout le devis (20, 10, 5,5 ou 0 %)." },
      // Aperçu avant création (:1509) ; mentions imprimées : rétractation (devisHtmlBuilder.js:425), décennale (:449),
      // pénalités (:454, 714)
      { title: "Vérifiez l'aperçu", text: "Avant de créer le devis, l'aperçu montre le document que recevra votre client. Les mentions de votre profil s'y ajoutent : assurance décennale, droit de rétractation, pénalités de retard." },
      // PDF joint (DevisPage.jsx:2380-2400, emailSender.js:63-79), bouton de signature (emailSender.js:106-114),
      // acompte et solde (DevisPage.jsx:1396, 1515)
      { title: 'Envoyez et faites signer', text: "Le devis part par e-mail avec son PDF et un lien pour le signer en ligne. Signé, il devient une facture d'acompte ou de solde, sans ressaisie." },
    ],
    groups: [
      {
        name: 'Création',
        items: [
          'Éditeur plein écran, total et marge calculés pendant la saisie', // DevisComposer.jsx:233-249, 924-926
          'Lots repliables avec sous-total par lot', // :429, 789
          'Métré : longueur × largeur (× hauteur), chutes en %', // :1271, src/lib/metre.js
          "Prix d'achat et marge par ligne", // :1257, 1521
          'Acompte en %, conditions de règlement, adresse du chantier', // :854, 860, 740
          "Brouillon gardé sur l'appareil : vous reprenez où vous en étiez", // :32, 199, 224 (localStorage)
        ],
      },
      {
        name: 'Documents',
        items: [
          "Factures d'acompte et de solde tirées du devis, avoirs", // DevisPage.jsx:1396, 1515, 1598
          'Numéro de chaque facture attribué par la base de données', // migration 101_numero_de_facture_attribue_par_la_base.sql
          "Duplication d'un devis ou d'une facture", // DevisPage.jsx:919-920, 2930
          'Mentions tirées de votre profil : assurance décennale, rétractation, pénalités de retard', // devisHtmlBuilder.js:425, 449, 454
          'Statut de chaque document : envoyé, signé, payé…', // src/lib/statuts.js:19, 32
        ],
      },
    ],
    faq: [
      // 17 métiers (trade-library.js) ; « 1 000+ » compté dans FaitsSection.jsx:5-12 ; modèles (DevisComposer.jsx:794)
      { q: "Est-ce que je pars d'une page blanche ?", a: "Non. La bibliothèque des 17 métiers propose des lots types déjà chiffrés, et le catalogue réunit plus de 1 000 prestations et ouvrages chiffrés. Vous pouvez aussi enregistrer vos propres modèles." },
      // Mentions (devisHtmlBuilder.js:425, 449, 454, 714) ; envoi bloqué si le profil est incomplet (DevisComposer.jsx:707,
      // validation à l'envoi DevisPage.jsx:2161)
      { q: 'Les mentions légales sont-elles gérées ?', a: "Elles s'ajoutent à partir de votre profil : assurance décennale, droit de rétractation, pénalités de retard et conditions de règlement. Tant que votre profil est incomplet, l'envoi est bloqué et l'application vous dit ce qui manque." },
      // Acompte et solde (DevisPage.jsx:1396, 1515) ; situations de travaux éteintes (FONCTIONS.facturesSituation)
      { q: 'Puis-je facturer en plusieurs fois ?', a: "Oui : une facture d'acompte, puis la facture de solde, toutes deux tirées du devis." },
    ],
    related: ['signature-electronique', 'relances', 'catalogue'],
  },

  // Page publique : src/components/signature/DevisSignaturePage.jsx ; règles en base : migration 083
  'signature-electronique': {
    slug: 'signature-electronique',
    label: 'Signature en ligne',
    badge: 'Sans compte pour votre client',
    title: 'Vos devis signés en ligne, sans courir après',
    // Lien propre au devis (083:87, gen_random_uuid) ; tracé au doigt ou à la souris (DevisSignaturePage.jsx:2,
    // react-signature-canvas) ; page testée à 390 px (scripts/parcours/documents.cjs:123) ; statut « signe » (083:261)
    tagline:
      "Votre client reçoit un lien, lit le devis sur son téléphone ou son ordinateur et signe du doigt ou à la souris. Pas de compte à créer, pas d'impression. Le devis passe « Signé » dans votre application.",
    capture: CAPTURES.signature,
    metaDescription:
      "Signature en ligne des devis pour artisans du bâtiment : un lien propre à chaque devis, signature au doigt sur téléphone, nom du signataire, date et heure enregistrés. Votre client signe sans créer de compte.",
    steps: [
      // emailSender.js:106-114 ; durée du lien : 083:31, 82-85 et DevisPage.jsx:2127-2131
      { title: 'Envoyez votre devis', text: "L'e-mail contient le PDF et un bouton « Consulter et signer le devis en ligne ». Le lien est propre à ce devis et reste valable jusqu'à la fin de validité du devis." },
      { title: 'Votre client lit et signe', text: "Il lit le devis complet dans son navigateur, sur téléphone ou ordinateur, et signe du doigt ou à la souris. Aucun compte à créer." },
      // Nom, date, heure (083:254-259) ; exemplaire envoyé par e-mail et téléchargeable (DevisSignaturePage.jsx:153, 330-356)
      { title: 'Vous êtes fixé', text: "Le devis passe en « Signé » dans votre application, avec le nom du signataire, la date et l'heure. Votre client télécharge son exemplaire signé, qui lui est aussi envoyé par e-mail." },
    ],
    groups: [
      {
        name: 'Traçabilité',
        items: [
          "Un lien propre à chaque devis, valable jusqu'à la fin de validité du devis", // 083:31, 82-85
          'Nom du signataire, date et heure enregistrés', // 083:254-259
          'Un devis signé ne peut pas être signé une seconde fois', // 083:245
          'Un devis expiré ne se signe plus en ligne', // 083:29-30, 78, 127
        ],
      },
      {
        name: 'Pour votre client',
        items: [
          'Sur téléphone comme sur ordinateur', // documents.cjs:123 (390 px)
          'Aucune application à installer, aucun compte à créer',
          'Le devis complet est lisible avant de signer',
          'Son exemplaire signé, à télécharger et reçu par e-mail', // DevisSignaturePage.jsx:153, 330-356
        ],
      },
    ],
    faq: [
      { q: 'Mon client doit-il créer un compte ?', a: "Non. Il ouvre le lien reçu par e-mail et signe directement." },
      // 083:31, 78 (« Devis expire : prolongez sa validite ») ; « Prolonger la validité » (DevisPage.jsx:2161, 2909)
      { q: 'Combien de temps le lien reste-t-il valable ?', a: "Jusqu'à la fin de validité du devis. Un devis expiré ne se signe plus en ligne : prolongez sa validité, puis renvoyez-le." },
      { q: 'Que se passe-t-il après la signature ?', a: "Le devis passe en « Signé » dans votre application, avec le nom du signataire, la date et l'heure. Vous pouvez alors en tirer une facture d'acompte ou de solde." },
    ],
    related: ['devis-factures', 'relances'],
  },

  // Scénarios : src/lib/scenariosRelance.js ; réglages : src/components/settings/RelanceConfigTab.jsx
  relances: {
    slug: 'relances',
    label: 'Relances',
    badge: 'Devis sans réponse, factures impayées',
    title: 'Ne laissez plus un devis ou une facture sans réponse',
    // Deux scénarios (scenariosRelance.js:12, 65) ; « Tout envoyer » (Dashboard.jsx:506-517) ; envoi quotidien en option
    // (RelanceConfigTab.jsx:900-925)
    tagline:
      "Deux scénarios de relance par e-mail, l'un pour les devis sans réponse, l'autre pour les factures impayées, avec des messages que vous modifiez. Vous envoyez les relances dues en un clic depuis l'accueil, ou vous les laissez partir seules chaque jour.",
    capture: CAPTURES.relances,
    metaDescription:
      'Relances de devis et de factures pour artisans du bâtiment : devis à J+7, J+15 et J+30, factures impayées en quatre étapes, messages modifiables, envoi en un clic ou automatique.',
    steps: [
      // Délais (scenariosRelance.js:16-126), modifiables (RelanceConfigTab.jsx:259-261), étapes ajoutées (:440-448, 515)
      { title: 'Activez vos scénarios', text: "Les relances des devis (J+7, J+15 et J+30 après l'envoi) et des factures impayées (J+3, J+15, J+30 et J+45 après l'échéance) sont prêtes. Vous changez les délais, ajoutez ou retirez des étapes." },
      // Variables (RelanceConfigTab.jsx:52-64), aperçu avec des données d'exemple (:342-371, 534)
      { title: 'Modifiez vos messages', text: "Chaque étape a son modèle de message, avec des variables : nom du client, montant, numéro du document, échéance. Un aperçu montre le message avec des données d'exemple." },
      { title: 'Relancez sans y penser', text: "Les relances dues apparaissent sur votre accueil : « Tout envoyer », et c'est parti. Ou activez l'envoi automatique : elles partent seules chaque jour." },
    ],
    groups: [
      {
        name: 'Scénarios',
        items: [
          'Devis : trois étapes (J+7, J+15, J+30), modifiables', // scenariosRelance.js:16, 32, 50
          'Factures impayées : quatre étapes, de J+3 à J+45', // scenariosRelance.js:69, 87, 107, 124
          'Messages modifiables, avec variables', // RelanceConfigTab.jsx:52-64
          'Aperçu du message avant activation', // RelanceConfigTab.jsx:371, 534
        ],
      },
      {
        name: 'Contrôle',
        items: [
          "Envoi en un clic depuis l'accueil (« À faire aujourd'hui »)", // Dashboard.jsx:504-517
          'Envoi automatique chaque jour, en option', // RelanceConfigTab.jsx:900-925
          'Historique des relances de chaque document', // RelanceTimelineWidget.jsx:1-5, DevisPage.jsx:3210-3245
          "Un client ou un document exclu des relances (litige, arrangement)", // RelanceTimelineWidget.jsx:199-203
        ],
      },
    ],
    faq: [
      // Interrupteur général éteint au départ, envoi automatique à part (RelanceConfigTab.jsx:854-861, 900-925)
      { q: 'Les relances partent-elles toutes seules ?', a: "C'est vous qui choisissez. Une fois les relances activées, celles qui sont dues s'affichent sur votre accueil et partent en un clic ; l'envoi automatique est une option à part." },
      { q: 'Puis-je exclure un client des relances ?', a: "Oui : depuis un document, vous excluez ce document ou ce client, par exemple en cas de litige ou d'arrangement de paiement." },
      { q: 'Les messages sont-ils modifiables ?', a: "Chaque étape a son propre modèle, avec des variables (nom, montant, numéro…). Vous l'écrivez une fois, Mallettico le remplit à chaque envoi." },
    ],
    related: ['devis-factures', 'tresorerie'],
  },

  // Fiche chantier : src/components/Chantiers.jsx ; marge : src/lib/business/margin-calculator.js
  chantiers: {
    slug: 'chantiers',
    label: 'Suivi de chantier',
    badge: 'Sur le chantier',
    title: 'Chaque chantier suivi, du devis à la facture',
    // Onglets photos, documents, journal (Chantiers.jsx:1285-1295), tâches (:869), « sur place » (:728-793)
    tagline:
      "Avancement, marge, dépenses, photos, documents et tâches : tout est rattaché au chantier. Sur place, l'itinéraire, l'appel au client, un message prêt à envoyer et le pointage des heures sont à un geste.",
    capture: CAPTURES.chantier,
    metaDescription:
      'Suivi de chantier pour artisans du bâtiment : avancement, marge calculée avec les dépenses et les heures, photos, documents, tâches, itinéraire et pointage depuis le téléphone.',
    steps: [
      // margin-calculator.js:55-110 (devis signés, dépenses, heures au coût chargé)
      { title: 'Créez le chantier', text: "Client, adresse des travaux, dates, budget. Le chantier est lié à ses devis et factures : la marge se calcule avec les devis signés, les dépenses et les heures pointées." },
      { title: 'Suivez au quotidien', text: "Avancement, dépenses, photos, documents, tâches. Le journal du chantier garde la trace de ce qui change." },
      // Chantiers.jsx:728-793 : itinéraire, appel, messages copiés pour les SMS, « Pointer des heures »
      { title: 'Sur place', text: "L'itinéraire vers l'adresse, l'appel au client, un message « en route », « arrivé » ou « fini » copié pour vos SMS, et le pointage des heures, depuis la fiche du chantier." },
    ],
    groups: [
      {
        name: 'Pilotage',
        items: [
          'Marge calculée : devis signés, moins les dépenses et les heures au coût chargé', // margin-calculator.js:66-100
          'Avancement et budget consommé sur la même échelle', // Chantiers.jsx:1134-1139
          'Dépenses rattachées au chantier', // Chantiers.jsx:1179-1188
          'Tâches à cocher, à partir de listes types', // Chantiers.jsx:869-1021
        ],
      },
      {
        name: 'Terrain',
        items: [
          "Itinéraire vers l'adresse du chantier", // Chantiers.jsx:755
          'Message au client copié pour vos SMS : en route, arrivé, fini', // Chantiers.jsx:732-790
          'Photos de chantier', // Chantiers.jsx:1285
          'Documents et pièces jointes', // Chantiers.jsx:1289
          'Météo du chantier', // Chantiers.jsx:796-811
        ],
      },
    ],
    faq: [
      { q: 'La marge est-elle calculée automatiquement ?', a: "Oui : les devis signés liés au chantier, les dépenses saisies et les heures pointées, au coût chargé de chaque personne, donnent la marge." },
      // Application installable (vite.config.js:29, display standalone) ; aucune promesse hors ligne
      { q: 'Ça fonctionne sur le chantier, sans réseau ?', a: "Mallettico s'installe sur votre téléphone depuis le navigateur. Il a besoin d'une connexion internet : le fonctionnement sans réseau n'est pas garanti." },
    ],
    related: ['devis-factures', 'equipe'],
  },

  // Catalogue : src/components/Catalogue.jsx ; référentiel : src/lib/data/index.js (523 articles, 15 métiers, compté le
  // 20 oct. 2026) ; bibliothèque des métiers : src/lib/templates/trade-library.js (17 métiers, 97 lots types)
  catalogue: {
    slug: 'catalogue',
    label: 'Catalogue',
    badge: 'Déjà chiffré',
    title: 'Plus de 1 000 prestations et ouvrages, déjà chiffrés', // compté dans FaitsSection.jsx:5-12
    tagline:
      "La bibliothèque des 17 métiers propose des lots types chiffrés à insérer dans un devis, et le Référentiel BTP ajoute à votre catalogue plus de 500 articles chiffrés, métier par métier. Vous ajustez les prix : ce sont les vôtres.",
    capture: CAPTURES.catalogue,
    metaDescription:
      "Catalogue pour artisans du bâtiment : plus de 1 000 prestations et ouvrages chiffrés, lots types de 17 métiers, import par métier, prix d'achat et marge, import de vos tarifs fournisseurs en CSV ou Excel.",
    steps: [
      // « Importer le Référentiel BTP » (Catalogue.jsx:1364, 1407) ; 15 métiers (src/lib/data/index.js)
      { title: 'Importez votre métier', text: "Dans le catalogue, « Importer le Référentiel BTP » : choisissez vos métiers parmi 15 (plomberie, électricité, maçonnerie, peinture, menuiserie…), les articles arrivent chiffrés." },
      // Prix d'achat et favori dans la fiche article (Catalogue.jsx:130)
      { title: 'Ajustez vos prix', text: "Prix de vente, prix d'achat pour suivre la marge, articles favoris." },
      // Favoris et récents proposés dans l'éditeur (DevisComposer.jsx:279-293)
      { title: 'Composez vos devis', text: "Dans l'éditeur de devis, la recherche retrouve vos articles ; vos favoris et vos articles récents sont proposés en premier." },
    ],
    groups: [
      {
        name: 'Contenu inclus',
        items: [
          'Les lots types de 17 métiers, avec leurs prix moyens', // trade-library.js
          'Le Référentiel BTP : plus de 500 articles chiffrés, en 15 métiers', // src/lib/data/index.js
          'Prix indicatifs et modifiables : vos tarifs restent les vôtres',
        ],
      },
      {
        name: 'Votre catalogue',
        items: [
          "Vos articles, avec prix d'achat et marge", // Catalogue.jsx:130
          'Favoris et articles récents', // DevisComposer.jsx:279-293
          'Import de vos tarifs fournisseurs (CSV ou Excel)', // Catalogue.jsx:1469, 1504
          'Stock, avec alerte de stock bas', // Catalogue.jsx:128-168
        ],
      },
    ],
    faq: [
      { q: 'Les prix du catalogue sont-ils fiables ?', a: "Ce sont des prix indicatifs moyens du marché, pensés comme point de départ. Vous les ajustez à votre réalité : vos prix restent prioritaires." },
      { q: 'Puis-je importer mes propres tarifs ?', a: "Oui, par fichier CSV ou Excel (l'export de votre fournisseur ou de votre ancien logiciel), ou article par article." },
    ],
    related: ['devis-factures', 'chantiers'],
  },

  // Trésorerie : src/components/tresorerie/TresorerieModule.jsx ; export : src/components/export/ExportComptable.jsx
  tresorerie: {
    slug: 'tresorerie',
    label: 'Trésorerie',
    badge: 'Finances',
    title: 'Sachez où vous en êtes, et où vous allez',
    // Projection sur six mois (TresorerieModule.jsx:1375-1437) ; formats d'export (ExportComptable.jsx:285-289)
    tagline:
      "Le solde, ce qu'il reste à encaisser et une projection sur six mois, à partir de vos factures, de vos devis signés et des charges que vous prévoyez. L'export comptable part chez votre comptable.",
    capture: CAPTURES.tresorerie,
    metaDescription:
      'Trésorerie pour artisans du bâtiment : solde, factures à encaisser, projection sur six mois, charges récurrentes, export comptable FEC, CSV ou Excel.',
    steps: [
      // Factures et dépenses reprises (TresorerieModule.jsx:1370-1373)
      { title: 'Vos flux se construisent seuls', text: 'Factures, paiements reçus et dépenses alimentent la trésorerie.' },
      // Factures ouvertes à leur échéance, devis signés, prévisions (TresorerieModule.jsx:1224, 1375-1439) ; solde négatif signalé (:1664)
      { title: 'Anticipez les creux', text: "La projection sur six mois tient compte des factures ouvertes à leur échéance, des devis signés et de vos prévisions ; un solde qui passerait sous zéro est signalé." },
      { title: 'Transmettez à votre comptable', text: 'Export comptable au format FEC, CSV ou Excel, par période et par journal.' }, // ExportComptable.jsx:274-296
    ],
    groups: [
      {
        name: 'Pilotage',
        items: [
          'Solde et factures à encaisser',
          'Projection du solde sur six mois', // TresorerieModule.jsx:1375
          'Charges récurrentes (loyer, assurances, véhicule…)', // TresorerieModule.jsx:117-128, 998
          "Alerte sous un seuil de solde que vous choisissez", // TresorerieModule.jsx:1437-1439
        ],
      },
      {
        name: 'Comptabilité',
        items: [
          'Export FEC pour votre expert-comptable', // ExportComptable.jsx:189, 287
          'Export CSV ou Excel', // ExportComptable.jsx:285-289
          'Résumé de la TVA facturée et déductible', // src/lib/integrations/accounting.js:1-6
        ],
      },
    ],
    faq: [
      { q: 'Dois-je saisir mes flux à la main ?', a: "Non pour l'essentiel : factures, paiements et dépenses alimentent la trésorerie. Vous ajoutez les charges que vous prévoyez (loyer, assurances…)." },
      { q: 'Mon comptable peut-il récupérer les données ?', a: "Oui : export au format FEC (le fichier des écritures comptables), CSV ou Excel." },
    ],
    related: ['relances', 'devis-factures'],
  },

  // Équipe : src/components/Equipe.jsx ; rôles : src/lib/permissions.js ; limites : PLANS (D-29)
  equipe: {
    slug: 'equipe',
    label: 'Équipe et pointage',
    badge: 'Équipe',
    title: 'Votre équipe organisée, vos heures comptées',
    tagline: `Invitez vos collaborateurs : ${collaborateursParPlan()}, chacun avec son rôle. Pointage des heures, planning de la semaine et sous-traitants.`,
    capture: CAPTURES.equipe,
    metaDescription:
      'Équipe et pointage pour artisans du bâtiment : collaborateurs invités avec leur rôle, pointage des heures, planning de la semaine, coût des heures dans la marge des chantiers, sous-traitants.',
    steps: [
      // permissions.js:24-33 : un ouvrier n'a ni les devis ni les finances
      { title: 'Invitez votre équipe', text: "Chaque collaborateur a son compte et son rôle : un ouvrier voit ses chantiers et son pointage, pas vos devis ni vos finances." },
      { title: 'Planifiez la semaine', text: 'Le planning de la semaine, chantier par chantier, et les rendez-vous du calendrier.' }, // Equipe.jsx:3991-4010
      // Pointage (Equipe.jsx:1641), validation (:342, 1643), coût de la semaine (:370-371), depuis la fiche chantier (Chantiers.jsx:793)
      { title: 'Suivez les heures', text: 'Pointage depuis le téléphone, y compris depuis la fiche du chantier, validation des heures et coût de la semaine.' },
    ],
    groups: [
      {
        name: 'Organisation',
        items: [
          'Un rôle par collaborateur : chacun voit ce qui le concerne', // permissions.js:23-50
          'Planning de la semaine par chantier', // Equipe.jsx:3991-4010
          'Fiches des sous-traitants', // Equipe.jsx:1636
        ],
      },
      {
        name: 'Heures et coûts',
        items: [
          'Pointage des heures depuis le téléphone',
          'Validation des heures pointées', // Equipe.jsx:342, 1643
          'Taux facturé et coût chargé par personne', // Equipe.jsx:113, 568
          'Heures comptées dans la marge des chantiers', // margin-calculator.js:94-97
        ],
      },
    ],
    faq: [
      { q: 'Combien de collaborateurs puis-je inviter ?', a: `${capitale(collaborateursParPlan())}. La limite ne compte pas le titulaire du compte.` },
      { q: 'Mes salariés voient-ils tout ?', a: "Non : chaque rôle ouvre une partie de l'application. Un ouvrier voit ses chantiers et son pointage, pas vos devis ni vos finances." },
      { q: 'Le pointage fonctionne-t-il sur téléphone ?', a: 'Oui : on pointe depuis le téléphone, y compris directement depuis la fiche du chantier.' },
    ],
    related: ['chantiers', 'tresorerie'],
  },
};

function capitale(texte) {
  return texte ? texte[0].toUpperCase() + texte.slice(1) : texte;
}

export const FEATURE_SLUGS = Object.keys(FEATURES_CONTENT);

/** Les catégories de la page /fonctionnalites. */
export const CATEGORIES_FONCTIONNALITES = [
  { id: 'tout', libelle: 'Tout' },
  { id: 'devis', libelle: 'Devis et factures' },
  { id: 'chantiers', libelle: 'Chantiers' },
  { id: 'gestion', libelle: 'Gestion' },
  { id: 'finances', libelle: 'Finances' },
  { id: 'technique', libelle: 'Technique' },
];

/**
 * Les cartes de /fonctionnalites. `slug` : la carte mène à sa page de détail ; sans `slug`, elle se lit seule.
 * Retirée : la carte « Catalogue de prestations » (doublon de « Catalogue », « comme un jeu de LEGO »).
 */
export const CARTES_FONCTIONNALITES = [
  {
    categorie: 'devis', icone: 'devis', slug: 'devis-factures', titre: 'Devis et factures', capture: CAPTURES.devis,
    description: "Montez un devis par lots, depuis la bibliothèque ou votre catalogue. La TVA se calcule ligne par ligne, et l'aperçu montre le document que recevra votre client.",
    points: ['Lots avec sous-totaux', 'TVA par ligne ou pour tout le devis', "Aperçu du document avant l'envoi", "Factures d'acompte et de solde tirées du devis"],
  },
  {
    categorie: 'devis', icone: 'catalogue', slug: 'catalogue', titre: 'Catalogue et bibliothèque', capture: CAPTURES.catalogue,
    description: "Les lots types de 17 métiers et le Référentiel BTP, déjà chiffrés : vous composez vos devis sans partir d'une page blanche.",
    points: ['Plus de 1 000 prestations et ouvrages chiffrés', 'Import par métier', "Prix d'achat et marge", 'Import de vos tarifs (CSV ou Excel)'],
  },
  {
    categorie: 'devis', icone: 'signature', slug: 'signature-electronique', titre: 'Signature en ligne', capture: CAPTURES.signature,
    description: "Votre client signe le devis en ligne, depuis le lien reçu par e-mail, sans créer de compte.",
    points: ['Signature au doigt sur téléphone', "Lien valable jusqu'à la fin de validité du devis", 'Nom, date et heure enregistrés', "Statut « Signé » dans l'application"],
  },
  {
    categorie: 'chantiers', icone: 'chantier', slug: 'chantiers', titre: 'Suivi de chantier', capture: CAPTURES.chantier,
    description: 'Avancement, marge, dépenses, photos, documents et tâches, rattachés au chantier.',
    points: ['Marge calculée', 'Journal du chantier', 'Tâches à cocher', 'Itinéraire et pointage sur place'],
  },
  {
    // Vues (TasksAndPlanning.jsx:18-24, Planning.jsx:70, 453-465) ; déplacement à la souris (Planning.jsx:660, 762)
    categorie: 'chantiers', icone: 'planning', titre: 'Planning', capture: CAPTURES.planning,
    description: 'Vos chantiers et rendez-vous dans un calendrier, au mois, à la semaine ou au jour, et une vue par équipe.',
    points: ['Mois, semaine, jour', 'Vue par équipe', 'Rendez-vous déplacés à la souris', 'Tâches en liste ou en colonnes'],
  },
  {
    // Historique (Clients.jsx:899), échanges (:1030), doublons (:1560) et fusion (:372), import CSV (App.jsx:2408-2425)
    categorie: 'gestion', icone: 'clients', titre: 'Clients', capture: CAPTURES.clients,
    description: "Vos clients, l'historique de leurs devis et chantiers, et les doublons repérés.",
    points: ['Fiche client', 'Historique et échanges', 'Doublons repérés et fusionnés', 'Import de vos clients (CSV)'],
  },
  {
    categorie: 'gestion', icone: 'equipe', slug: 'equipe', titre: 'Équipe et sous-traitants', capture: CAPTURES.equipe,
    description: 'Vos collaborateurs avec leur rôle, le pointage des heures, les sous-traitants et le coût des heures.',
    points: ['Un rôle par collaborateur', 'Pointage des heures', 'Planning de la semaine', 'Sous-traitants'],
  },
  {
    categorie: 'finances', icone: 'tresorerie', slug: 'tresorerie', titre: 'Trésorerie', capture: CAPTURES.tresorerie,
    description: "Le solde, ce qu'il reste à encaisser et une projection sur six mois.",
    points: ['Projection sur six mois', 'Factures à encaisser', 'Charges récurrentes', 'Export comptable FEC, CSV ou Excel'],
  },
  {
    categorie: 'finances', icone: 'relances', slug: 'relances', titre: 'Relances', capture: CAPTURES.relances,
    description: 'Relances par e-mail des devis sans réponse et des factures impayées, avec des messages que vous modifiez.',
    points: ['Messages modifiables', 'Délais réglables', 'Envoi en un clic ou automatique', 'Historique par document'],
  },
  {
    // Calendrier : docs/metier-btp.md § 8 ; raccordement à une Plateforme Agréée : décision D-03, feuille de route
    // (« E-reporting et transmission par une Plateforme Agréée »). Mallettico n'est pas une Plateforme Agréée.
    categorie: 'technique', icone: 'facture', titre: 'Facture électronique', capture: CAPTURES.facture,
    description: "Aujourd'hui, Mallettico produit des factures PDF avec les mentions de votre profil. À partir du 1er septembre 2027, les TPE devront émettre leurs factures par une Plateforme Agréée : Mallettico prévoit de s'y raccorder, ce n'est pas encore fait.",
    points: ['Factures PDF avec les mentions de votre profil', 'Export comptable', "Raccordement à une Plateforme Agréée : prévu, pas encore fait"],
  },
  {
    // Application installable, ouverte en plein écran (vite.config.js:29, display standalone)
    categorie: 'technique', icone: 'telephone', titre: 'Sur téléphone', capture: CAPTURES.telAccueil,
    description: "Installez Mallettico sur votre téléphone depuis le navigateur : il s'ouvre en plein écran, comme une application.",
    points: ['Installation depuis le navigateur', 'Téléphone et ordinateur'],
  },
];

/** La galerie de /ressources : une vue de l'application par onglet. */
export const VUES_RESSOURCES = [
  { id: 'accueil', libelle: 'Accueil', icone: 'accueil', capture: CAPTURES.accueil, description: "À l'ouverture : ce qu'il reste à encaisser, les devis à relancer, les brouillons à finir." },
  { id: 'devis', libelle: 'Devis', icone: 'devis', capture: CAPTURES.devis, description: "L'éditeur de devis : lots, quantités, TVA par ligne, total calculé pendant la saisie." },
  { id: 'catalogue', libelle: 'Catalogue', icone: 'catalogue', capture: CAPTURES.catalogue, description: 'Le catalogue : vos articles et leurs prix, la marge moyenne et le stock.' },
  { id: 'chantier', libelle: 'Chantier', icone: 'chantier', capture: CAPTURES.chantier, description: "Un chantier : itinéraire, appel, message au client, pointage et tâches." },
  { id: 'planning', libelle: 'Planning', icone: 'planning', capture: CAPTURES.planning, description: 'Le planning : vos chantiers et rendez-vous, au mois, à la semaine ou au jour.' },
  { id: 'clients', libelle: 'Clients', icone: 'clients', capture: CAPTURES.clients, description: "Les clients : ce qui est encaissé, ce qui est en cours, les devis à relancer." },
  { id: 'tresorerie', libelle: 'Trésorerie', icone: 'tresorerie', capture: CAPTURES.tresorerie, description: "Les finances : le solde du jour, le seuil d'alerte, les factures à encaisser." },
  { id: 'relances', libelle: 'Relances', icone: 'relances', capture: CAPTURES.relances, description: "Les relances : les scénarios des devis et des factures, l'envoi automatique en option." },
];

/** Les étapes de /ressources, de l'inscription à l'encaissement. */
export const ETAPES_RESSOURCES = [
  // Formulaire d'inscription : nom de l'entreprise, e-mail, mot de passe (App.jsx:1345) ; plan Gratuit sans prix (PLANS)
  { titre: 'Créez votre compte', texte: "L'inscription demande le nom de votre entreprise, une adresse e-mail et un mot de passe. Pas de carte bancaire." },
  // Assistant des réglages : identité, informations légales, documents, relances, catalogue (Settings.jsx:65-70)
  { titre: 'Configurez votre espace', texte: "Complétez le profil de votre entreprise, dont les mentions s'impriment sur vos devis, et importez le catalogue de votre métier." },
  { titre: 'Créez votre premier devis', texte: "Partez d'un lot de la bibliothèque ou de votre catalogue, ajustez les quantités, vérifiez l'aperçu." },
  // Signature (083), facture tirée du devis (DevisPage.jsx:1396, 1515), paiements partiels (src/lib/paiementsFacture.js)
  { titre: 'Suivez et encaissez', texte: 'Signature en ligne, facture tirée du devis, relances, et chaque paiement noté, même partiel.' },
];

// La saisie à la voix n'a pas de page tant que FONCTIONS.ia est éteint (src/lib/fonctions.js) : son ancienne adresse
// renvoie à /fonctionnalites (FeatureDeepDivePage, adresse inconnue). Si la fonction est rallumée, sa page est à écrire
// et à faire relire avant d'être publiée.
