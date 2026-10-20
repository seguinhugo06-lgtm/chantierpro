/**
 * La FAQ du site public (`#faq`, section 9 de la spec de la refonte) — logique pure, sans React, testée dans
 * `__tests__/faq.test.js` ; l'affichage est dans `FAQSection.jsx`, le parcours `scripts/parcours/site.cjs` relit les
 * réponses affichées.
 *
 * Mêmes questions qu'avant la refonte, réponses relues le 20 oct. 2026 (tâche 7) : chaque affirmation gardée a sa preuve
 * en commentaire ; toute limite, tout prix et les mois offerts à l'année sont lus dans `PLANS` (décision D-29), les prix
 * par `prixAbonnement` avec la mention de franchise de TVA (D-19), jamais « HT ».
 * Retirés : le format de facture électronique PDF et XML (aucun fichier validé), « nous vous préviendrons bien avant
 * l'échéance » (promesse), « 2 chantiers actifs » (l'application compte tous les chantiers, `computeLiveUsage`), les
 * exports « compatibles » avec deux logiciels de comptabilité nommés (les exports réels sont FEC, CSV et Excel),
 * l'import JSON des données (seule l'identité de l'entreprise se reprend d'un export), « notre support peut vous
 * accompagner dans la migration » et « d'autres intégrations sont en cours de développement » (promesses), le
 * support prioritaire du plan Équipe (absent de `PLANS` : seule la limite d'équipe distingue Équipe), « résilier en
 * un clic » (la résiliation passe par la page de Stripe), les mots anglais (application web progressive, logiciel en
 * ligne « SaaS », « CRM », « templates »), le chiffrement « au repos et en transit » (sa seule source est la page
 * sécurité de Supabase, pas le code : tour de correction 1).
 */
import { PLANS as PLANS_APP } from '../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../stores/prixAbonnement';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS, delais } from './site/delaisRelance';

export const CATEGORIES_FAQ = [
  { id: 'tout', libelle: 'Tout' },
  { id: 'general', libelle: 'Général' },
  { id: 'features', libelle: 'Fonctionnalités' },
  { id: 'pricing', libelle: 'Tarifs' },
  { id: 'tech', libelle: 'Technique' },
];

/** Mois offerts par l'abonnement à l'année, par rapport à douze mois payés au mois (0 si le plan n'est pas vendu à l'année). */
export function moisOfferts(plan) {
  if (!(plan?.priceMonthly > 0) || !(plan?.priceYearly > 0)) return 0;
  return Math.round((plan.priceMonthly * 12 - plan.priceYearly) / plan.priceMonthly);
}

/** « 99 € par an pour Artisan et 199 € par an pour Équipe, soit 2 mois offerts » (mois offerts lus dans PLANS). */
function offreAnnuelle(plans) {
  const payants = ['artisan', 'equipe'].map((id) => plans[id]).filter((p) => p?.priceYearly > 0);
  const memesMois = new Set(payants.map(moisOfferts)).size === 1;
  const prix = payants.map((p) => `${prixAbonnement(p, 'an')} par an pour ${p.name}${memesMois ? '' : ` (${moisOfferts(p)} mois offerts)`}`);
  const liste = prix.length > 1 ? `${prix.slice(0, -1).join(', ')} et ${prix[prix.length - 1]}` : prix[0];
  return memesMois ? `${liste}, soit ${moisOfferts(payants[0])} mois offerts par rapport au prix mensuel` : liste;
}

/**
 * Les questions et réponses, dans l'ordre d'affichage. `plans` : `PLANS` de l'application (un jeu fictif dans les tests).
 * @returns {{ categorie: string, q: string, a: string }[]}
 */
