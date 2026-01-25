/**
 * MaPrimeRénov' Document Templates
 * PDF generation templates for compliant MaPrimeRénov' documents
 */

import { TRAVAUX_ELIGIBLES, REVENUE_CATEGORIES } from '../compliance/renovation-compliance';

// ============ CONSTANTS ============

const MENTIONS_MAPRIMERENOV = [
  'Devis établi dans le cadre de MaPrimeRénov\' - Aide à la rénovation énergétique',
  'L\'entreprise est certifiée RGE (Reconnu Garant de l\'Environnement)',
  'Travaux éligibles à MaPrimeRénov\' sous réserve d\'acceptation du dossier par l\'ANAH',
  'Le client doit créer son compte sur maprimerenov.gouv.fr AVANT signature du devis',
  'TVA à taux réduit de 5,5% applicable conformément à l\'article 278-0 bis du CGI'
];

const DOCUMENTS_REQUIS_CLIENT = [
  { id: 'avis_imposition', label: 'Dernier avis d\'imposition', obligatoire: true },
  { id: 'justificatif_propriete', label: 'Justificatif de propriété (titre ou taxe foncière)', obligatoire: true },
  { id: 'devis', label: 'Devis détaillé de l\'entreprise RGE', obligatoire: true },
  { id: 'piece_identite', label: 'Pièce d\'identité', obligatoire: true },
  { id: 'rib', label: 'RIB pour le versement de l\'aide', obligatoire: true }
];

const ETAPES_DEMARCHES = [
  { numero: 1, titre: 'Créer votre compte', description: 'Rendez-vous sur maprimerenov.gouv.fr et créez votre compte personnel' },
  { numero: 2, titre: 'Déposer le devis', description: 'Téléchargez ce devis ainsi que vos justificatifs sur votre espace' },
  { numero: 3, titre: 'Attendre la validation', description: 'L\'ANAH examine votre dossier (délai: 2 à 3 semaines)' },
  { numero: 4, titre: 'Signer le devis', description: 'IMPORTANT: Ne signez le devis qu\'APRÈS réception de l\'accord de l\'ANAH' },
  { numero: 5, titre: 'Réaliser les travaux', description: 'L\'entreprise réalise les travaux conformément au devis validé' },
  { numero: 6, titre: 'Demander le paiement', description: 'Après travaux, téléchargez la facture pour recevoir votre aide' }
];

// ============ TEMPLATE GENERATORS ============

/**
 * Generate MaPrimeRénov' compliant devis data
 * @param {Object} params - Parameters for the devis
 * @returns {Object} Complete devis data structure
 */
