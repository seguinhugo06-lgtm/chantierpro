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
    cgv: { title: 'Conditions Generales de Vente', icon: FileText },
    cgu: { title: "Conditions Generales d'Utilisation", icon: Scale },
    confidentialite: { title: 'Politique de Confidentialite', icon: Lock },
    'mentions-legales': { title: 'Mentions Legales', icon: Shield },
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
      <Section title="Article 1 - Editeur">
        <P>
          Le site ChantierPro est edite par : <strong className={textPrimary}>[A REMPLIR - Raison sociale]</strong>
        </P>
        <UL>
          <li>Forme juridique : [A REMPLIR]</li>
          <li>Capital social : [A REMPLIR] euros</li>
          <li>Siege social : [A REMPLIR - Adresse complete]</li>
          <li>SIRET : [A REMPLIR]</li>
          <li>RCS : [A REMPLIR - Ville et numéro]</li>
          <li>Numéro de TVA intracommunautaire : [A REMPLIR]</li>
          <li>Email : [A REMPLIR]</li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="Article 2 - Objet">
        <P>
          Les presentes Conditions Generales de Vente (CGV) ont pour objet de definir les droits et obligations
          des parties dans le cadre de la vente des services proposes par ChantierPro, plateforme de gestion
          de chantiers et d'activite pour les professionnels du batiment.
        </P>
        <P>
          Toute souscription a un abonnement implique l'acceptation sans reserve des presentes CGV.
        </P>
      </Section>

      <Section title="Article 3 - Description des services">
        <P>
          ChantierPro est une application web (SaaS) permettant aux professionnels du batiment de :
        </P>
        <UL>
          <li>Gérer leurs chantiers, clients et equipes</li>
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
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Decouverte</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Gratuit</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Acces limite pour decouvrir la plateforme. 1 chantier actif, fonctionnalites de base.</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Artisan</td>
                <td className={`px-4 py-3 ${textSecondary}`}>29 EUR / mois HT</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Ideal pour les artisans independants. Chantiers illimites, devis, factures, planning, stocks.</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Pro</td>
                <td className={`px-4 py-3 ${textSecondary}`}>99 EUR / mois HT</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Pour les entreprises avec equipes. Toutes les fonctionnalites, gestion d'equipe, sous-traitants, tresorerie avancee.</td>
              </tr>
              <tr>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Entreprise</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Sur devis</td>
                <td className={`px-4 py-3 ${textSecondary}`}>Solution sur mesure pour les grandes entreprises. Support dedie, integrations personnalisees, formation.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>Les prix sont indiques en euros hors taxes (HT). La TVA applicable sera ajoutee au moment de la facturation.</P>
      </Section>

      <Section title="Article 5 - Modalites de paiement">
        <P>
          Le paiement des abonnements est effectue par carte bancaire via la plateforme securisee
          <strong> Stripe</strong>. Les paiements sont preleves automatiquement chaque mois a la date
          anniversaire de la souscription.
        </P>
        <UL>
          <li>Les paiements sont securises par le protocole SSL/TLS</li>
          <li>Stripe est certifie PCI DSS niveau 1</li>
          <li>ChantierPro ne stocke aucune donnee de carte bancaire</li>
          <li>Une facture est emise automatiquement a chaque paiement</li>
        </UL>
      </Section>

      <Section title="Article 6 - Droit de retractation">
        <P>
          Conformement aux articles L.221-18 et suivants du Code de la consommation, l'utilisateur
          dispose d'un delai de <strong className={textPrimary}>14 jours calendaires</strong> a compter de la
          souscription pour exercer son droit de retractation, sans avoir a justifier de motifs ni a payer de penalites.
        </P>
        <P>
          Pour exercer ce droit, l'utilisateur doit adresser sa demande par email a l'adresse :
          <span style={linkStyle}> [A REMPLIR - email de contact]</span>.
        </P>
        <P>
          Le remboursement sera effectue dans un delai de 14 jours suivant la reception de la demande,
          en utilisant le meme moyen de paiement que celui utilise pour la transaction initiale.
        </P>
        <P>
          Toutefois, si l'utilisateur a expressement demande le demarrage de l'execution du service avant
          l'expiration du delai de retractation et a utilise le service, le montant correspondant au service
          fourni jusqu'a la communication de sa decision de se retracter sera deduit du remboursement.
        </P>
      </Section>

      <Section title="Article 7 - Duree et resiliation">
        <P>
          L'abonnement est souscrit pour une duree indeterminee, avec une facturation mensuelle.
        </P>
        <UL>
          <li>L'utilisateur peut resilier son abonnement a tout moment depuis son espace client ou par email</li>
          <li>La resiliation prend effet a la fin de la periode de facturation en cours</li>
          <li>L'acces aux fonctionnalites payantes est maintenu jusqu'a la fin de la periode payee</li>
          <li>Les donnees de l'utilisateur sont conservees pendant 30 jours apres la resiliation, puis supprimees</li>
          <li>L'utilisateur peut demander l'export de ses donnees avant la suppression</li>
        </UL>
      </Section>

      <Section title="Article 8 - Responsabilite">
        <P>
          ChantierPro s'engage a fournir un service de qualite et a assurer la disponibilite de la plateforme.
          Toutefois, ChantierPro ne saurait etre tenu responsable :
        </P>
        <UL>
          <li>Des interruptions temporaires du service pour maintenance ou mise a jour</li>
          <li>Des dommages resultant d'une mauvaise utilisation du service par l'utilisateur</li>
          <li>Des pertes de donnees resultant d'une defaillance technique independante de sa volonte</li>
          <li>De l'inexactitude des informations saisies par l'utilisateur</li>
          <li>Des consequences fiscales ou juridiques liees a l'utilisation des documents generes (devis, factures)</li>
        </UL>
        <P>
          La responsabilite de ChantierPro est limitee au montant des sommes effectivement versees par
          l'utilisateur au cours des 12 derniers mois precedant le fait generateur de la responsabilite.
        </P>
      </Section>

      <Section title="Article 9 - Propriete intellectuelle">
        <P>
          L'ensemble des elements constituant la plateforme ChantierPro (logiciel, interface, textes, images,
          base de donnees, algorithmes) sont proteges par le droit de la propriete intellectuelle et restent
          la propriete exclusive de ChantierPro.
        </P>
        <P>
          L'utilisateur conserve la propriete integrale de toutes les donnees qu'il saisit dans la plateforme
          (informations clients, devis, factures, photos, etc.).
        </P>
      </Section>

      <Section title="Article 10 - Droit applicable et litiges">
        <P>
          Les presentes CGV sont soumises au droit francais. En cas de litige, les parties s'engagent a
          rechercher une solution amiable avant toute action judiciaire.
        </P>
        <P>
          A defaut de resolution amiable dans un delai de 30 jours, le litige sera soumis aux tribunaux
          competents du ressort du siege social de l'editeur.
        </P>
        <P>
          Conformement aux dispositions du Code de la consommation concernant le reglement amiable des
          litiges, l'utilisateur peut recourir au service de mediation : [A REMPLIR - Nom et coordonnees du mediateur].
        </P>
      </Section>
    </>
  );

  const renderCGU = () => (
    <>
      <Section title="Article 1 - Objet">
        <P>
          Les presentes Conditions Generales d'Utilisation (CGU) ont pour objet de definir les modalites
          et conditions d'utilisation de la plateforme ChantierPro, ainsi que les droits et obligations
          des utilisateurs.
        </P>
        <P>
          L'utilisation de la plateforme implique l'acceptation pleine et entiere des presentes CGU.
        </P>
      </Section>

      <Section title="Article 2 - Acceptation des conditions">
        <P>
          L'inscription sur ChantierPro vaut acceptation sans reserve des presentes CGU. L'utilisateur
          reconnait en avoir pris connaissance et s'engage a les respecter.
        </P>
        <P>
          ChantierPro se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs
          seront informes de toute modification par email ou notification dans l'application. La poursuite
          de l'utilisation du service apres modification vaut acceptation des nouvelles conditions.
        </P>
      </Section>

      <Section title="Article 3 - Creation de compte">
        <P>
          Pour acceder aux services de ChantierPro, l'utilisateur doit creer un compte en fournissant :
        </P>
        <UL>
          <li>Une adresse email valide</li>
          <li>Un mot de passe securise</li>
          <li>Les informations relatives a son entreprise (raison sociale, SIRET, adresse)</li>
        </UL>
        <P>
          L'utilisateur garantit l'exactitude des informations fournies et s'engage a les maintenir a jour.
          Il est responsable de la confidentialite de ses identifiants de connexion et de toute activite
          realisee depuis son compte.
        </P>
        <P>
          Un seul compte par entreprise est autorise, sauf dans le cadre d'un plan Entreprise prevoyant
          des comptes multi-utilisateurs.
        </P>
      </Section>

      <Section title="Article 4 - Obligations de l'utilisateur">
        <P>L'utilisateur s'engage a :</P>
        <UL>
          <li>Utiliser la plateforme conformement a sa destination et aux lois en vigueur</li>
          <li>Fournir des informations exactes et a jour</li>
          <li>Ne pas porter atteinte a la securite ou au fonctionnement de la plateforme</li>
          <li>Respecter les droits de propriete intellectuelle de ChantierPro et des tiers</li>
          <li>Ne pas utiliser le service a des fins illicites ou frauduleuses</li>
          <li>Sauvegarder regulierement ses donnees importantes</li>
          <li>Signaler tout dysfonctionnement ou faille de securite constatee</li>
        </UL>
      </Section>

      <Section title="Article 5 - Usages interdits">
        <P>Il est strictement interdit de :</P>
        <UL>
          <li>Tenter d'acceder de maniere non autorisee au systeme, aux serveurs ou aux reseaux de ChantierPro</li>
          <li>Utiliser des robots, scrapers ou tout autre moyen automatise pour acceder au service</li>
          <li>Reproduire, copier, vendre ou exploiter tout ou partie du service sans autorisation</li>
          <li>Transmettre des virus, malwares ou tout code malveillant</li>
          <li>Utiliser le service pour envoyer des communications non sollicitees (spam)</li>
          <li>Usurper l'identite d'un tiers ou fournir de fausses informations</li>
          <li>Contourner les mesures techniques de protection ou de limitation d'acces</li>
          <li>Partager ses identifiants de connexion avec des personnes non autorisees</li>
        </UL>
      </Section>

      <Section title="Article 6 - Propriete intellectuelle">
        <P>
          La plateforme ChantierPro, incluant sans s'y limiter son code source, son interface graphique,
          ses textes, images, logos, bases de donnees et algorithmes, est protegee par les lois francaises
          et internationales relatives a la propriete intellectuelle.
        </P>
        <P>
          L'abonnement confere a l'utilisateur un droit d'utilisation personnel, non exclusif et non
          transferable de la plateforme, pour la duree de l'abonnement.
        </P>
        <P>
          Les donnees saisies par l'utilisateur (informations clients, devis, factures, photos, documents)
          restent sa propriete exclusive. L'utilisateur accorde a ChantierPro une licence limitee pour
          traiter ces donnees dans le cadre de la fourniture du service.
        </P>
      </Section>

      <Section title="Article 7 - Limitation de responsabilite">
        <P>
          ChantierPro fournit le service « en l'etat » et ne garantit pas l'absence d'erreurs,
          d'interruptions ou de défauts.
        </P>
        <UL>
          <li>ChantierPro ne garantit pas que le service répondra à toutes les exigences spécifiques de l'utilisateur</li>
          <li>Les documents générés (devis, factures) doivent être vérifiés par l'utilisateur avant envoi</li>
          <li>ChantierPro ne se substitue pas a un expert-comptable ou a un conseiller juridique</li>
          <li>L'utilisateur est seul responsable de la conformité fiscale et réglementaire de ses documents</li>
        </UL>
        <P>
          En tout etat de cause, la responsabilite totale de ChantierPro ne pourra exceder le montant
          des sommes versees par l'utilisateur au cours des 12 derniers mois.
        </P>
      </Section>

      <Section title="Article 8 - Suspension et resiliation">
        <P>
          ChantierPro se reserve le droit de suspendre ou de resilier l'acces d'un utilisateur en cas de :
        </P>
        <UL>
          <li>Violation des presentes CGU</li>
          <li>Utilisation frauduleuse ou abusive du service</li>
          <li>Non-paiement de l'abonnement apres mise en demeure restee infructueuse</li>
          <li>Comportement portant atteinte aux autres utilisateurs ou a la plateforme</li>
        </UL>
        <P>
          En cas de suspension pour motif grave, ChantierPro se reserve le droit de ne pas rembourser
          la periode d'abonnement en cours.
        </P>
      </Section>

      <Section title="Article 9 - Disponibilite du service">
        <P>
          ChantierPro s'efforce d'assurer une disponibilite optimale de la plateforme. Toutefois,
          le service peut etre temporairement interrompu pour :
        </P>
        <UL>
          <li>Maintenance planifiee (les utilisateurs seront prevenus a l'avance)</li>
          <li>Mises a jour et ameliorations du service</li>
          <li>Cas de force majeure</li>
        </UL>
        <P>
          ChantierPro s'engage a limiter au maximum la duree et la frequence de ces interruptions.
        </P>
      </Section>

      <Section title="Article 10 - Modifications des CGU">
        <P>
          ChantierPro se reserve le droit de modifier les presentes CGU a tout moment. Les modifications
          entreront en vigueur des leur publication sur la plateforme. Les utilisateurs seront informes
          des modifications substantielles par email au moins 30 jours avant leur entree en vigueur.
        </P>
        <P>
          Si l'utilisateur n'accepte pas les nouvelles conditions, il peut resilier son abonnement avant
          leur entree en vigueur.
        </P>
      </Section>
    </>
  );

  const renderConfidentialite = () => (
    <>
      <Section title="Article 1 - Responsable du traitement">
        <P>
          Le responsable du traitement des donnees a caractere personnel collectees sur ChantierPro est :
        </P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>[A REMPLIR]</strong></li>
          <li>Adresse : [A REMPLIR]</li>
          <li>Email du DPO / referent donnees : [A REMPLIR]</li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="Article 2 - Donnees collectees">
        <P>
          ChantierPro collecte et traite les donnees suivantes, conformement au Reglement General sur la
          Protection des Donnees (RGPD - Reglement UE 2016/679) :
        </P>
        <div className={`border rounded-lg overflow-hidden mb-4 overflow-x-auto ${tableBorder}`}>
          <table className="w-full text-left text-sm" aria-label="Données personnelles collectées">
            <thead className={tableHeaderBg}>
              <tr>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Categorie de donnees</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Donnees collectees</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Finalite</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Base legale (RGPD)</th>
              </tr>
            </thead>
            <tbody className={textSecondary}>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Identite</td>
                <td className="px-4 py-3">Nom, prenom, email, telephone</td>
                <td className="px-4 py-3">Gestion du compte utilisateur</td>
                <td className="px-4 py-3">Execution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Entreprise</td>
                <td className="px-4 py-3">Raison sociale, SIRET, adresse, TVA, RCS, APE</td>
                <td className="px-4 py-3">Generation des documents legaux (devis, factures)</td>
                <td className="px-4 py-3">Execution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Clients</td>
                <td className="px-4 py-3">Nom, adresse, email, telephone des clients de l'utilisateur</td>
                <td className="px-4 py-3">Gestion des chantiers et facturation</td>
                <td className="px-4 py-3">Interet legitime (Art. 6.1.f)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Chantiers</td>
                <td className="px-4 py-3">Adresses, descriptions, budgets, planning, photos</td>
                <td className="px-4 py-3">Suivi operationnel des projets</td>
                <td className="px-4 py-3">Execution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Financieres</td>
                <td className="px-4 py-3">Montants des devis, factures, depenses, tresorerie</td>
                <td className="px-4 py-3">Gestion financiere et comptable</td>
                <td className="px-4 py-3">Execution du contrat (Art. 6.1.b)</td>
              </tr>
              <tr className={`border-b ${tableBorder}`}>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Pointage</td>
                <td className="px-4 py-3">Heures d'arrivee/depart, geolocalisation (si autorisee)</td>
                <td className="px-4 py-3">Suivi des heures de travail</td>
                <td className="px-4 py-3">Consentement (Art. 6.1.a)</td>
              </tr>
              <tr>
                <td className={`px-4 py-3 font-medium ${textPrimary}`}>Technique</td>
                <td className="px-4 py-3">Adresse IP, navigateur, appareil, journaux de connexion</td>
                <td className="px-4 py-3">Securite et amelioration du service</td>
                <td className="px-4 py-3">Interet legitime (Art. 6.1.f)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Article 3 - Duree de conservation">
        <P>Les donnees personnelles sont conservees selon les durees suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Donnees du compte :</strong> pendant toute la duree de l'abonnement, puis 30 jours apres resiliation</li>
          <li><strong className={textPrimary}>Donnees de facturation :</strong> 10 ans conformement aux obligations legales comptables (Code de commerce, Art. L123-22)</li>
          <li><strong className={textPrimary}>Donnees de connexion :</strong> 12 mois conformement a la legislation en vigueur</li>
          <li><strong className={textPrimary}>Donnees de geolocalisation :</strong> 3 mois</li>
          <li><strong className={textPrimary}>Cookies :</strong> 13 mois maximum</li>
        </UL>
        <P>
          A l'expiration de ces delais, les donnees sont supprimees ou anonymisees de maniere irreversible.
        </P>
      </Section>

      <Section title="Article 4 - Sous-traitants et transferts de donnees">
        <P>
          ChantierPro fait appel aux sous-traitants suivants pour le traitement des donnees :
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
                <td className="px-4 py-3">Base de donnees, authentification, stockage fichiers</td>
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
                <td className="px-4 py-3">Hebergement de l'application web</td>
                <td className="px-4 py-3">Global (CDN) / US</td>
                <td className="px-4 py-3">SOC 2, SCC, chiffrement en transit</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          Les transferts de donnees hors de l'Union Europeenne sont encadres par des Clauses Contractuelles
          Types (SCC) approuvees par la Commission Europeenne, conformement au chapitre V du RGPD.
        </P>
      </Section>

      <Section title="Article 5 - Droits de l'utilisateur">
        <P>
          Conformement au RGPD et a la loi Informatique et Libertes, l'utilisateur dispose des droits suivants :
        </P>
        <UL>
          <li><strong className={textPrimary}>Droit d'acces (Art. 15 RGPD) :</strong> obtenir la confirmation que des donnees le concernant sont traitees et en obtenir une copie</li>
          <li><strong className={textPrimary}>Droit de rectification (Art. 16 RGPD) :</strong> demander la correction de donnees inexactes ou incompletes</li>
          <li><strong className={textPrimary}>Droit a l'effacement (Art. 17 RGPD) :</strong> demander la suppression de ses donnees personnelles (« droit a l'oubli »)</li>
          <li><strong className={textPrimary}>Droit a la portabilite (Art. 20 RGPD) :</strong> recevoir ses donnees dans un format structure, couramment utilise et lisible par machine (JSON, CSV)</li>
          <li><strong className={textPrimary}>Droit d'opposition (Art. 21 RGPD) :</strong> s'opposer au traitement de ses donnees pour des motifs legitimes</li>
          <li><strong className={textPrimary}>Droit a la limitation (Art. 18 RGPD) :</strong> demander la limitation du traitement de ses donnees</li>
        </UL>
        <P>
          Pour exercer ces droits, l'utilisateur peut contacter le responsable du traitement a l'adresse :
          <span style={linkStyle}> [A REMPLIR - email DPO]</span>.
          Une reponse sera apportee dans un delai d'un mois a compter de la reception de la demande.
        </P>
      </Section>

      <Section title="Article 6 - Cookies">
        <P>ChantierPro utilise les cookies suivants :</P>
        <UL>
          <li><strong className={textPrimary}>Cookies essentiels :</strong> necessaires au fonctionnement de l'application (session, authentification, preferences). Base legale : interet legitime.</li>
          <li><strong className={textPrimary}>Cookies de performance :</strong> mesure d'audience anonymisee pour ameliorer le service. Base legale : consentement.</li>
        </UL>
        <P>
          ChantierPro n'utilise pas de cookies publicitaires ni de cookies de tracking tiers.
          L'utilisateur peut gerer ses preferences de cookies depuis les parametres de l'application
          ou de son navigateur.
        </P>
      </Section>

      <Section title="Article 7 - Securite des donnees">
        <P>ChantierPro met en oeuvre les mesures de securite suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Chiffrement HTTPS/TLS :</strong> toutes les communications sont chiffrees en transit</li>
          <li><strong className={textPrimary}>Row Level Security (RLS) :</strong> isolation des donnees au niveau de la base de donnees - chaque utilisateur n'accede qu'a ses propres donnees</li>
          <li><strong className={textPrimary}>Authentification JWT :</strong> tokens securises avec expiration automatique</li>
          <li><strong className={textPrimary}>Chiffrement au repos :</strong> les donnees stockees sont chiffrees (AES-256)</li>
          <li><strong className={textPrimary}>Sauvegardes automatiques :</strong> sauvegardes quotidiennes des bases de donnees</li>
          <li><strong className={textPrimary}>Mises a jour regulieres :</strong> correctifs de securite appliques en continu</li>
        </UL>
      </Section>

      <Section title="Article 8 - Violation de donnees">
        <P>
          En cas de violation de donnees a caractere personnel, ChantierPro s'engage a :
        </P>
        <UL>
          <li>Notifier la CNIL dans un delai de 72 heures conformement a l'article 33 du RGPD</li>
          <li>Informer les utilisateurs concernes dans les meilleurs delais si la violation est susceptible d'engendrer un risque eleve pour leurs droits et libertes</li>
          <li>Documenter toute violation dans un registre interne</li>
        </UL>
      </Section>

      <Section title="Article 9 - Contact et reclamations">
        <P>
          Pour toute question relative a la protection des donnees personnelles, l'utilisateur peut
          contacter : <span style={linkStyle}>[A REMPLIR - email DPO]</span>.
        </P>
        <P>
          Si l'utilisateur estime que ses droits ne sont pas respectes, il peut introduire une
          reclamation aupres de la Commission Nationale de l'Informatique et des Libertes (CNIL) :
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
      <Section title="1. Editeur du site">
        <P>Le site ChantierPro est edite par :</P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>[A REMPLIR]</strong></li>
          <li>Forme juridique : [A REMPLIR]</li>
          <li>Capital social : [A REMPLIR] euros</li>
          <li>Siege social : [A REMPLIR - Adresse complete]</li>
          <li>SIRET : [A REMPLIR]</li>
          <li>RCS : [A REMPLIR - Ville et numéro]</li>
          <li>Numéro de TVA intracommunautaire : [A REMPLIR]</li>
          <li>Email : <span style={linkStyle}>[A REMPLIR]</span></li>
          <li>Téléphone : [A REMPLIR]</li>
        </UL>
      </Section>

      <Section title="2. Directeur de la publication">
        <UL>
          <li>Nom : <strong className={textPrimary}>[A REMPLIR - Nom et prenom]</strong></li>
          <li>Qualite : [A REMPLIR - Gerant / President / etc.]</li>
          <li>Email : <span style={linkStyle}>[A REMPLIR]</span></li>
        </UL>
      </Section>

      <Section title="3. Hebergement">
        <SubSection title="Application web">
          <UL>
            <li>Hebergeur : <strong className={textPrimary}>Vercel Inc.</strong></li>
            <li>Adresse : 440 N Barranca Ave #4133, Covina, CA 91723, Etats-Unis</li>
            <li>Site web : <span style={linkStyle}>vercel.com</span></li>
          </UL>
        </SubSection>
        <SubSection title="Base de donnees et stockage">
          <UL>
            <li>Hebergeur : <strong className={textPrimary}>Supabase Inc.</strong></li>
            <li>Adresse : 970 Toa Payoh North #07-04, Singapore 318992</li>
            <li>Infrastructure : Amazon Web Services (AWS), region EU (eu-west)</li>
            <li>Site web : <span style={linkStyle}>supabase.com</span></li>
          </UL>
        </SubSection>
      </Section>

      <Section title="4. Propriete intellectuelle">
        <P>
          L'ensemble du contenu du site ChantierPro (textes, images, graphismes, logo, icones,
          logiciel, base de donnees) est protege par les lois francaises et internationales relatives
          a la propriete intellectuelle.
        </P>
        <P>
          Toute reproduction, representation, modification, publication, distribution ou retransmission,
          totale ou partielle, du contenu de ce site, par quelque procede que ce soit, sans l'autorisation
          ecrite prealable de l'editeur, est strictement interdite et constitue un delit de contrefacon
          (articles L.335-2 et suivants du Code de la propriete intellectuelle).
        </P>
      </Section>

      <Section title="5. Donnees personnelles">
        <P>
          ChantierPro collecte et traite des donnees personnelles dans le respect du Reglement General
          sur la Protection des Donnees (RGPD) et de la loi Informatique et Libertes du 6 janvier 1978 modifiee.
        </P>
        <P>
          Pour en savoir plus sur la collecte et le traitement des donnees, veuillez consulter notre{' '}
          <button
            onClick={() => setPage('confidentialite')}
            className="underline font-medium hover:opacity-80 transition-opacity"
            style={linkStyle}
          >
            Politique de Confidentialite
          </button>.
        </P>
      </Section>

      <Section title="6. Cookies">
        <P>
          Le site utilise des cookies necessaires a son bon fonctionnement. Pour plus d'informations,
          consultez notre{' '}
          <button
            onClick={() => setPage('confidentialite')}
            className="underline font-medium hover:opacity-80 transition-opacity"
            style={linkStyle}
          >
            Politique de Confidentialite
          </button>.
        </P>
      </Section>

      <Section title="7. Limitation de responsabilite">
        <P>
          L'editeur s'efforce de fournir sur le site des informations aussi precises que possible.
          Toutefois, il ne pourra etre tenu responsable des omissions, des inexactitudes et des carences
          dans la mise a jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui
          fournissent ces informations.
        </P>
        <P>
          L'editeur ne saurait etre tenu responsable des dommages directs ou indirects causes au
          materiel de l'utilisateur lors de l'acces au site, resultant soit de l'utilisation d'un
          materiel ne repondant pas aux specifications, soit de l'apparition d'un bug ou d'une incompatibilite.
        </P>
      </Section>

      <Section title="8. Droit applicable">
        <P>
          Le present site et les presentes mentions legales sont soumis au droit francais. En cas de
          litige et a defaut de resolution amiable, les tribunaux francais seront seuls competents.
        </P>
      </Section>

      <Section title="9. Contact">
        <P>
          Pour toute question ou demande d'information concernant le site, ou tout signalement de
          contenu ou d'activites illicites, l'utilisateur peut contacter l'editeur a l'adresse
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
              Derniere mise a jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
