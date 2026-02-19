/**
 * PolitiqueConfidentialite - Privacy Policy page (template)
 * @module PolitiqueConfidentialite
 */

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-900 hover:text-orange-500 transition-colors">
            <Building2 size={24} className="text-orange-500" />
            <span className="text-lg font-bold">ChantierPro</span>
          </a>
          <a href="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} />
            Retour
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Politique de confidentialité</h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Responsable du traitement</h2>
            <p className="text-slate-600 leading-relaxed">
              Le responsable du traitement des données personnelles est :<br />
              <strong>[Nom de la société]</strong><br />
              [Adresse complète]<br />
              Contact DPO : contact@chantierpro.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Données collectées</h2>
            <p className="text-slate-600 leading-relaxed">
              Dans le cadre de l'utilisation du service ChantierPro, nous collectons les données suivantes :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse email, mot de passe (chiffré)</li>
              <li><strong>Données d'entreprise :</strong> raison sociale, SIRET, adresse, téléphone, logo</li>
              <li><strong>Données métier :</strong> clients, devis, factures, chantiers, dépenses, pointages (saisies par l'utilisateur)</li>
              <li><strong>Données techniques :</strong> adresse IP, type de navigateur, données de connexion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Finalités du traitement</h2>
            <p className="text-slate-600 leading-relaxed">
              Les données sont collectées et traitées pour les finalités suivantes :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Fourniture et fonctionnement du service ChantierPro</li>
              <li>Gestion du compte utilisateur et authentification</li>
              <li>Communication relative au service (notifications, mises à jour)</li>
              <li>Amélioration du service et statistiques d'utilisation (anonymisées)</li>
              <li>Respect des obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Base légale</h2>
            <p className="text-slate-600 leading-relaxed">
              Le traitement des données repose sur :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li><strong>L'exécution du contrat :</strong> fourniture du service souscrit</li>
              <li><strong>Le consentement :</strong> lors de la création du compte</li>
              <li><strong>L'intérêt légitime :</strong> amélioration du service, sécurité</li>
              <li><strong>L'obligation légale :</strong> conservation des données de facturation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Durée de conservation</h2>
            <p className="text-slate-600 leading-relaxed">
              Les données sont conservées pendant toute la durée d'utilisation du service. En cas de suppression du compte :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Les données personnelles sont supprimées sous 30 jours</li>
              <li>Les données de facturation sont conservées 10 ans (obligation légale)</li>
              <li>Les données techniques (logs) sont conservées 12 mois</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Destinataires des données</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li><strong>Supabase :</strong> hébergement de la base de données (Singapour / UE)</li>
              <li><strong>Vercel :</strong> hébergement du site (USA, conforme Privacy Shield)</li>
              <li><strong>Autorités compétentes :</strong> uniquement sur réquisition judiciaire</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Transferts hors UE</h2>
            <p className="text-slate-600 leading-relaxed">
              Certains de nos sous-traitants sont situés hors de l'Union européenne (USA). Ces transferts sont encadrés par des clauses contractuelles types (CCT) approuvées par la Commission européenne, garantissant un niveau de protection adéquat.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Sécurité</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Isolation des données par utilisateur (Row Level Security)</li>
              <li>Sauvegardes automatiques quotidiennes</li>
              <li>Accès restreint aux données de production</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Vos droits</h2>
            <p className="text-slate-600 leading-relaxed">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format standard</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
              <li><strong>Droit à la limitation :</strong> restreindre le traitement</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Pour exercer vos droits, contactez-nous à : <a href="mailto:contact@chantierpro.fr" className="text-orange-500 hover:underline">contact@chantierpro.fr</a>
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" className="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro utilise uniquement des cookies strictement nécessaires au fonctionnement du service :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>Cookie d'authentification (session Supabase)</li>
              <li>Préférences utilisateur (thème, dernière page visitée)</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-2">
              Aucun cookie publicitaire, de tracking ou d'analyse tiers n'est utilisé. Aucun consentement n'est requis pour les cookies strictement nécessaires conformément à la directive ePrivacy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Modifications</h2>
            <p className="text-slate-600 leading-relaxed">
              Cette politique de confidentialité peut être mise à jour. En cas de modification substantielle, les utilisateurs seront informés par email ou notification dans l'application. La date de dernière mise à jour est indiquée ci-dessous.
            </p>
          </section>
        </div>

        <p className="text-sm text-slate-400 mt-12">Dernière mise à jour : février 2025</p>
      </main>
    </div>
  );
}
