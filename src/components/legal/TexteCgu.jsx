/**
 * Texte des conditions générales d'utilisation : UNE source (avis juriste du 24 oct. 2026, H1). La page /cgu
 * (LegalPages.jsx) et la fenêtre d'acceptation (CGUAcceptanceModal.jsx) affichent ce composant : la version acceptée
 * (CGU_VERSION, src/lib/cgu.js) est celle de ce texte. Avant, la fenêtre portait un autre texte (conservation des
 * données « 30 jours puis supprimées », contraire aux CGV et au produit). Toute modification du texte relève la version.
 *
 * Version du 25 octobre 2026 : article 2, acceptation par la case de l'inscription (relecture juriste du 25 oct., G3) et
 * 2e paragraphe retiré ; article 10 remplacé par le texte H2 de l'avis du 24 oct. 2026, mot pour mot.
 * Version du 28 octobre 2026 : art. 1, 2e paragraphe retiré (avis du 28 oct.) : « l'utilisation vaut acceptation »
 * contredisait l'article 2 (acceptation par la case). Aucun droit réduit : pas de préavis de 30 jours.
 */
import { CGU_VERSION_DATE } from '../../lib/cgu';
import { COMPANY } from '../../lib/editeur';

/**
 * @param {boolean} [compact]  dans la fenêtre d'acceptation : titres plus petits, sections resserrées
 * @param {() => void} [versConfidentialite]  ouvre la politique de confidentialité dans l'app ; sans elle, un lien
 *   vers /confidentialite dans un nouvel onglet (la fenêtre ne doit pas perdre le geste en cours)
 */