export function generateDevisRGE({
  company,
  client,
  travaux,
  categorieRevenus,
  notes = ''
}) {
  const now = new Date();
  const validite = new Date(now);
  validite.setDate(validite.getDate() + 60); // 60 days validity for MaPrimeRénov

  // Calculate totals
  let totalHT = 0;
  const lignes = travaux.map(t => {
    const travailInfo = Object.values(TRAVAUX_ELIGIBLES)
      .flatMap(cat => Object.values(cat))
      .find(tr => tr.id === t.id);

    if (!travailInfo) return null;

    const prixUnitaire = t.prix_unitaire || (travailInfo.montants[categorieRevenus?.id] || 0) * 4; // Estimation prix marché
    const totalLigne = prixUnitaire * t.quantite;
    totalHT += totalLigne;

    return {
      description: travailInfo.label,
      quantite: t.quantite,
      unite: travailInfo.unite.includes('m²') ? 'm²' : 'u',
      prix_unitaire: prixUnitaire,
      total_ht: totalLigne,
      details_techniques: {
        type: travailInfo.id,
        category: travailInfo.category,
        conditions: travailInfo.conditions,
        resistance_thermique: t.resistance_thermique || null,
        cop_scop: t.cop_scop || null,
        marque_reference: t.marque_reference || null,
        certification: t.certification || null
      }
    };
  }).filter(Boolean);

  const tvaRate = 5.5; // Taux réduit rénovation énergétique
  const montantTVA = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + montantTVA;

  // Calculate estimated aid
  const aideEstimee = travaux.reduce((sum, t) => {
    const travailInfo = Object.values(TRAVAUX_ELIGIBLES)
      .flatMap(cat => Object.values(cat))
      .find(tr => tr.id === t.id);

    if (!travailInfo) return sum;
    const montantUnitaire = travailInfo.montants[categorieRevenus?.id] || 0;
    return sum + (montantUnitaire * Math.min(t.quantite, travailInfo.plafond));
  }, 0);

  return {
    // Identification
    numero: `MPR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    type: 'maprimerenov',
    created_at: now.toISOString(),
    validite: validite.toISOString(),
    validite_jours: 60,

    // Company
    entreprise: {
      nom: company.nom,
      forme_juridique: company.forme_juridique,
      siret: company.siret,
      adresse: company.adresse,
      code_postal: company.code_postal,
      ville: company.ville,
      telephone: company.telephone,
      email: company.email,
      tva_intra: company.tva_intra,
      rge: true,
      rge_numero: company.rge_numero,
      rge_validite: company.rge_validite,
      rge_domaines: company.rge_domaines,
      assurance_decennale: {
        numero: company.assurance_decennale_numero,
        assureur: company.assurance_decennale_assureur,
        validite: company.assurance_decennale_validite
      }
    },

    // Client
    client: {
      nom: client.nom,
      prenom: client.prenom,
      adresse: client.adresse,
      code_postal: client.code_postal,
      ville: client.ville,
      email: client.email,
      telephone: client.telephone,
      type: 'particulier',
      categorie_revenus: categorieRevenus?.id,
      categorie_revenus_label: categorieRevenus?.label
    },

    // Works
    lignes,
    description_generale: `Travaux de rénovation énergétique - ${lignes.map(l => l.description).join(', ')}`,

    // Financial
    montant_ht: Math.round(totalHT * 100) / 100,
    tva_rate: tvaRate,
    montant_tva: Math.round(montantTVA * 100) / 100,
    montant_ttc: Math.round(totalTTC * 100) / 100,

    // MaPrimeRénov specific
    maprimerenov: {
      eligible: true,
      aide_estimee: aideEstimee,
      reste_a_charge: Math.round((totalTTC - aideEstimee) * 100) / 100,
      categorie_revenus: categorieRevenus?.id,
      documents_requis: DOCUMENTS_REQUIS_CLIENT,
      etapes_demarches: ETAPES_DEMARCHES
    },

    // Legal mentions
    mentions_obligatoires: MENTIONS_MAPRIMERENOV,
    mentions_specifiques: [
      `Entreprise certifiée RGE n°${company.rge_numero}`,
      `Assurance décennale n°${company.assurance_decennale_numero}`,
      'TVA 5,5% applicable pour travaux de rénovation énergétique (logement > 2 ans)',
      `Aide MaPrimeRénov\' estimée : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(aideEstimee)} (sous réserve d\'acceptation)`
    ],

    // Conditions
    modalites_paiement: 'Acompte 30% à la commande, solde 70% à la réception des travaux',
    delai_execution: '4 à 6 semaines après acceptation du devis',

    // Notes
    notes,

    // Annexes
    annexes: [
      { id: 'certificat_rge', label: 'Certificat RGE', inclus: true },
      { id: 'fiche_technique', label: 'Fiches techniques des produits', inclus: true },
      { id: 'attestation_honneur', label: 'Attestation sur l\'honneur', inclus: true },
      { id: 'notice_client', label: 'Notice explicative MaPrimeRénov\'', inclus: true }
    ]
  };
}

/**
 * Generate attestation sur l'honneur content
 * @param {Object} client - Client data
 * @param {Object} travaux - Works data
 * @returns {Object} Attestation content
 */
export function generateAttestationHonneur(client, travaux) {
  const now = new Date();

  return {
    titre: 'ATTESTATION SUR L\'HONNEUR',
    sous_titre: 'Travaux de rénovation énergétique - MaPrimeRénov\'',

    introduction: `Je soussigné(e), ${client.prenom || ''} ${client.nom}, propriétaire du logement situé au :`,

    adresse_logement: {
      adresse: client.adresse,
      code_postal: client.code_postal,
      ville: client.ville
    },

    declarations: [
      'Le logement objet des travaux est ma résidence principale',
      'Le logement a été achevé depuis plus de 15 ans',
      'Je suis domicilié(e) fiscalement en France',
      'Les travaux n\'ont pas encore débuté à la date de cette attestation',
      'Je m\'engage à ne pas cumuler cette aide avec une autre aide pour les mêmes travaux',
      'Les informations fournies dans ce dossier sont exactes et complètes'
    ],

    travaux_prevus: travaux.map(t => {
      const travailInfo = Object.values(TRAVAUX_ELIGIBLES)
        .flatMap(cat => Object.values(cat))
        .find(tr => tr.id === t.id);
      return travailInfo?.label || t.description;
    }),

    engagement: 'Je certifie sur l\'honneur l\'exactitude des informations ci-dessus et m\'engage à signaler tout changement de situation à l\'ANAH.',

    avertissement: 'Toute fausse déclaration est passible de sanctions pénales et du remboursement des aides perçues.',

    signature: {
      mention: 'Fait pour servir et valoir ce que de droit',
      lieu: client.ville,
      date: now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
      signature_label: 'Signature précédée de la mention "Lu et approuvé"'
    }
  };
}

