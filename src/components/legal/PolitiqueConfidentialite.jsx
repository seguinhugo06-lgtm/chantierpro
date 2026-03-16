import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function PolitiqueConfidentialite() {
  return (
    <LegalPageLayout title="Politique de confidentialité" lastUpdated="15 mars 2026">
      <h2>1. Responsable du traitement</h2>
      <p>
        BatiGesti SAS est responsable du traitement des données personnelles collectées
        via l'application batigesti.fr, conformément au Règlement Général sur la Protection
        des Données (RGPD - UE 2016/679) et à la loi Informatique et Libertés.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li><strong>Données d'inscription</strong> : email, mot de passe (hashé), nom de l'entreprise</li>
        <li><strong>Données d'entreprise</strong> : raison sociale, SIRET, adresse, téléphone, logo</li>
        <li><strong>Données métier</strong> : clients, devis, factures, chantiers, catalogue, photos</li>
        <li><strong>Données techniques</strong> : adresse IP, type de navigateur, système d'exploitation</li>
        <li><strong>Données de paiement</strong> : traitées par Stripe (nous ne stockons pas les numéros de carte)</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <ul>
        <li>Fourniture et amélioration du service</li>
        <li>Gestion des comptes utilisateurs et des abonnements</li>
        <li>Envoi de notifications liées au service (emails transactionnels)</li>
        <li>Conformité aux obligations légales (facturation, archivage)</li>
        <li>Analyse anonymisée de l'utilisation pour améliorer le service</li>
      </ul>

      <h2>4. Base légale</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> : fourniture du service, gestion du compte</li>
        <li><strong>Obligation légale</strong> : conservation des factures, conformité fiscale</li>
        <li><strong>Intérêt légitime</strong> : amélioration du service, sécurité</li>
      </ul>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li><strong>Données du compte</strong> : durée de l'abonnement + 3 ans</li>
        <li><strong>Factures et documents comptables</strong> : 10 ans (obligation légale)</li>
        <li><strong>Logs de connexion</strong> : 12 mois</li>
        <li><strong>Données de paiement</strong> : gérées par Stripe selon leur politique</li>
      </ul>

      <h2>6. Partage des données</h2>
      <p>Vos données peuvent être partagées avec :</p>
      <ul>
        <li><strong>Supabase</strong> (hébergement base de données) — UE/Irlande</li>
        <li><strong>Vercel</strong> (hébergement application) — États-Unis (clauses contractuelles types)</li>
        <li><strong>Stripe</strong> (paiements) — États-Unis (Privacy Shield, CCT)</li>
        <li><strong>SendGrid</strong> (emails) — États-Unis (CCT)</li>
      </ul>
      <p>Nous ne vendons jamais vos données à des tiers.</p>

      <h2>7. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures de sécurité appropriées : chiffrement TLS en transit,
        chiffrement au repos, authentification JWT, Row Level Security (RLS) sur la base de
        données, hashing bcrypt des mots de passe, et archivage SHA-256 des documents.
      </p>

      <h2>8. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger vos données</li>
        <li><strong>Droit à l'effacement</strong> : supprimer vos données</li>
        <li><strong>Droit à la portabilité</strong> : exporter vos données</li>
        <li><strong>Droit d'opposition</strong> : vous opposer au traitement</li>
        <li><strong>Droit à la limitation</strong> : limiter le traitement</li>
      </ul>
      <p>
        Pour exercer vos droits, contactez-nous à{' '}
        <a href="mailto:contact@batigesti.fr">contact@batigesti.fr</a>.
        Nous répondrons dans un délai de 30 jours.
      </p>

      <h2>9. Cookies</h2>
      <p>
        BatiGesti utilise uniquement des cookies essentiels au fonctionnement du service
        (authentification, préférences d'interface). Aucun cookie publicitaire ou de
        tracking tiers n'est utilisé. Le consentement pour ces cookies essentiels n'est
        pas requis au sens de la directive ePrivacy.
      </p>

      <h2>10. Contact</h2>
      <p>
        Pour toute question relative à la protection de vos données, contactez-nous à{' '}
        <a href="mailto:contact@batigesti.fr">contact@batigesti.fr</a>.
      </p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
      </p>
    </LegalPageLayout>
  );
}