export default function TexteCgu({ compact = false, versConfidentialite }) {
  const Titre = compact ? 'h3' : 'h2';
  const section = compact ? 'mb-5' : 'mb-8';
  const titre = compact ? 'text-base font-semibold mb-2 text-encre' : 'text-xl font-bold mb-4 text-encre';
  const p = compact ? 'mb-2 leading-relaxed text-encre-2' : 'mb-3 leading-relaxed text-encre-2';
  const ul = compact ? 'list-disc list-inside mb-3 space-y-1 text-encre-2' : 'list-disc list-inside mb-4 space-y-1 text-encre-2';
  const lien = 'underline font-medium text-accent-texte';

  return (
    <div data-texte-cgu="">
      {/* La version que nomment la case de l'inscription et la fenêtre d'acceptation (src/lib/cgu.js) */}
      <p className={`${compact ? 'mb-5' : 'mb-8'} text-sm font-medium text-encre-2`}>Version du {CGU_VERSION_DATE}</p>

      <section className={section}>
        <Titre className={titre}>Article 1 - Objet</Titre>
        <p className={p}>
          Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités
          et conditions d'utilisation de la plateforme Mallettico, ainsi que les droits et obligations
          des utilisateurs.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 2 - Acceptation des conditions</Titre>
        <p className={p}>
          L'utilisateur accepte les présentes CGU en cochant la case prévue à la création de son compte ; pour un compte plus ancien, avant la création d'un premier document. Il reconnaît en avoir pris connaissance et s'engage à les respecter. La date d'acceptation et la version acceptée sont enregistrées.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 3 - Création de compte</Titre>
        <p className={p}>
          Pour accéder aux services de Mallettico, l'utilisateur doit créer un compte en fournissant :
        </p>
        <ul className={ul}>
          <li>Une adresse email valide</li>
          <li>Un mot de passe sécurisé</li>
          <li>Les informations relatives à son entreprise (raison sociale, SIRET, adresse)</li>
        </ul>
        <p className={p}>
          L'utilisateur garantit l'exactitude des informations fournies et s'engage à les maintenir à jour.
          Il est responsable de la confidentialité de ses identifiants de connexion et de toute activité
          réalisée depuis son compte.
        </p>
        <p className={p}>
          Un seul compte par entreprise est autorisé, sauf dans le cadre d’un plan Équipe prévoyant
          des comptes multi-utilisateurs.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 4 - Obligations de l'utilisateur</Titre>
        <p className={p}>L'utilisateur s'engage à:</p>
        <ul className={ul}>
          <li>Utiliser la plateforme conformément à sa destination et aux lois en vigueur</li>
          <li>Fournir des informations exactes et à jour</li>
          <li>Ne pas porter atteinte à la sécurité ou au fonctionnement de la plateforme</li>
          <li>Respecter les droits de propriété intellectuelle de Mallettico et des tiers</li>
          <li>Ne pas utiliser le service à des fins illicites ou frauduleuses</li>
          <li>Sauvegarder régulièrement ses données importantes</li>
          <li>Signaler tout dysfonctionnement ou faille de sécurité constatée</li>
        </ul>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 5 - Usages interdits</Titre>
        <p className={p}>Il est strictement interdit de :</p>
        <ul className={ul}>
          <li>Tenter d'accéder de manière non autorisée au système, aux serveurs ou aux réseaux de Mallettico</li>
          <li>Utiliser des robots, scrapers ou tout autre moyen automatisé pour accéder au service</li>
          <li>Reproduire, copier, vendre ou exploiter tout ou partie du service sans autorisation</li>
          <li>Transmettre des virus, malwares ou tout code malveillant</li>
          <li>Utiliser le service pour envoyer des communications non sollicitées (spam)</li>
          <li>Usurper l'identité d'un tiers ou fournir de fausses informations</li>
          <li>Contourner les mesures techniques de protection ou de limitation d'accès</li>
          <li>Partager ses identifiants de connexion avec des personnes non autorisées</li>
        </ul>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 6 - Propriété intellectuelle</Titre>
        <p className={p}>
          La plateforme Mallettico, incluant sans s'y limiter son code source, son interface graphique,
          ses textes, images, logos, bases de données et algorithmes, est protégée par les lois françaises
          et internationales relatives à la propriété intellectuelle.
        </p>
        <p className={p}>
          L'abonnement confère à l'utilisateur un droit d'utilisation personnel, non exclusif et non
          transférable de la plateforme, pour la durée de l'abonnement.
        </p>
        <p className={p}>
          Les données saisies par l'utilisateur (informations clients, devis, factures, photos, documents)
          restent sa propriété exclusive. L'utilisateur accorde à Mallettico une licence limitée pour
          traiter ces données dans le cadre de la fourniture du service.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 7 - Limitation de responsabilité</Titre>
        <p className={p}>
          Mallettico fournit le service « en l'état » et ne garantit pas l'absence d'erreurs,
          d'interruptions ou de défauts.
        </p>
        <ul className={ul}>
          <li>Mallettico ne garantit pas que le service répondra à toutes les exigences spécifiques de l'utilisateur</li>
          <li>Les documents générés (devis, factures) doivent être vérifiés par l'utilisateur avant envoi</li>
          <li>Mallettico ne se substitue pas à un expert-comptable ou à un conseiller juridique</li>
          <li>L'utilisateur est seul responsable de la conformité fiscale et réglementaire de ses documents</li>
        </ul>
        <p className={p}>
          En tout état de cause, la responsabilité totale de Mallettico ne pourra excéder le montant
          des sommes versées par l'utilisateur au cours des 12 derniers mois.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 8 - Suspension et résiliation</Titre>
        <p className={p}>
          Mallettico se réserve le droit de suspendre ou de résilier l'accès d'un utilisateur en cas de :
        </p>
        <ul className={ul}>
          <li>Violation des présentes CGU</li>
          <li>Utilisation frauduleuse ou abusive du service</li>
          <li>Non-paiement de l'abonnement après mise en demeure restée infructueuse</li>
          <li>Comportement portant atteinte aux autres utilisateurs ou à la plateforme</li>
        </ul>
        <p className={p}>
          En cas de suspension pour motif grave, Mallettico se réserve le droit de ne pas rembourser
          la période d'abonnement en cours.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 9 - Disponibilité du service</Titre>
        <p className={p}>
          Mallettico s'efforce d'assurer une disponibilité optimale de la plateforme. Toutefois,
          le service peut être temporairement interrompu pour :
        </p>
        <ul className={ul}>
          <li>Maintenance planifiée (les utilisateurs seront prévenus à l'avance)</li>
          <li>Mises à jour et améliorations du service</li>
          <li>Cas de force majeure</li>
        </ul>
        <p className={p}>
          Mallettico s'engage à limiter au maximum la durée et la fréquence de ces interruptions.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 10 - Modifications des CGU</Titre>
        {/* Texte H2 de l'avis juriste du 24 oct. 2026 (docs/avis-juriste-2026-10-24.md), mot pour mot */}
        <p className={p}>
          Mallettico peut modifier les présentes CGU pour un motif légitime. Toute modification qui réduit les droits de l'utilisateur lui est notifiée par e-mail au moins 30 jours avant son entrée en vigueur ; l'utilisateur qui la refuse peut supprimer son compte avant cette date. Les corrections de forme et les modifications imposées par la loi s'appliquent dès leur publication.
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 11 - Protection des données personnelles</Titre>
        <p className={p}>
          Le traitement des données personnelles des utilisateurs est détaillé dans notre{' '}
          {versConfidentialite ? (
            <button type="button" onClick={versConfidentialite} className={lien}>
              Politique de Confidentialité
            </button>
          ) : (
            <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className={lien}>
              Politique de Confidentialité
            </a>
          )}, qui fait partie intégrante des présentes CGU.
        </p>
        <p className={p}>
          En utilisant Mallettico, l'utilisateur reconnaît avoir pris connaissance de cette politique
          et consent au traitement de ses données conformément au RGPD (Règlement UE 2016/679).
        </p>
      </section>

      <section className={section}>
        <Titre className={titre}>Article 12 - Droit applicable et juridiction</Titre>
        <p className={p}>
          Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent
          à rechercher une solution amiable avant toute action judiciaire.
        </p>
        <p className={p}>
          {COMPANY.mediateur
            ? <>À défaut de résolution amiable, l'utilisateur peut recourir au service de médiation de la consommation : {COMPANY.mediateur}.</>
            : <>À défaut de résolution amiable, la partie la plus diligente peut saisir les juridictions compétentes.</>}
        </p>
        <p className={p}>
          En dernier recours, le litige sera porté devant les tribunaux compétents du ressort du siège
          social de {COMPANY.nom}, sauf disposition légale contraire au bénéfice du consommateur.
        </p>
      </section>
    </div>
  );
}
