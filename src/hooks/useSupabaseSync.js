/**
 * useSupabaseSync - Hook for syncing data with Supabase
 * Handles loading data on mount and saving changes
 */

import { useEffect, useCallback, useRef } from 'react';
import supabase, { isDemo } from '../supabaseClient';
import { captureException } from '../lib/sentry';


/**
 * Map of local field names to Supabase column names
 */
const FIELD_MAPPINGS = {
  clients: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      prenom: item.prenom || '',
      email: item.email || '',
      telephone: item.telephone || '',
      adresse: item.adresse || '',
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone,
      adresse: row.adresse,
      type: 'particulier', // Default value for local use
      createdAt: row.created_at,
    }),
  },
  chantiers: {
    toSupabase: (item) => ({
      id: item.id,
      client_id: item.clientId,
      nom: item.nom,
      description: item.description,
      adresse: item.adresse,
      ville: item.ville,
      code_postal: item.codePostal,
      statut: item.statut,
      date_debut: item.dateDebut,
      date_fin: item.dateFin,
      budget_prevu: item.budgetPrevu || item.budget_estime,
      notes: item.notes,
      type: item.type,
      avancement: item.avancement,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      clientId: row.client_id,
      nom: row.nom,
      description: row.description,
      adresse: row.adresse,
      ville: row.ville,
      codePostal: row.code_postal,
      statut: row.statut,
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      budgetPrevu: row.budget_prevu,
      budget_estime: row.budget_prevu,
      notes: row.notes,
      type: row.type,
      avancement: row.avancement || 0,
      photos: [],
      taches: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },
  devis: {
    toSupabase: (item) => {
      // Combine lignes and sections into a single lignes array for storage
      // This ensures compatibility even if sections column doesn't exist
      let allLignes = item.lignes || [];
      if (item.sections && item.sections.length > 0) {
        // Flatten sections into lignes array with section markers
        allLignes = item.sections.flatMap(section => {
          const sectionMarker = { _sectionId: section.id, _sectionName: section.nom, _isSection: true };
          return [sectionMarker, ...(section.lignes || [])];
        });
      }

      return {
        id: item.id,
        client_id: item.client_id,
        numero: item.numero,
        type: item.type,
        statut: item.statut,
        date: item.date,
        date_validite: item.date_validite,
        objet: item.objet || item.titre,
        lignes: JSON.stringify(allLignes),
        sections: JSON.stringify(item.sections || []),
        conditions: item.conditions,
        remise_globale: item.remise || 0,
        tva_rate: item.tvaRate || 10,
        total_ht: item.total_ht || 0,
        total_tva: item.tva || 0,
        total_ttc: item.total_ttc || 0,
        // Signature fields
        signature_token: item.signature_token || null,
        signature_expires_at: item.signature_expires_at || null,
        signature_data: item.signature_data || null,
        signature_date: item.signature_date || null,
        signature_ip: item.signature_ip || null,
        signature_user_agent: item.signature_user_agent || null,
        signataire_nom: item.signataire_nom || null,
        signature_cgv_accepted: item.signature_cgv_accepted || false,
        // Payment fields
        payment_token: item.payment_token || null,
        payment_token_expires_at: item.payment_token_expires_at || null,
        stripe_session_id: item.stripe_session_id || null,
        stripe_payment_intent_id: item.stripe_payment_intent_id || null,
        payment_amount: item.payment_amount || null,
        payment_status: item.payment_status || null,
        payment_completed_at: item.payment_completed_at || null,
        payment_metadata: item.payment_metadata ? JSON.stringify(item.payment_metadata) : null,
      };
    },
    fromSupabase: (row) => ({
      id: row.id,
      client_id: row.client_id,
      numero: row.numero,
      type: row.type || 'devis',
      statut: row.statut || 'brouillon',
      date: row.date,
      date_validite: row.date_validite,
      objet: row.objet,
      titre: row.objet,
      lignes: typeof row.lignes === 'string' ? JSON.parse(row.lignes || '[]') : (row.lignes || []),
      sections: typeof row.sections === 'string' ? JSON.parse(row.sections || '[]') : (row.sections || []),
      conditions: row.conditions,
      remise: row.remise_globale || 0,
      tvaRate: row.tva_rate || 10,
      total_ht: row.total_ht || 0,
      tva: row.total_tva || 0,
      total_ttc: row.total_ttc || 0,
      createdAt: row.created_at,
      // Signature fields
      signature_token: row.signature_token,
      signature_expires_at: row.signature_expires_at,
      signature_data: row.signature_data,
      signature_date: row.signature_date,
      signature_ip: row.signature_ip,
      signature_user_agent: row.signature_user_agent,
      signataire_nom: row.signataire_nom,
      signature_cgv_accepted: row.signature_cgv_accepted,
      // Payment fields
      payment_token: row.payment_token,
      payment_token_expires_at: row.payment_token_expires_at,
      stripe_session_id: row.stripe_session_id,
      stripe_payment_intent_id: row.stripe_payment_intent_id,
      payment_amount: row.payment_amount,
      payment_status: row.payment_status,
      payment_completed_at: row.payment_completed_at,
      payment_metadata: typeof row.payment_metadata === 'string' ? JSON.parse(row.payment_metadata || 'null') : row.payment_metadata,
    }),
  },
  depenses: {
    toSupabase: (item) => ({
      id: item.id,
      chantier_id: item.chantierId,
      description: item.description || item.libelle,
      montant: item.montant,
      date: item.date,
      categorie: item.categorie,
      fournisseur: item.fournisseur,
      numero_facture: item.numeroFacture,
      notes: item.notes,
      sous_traitant_id: item.sousTraitantId || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      chantierId: row.chantier_id,
      description: row.description,
      libelle: row.description,
      montant: row.montant,
      date: row.date,
      categorie: row.categorie,
      fournisseur: row.fournisseur,
      numeroFacture: row.numero_facture,
      notes: row.notes,
      sousTraitantId: row.sous_traitant_id || null,
      createdAt: row.created_at,
    }),
  },
  equipe: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      prenom: item.prenom,
      role: item.role,
      email: item.email,
      telephone: item.telephone,
      taux_horaire: item.tauxHoraire,
      cout_horaire_charge: item.coutHoraireCharge,
      actif: item.actif !== false,
      // Sous-traitant fields
      type: item.type || 'employe',
      entreprise: item.entreprise || null,
      siret: item.siret || null,
      specialite: item.specialite || null,
      decennale_numero: item.decennale_numero || null,
      decennale_expiration: item.decennale_expiration || null,
      urssaf_date: item.urssaf_date || null,
      tarif_type: item.tarif_type || 'horaire',
      tarif_forfait: item.tarif_forfait || null,
      documents: item.documents ? JSON.stringify(item.documents) : '[]',
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      role: row.role,
      email: row.email,
      telephone: row.telephone,
      tauxHoraire: row.taux_horaire,
      coutHoraireCharge: row.cout_horaire_charge,
      actif: row.actif,
      createdAt: row.created_at,
      // Sous-traitant fields
      type: row.type || 'employe',
      entreprise: row.entreprise || '',
      siret: row.siret || '',
      specialite: row.specialite || '',
      decennale_numero: row.decennale_numero || '',
      decennale_expiration: row.decennale_expiration || null,
      urssaf_date: row.urssaf_date || null,
      tarif_type: row.tarif_type || 'horaire',
      tarif_forfait: row.tarif_forfait || null,
      documents: typeof row.documents === 'string' ? JSON.parse(row.documents || '[]') : (row.documents || []),
    }),
  },
  pointages: {
    toSupabase: (item) => ({
      id: item.id,
      employe_id: item.employeId,
      chantier_id: item.chantierId,
      date: item.date,
      heures: item.heures,
      description: item.description,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      employeId: row.employe_id,
      chantierId: row.chantier_id,
      date: row.date,
      heures: row.heures,
      description: row.description,
      createdAt: row.created_at,
    }),
  },
  catalogue: {
    toSupabase: (item) => ({
      id: item.id,
      reference: item.reference,
      designation: item.nom || item.designation,
      description: item.description,
      unite: item.unite,
      prix_unitaire_ht: item.prixUnitaire || item.prix_unitaire_ht,
      prix_achat: item.prixAchat,
      tva_rate: item.tva || 10,
      categorie: item.categorie,
      favori: item.favori || false,
      actif: item.actif !== false,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      reference: row.reference,
      nom: row.designation,
      designation: row.designation,
      description: row.description,
      unite: row.unite || 'u',
      prixUnitaire: row.prix_unitaire_ht,
      prix_unitaire_ht: row.prix_unitaire_ht,
      prixAchat: row.prix_achat,
      tva: row.tva_rate || 10,
      categorie: row.categorie,
      favori: row.favori || false,
      actif: row.actif,
      createdAt: row.created_at,
    }),
  },
};

