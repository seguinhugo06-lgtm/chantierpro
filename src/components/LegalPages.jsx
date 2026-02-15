import React from 'react';
import { ArrowLeft, Shield, FileText, Scale, Lock } from 'lucide-react';

export default function LegalPages({ page, isDark, couleur, setPage }) {
  // Theme classes
  const mainBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const tableBorder = isDark ? 'border-slate-600' : 'border-slate-300';
  const tableHeaderBg = isDark ? 'bg-slate-700' : 'bg-slate-100';
  const linkStyle = { color: couleur };

  const pageConfig = {
    cgv: { title: 'Conditions Générales de Vente', icon: FileText },
    cgu: { title: "Conditions Générales d'Utilisation", icon: Scale },
    confidentialite: { title: 'Politique de Confidentialité', icon: Lock },
    'mentions-legales': { title: 'Mentions Légales', icon: Shield },
  };

  const config = pageConfig[page] || pageConfig.cgv;
  const Icon = config.icon;

  const Section = ({ title, children, id }) => (
    <section className="mb-8" id={id}>
      <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>{title}</h2>
      {children}
    </section>
  );

  const SubSection = ({ title, children }) => (
    <div className="mb-4">
      <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>{title}</h3>
      {children}
    </div>
  );

  const P = ({ children }) => (
    <p className={`mb-3 leading-relaxed ${textSecondary}`}>{children}</p>
  );

  const UL = ({ children }) => (
    <ul className={`list-disc list-inside mb-4 space-y-1 ${textSecondary}`}>{children}</ul>
  );

  const renderCGV = () => (
    <>
      <Section title="Article 1 - Éditeur">
        <P>
          Le site ChantierPro est édité par : <strong className={textPrimary}>[A REMPLIR - Raison sociale]</strong>
        </P>
        <UL>
          <li>Forme juridique : [A REMPLIR]</li>
          <li>Capital social : [A REMPLIR] euros</li>
          <li>Siège social : [A REMPLIR - Adresse complète]</li>
          <li>SIRET : [A REMPLIR]</li>
          <li>RCS : [A REMPLIR - Ville et numéro]</li>
          <li>Numéro de TVA intracommunautaire : [A REMPLIR]</li>
          <li>Email : [A REMPLIR]</li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="Article 2 - Objet">
        <P>
          Les présentes Conditions Générales de Vente (CGV) ont pour objet de définir les droits et obligations
          des parties dans le cadre de la vente des services proposés par ChantierPro, plateforme de gestion
          de chantiers et d'activité pour les professionnels du bâtiment.
        </P>
        <P>
          Toute souscription à un abonnement implique l'acceptation sans réserve des présentes CGV.
        </P>
      </Section>

      <Section title="Article 3 - Description des services">
        <P>
          ChantierPro est une application web (SaaS) permettant aux professionnels du bâtiment de :
        </P>
        <UL>
          <li>Gérer leurs chantiers, clients et équipes</li>
          <li>Créer et envoyer des devis et factures</li>
          <li>Suivre le planning et les tâches</li>
          <li>Gérer les stocks et le catalogue d'articles</li>
          <li>Suivre la trésorerie et les dépenses</li>
          <li>Gérer les sous-traitants et la conformité réglementaire</li>
          <li>Pointer les heures de travail</li>
          <li>Prendre et organiser des photos de chantier</li>
          <li>Obtenir des rapports et tableaux de bord</li>
        </UL>
      </Section>

      <Section title="Article 4 - Plans tarifaires">
        <P>ChantierPro propose les plans d'abonnement suivants :</P>
        <div className={`border rounded-lg overflow-hidden mb-4 ${tableBorder}`}>
          <table className="w-full text-left" aria-label="Plans tarifaires ChantierPro">
            <thead className={tableHeaderBg}>
              <tr>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Plan</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Prix</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Découverte</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Gratuit</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Accès limité pour découvrir la plateforme. 1 chantier actif, fonctionnalités de base.</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Artisan</td>
                <td className={`px-4 py-3 ${textSecondary}`}>29 EUR / mois HT</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Idéal pour les artisans indépendants. Chantiers illimités, devis, factures, planning, stocks.</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Pro</td>
                <td className={`px-4 py-3 ${textSecondary}`}>99 EUR / mois HT</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Pour les entreprises avec équipes. Toutes les fonctionnalités, gestion d'équipe, sous-traitants, trésorerie avancée.</td>
              </tr>
              <tr>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Entreprise</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Sur devis</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Solution sur mesure pour les grandes entreprises. Support dédié, intégrations personnalisées, formation.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>Les prix sont indiqués en euros hors taxes (HT). La TVA applicable sera ajoutée au moment de la facturation.</P>
      </Section>

      <Section title="Article 5 - Modalités de paiement">
        <P>
          Le paiement des abonnements est effectué par carte bancaire via la plateforme sécurisée
          <strong> Stripe</strong>. Les paiements sont prélevés automatiquement chaque mois à la date
          anniversaire de la souscription.
        </P>
        <UL>
          <li>Les paiements sont sécurisés par le protocole SSL/TLS</li>
          <li>Stripe est certifié PCI DSS niveau 1</li>
          <li>ChantierPro ne stocke aucune donnée de carte bancaire</li>
          <li>Une facture est émise automatiquement à chaque paiement</li>
        </UL>
      </Section>

      <Section title="Article 6 - Droit de rétractation">
        <P>
          Conformément aux articles L.221-18 et suivants du Code de la consommation, l'utilisateur
          dispose d'un délai de <strong className={textPrimary}>14 jours calendaires</strong> à compter de la
          souscription pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
        </P>
        <P>
          Pour exercer ce droit, l'utilisateur doit adresser sa demande par email à l'adresse :
          <span style={linkStyle}> [A REMPLIR - email de contact]</span>.
        </P>
        <P>
          Le remboursement sera effectué dans un délai de 14 jours suivant la réception de la demande,
          en utilisant le même moyen de paiement que celui utilisé pour la transaction initiale.
        </P>
        <P>
          Toutefois, si l'utilisateur a expressément demandé le démarrage de l'exécution du service avant
          l'expiration du délai de rétractation et a utilisé le service, le montant correspondant au service
          fourni jusqu'à la communication de sa décision de se rétracter sera déduit du remboursement.
        </P>
      </Section>

      <Section title="Article 7 - Durée et résiliation">
        <P>
          L'abonnement est souscrit pour une durée indéterminée, avec une facturation mensuelle.
        </P>
        <UL>
          <li>L'utilisateur peut résilier son abonnement à tout moment depuis son espace client ou par email</li>
          <li>La résiliation prend effet à la fin de la période de facturation en cours</li>
          <li>L'accès aux fonctionnalités payantes est maintenu jusqu'à la fin de la période payée</li>
          <li>Les données de l'utilisateur sont conservées pendant 30 jours après la résiliation, puis supprimées</li>
          <li>L'utilisateur peut demander l'export de ses données avant la suppression</li>
        </UL>
      </Section>

      <Section title="Article 8 - Responsabilité">
        <P>
          ChantierPro s'engage à fournir un service de qualité et à assurer la disponibilité de la plateforme.
          Toutefois, ChantierPro ne saurait être tenu responsable :
        </P>
        <UL>
          <li>Des interruptions temporaires du service pour maintenance ou mise à jour</li>
          <li>Des dommages résultant d'une mauvaise utilisation du service par l'utilisateur</li>
          <li>Des pertes de données résultant d'une défaillance technique indépendante de sa volonté</li>
          <li>De l'inexactitude des informations saisies par l'utilisateur</li>
          <li>Des conséquences fiscales ou juridiques liées à l'utilisation des documents générés (devis, factures)</li>
        </UL>
        <P>
          La responsabilité de ChantierPro est limitée au montant des sommes effectivement versées par
          l'utilisateur au cours des 12 derniers mois précédant le fait générateur de la responsabilité.
        </P>
      </Section>

      <Section title="Article 9 - Propriété intellectuelle">
        <P>
          L'ensemble des éléments constituant la plateforme ChantierPro (logiciel, interface, textes, images,
          base de données, algorithmes) sont protégés par le droit de la propriété intellectuelle et restent
          la propriété exclusive de ChantierPro.
        </P>
        <P>
          L'utilisateur conserve la propriété intégrale de toutes les données qu'il saisit dans la plateforme
          (informations clients, devis, factures, photos, etc.).
        </P>
      </Section>

      <Section title="Article 10 - Droit applicable et litiges">
        <P>
          Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à
          rechercher une solution amiable avant toute action judiciaire.
        </P>
        <P>
          À défaut de résolution amiable dans un délai de 30 jours, le litige sera soumis aux tribunaux
          compétents du ressort du siège social de l'éditeur.
        </P>
        <P>
          Conformément aux dispositions du Code de la consommation concernant le règlement amiable des
          litiges, l'utilisateur peut recourir au service de médiation : [A REMPLIR - Nom et coordonnées du médiateur].
        </P>
      </Section>
    </>
  );

  const renderCGU = () => (
    <>
      <Section title="Article 1 - Objet">
        <P>
          Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités
          et conditions d'utilisation de la plateforme ChantierPro, ainsi que les droits et obligations
          des utilisateurs.
        </P>
        <P>
          L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU.
        </P>
      </Section>

      <Section title="Article 2 - Acceptation des conditions">
        <P>
          L'inscription sur ChantierPro vaut acceptation sans réserve des présentes CGU. L'utilisateur
          reconnaît en avoir pris connaissance et s'engage à les respecter.
        </P>
        <P>
          ChantierPro se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
          seront informés de toute modification par email ou notification dans l'application. La poursuite
          de l'utilisation du service après modification vaut acceptation des nouvelles conditions.
        </P>
      </Section>

      <Section title="Article 3 - Création de compte">
        <P>
          Pour accéder aux services de ChantierPro, l'utilisateur doit créer un compte en fournissant :
        </P>
        <UL>
          <li>Une adresse email valide</li>
          <li>Un mot de passe sécurisé</li>
          <li>Les informations relatives à son entreprise (raison sociale, SIRET, adresse)</li>
        </UL>
        <P>
          L'utilisateur garantit l'exactitude des informations fournies et s'engage à les maintenir à jour.
          Il est responsable de la confidentialité de ses identifiants de connexion et de toute activité
          réalisée depuis son compte.
        </P>
        <P>
          Un seul compte par entreprise est autorisé, sauf dans le cadre d'un plan Entreprise prévoyant
          des comptes multi-utilisateurs.
        </P>
      </Section>

      <Section title="Article 4 - Obligations de l'utilisateur">
        <P>L'utilisateur s'engage à:</P>
        <UL>
          <li>Utiliser la plateforme conformément à sa destination et aux lois en vigueur</li>
          <li>Fournir des informations exactes et à jour</li>
          <li>Ne pas porter atteinte à la sécurité ou au fonctionnement de la plateforme</li>
          <li>Respecter les droits de propriété intellectuelle de ChantierPro et des tiers</li>
          <li>Ne pas utiliser le service à des fins illicites ou frauduleuses</li>
          <li>Sauvegarder régulièrement ses données importantes</li>
          <li>Signaler tout dysfonctionnement ou faille de sécurité constatée</li>
        </UL>
      </Section>

      <Section title="Article 5 - Usages interdits">
        <P>Il est strictement interdit de :</P>
        <UL>
          <li>Tenter d'accéder de manière non autorisée au système, aux serveurs ou aux réseaux de ChantierPro</li>
          <li>Utiliser des robots, scrapers ou tout autre moyen automatisé pour accéder au service</li>
          <li>Reproduire, copier, vendre ou exploiter tout ou partie du service sans autorisation</li>
          <li>Transmettre des virus, malwares ou tout code malveillant</li>
          <li>Utiliser le service pour envoyer des communications non sollicitées (spam)</li>
          <li>Usurper l'identité d'un tiers ou fournir de fausses informations</li>
          <li>Contourner les mesures techniques de protection ou de limitation d'accès</li>
          <li>Partager ses identifiants de connexion avec des personnes non autorisées</li>
        </UL>
      </Section>

      <Section title="Article 6 - Propriété intellectuelle">
        <P>
          La plateforme ChantierPro, incluant sans s'y limiter son code source, son interface graphique,
          ses textes, images, logos, bases de données et algorithmes, est protégée par les lois françaises
          et internationales relatives à la propriété intellectuelle.
        </P>
        <P>
          L'abonnement confère à l'utilisateur un droit d'utilisation personnel, non exclusif et non
          transférable de la plateforme, pour la durée de l'abonnement.
        </P>
        <P>
          Les données saisies par l'utilisateur (informations clients, devis, factures, photos, documents)
          restent sa propriété exclusive. L'utilisateur accorde à ChantierPro une licence limitée pour
          traiter ces données dans le cadre de la fourniture du service.
        </P>
      </Section>

      <Section title="Article 7 - Limitation de responsabilité">
        <P>
          ChantierPro fournit le service « en l'état » et ne garantit pas l'absence d'erreurs,
          d'interruptions ou de défauts.
        </P>
        <UL>
          <li>ChantierPro ne garantit pas que le service répondra à toutes les exigences spécifiques de l'utilisateur</li>
          <li>Les documents générés (devis, factures) doivent être vérifiés par l'utilisateur avant envoi</li>
          <li>ChantierPro ne se substitue pas à un expert-comptable ou à un conseiller juridique</li>
          <li>L'utilisateur est seul responsable de la conformité fiscale et réglementaire de ses documents</li>
        </UL>
        <P>
          En tout état de cause, la responsabilité totale de ChantierPro ne pourra excéder le montant
          des sommes versées par l'utilisateur au cours des 12 derniers mois.
        </P>
      </Section>

      <Section title="Article 8 - Suspension et résiliation">
        <P>
          ChantierPro se réserve le droit de suspendre ou de résilier l'accès d'un utilisateur en cas de :
        </P>
        <UL>
          <li>Violation des présentes CGU</li>
          <li>Utilisation frauduleuse ou abusive du service</li>
          <li>Non-paiement de l'abonnement après mise en demeure restée infructueuse</li>
          <li>Comportement portant atteinte aux autres utilisateurs ou à la plateforme</li>
        </UL>
        <P>
          En cas de suspension pour motif grave, ChantierPro se réserve le droit de ne pas rembourser
          la période d'abonnement en cours.
        </P>
      </Section>

      <Section title="Article 9 - Disponibilité du service">
        <P>
          ChantierPro s'efforce d'assurer une disponibilité optimale de la plateforme. Toutefois,
          le service peut être temporairement interrompu pour :
        </P>
        <UL>
          <li>Maintenance planifiée (les utilisateurs seront prévenus à l'avance)</li>
          <li>Mises à jour et améliorations du service</li>
          <li>Cas de force majeure</li>
        </UL>
        <P>
          ChantierPro s'engage à limiter au maximum la durée et la fréquence de ces interruptions.
        </P>
      </Section>

      <Section title="Article 10 - Modifications des CGU">
        <P>
          ChantierPro se réserve le droit de modifier les présentes CGU à tout moment. Les modifications
          entreront en vigueur dès leur publication sur la plateforme. Les utilisateurs seront informés
          des modifications substantielles par email au moins 30 jours avant leur entrée en vigueur.
        </P>
        <P>
          Si l'utilisateur n'accepte pas les nouvelles conditions, il peut résilier son abonnement avant
          leur entrée en vigueur.
        </P>
      </Section>
    </>
  );

  const renderConfidentialite = () => (
    <>
      <Section title="Article 1 - Responsable du traitement">
        <P>
          Le responsable du traitement des données à caractère personnel collectées sur ChantierPro est :
        </P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>[A REMPLIR]</strong></li>
          <li>Adresse : [A REMPLIR]</li>
          <li>Email du DPO / référent données : [A REMPLIR]</li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="Article 2 - Données collectées">
        <P>
          ChantierPro collecte et traite les données suivantes, conformément au Règlement Général sur la
          Protection des Données (RGPD - Règlement UE 2016/679) :
        </P>
        <div className={`border rounded-lg overflow-hidden mb-4 overflow-x-auto ${tableBorder}`}>
          <table className="w-full text-left text-sm" aria-label="Données personnelles collectées">
            <thead className={tableHeaderBg}>
              <tr>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Catégorie de données</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Données collectées</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Finalité</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Base légale (RGPD)</th>
              </tr>
            </thead>
            <tbody className={textSecondary}>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Identité</td>
                <td className="px-4 py-3">Nom, prénom, email, téléphone</td>
                <td className="px-4 py-3">Gestion du compte utilisateur</td>
                <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Entreprise</td>
                <td className="px-4 py-3">Raison sociale, SIRET, adresse, TVA, RCS, APE</td>
                <td className="px-4 py-3">Génération des documents légaux (devis, factures)</td>
                <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Clients</td>
                <td className="px-4 py-3">Nom, adresse, email, téléphone des clients de l'utilisateur</td>
                <td className="px-4 py-3">Gestion des chantiers et facturation</td>
                <td className="px-4 py-3">Intérêt légitime (Art. 6.1.f)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Chantiers</td>
                <td className="px-4 py-3">Adresses, descriptions, budgets, planning, photos</td>
                <td className="px-4 py-3">Suivi opérationnel des projets</td>
                <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Financières</td>
                <td className="px-4 py-3">Montants des devis, factures, dépenses, trésorerie</td>
                <td className="px-4 py-3">Gestion financière et comptable</td>
                <td className="px-4 py-3">Exécution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Pointage</td>
                <td className="px-4 py-3">Heures d'arrivée/départ, géolocalisation (si autorisée)</td>
                <td className="px-4 py-3">Suivi des heures de travail</td>
                <td className="px-4 py-3">Consentement (Art. 6.1.a)</td>
              </tr>
              <tr>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Technique</td>
                <td className="px-4 py-3">Adresse IP, navigateur, appareil, journaux de connexion</td>
                <td className="px-4 py-3">Sécurité et amélioration du service</td>
                <td className="px-4 py-3">Intérêt légitime (Art. 6.1.f)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Article 3 - Durée de conservation">
        <P>Les données personnelles sont conservées selon les durées suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Données du compte :</strong> pendant toute la durée de l'abonnement, puis 30 jours après résiliation</li>
          <li><strong className={textPrimary}>Données de facturation :</strong> 10 ans conformément aux obligations légales comptables (Code de commerce, Art. L123-22)</li>
          <li><strong className={textPrimary}>Données de connexion :</strong> 12 mois conformément à la législation en vigueur</li>
          <li><strong className={textPrimary}>Données de géolocalisation :</strong> 3 mois</li>
          <li><strong className={textPrimary}>Cookies :</strong> 13 mois maximum</li>
        </UL>
        <P>
          À l'expiration de ces délais, les données sont supprimées ou anonymisées de manière irréversible.
        </P>
      </Section>

      <Section title="Article 4 - Sous-traitants et transferts de données">
        <P>
          ChantierPro fait appel aux sous-traitants suivants pour le traitement des données :
        </P>
        <div className={`border rounded-lg overflow-hidden mb-4 ${tableBorder}`}>
          <table className="w-full text-left text-sm" aria-label="Sous-traitants et transferts de données">
            <thead className={tableHeaderBg}>
              <tr>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Sous-traitant</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Service</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Localisation</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Garanties</th>
              </tr>
            </thead>
            <tbody className={textSecondary}>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Supabase</td>
                <td className="px-4 py-3">Base de données, authentification, stockage fichiers</td>
                <td className="px-4 py-3">UE (AWS eu-west)</td>
                <td className="px-4 py-3">SOC 2 Type II, RGPD, chiffrement AES-256</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Stripe</td>
                <td className="px-4 py-3">Paiement et facturation</td>
                <td className="px-4 py-3">UE / US</td>
                <td className="px-4 py-3">PCI DSS niveau 1, SCC (clauses contractuelles types)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Resend</td>
                <td className="px-4 py-3">Envoi d'emails transactionnels</td>
                <td className="px-4 py-3">US</td>
                <td className="px-4 py-3">SCC, chiffrement TLS</td>
              </tr>
              <tr>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Vercel</td>
                <td className="px-4 py-3">Hébergement de l'application web</td>
                <td className="px-4 py-3">Global (CDN) / US</td>
                <td className="px-4 py-3">SOC 2, SCC, chiffrement en transit</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          Les transferts de données hors de l'Union Européenne sont encadrés par des Clauses Contractuelles
          Types (SCC) approuvées par la Commission Européenne, conformément au chapitre V du RGPD.
        </P>
      </Section>

      <Section title="Article 5 - Droits de l'utilisateur">
        <P>
          Conformément au RGPD et à la loi Informatique et Libertés, l'utilisateur dispose des droits suivants :
        </P>
        <UL>
          <li><strong className={textPrimary}>Droit d'accès (Art. 15 RGPD) :</strong> obtenir la confirmation que des données le concernant sont traitées et en obtenir une copie</li>
          <li><strong className={textPrimary}>Droit de rectification (Art. 16 RGPD) :</strong> demander la correction de données inexactes ou incomplètes</li>
          <li><strong className={textPrimary}>Droit à l'effacement (Art. 17 RGPD) :</strong> demander la suppression de ses données personnelles (« droit à l'oubli »)</li>
          <li><strong className={textPrimary}>Droit à la portabilité (Art. 20 RGPD) :</strong> recevoir ses données dans un format structuré, couramment utilisé et lisible par machine (JSON, CSV)</li>
          <li><strong className={textPrimary}>Droit d'opposition (Art. 21 RGPD) :</strong> s'opposer au traitement de ses données pour des motifs légitimes</li>
          <li><strong className={textPrimary}>Droit à la limitation (Art. 18 RGPD) :</strong> demander la limitation du traitement de ses données</li>
        </UL>
        <P>
          Pour exercer ces droits, l'utilisateur peut contacter le responsable du traitement à l'adresse :
          <span style={linkStyle}> [A REMPLIR - email DPO]</span>.
          Une réponse sera apportée dans un délai d'un mois à compter de la réception de la demande.
        </P>
      </Section>

      <Section title="Article 6 - Cookies">
        <P>ChantierPro utilise les cookies suivants :</P>
        <UL>
          <li><strong className={textPrimary}>Cookies essentiels :</strong> nécessaires au fonctionnement de l'application (session, authentification, préférences). Base légale : intérêt légitime.</li>
          <li><strong className={textPrimary}>Cookies de performance :</strong> mesure d'audience anonymisée pour améliorer le service. Base légale : consentement.</li>
        </UL>
        <P>
          ChantierPro n'utilise pas de cookies publicitaires ni de cookies de tracking tiers.
          L'utilisateur peut gérer ses préférences de cookies depuis les paramètres de l'application
          ou de son navigateur.
        </P>
      </Section>

      <Section title="Article 7 - Sécurité des données">
        <P>ChantierPro met en oeuvre les mesures de sécurité suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Chiffrement HTTPS/TLS :</strong> toutes les communications sont chiffrées en transit</li>
          <li><strong className={textPrimary}>Row Level Security (RLS) :</strong> isolation des données au niveau de la base de données - chaque utilisateur n'accède qu'à ses propres données</li>
          <li><strong className={textPrimary}>Authentification JWT :</strong> tokens sécurisés avec expiration automatique</li>
          <li><strong className={textPrimary}>Chiffrement au repos :</strong> les données stockées sont chiffrées (AES-256)</li>
          <li><strong className={textPrimary}>Sauvegardes automatiques :</strong> sauvegardes quotidiennes des bases de données</li>
          <li><strong className={textPrimary}>Mises à jour régulières :</strong> correctifs de sécurité appliqués en continu</li>
        </UL>
      </Section>

      <Section title="Article 8 - Violation de données">
        <P>
          En cas de violation de données à caractère personnel, ChantierPro s'engage à:
        </P>
        <UL>
          <li>Notifier la CNIL dans un délai de 72 heures conformément à l'article 33 du RGPD</li>
          <li>Informer les utilisateurs concernés dans les meilleurs délais si la violation est susceptible d'engendrer un risque élevé pour leurs droits et libertés</li>
          <li>Documenter toute violation dans un registre interne</li>
        </UL>
      </Section>

      <Section title="Article 9 - Contact et réclamations">
        <P>
          Pour toute question relative à la protection des données personnelles, l'utilisateur peut
          contacter : <span style={linkStyle}>[A REMPLIR - email DPO]</span>.
        </P>
        <P>
          Si l'utilisateur estime que ses droits ne sont pas respectés, il peut introduire une
          réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
        </P>
        <UL>
          <li>Site web : <span style={linkStyle}>www.cnil.fr</span></li>
          <li>Adresse : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
          <li>Téléphone : 01 53 73 22 22</li>
        </UL>
      </Section>
    </>
  );

  const renderMentionsLegales = () => (
    <>
      <Section title="1. Éditeur du site">
        <P>Le site ChantierPro est édité par :</P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>[A REMPLIR]</strong></li>
          <li>Forme juridique : [A REMPLIR]</li>
          <li>Capital social : [A REMPLIR] euros</li>
          <li>Siège social : [A REMPLIR - Adresse complète]</li>
          <li>SIRET : [A REMPLIR]</li>
          <li>RCS : [A REMPLIR - Ville et numéro]</li>
          <li>Numéro de TVA intracommunautaire : [A REMPLIR]</li>
          <li>Email : <span style={linkStyle}>[A REMPLIR]</span></li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="2. Directeur de la publication">
        <UL>
          <li>Nom : <strong className={textPrimary}>[A REMPLIR - Nom et prénom]</strong></li>
          <li>Qualité : [A REMPLIR - Gérant / Président / etc.]</li>
          <li>Email : <span style={linkStyle}>[A REMPLIR]</span></li>
        </UL>
      </Section>

      <Section title="3. Hébergement">
        <SubSection title="Application web">
          <UL>
            <li>Hébergeur : <strong className={textPrimary}>Vercel Inc.</strong></li>
            <li>Adresse : 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
            <li>Site web : <span style={linkStyle}>vercel.com</span></li>
          </UL>
        </SubSection>
        <SubSection title="Base de données et stockage">
          <UL>
            <li>Hébergeur : <strong className={textPrimary}>Supabase Inc.</strong></li>
            <li>Adresse : 970 Toa Payoh North #07-04, Singapore 318992</li>
            <li>Infrastructure : Amazon Web Services (AWS), région EU (eu-west)</li>
            <li>Site web : <span style={linkStyle}>supabase.com</span></li>
          </UL>
        </SubSection>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <P>
          L'ensemble du contenu du site ChantierPro (textes, images, graphismes, logo, icônes,
          logiciel, base de données) est protégé par les lois françaises et internationales relatives
          à la propriété intellectuelle.
        </P>
        <P>
          Toute reproduction, représentation, modification, publication, distribution ou retransmission,
          totale ou partielle, du contenu de ce site, par quelque procédé que ce soit, sans l'autorisation
          écrite préalable de l'éditeur, est strictement interdite et constitue un délit de contrefaçon
          (articles L.335-2 et suivants du Code de la propriété intellectuelle).
        </P>
      </Section>

      <Section title="5. Données personnelles">
        <P>
          ChantierPro collecte et traite des données personnelles dans le respect du Règlement Général
          sur la Protection des Données (RGPD) et de la loi Informatique et Libertés du 6 janvier 1978 modifiée.
        </P>
        <P>
          Pour en savoir plus sur la collecte et le traitement des données, veuillez consulter notre{' '}
          <button
            onClick={() => setPage('confidentialite')}
            className="underline font-medium hover:opacity-80 transition-opacity"
            style={linkStyle}
          >
            Politique de Confidentialité
          </button>.
        </P>
      </Section>

      <Section title="6. Cookies">
        <P>
          Le site utilise des cookies nécessaires à son bon fonctionnement. Pour plus d'informations,
          consultez notre{' '}
          <button
            onClick={() => setPage('confidentialite')}
            className="underline font-medium hover:opacity-80 transition-opacity"
            style={linkStyle}
          >
            Politique de Confidentialité
          </button>.
        </P>
      </Section>

      <Section title="7. Limitation de responsabilité">
        <P>
          L'éditeur s'efforce de fournir sur le site des informations aussi précises que possible.
          Toutefois, il ne pourra être tenu responsable des omissions, des inexactitudes et des carences
          dans la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui
          fournissent ces informations.
        </P>
        <P>
          L'éditeur ne saurait être tenu responsable des dommages directs ou indirects causés au
          matériel de l'utilisateur lors de l'accès au site, résultant soit de l'utilisation d'un
          matériel ne répondant pas aux spécifications, soit de l'apparition d'un bug ou d'une incompatibilité.
        </P>
      </Section>

      <Section title="8. Droit applicable">
        <P>
          Le présent site et les présentes mentions légales sont soumis au droit français. En cas de
          litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
        </P>
      </Section>

      <Section title="9. Contact">
        <P>
          Pour toute question ou demande d'information concernant le site, ou tout signalement de
          contenu ou d'activités illicites, l'utilisateur peut contacter l'éditeur à l'adresse
          email suivante : <span style={linkStyle}>[A REMPLIR]</span>.
        </P>
      </Section>
    </>
  );

  const renderContent = () => {
    switch (page) {
      case 'cgv':
        return renderCGV();
      case 'cgu':
        return renderCGU();
      case 'confidentialite':
        return renderConfidentialite();
      case 'mentions-legales':
        return renderMentionsLegales();
      default:
        return renderCGV();
    }
  };

  return (
    <div className={`min-h-screen ${mainBg} pb-12`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${cardBg} backdrop-blur-sm`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setPage('dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: couleur + '20' }}
            >
              <Icon className="w-5 h-5" style={{ color: couleur }} />
            </div>
            <h1 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>
              {config.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className={`border rounded-xl p-6 sm:p-8 ${cardBg}`}>
          {renderContent()}

          {/* Last updated */}
          <div className={`mt-12 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <p className={`text-sm ${textSecondary}`}>
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