/**
 * Generate client notice content
 * @param {Object} devisData - Devis data
 * @returns {Object} Notice content
 */
export function generateNoticeClient(devisData) {
  const categorieInfo = {
    tres_modeste: { label: 'Très modestes', color: 'Bleu', avantages: 'Taux d\'aide maximum' },
    modeste: { label: 'Modestes', color: 'Jaune', avantages: 'Taux d\'aide élevé' },
    intermediaire: { label: 'Intermédiaires', color: 'Violet', avantages: 'Taux d\'aide modéré' },
    superieur: { label: 'Supérieurs', color: 'Rose', avantages: 'Aide limitée à certains travaux' }
  };

  const categorie = categorieInfo[devisData.maprimerenov?.categorie_revenus] || categorieInfo.intermediaire;

  return {
    titre: 'NOTICE EXPLICATIVE',
    sous_titre: 'MaPrimeRénov\' - Aide à la rénovation énergétique',

    sections: [
      {
        titre: 'QU\'EST-CE QUE MAPRIMERENOV\' ?',
        contenu: [
          'MaPrimeRénov\' est une aide de l\'État destinée à financer les travaux de rénovation énergétique des logements.',
          'Cette aide est versée par l\'Agence Nationale de l\'Habitat (ANAH).',
          'Elle remplace le crédit d\'impôt transition énergétique (CITE) et les aides de l\'ANAH "Habiter Mieux Agilité".'
        ]
      },
      {
        titre: 'VOTRE SITUATION',
        contenu: [
          `Catégorie de revenus : ${categorie.label} (${categorie.color})`,
          `Avantage : ${categorie.avantages}`,
          `Aide estimée pour vos travaux : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devisData.maprimerenov?.aide_estimee || 0)}`,
          `Reste à charge estimé : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devisData.maprimerenov?.reste_a_charge || 0)}`
        ]
      },
      {
        titre: 'LES ÉTAPES À SUIVRE',
        contenu: ETAPES_DEMARCHES.map(e => `${e.numero}. ${e.titre}\n   ${e.description}`)
      },
      {
        titre: 'DOCUMENTS À PRÉPARER',
        contenu: DOCUMENTS_REQUIS_CLIENT.map(d => `${d.obligatoire ? '✓' : '○'} ${d.label}`)
      },
      {
        titre: 'IMPORTANT - À RETENIR',
        contenu: [
          '⚠️ Ne signez PAS le devis avant d\'avoir reçu l\'accord de l\'ANAH',
          '⚠️ Les travaux ne doivent PAS commencer avant l\'accord',
          '⚠️ Conservez tous les documents (devis, factures, photos)',
          '⚠️ Vous avez 2 ans maximum pour réaliser les travaux après l\'accord'
        ]
      },
      {
        titre: 'LIENS UTILES',
        contenu: [
          'Site officiel : www.maprimerenov.gouv.fr',
          'Création de compte : france-renov.gouv.fr',
          'Simulation d\'aides : simul-aide.fr',
          'Conseils gratuits : 0 808 800 700 (France Rénov\')'
        ]
      }
    ],

    footer: {
      entreprise: devisData.entreprise?.nom,
      contact: devisData.entreprise?.telephone,
      mention: 'Ce document vous est fourni par votre artisan RGE pour vous accompagner dans vos démarches.'
    }
  };
}

/**
 * Generate email content for client pack
 * @param {Object} devisData - Devis data
 * @param {Object} company - Company data
 * @returns {Object} Email content
 */