/**
 * Load all data from Supabase for the current user
 */
export async function loadAllData(userId) {
  if (isDemo || !supabase || !userId) {
    if (import.meta.env.DEV) console.log('Skipping Supabase load - demo mode or no user');
    return null;
  }

  try {
    if (import.meta.env.DEV) console.log('Loading data from Supabase for user:', userId);

    const [
      clientsRes,
      chantiersRes,
      devisRes,
      depensesRes,
      equipeRes,
      pointagesRes,
      catalogueRes,
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', userId),
      supabase.from('chantiers').select('*').eq('user_id', userId),
      supabase.from('devis').select('*').eq('user_id', userId),
      supabase.from('depenses').select('*').eq('user_id', userId),
      supabase.from('equipe').select('*').eq('user_id', userId),
      supabase.from('pointages').select('*').eq('user_id', userId),
      supabase.from('catalogue').select('*').eq('user_id', userId),
    ]);

    const data = {
      clients: (clientsRes.data || []).map(FIELD_MAPPINGS.clients.fromSupabase),
      chantiers: (chantiersRes.data || []).map(FIELD_MAPPINGS.chantiers.fromSupabase),
      devis: (devisRes.data || []).map(FIELD_MAPPINGS.devis.fromSupabase),
      depenses: (depensesRes.data || []).map(FIELD_MAPPINGS.depenses.fromSupabase),
      equipe: (equipeRes.data || []).map(FIELD_MAPPINGS.equipe.fromSupabase),
      pointages: (pointagesRes.data || []).map(FIELD_MAPPINGS.pointages.fromSupabase),
      catalogue: (catalogueRes.data || []).map(FIELD_MAPPINGS.catalogue.fromSupabase),
    };

    if (import.meta.env.DEV) console.log('Loaded data from Supabase:', {
      clients: data.clients.length,
      chantiers: data.chantiers.length,
      devis: data.devis.length,
    });

    return data;
  } catch (error) {
    captureException(error, { context: 'useSupabaseSync.loadAllData' });
    return null;
  }
}