export function questionsFaq(plans = PLANS_APP) {
  const gratuit = plans.gratuit;
  const artisan = plans.artisan;
  const equipe = plans.equipe;
  const { devis, clients, chantiers } = gratuit.limits;

  return [
    {
      categorie: 'general',
      q: "C'est quoi Mallettico ?",
      // Menu de l'application : Devis & Factures, Chantiers, Clients, Tâches & Planning, Équipe, Catalogue, Finances
      // (App.jsx:1443-1476)
      // Mallettico est toujours « il » (le logiciel)
      a: "Un logiciel en ligne de devis, de factures et de relances pour les artisans du bâtiment. Il suit aussi vos chantiers, vos clients, votre planning, votre équipe et votre trésorerie. Il s'utilise dans le navigateur, sur téléphone comme sur ordinateur.",
    },
    {
      categorie: 'general',
      q: 'Puis-je utiliser Mallettico sur mon téléphone ?',
      // Application installable, ouverte en plein écran (vite.config.js:29, display standalone)
      a: "Oui. Mallettico s'ouvre dans le navigateur de votre téléphone et s'installe sur l'écran d'accueil : il s'ouvre alors en plein écran, comme une application. Il a besoin d'une connexion internet.",
    },
    {
      categorie: 'features',
      q: "Est-ce que je pars d'une page blanche pour mes devis ?",
      // Bibliothèque des 17 métiers (trade-library.js) ; Référentiel BTP (Catalogue.jsx:1364) ; « 1 000+ » compté dans
      // FaitsSection.jsx:5-12 ; import CSV ou Excel (Catalogue.jsx:1469, 1504)
      a: "Non. La bibliothèque des 17 métiers propose des lots types déjà chiffrés, à insérer en un geste dans un devis, et le Référentiel BTP ajoute à votre catalogue les articles chiffrés de votre métier : en tout, plus de 1 000 prestations et ouvrages chiffrés. Vous ajoutez vos propres articles, ou importez vos tarifs fournisseurs en CSV ou Excel.",
    },
    {
      categorie: 'features',
      q: 'Comment fonctionnent les relances automatiques ?',
      // Scénarios (src/lib/scenariosRelance.js), variables (RelanceConfigTab.jsx:52-64), « Tout envoyer » (Dashboard.jsx:
      // 506-517), envoi quotidien en option (RelanceConfigTab.jsx:900-925), historique par document
      // (RelanceTimelineWidget.jsx)
      a: `Deux scénarios sont prêts : les devis sans réponse (${delais(DEFAULT_DEVIS_STEPS)} après l'envoi) et les factures impayées (${delais(DEFAULT_FACTURE_STEPS)} après l'échéance). Vous modifiez les délais et les messages, qui reprennent le nom du client, le montant ou le numéro du document. Les relances dues s'envoient en un clic depuis l'accueil, ou partent seules chaque jour si vous activez l'envoi automatique. Chaque document garde l'historique de ses relances.`,
    },
    {
      categorie: 'tech',
      q: 'Mallettico est-il prêt pour la facturation électronique ?',
      // Calendrier : docs/metier-btp.md § 8 (réception au 1er sept. 2026, émission au 1er sept. 2027 pour les TPE) ;
      // Mallettico n'est pas une Plateforme Agréée ; raccordement décidé (D-03), au programme (feuille de route)
      a: "Pas encore, et nous préférons le dire. Aujourd'hui, Mallettico produit des factures PDF avec les mentions de votre profil. Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques : cela passe par la Plateforme Agréée de votre choix (liste officielle sur impots.gouv.fr). À partir du 1er septembre 2027, les TPE devront aussi les émettre par une Plateforme Agréée : Mallettico prévoit de s'y raccorder, ce n'est pas encore fait.",
    },
    {
      categorie: 'tech',
      q: 'Mes données sont-elles sécurisées ?',
      // Base à Paris : chiffre vérifié de la règle marketing (Supabase, AWS eu-west-3). Rien sur le chiffrement : sa seule
      // source est la page sécurité de Supabase, pas le code (retiré au tour de correction 1). Export : Réglages ›
      // Données (Settings.jsx:1617-1652). Suppression du compte : refusée tant qu'un abonnement payant ou une équipe est
      // actif (migration 072, src/services/suppressionCompte.js:7-8). Conservation 10 ans : docs/metier-btp.md § 3.
      a: "Votre base de données est hébergée à Paris (Supabase, région eu-west-3). Depuis les paramètres, vous exportez vos clients, devis, factures, chantiers et dépenses dans un fichier (JSON), puis vous pouvez supprimer votre compte, une fois l'abonnement payant résilié et les membres de l'équipe retirés. Exportez vos factures avant : vous devez les conserver 10 ans.",
    },
    {
      categorie: 'tech',
      q: 'Puis-je exporter mes données ?',
      // PDF (DevisPage.jsx:2954), export comptable (ExportComptable.jsx:285-289), export complet (Settings.jsx:1617-1652)
      a: "Oui. Vos devis et factures en PDF, vos écritures comptables au format FEC, CSV ou Excel (Finances › Export comptable), et vos clients, devis, factures, chantiers et dépenses dans un fichier JSON, depuis les paramètres.",
    },
    {
      categorie: 'pricing',
      q: 'Puis-je essayer avant de payer ?',
      // Limites et prix lus dans PLANS ; tarif fondateur : D-08 ; retour au plan Gratuit, données conservées : CGV art. 7
      // (LegalPages.jsx, « À la fin de l'abonnement, le compte revient au plan Gratuit »)
      a: `Oui, sans limite de durée : le plan ${gratuit.name} inclut ${devis} devis par mois, ${clients} clients et ${chantiers} chantiers, sans carte bancaire. Quand vous êtes prêt, passez à ${artisan.name} (${prixAbonnement(artisan)} par mois, sans ces limites) ou à ${equipe.name} (${prixAbonnement(equipe)} par mois, vous + ${equipe.limits.equipe} collaborateurs), ${MENTION_TVA_ABONNEMENT} — tarif fondateur, garanti tant que l'abonnement reste actif. Si vous arrêtez, votre compte revient au plan ${gratuit.name} : vos données sont conservées.`,
    },
    {
      categorie: 'pricing',
      q: 'Puis-je changer de plan en cours de route ?',
      // « Passer au … » (profil/PlanPage.jsx:397) ; portail Stripe pour gérer et arrêter l'abonnement (PlanPage.jsx:84-140)
      a: `Oui. Depuis « Mon plan », vous passez à un plan supérieur à tout moment. Pour arrêter un abonnement payant et revenir au plan ${gratuit.name}, « Mon plan » vous mène à votre espace d'abonnement chez Stripe.`,
    },
    {
      categorie: 'general',
      q: 'Comment migrer depuis un autre logiciel ?',
      // Import des clients en CSV (App.jsx:2408-2425, ImportModal.jsx:399) ; catalogue en CSV ou Excel (Catalogue.jsx:1504)
      a: "Importez vos clients (fichier CSV) et votre catalogue ou vos tarifs fournisseurs (CSV ou Excel). Pour une question, écrivez-nous à contact@mallettico.fr.",
    },
    {
      categorie: 'tech',
      q: 'Quelles intégrations sont disponibles ?',
      // E-mail avec PDF joint (DevisPage.jsx:2380-2400, emailSender.js:63-79), météo du chantier (Chantiers.jsx:796-811,
      // src/services/WeatherService.js), export comptable (ExportComptable.jsx:285-289)
      a: "Mallettico envoie vos devis et factures par e-mail avec leur PDF joint, affiche la météo de vos chantiers et exporte vos écritures comptables au format FEC, CSV ou Excel pour votre comptable.",
    },
    {
      categorie: 'pricing',
      q: 'Comment fonctionne la facturation ?',
      // Annuel lu dans PLANS (priceYearly) ; « Au mois, sans engagement · À l'année, payé pour 12 mois · Paiement sécurisé
      // par Stripe » (PlanPage.jsx:411) ; carte bancaire par Stripe (CGV art. 5)
      a: `Au mois ou à l'année : ${offreAnnuelle(plans)} ; ${MENTION_TVA_ABONNEMENT}. Vous payez par carte bancaire, par Stripe. Au mois, sans engagement : vous résiliez quand vous voulez depuis « Mon plan » ; à l'année, l'abonnement est payé pour douze mois.`,
    },
    {
      categorie: 'general',
      q: 'Y a-t-il un support client ?',
      // Bouton de retours de l'application (RetourModal, table `retours`, migration 074 ; réponse affichée dans l'écran),
      // relevé dans EarlyAdoptersSection.jsx
      a: "Oui. Écrivez-nous à contact@mallettico.fr, ou utilisez le bouton de retours de l'application : votre message arrive directement chez le créateur de Mallettico, et sa réponse s'affiche dans l'application.",
    },
    {
      categorie: 'pricing',
      q: 'Puis-je annuler mon abonnement à tout moment ?',
      // PlanPage.jsx:126-135 (« Vous gardez l'accès à toutes les fonctionnalités jusqu'au … ») ; CGV art. 7 (LegalPages.jsx)
      a: `Oui, depuis « Mon plan » : la résiliation se fait sur la page de Stripe. Vous gardez l'accès jusqu'à la fin de la période déjà payée, puis votre compte revient au plan ${gratuit.name} : vos données sont conservées et restent exportables.`,
    },
  ];
}