export function generateEmailContent(devisData, company) {
  const aideEstimee = devisData.maprimerenov?.aide_estimee || 0;
  const resteACharge = devisData.maprimerenov?.reste_a_charge || 0;

  return {
    subject: `Votre devis MaPrimeRénov' - ${company.nom}`,

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🏡 MaPrimeRénov'</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Votre dossier d'aide à la rénovation énergétique</p>
        </div>

        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151;">
            Bonjour ${devisData.client?.prenom || ''} ${devisData.client?.nom || ''},
          </p>

          <p style="color: #4b5563;">
            Suite à notre échange, veuillez trouver ci-joint votre dossier complet MaPrimeRénov' pour vos travaux de rénovation énergétique.
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #059669; margin: 0 0 15px 0;">💰 Récapitulatif financier</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Montant total TTC</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #1f2937;">
                  ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devisData.montant_ttc)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Aide MaPrimeRénov' estimée</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669;">
                  - ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(aideEstimee)}
                </td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #1f2937; font-weight: bold;">Reste à votre charge</td>
                <td style="padding: 12px 0 8px 0; text-align: right; font-weight: bold; color: #1f2937; font-size: 18px;">
                  ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(resteACharge)}
                </td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-weight: bold;">
              ⚠️ Important : Ne signez pas ce devis maintenant !
            </p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
              Vous devez d'abord créer votre compte sur maprimerenov.gouv.fr et déposer votre dossier.
              La signature n'interviendra qu'après réception de l'accord de l'ANAH.
            </p>
          </div>

          <h3 style="color: #1f2937;">📎 Pièces jointes</h3>
          <ul style="color: #4b5563; padding-left: 20px;">
            <li>Devis détaillé conforme MaPrimeRénov'</li>
            <li>Attestation sur l'honneur (à signer et joindre)</li>
            <li>Notice explicative des démarches</li>
            <li>Certificat RGE de l'entreprise</li>
          </ul>

          <h3 style="color: #1f2937;">📝 Prochaines étapes</h3>
          <ol style="color: #4b5563; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Créez votre compte sur <a href="https://www.maprimerenov.gouv.fr" style="color: #059669;">maprimerenov.gouv.fr</a></li>
            <li style="margin-bottom: 8px;">Téléchargez les documents ci-joints sur votre espace</li>
            <li style="margin-bottom: 8px;">Attendez la validation de l'ANAH (2-3 semaines)</li>
            <li style="margin-bottom: 8px;">Revenez vers nous pour signer le devis</li>
          </ol>

          <p style="color: #4b5563; margin-top: 30px;">
            Pour toute question, n'hésitez pas à nous contacter.
          </p>

          <p style="color: #1f2937; margin-top: 20px;">
            Cordialement,<br>
            <strong>${company.nom}</strong><br>
            <span style="color: #6b7280; font-size: 14px;">${company.telephone} | ${company.email}</span>
          </p>
        </div>

        <div style="background: #1f2937; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            Entreprise certifiée RGE n°${company.rge_numero}
          </p>
        </div>
      </div>
    `,

    text: `
MaPrimeRénov' - Votre dossier d'aide à la rénovation énergétique

Bonjour ${devisData.client?.prenom || ''} ${devisData.client?.nom || ''},

Suite à notre échange, veuillez trouver ci-joint votre dossier complet MaPrimeRénov'.

RÉCAPITULATIF FINANCIER
-----------------------
Montant total TTC : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devisData.montant_ttc)}
Aide MaPrimeRénov' estimée : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(aideEstimee)}
Reste à votre charge : ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(resteACharge)}

⚠️ IMPORTANT : Ne signez pas ce devis maintenant !
Vous devez d'abord créer votre compte sur maprimerenov.gouv.fr et déposer votre dossier.

PROCHAINES ÉTAPES
-----------------
1. Créez votre compte sur maprimerenov.gouv.fr
2. Téléchargez les documents sur votre espace
3. Attendez la validation de l'ANAH (2-3 semaines)
4. Revenez vers nous pour signer le devis

Cordialement,
${company.nom}
${company.telephone} | ${company.email}
Entreprise RGE n°${company.rge_numero}
    `
  };
}

// ============ EXPORTS ============

export default {
  generateDevisRGE,
  generateAttestationHonneur,
  generateNoticeClient,
  generateEmailContent,
  MENTIONS_MAPRIMERENOV,
  DOCUMENTS_REQUIS_CLIENT,
  ETAPES_DEMARCHES
};