/**
 * Save a single item to Supabase
 */
export async function saveItem(table, item, userId) {
  if (isDemo || !supabase || !userId) return item;

  try {
    const mapping = FIELD_MAPPINGS[table];
    if (!mapping) {
      if (import.meta.env.DEV) console.warn(`No mapping for table: ${table}`);
      return item;
    }

    const supabaseData = {
      ...mapping.toSupabase(item),
      user_id: userId,
    };

    if (import.meta.env.DEV) console.log(`Saving to ${table}:`, supabaseData.id);

    const { data, error } = await supabase
      .from(table)
      .upsert(supabaseData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      captureException(error, { context: `useSupabaseSync.saveItem.${table}` });
      // Throw error so the caller can handle it (rollback optimistic update)
      throw new Error(`Failed to save to ${table}: ${error.message}`);
    }

    if (import.meta.env.DEV) console.log(`Saved to ${table}:`, data?.id);
    return mapping.fromSupabase(data);
  } catch (error) {
    captureException(error, { context: `useSupabaseSync.saveItem.${table}` });
    throw error;
  }
}

/**
 * Delete an item from Supabase
 */
export async function deleteItem(table, itemId, userId) {
  if (isDemo || !supabase || !userId) return true;

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      captureException(error, { context: `useSupabaseSync.deleteItem.${table}` });
      return false;
    }

    if (import.meta.env.DEV) console.log(`Deleted from ${table}:`, itemId);
    return true;
  } catch (error) {
    captureException(error, { context: `useSupabaseSync.deleteItem.${table}` });
    return false;
  }
}

export default {
  loadAllData,
  saveItem,
  deleteItem,
  FIELD_MAPPINGS,
};
