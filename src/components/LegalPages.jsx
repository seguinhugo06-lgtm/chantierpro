import { ArrowLeft, Shield, FileText, Scale, Lock, Trash2 } from 'lucide-react';
import { CGV_ARTICLE_4_PLANS, CGV_ARTICLE_4_TVA, libelleVersionCgv } from '../lib/cgv';
import { COMPANY, ADRESSE } from '../lib/editeur';
import TexteCgu from './legal/TexteCgu';

// Identité de l'éditeur (COMPANY, ADRESSE) : src/lib/editeur.js, partagée avec le texte des CGU (TexteCgu.jsx)

export default function LegalPages({ page, couleur: _couleur, setPage }) {
  // Theme classes
  const mainBg = 'bg-fond';
  const cardBg = 'bg-surface border-bord';
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const tableBorder = 'border-bord-fort';
  const tableHeaderBg = 'bg-surface-2';

  const pageConfig = {
    cgv: { title: 'Conditions Générales de Vente', icon: FileText },
    cgu: { title: "Conditions Générales d'Utilisation", icon: Scale },
    confidentialite: { title: 'Politique de Confidentialité', icon: Lock },
    'mentions-legales': { title: 'Mentions Légales', icon: Shield },
    accessibilite: { title: 'Déclaration d\'Accessibilité', icon: Shield },
    'supprimer-mon-compte': { title: 'Supprimer mon compte', icon: Trash2 },
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
      {/* Version en vigueur : la date d'effet de ce texte (CGV_VERSION), pas la date du jour */}
      <p className={`mb-8 text-sm font-medium ${textSecondary}`}>{libelleVersionCgv()}</p>

      <Section title="Article 1 - Éditeur">
        <P>
          Le site Mallettico est édité par : <strong className={textPrimary}>{COMPANY.nom}</strong>
        </P>
        <UL>
          <li>Forme juridique : {COMPANY.forme}</li>
          {COMPANY.capital && <li>Capital social : {COMPANY.capital} euros</li>}
          <li>Adresse : {ADRESSE}</li>
          <li>SIREN : {COMPANY.siren}</li>
          {COMPANY.rcs && <li>RCS : {COMPANY.rcs}</li>}
          {COMPANY.tva && <li>Numéro de TVA intracommunautaire : {COMPANY.tva}</li>}
          <li>Email : {COMPANY.email}</li>
          {COMPANY.tel && <li>Téléphone : {COMPANY.tel}</li>}
        </UL>
      </Section>

      <Section title="Article 2 - Objet">
        <P>
          Les présentes Conditions Générales de Vente (CGV) ont pour objet de définir les droits et obligations
          des parties dans le cadre de la vente des services proposés par Mallettico, plateforme de gestion
          de chantiers et d'activité pour les professionnels du bâtiment.
        </P>
        <P>
          Toute souscription à un abonnement implique l'acceptation sans réserve des présentes CGV.
        </P>
      </Section>

      <Section title="Article 3 - Description des services">
        <P>
          Mallettico est une application web (SaaS) permettant aux professionnels du bâtiment de :
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
        <P>Mallettico propose les plans d'abonnement suivants :</P>
        <div className={`border rounded-lg overflow-hidden mb-4 ${tableBorder}`}>
          <table className="w-full text-left" aria-label="Plans tarifaires Mallettico">
            <thead className={tableHeaderBg}>
              <tr>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Plan</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Prix</th>
                <th scope="col" className={`px-4 py-3 font-semibold ${textPrimary} border-b ${tableBorder}`}>Description</th>
              </tr>
            </thead>
            <tbody>
              {/* Article 4 figé pour la version des CGV (src/lib/cgv.js) : il ne se recalcule plus depuis PLANS. Un test
                  le compare à PLANS et échoue si PLANS change (relecture juridique du 20 oct. 2026 : changer PLANS
                  modifiait le contrat en silence). Avant : « 2 chantiers actifs », « signatures électroniques, export
                  comptable » sous Artisan et « Jusqu'à 10 utilisateurs… » sous Équipe, corrigés le 20 oct. */}
              {CGV_ARTICLE_4_PLANS.map((ligne, i) => (
                <tr key={ligne.plan} className={i < CGV_ARTICLE_4_PLANS.length - 1 ? `border-b ${tableBorder}` : undefined}>
                  <td className={`px-4 py-3 font-medium ${textPrimary}`}>{ligne.plan}</td>
                  <td className={`px-4 py-3 ${textSecondary}`}>{ligne.prix}</td>
                  <td className={`px-4 py-3 ${textSecondary}`}>{ligne.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>{CGV_ARTICLE_4_TVA}</P>
        {/* D-19 : la sortie de franchise doit être écrite dans les CGV (relecture juriste du 20 oct. 2026) */}
        <P>
          Si l'éditeur cesse de bénéficier de la franchise en base de TVA, la TVA au taux en vigueur (20 % à ce jour)
          s'ajoutera aux prix indiqués à compter de l'échéance suivant ce changement. Le prix hors taxes du tarif
          fondateur reste celui indiqué. L'utilisateur est prévenu par e-mail au moins 30 jours avant et peut résilier
          sans frais avant cette date.
        </P>
      </Section>

      <Section title="Article 5 - Modalités de paiement">
        <P>
          Le paiement des abonnements est effectué par carte bancaire via la plateforme sécurisée
          <strong> Stripe</strong>. Il est prélevé automatiquement chaque mois (abonnement mensuel) ou une fois par an
          (abonnement annuel, payé pour douze mois), à la date anniversaire de la souscription.
        </P>
        <UL>
          <li>Le paiement se fait sur la page sécurisée de Stripe (connexion chiffrée TLS)</li>
          <li>Stripe est certifié PCI DSS niveau 1</li>
          <li>Mallettico ne stocke aucune donnée de carte bancaire</li>
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
          <span className="text-accent-texte"> {COMPANY.email}</span>.
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
          L'abonnement est souscrit pour une durée indéterminée, avec une facturation mensuelle ou annuelle selon la
          périodicité choisie.
        </P>
        <UL>
          <li>L'utilisateur peut résilier son abonnement à tout moment depuis son espace client ou par email</li>
          <li>La résiliation prend effet à la fin de la période de facturation en cours (le mois, ou l'année pour un
            abonnement annuel) ; la période déjà payée n'est pas remboursée, sous réserve du droit de rétractation de
            l'article 6</li>
          <li>L'accès aux fonctionnalités payantes est maintenu jusqu'à la fin de la période payée</li>
          <li>À la fin de l'abonnement, le compte revient au plan Gratuit : les données sont conservées et restent exportables</li>
          <li>L'utilisateur peut supprimer son compte et ses données depuis « Supprimer mon compte ». Si un abonnement
            payant est en cours, il faut d'abord le résilier ; si des membres d'équipe dépendent du compte, il faut
            d'abord les retirer. La suppression est ensuite immédiate et définitive</li>
        </UL>
      </Section>

      <Section title="Article 8 - Responsabilité">
        <P>
          Mallettico s'engage à fournir un service de qualité et à assurer la disponibilité de la plateforme.
          Toutefois, Mallettico ne saurait être tenu responsable :
        </P>
        <UL>
          <li>Des interruptions temporaires du service pour maintenance ou mise à jour</li>
          <li>Des dommages résultant d'une mauvaise utilisation du service par l'utilisateur</li>
          <li>Des pertes de données résultant d'une défaillance technique indépendante de sa volonté</li>
          <li>De l'inexactitude des informations saisies par l'utilisateur</li>
          <li>Des conséquences fiscales ou juridiques liées à l'utilisation des documents générés (devis, factures)</li>
        </UL>
        <P>
          La responsabilité de Mallettico est limitée au montant des sommes effectivement versées par
          l'utilisateur au cours des 12 derniers mois précédant le fait générateur de la responsabilité.
        </P>
      </Section>

      <Section title="Article 9 - Propriété intellectuelle">
        <P>
          L'ensemble des éléments constituant la plateforme Mallettico (logiciel, interface, textes, images,
          base de données, algorithmes) sont protégés par le droit de la propriété intellectuelle et restent
          la propriété exclusive de Mallettico.
        </P>
        <P>
          L'utilisateur conserve la propriété intégrale de toutes les données qu'il saisit dans la plateforme
          (informations clients, devis, factures, photos, etc.).
        </P>
      </Section>

      <Section title="Article 10 - Modification des conditions">
        <P>
          L'éditeur peut modifier les présentes conditions et le contenu des offres pour un motif légitime (évolution
          du service, de la loi ou de la réglementation). Toute modification qui augmente le prix ou réduit les droits de
          l'utilisateur lui est notifiée par e-mail, à l'adresse de son compte, au moins 30 jours avant son entrée en
          vigueur ; elle ne s'applique pas à la période déjà payée. L'utilisateur qui la refuse peut résilier sans frais
          avant cette date, selon l'article 7. Le prix hors taxes du tarif fondateur (article 4) n'est pas modifié par
          cette faculté. Les corrections de forme et les modifications imposées par la loi s'appliquent dès leur
          publication ou à la date que la loi fixe.
        </P>
      </Section>

      <Section title="Article 11 - Droit applicable et litiges">
        <P>
          Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à
          rechercher une solution amiable avant toute action judiciaire.
        </P>
        <P>
          À défaut de résolution amiable dans un délai de 30 jours, le litige sera soumis aux tribunaux
          compétents du ressort du siège social de l'éditeur.
        </P>
        <P>
          {COMPANY.mediateur
            ? <>Conformément aux dispositions du Code de la consommation concernant le règlement amiable des litiges, l'utilisateur peut recourir au service de médiation : {COMPANY.mediateur}.</>
            : <>Le service s'adresse aux professionnels ; en cas de différend, écrivez d'abord à {COMPANY.email} pour rechercher une solution amiable.</>}
        </P>
      </Section>
    </>
  );

  // Texte des CGU : un seul, partagé avec la fenêtre d'acceptation (components/legal/TexteCgu.jsx, avis juriste H1)
  const renderCGU = () => <TexteCgu versConfidentialite={() => setPage('confidentialite')} />;

  const renderConfidentialite = () => (
    <>
      <p className={`mb-8 text-sm font-medium ${textSecondary}`}>Version du 24 octobre 2026</p>
      <Section title="Article 1 - Responsable du traitement">
        <P>
          Le responsable du traitement des données à caractère personnel collectées sur Mallettico est :
        </P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>{COMPANY.nom}</strong></li>
          <li>Adresse : {ADRESSE}</li>
          <li>Email du DPO / référent données : {COMPANY.dpo}</li>
          {COMPANY.tel && <li>Téléphone : {COMPANY.tel}</li>}
        </UL>
      </Section>

      <Section title="Article 2 - Données collectées">
        <P>
          Mallettico collecte et traite les données suivantes, conformément au Règlement Général sur la
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
        {/* Rappels de ramonage (tâche ramonage, D-30 ; texte de la relecture juriste-btp du 24 oct. 2026) */}
        <P>
          <strong className={textPrimary}>Rappels de ramonage.</strong> Si un utilisateur active l'envoi automatique des rappels (Paramètres → Ramonage), Mallettico envoie en son nom, une seule fois par échéance, un e-mail à ses clients dont le prochain ramonage approche. Données utilisées : nom, prénom et adresse e-mail du client, date du dernier ramonage, type d'appareil et pièce, date conseillée du prochain ramonage. L'utilisateur est responsable de ce traitement ; Mallettico agit pour son compte, comme sous-traitant (RGPD, art. 28), et n'utilise ces données à aucune autre fin. Chaque e-mail contient un lien qui enregistre, sans compte, le refus du client ; la date du refus est conservée tant que le compte de l'utilisateur existe. Les e-mails sont envoyés par Resend (article 4).
        </P>
      </Section>

      <Section title="Article 3 - Durée de conservation">
        <P>Les données personnelles sont conservées selon les durées suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Données du compte et données que vous saisissez (devis, factures, clients, chantiers…) :</strong> tant que votre compte existe, y compris au plan Gratuit après la résiliation d'un abonnement ; elles sont effacées dès que vous supprimez votre compte (voir « Supprimer mon compte »)</li>
          <li><strong className={textPrimary}>Factures de votre abonnement Mallettico :</strong> 10 ans à compter de la clôture de l'exercice (Code de commerce, Art. L123-22), chez notre prestataire de paiement Stripe. Les devis et factures que vous établissez pour vos clients sont les vôtres : vous devez les conserver 10 ans ; ils sont effacés avec votre compte, téléchargez-les avant</li>
          <li><strong className={textPrimary}>Données de connexion :</strong> 12 mois conformément à la législation en vigueur</li>
          <li><strong className={textPrimary}>Données de géolocalisation :</strong> 3 mois</li>
        </UL>
        <P>
          À l'expiration de ces délais, les données sont supprimées ou anonymisées de manière irréversible.
        </P>
      </Section>

      <Section title="Article 4 - Sous-traitants et transferts de données">
        <P>
          Mallettico fait appel aux sous-traitants suivants pour le traitement des données :
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
                <td className="px-4 py-3">France (AWS eu-west-3, Paris)</td>
                <td className="px-4 py-3">SOC 2 Type 2 et chiffrement AES-256 au repos, selon Supabase ; accord de traitement des données (DPA)</td>
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
                <td className="px-4 py-3">Accord de traitement des données ; chiffrement TLS à l'envoi</td>
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
          <li><strong className={textPrimary}>Droit à l'effacement (Art. 17 RGPD) :</strong> demander la suppression de ses données personnelles (« droit à l'oubli ») ; comment supprimer son compte et ce qui est effacé :{' '}
            <button type="button" onClick={() => setPage('supprimer-mon-compte')} className="text-accent-texte underline font-medium">Supprimer mon compte</button></li>
          <li><strong className={textPrimary}>Droit à la portabilité (Art. 20 RGPD) :</strong> recevoir ses données dans un format structuré, couramment utilisé et lisible par machine (JSON, CSV)</li>
          <li><strong className={textPrimary}>Droit d'opposition (Art. 21 RGPD) :</strong> s'opposer au traitement de ses données pour des motifs légitimes</li>
          <li><strong className={textPrimary}>Droit à la limitation (Art. 18 RGPD) :</strong> demander la limitation du traitement de ses données</li>
        </UL>
        <P>
          Pour exercer ces droits, l'utilisateur peut contacter le responsable du traitement à l'adresse :
          <span className="text-accent-texte"> {COMPANY.dpo}</span>.
          Une réponse sera apportée dans un délai d'un mois à compter de la réception de la demande.
        </P>
      </Section>

      {/* Texte de la relecture juriste du 25 oct. 2026 (R-C2) : aucun traceur soumis à consentement n'est chargé (le script
          de mesure d'audience a été retiré le 16 mars 2026, et le bandeau avec lui). À réécrire AVANT d'en activer un. */}
      <Section title="Article 6 - Cookies et autres traceurs">
        <P>
          Mallettico n'enregistre sur votre appareil que ce qui est nécessaire au service que vous demandez : votre connexion, vos préférences d'affichage et vos brouillons en cours. Ces éléments ne demandent pas votre consentement (loi du 6 janvier 1978, art. 82). Mallettico n'utilise ni traceur de mesure d'audience, ni traceur publicitaire, ni suivi entre sites. Si cela change, cette page sera mise à jour et votre accord sera demandé avant tout traceur qui l'exige.
        </P>
      </Section>

      <Section title="Article 7 - Sécurité des données">
        <P>Mallettico met en oeuvre les mesures de sécurité suivantes :</P>
        <UL>
          <li><strong className={textPrimary}>Chiffrement HTTPS/TLS :</strong> les échanges entre votre navigateur et l'application passent par HTTPS (TLS)</li>
          <li><strong className={textPrimary}>Row Level Security (RLS) :</strong> isolation des données au niveau de la base de données - chaque organisation n'accède qu'à ses propres données ; au sein d'une équipe, chaque membre voit ce que son
            rôle autorise</li>
          <li><strong className={textPrimary}>Authentification JWT :</strong> tokens sécurisés avec expiration automatique</li>
          <li><strong className={textPrimary}>Chiffrement au repos :</strong> chez notre hébergeur de base de données
            (Supabase), les données stockées sont chiffrées au repos (AES-256, selon sa documentation)</li>
          <li><strong className={textPrimary}>Mises à jour régulières :</strong> les mises à jour de sécurité sont appliquées régulièrement</li>
        </UL>
      </Section>

      <Section title="Article 8 - Violation de données">
        <P>
          En cas de violation de données à caractère personnel, Mallettico s'engage à:
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
          contacter : <span className="text-accent-texte">{COMPANY.dpo}</span>.
        </P>
        <P>
          Si l'utilisateur estime que ses droits ne sont pas respectés, il peut introduire une
          réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
        </P>
        <UL>
          <li>Site web : <span className="text-accent-texte">www.cnil.fr</span></li>
          <li>Adresse : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
          <li>Téléphone : 01 53 73 22 22</li>
        </UL>
      </Section>
    </>
  );

  const renderMentionsLegales = () => (
    <>
      <Section title="1. Éditeur du site">
        <P>Le site Mallettico est édité par :</P>
        <UL>
          <li>Raison sociale : <strong className={textPrimary}>{COMPANY.nom}</strong></li>
          <li>Forme juridique : {COMPANY.forme}</li>
          {COMPANY.capital && <li>Capital social : {COMPANY.capital} euros</li>}
          <li>Adresse : {ADRESSE}</li>
          <li>SIREN : {COMPANY.siren}</li>
          {COMPANY.rcs && <li>RCS : {COMPANY.rcs}</li>}
          {COMPANY.tva && <li>Numéro de TVA intracommunautaire : {COMPANY.tva}</li>}
          <li>Email : <span className="text-accent-texte">{COMPANY.email}</span></li>
          {COMPANY.tel && <li>Téléphone : {COMPANY.tel}</li>}
        </UL>
      </Section>

      <Section title="2. Directeur de la publication">
        <UL>
          <li>Nom : <strong className={textPrimary}>{COMPANY.directeur}</strong></li>
          <li>Qualité : {COMPANY.qualite}</li>
          <li>Email : <span className="text-accent-texte">{COMPANY.email}</span></li>
        </UL>
      </Section>

      <Section title="3. Hébergement">
        <SubSection title="Application web">
          <UL>
            <li>Hébergeur : <strong className={textPrimary}>Vercel Inc.</strong></li>
            <li>Adresse : 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
            <li>Site web : <span className="text-accent-texte">vercel.com</span></li>
          </UL>
        </SubSection>
        <SubSection title="Base de données et stockage">
          <UL>
            <li>Hébergeur : <strong className={textPrimary}>Supabase Inc.</strong></li>
            <li>Adresse : 970 Toa Payoh North #07-04, Singapore 318992</li>
            <li>Infrastructure : Amazon Web Services (AWS), région eu-west-3 (Paris, France)</li>
            <li>Site web : <span className="text-accent-texte">supabase.com</span></li>
          </UL>
        </SubSection>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <P>
          L'ensemble du contenu du site Mallettico (textes, images, graphismes, logo, icônes,
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
          Mallettico collecte et traite des données personnelles dans le respect du Règlement Général
          sur la Protection des Données (RGPD) et de la loi Informatique et Libertés du 6 janvier 1978 modifiée.
        </P>
        <P>
          Pour en savoir plus sur la collecte et le traitement des données, veuillez consulter notre{' '}
          <button
            onClick={() => setPage('confidentialite')}
            className="text-accent-texte underline font-medium hover:opacity-80 transition-opacity"
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
            className="text-accent-texte underline font-medium hover:opacity-80 transition-opacity"
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
          email suivante : <span className="text-accent-texte">{COMPANY.email}</span>.
        </P>
      </Section>
    </>
  );

  // Page publique « Supprimer mon compte » (Google Play l'exige en plus de la suppression dans l'app). Elle décrit
  // ce que fait réellement supprimer_mon_compte (migration 072) et l'écran Paramètres › Avancé › Données.
  const renderSuppressionCompte = () => (
    <>
      <P>Vous pouvez supprimer votre compte Mallettico depuis l'application, ou le demander par e-mail sans ouvrir l'application (voir plus bas).</P>
      <Section title="Depuis l'application">
        <P>Connectez-vous à Mallettico, puis ouvrez <strong className={textPrimary}>Paramètres › Avancé › Données</strong> et choisissez «&nbsp;Supprimer mon compte&nbsp;».</P>
        <UL>
          <li>Si vous avez un abonnement payant, résiliez-le d'abord (« Gérer mon abonnement ») : sinon il continuerait d'être prélevé, et la suppression est refusée.</li>
          <li>Avant de continuer, téléchargez le PDF de vos factures et de vos devis signés : vous devez conserver vos factures 10 ans (Code de commerce, art. L123-22), sous la forme où vous les avez envoyées. Le bouton « Exporter mes données d'abord » fournit en plus un fichier de vos données (JSON), qui ne remplace pas les factures. Après la suppression, Mallettico ne pourra plus vous les rendre.</li>
          <li>Si un client particulier a signé un devis en ligne il y a moins de 14 jours, sa page de signature et son bouton « renoncer au contrat ici » disparaîtront : attendez la fin de son délai de rétractation avant de supprimer votre compte.</li>
          <li>Tapez le mot demandé pour confirmer. La suppression est immédiate et définitive.</li>
          <li>Si vous êtes le propriétaire d'une équipe qui compte d'autres membres, retirez-les d'abord : la suppression est refusée tant qu'ils en font partie.</li>
        </UL>
      </Section>
      <Section title="Ce qui est supprimé">
        <UL>
          <li>Votre compte : adresse e-mail et mot de passe ; vous ne pourrez plus vous connecter.</li>
          <li>Vos devis, factures, clients, chantiers, photos et fichiers, notes, plannings et paramètres, y compris vos réglages de paiement et de banque.</li>
          <li>Les liens de signature et de paiement déjà envoyés à vos clients cessent de fonctionner.</li>
          <li>Si vous étiez membre de l'équipe d'un autre artisan : ce que vous avez créé dans son équipe (devis, clients…) reste à l'entreprise et lui est rattaché ; vos photos et fichiers, vos réglages de paiement et de banque sont supprimés.</li>
        </UL>
      </Section>
      <Section title="Ce qui est conservé">
        <UL>
          <li>Une trace de la suppression : un identifiant technique et la date, sans nom ni adresse e-mail, pour pouvoir répondre d'une suppression demandée.</li>
          <li>Si vous avez été abonné : les factures de votre abonnement Mallettico et la fiche client qui les accompagne (nom, adresse e-mail), conservées chez notre prestataire de paiement Stripe pendant 10 ans (obligation comptable, Code de commerce, art. L123-22).</li>
        </UL>
      </Section>
      <Section title="Sans accès à l'application">
        <P>
          Écrivez à <a href={`mailto:${COMPANY.dpo}?subject=Supprimer%20mon%20compte`} className="text-accent-texte underline font-medium">{COMPANY.dpo}</a> depuis l'adresse e-mail de votre compte, avec l'objet «&nbsp;Supprimer mon compte&nbsp;».
          Nous vérifions que la demande vient bien de vous. Si un abonnement payant est en cours, nous le résilions. Si d'autres membres utilisent votre équipe, nous vous demandons d'abord de confirmer qu'ils perdront l'accès à l'espace de l'entreprise.
          Puis nous supprimons le compte et les données décrites ci-dessus. Vous recevez une réponse dans un délai d'un mois au plus (RGPD, art. 12).
        </P>
        <P>
          Pour en savoir plus sur vos données et vos droits :{' '}
          <button type="button" onClick={() => setPage('confidentialite')} className="text-accent-texte underline font-medium">politique de confidentialité</button>.
        </P>
      </Section>
    </>
  );

  const renderAccessibilite = () => (
    <>
      <Section title="1. État de conformité">
        <P>
          Mallettico s'engage à rendre son service accessible conformément à l'article 47 de la loi n°2005-102
          du 11 février 2005 et au Référentiel Général d'Amélioration de l'Accessibilité (RGAA) version 4.1.
        </P>
        <P>
          <strong className={textPrimary}>Niveau de conformité visé :</strong> WCAG 2.1 niveau AA (partiellement conforme).
        </P>
        <P>
          Cette déclaration a été établie le 5 avril 2026. Elle a été réalisée par auto-évaluation.
        </P>
      </Section>

      <Section title="2. Résultats des tests">
        <P>Les points suivants ont été vérifiés :</P>
        <UL>
          <li>✅ Navigation au clavier fonctionnelle (Tab, Enter, Escape)</li>
          <li>✅ Labels visibles sur tous les champs de formulaire</li>
          <li>✅ Dark mode avec contrastes adaptés</li>
          <li>✅ Touch targets ≥ 44px sur les boutons principaux</li>
          <li>✅ Textes alternatifs sur les icônes interactives (aria-label)</li>
          <li>✅ Modales fermables via Escape et bouton X</li>
          <li>⚠️ Certains graphiques (recharts) manquent de descriptions textuelles alternatives</li>
          <li>⚠️ Quelques contrastes insuffisants sur les textes gris clair en mode clair</li>
        </UL>
      </Section>

      <Section title="3. Contenus non accessibles">
        <SubSection title="Non-conformités">
          <UL>
            <li>Certains graphiques SVG et charts recharts ne disposent pas d'alternative textuelle complète</li>
            <li>Quelques boutons d'icône uniquement manquent d'aria-label dans les vues secondaires</li>
            <li>Le contraste de certains textes secondaires (gris clair) peut être insuffisant en mode clair</li>
          </UL>
        </SubSection>
        <SubSection title="Dérogations">
          <P>Aucune dérogation n'est invoquée.</P>
        </SubSection>
      </Section>

      <Section title="4. Technologies utilisées">
        <UL>
          <li>HTML5</li>
          <li>CSS3 (Tailwind CSS)</li>
          <li>JavaScript (React 18)</li>
          <li>SVG (graphiques et icônes)</li>
          <li>WAI-ARIA (attributs d'accessibilité)</li>
        </UL>
      </Section>

      <Section title="5. Environnement de test">
        <P>Les vérifications ont été effectuées avec :</P>
        <UL>
          <li>Google Chrome 124+ (desktop et mobile)</li>
          <li>Safari 17+ (iOS)</li>
          <li>Firefox 125+</li>
          <li>Lecteur d'écran VoiceOver (macOS/iOS)</li>
        </UL>
      </Section>

      <Section title="6. Retour d'information et contact">
        <P>
          Si vous rencontrez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou
          une fonctionnalité du service, vous pouvez nous contacter :
        </P>
        <UL>
          <li>Email : <span className="text-accent-texte">{COMPANY.email}</span></li>
          {COMPANY.tel && <li>Téléphone : {COMPANY.tel}</li>}
        </UL>
        <P>
          Nous nous engageons à vous répondre dans un délai de 7 jours ouvrés et à mettre en œuvre
          une solution de contournement dans un délai raisonnable.
        </P>
      </Section>

      <Section title="7. Voies de recours">
        <P>
          Si vous constatez un défaut d'accessibilité et que vous n'obtenez pas de réponse satisfaisante
          de notre part, vous avez le droit de saisir le Défenseur des droits :
        </P>
        <UL>
          <li>Formulaire en ligne : <span className="text-accent-texte">https://formulaire.defenseurdesdroits.fr</span></li>
          <li>Par courrier : Défenseur des droits, Libre réponse 71120, 75342 Paris Cedex 07</li>
          <li>Par téléphone : 09 69 39 00 00</li>
        </UL>
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
      case 'accessibilite':
        return renderAccessibilite();
      case 'supprimer-mon-compte':
        return renderSuppressionCompte();
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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-surface-2 text-encre-2`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent/10">
              <Icon className="w-5 h-5 text-accent-texte" aria-hidden="true" />
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

          {/* Plus de « Dernière mise à jour » calculée à la date du jour : elle affichait toujours aujourd'hui, sur des
              textes qui n'avaient pas changé. Les CGV portent leur version en tête (CGV_VERSION, src/lib/cgv.js). */}
        </div>
      </div>
    </div>
  );
}
