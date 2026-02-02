/**
 * useSupabaseSync - Hook for syncing data with Supabase
 * Handles loading data on mount and saving changes
 */

import { useEffect, useCallback, useRef } from 'react';
import supabase, { isDemo } from '../supabaseClient';

/**
 * Map of local field names to Supabase column names
 */
const FIELD_MAPPINGS = {
  clients: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      prenom: item.prenom || null,
      email: item.email || null,
      telephone: item.telephone || null,
      adresse: item.adresse || null,
      type: item.type || 'particulier',
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone,
      adresse: row.adresse,
      type: row.type || 'particulier',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
    toSupabase: (item) => ({
      id: item.id,
      client_id: item.client_id,
      chantier_id: item.chantier_id,
      numero: item.numero,
      type: item.type,
      statut: item.statut,
      date: item.date,
      date_validite: item.date_validite,
      objet: item.objet || item.titre,
      lignes: JSON.stringify(item.lignes || []),
      sections: JSON.stringify(item.sections || []),
      conditions: item.conditions,
      notes: item.notes,
      remise_globale: item.remise || 0,
      tva_rate: item.tvaRate || 10,
      total_ht: item.total_ht || 0,
      total_tva: item.tva || 0,
      total_ttc: item.total_ttc || 0,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      client_id: row.client_id,
      chantier_id: row.chantier_id,
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
      notes: row.notes,
      remise: row.remise_globale || 0,
      tvaRate: row.tva_rate || 10,
      total_ht: row.total_ht || 0,
      tva: row.total_tva || 0,
      total_ttc: row.total_ttc || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
    console.log('Skipping Supabase load - demo mode or no user');
    return null;
  }

  try {
    console.log('Loading data from Supabase for user:', userId);

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

    console.log('Loaded data from Supabase:', {
      clients: data.clients.length,
      chantiers: data.chantiers.length,
      devis: data.devis.length,
      depenses: data.depenses.length,
      equipe: data.equipe.length,
      pointages: data.pointages.length,
      catalogue: data.catalogue.length,
    });

    return data;
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
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
      console.warn(`No mapping for table: ${table}`);
      return item;
    }

    const supabaseData = {
      ...mapping.toSupabase(item),
      user_id: userId,
    };

    console.log(`💾 Saving to ${table}:`, supabaseData);

    const { data, error } = await supabase
      .from(table)
      .upsert(supabaseData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error(`❌ Error saving to ${table}:`, error);
      // Throw error so the caller can handle it (rollback optimistic update)
      throw new Error(`Failed to save to ${table}: ${error.message}`);
    }

    console.log(`✅ Saved to ${table}:`, data?.id);
    return mapping.fromSupabase(data);
  } catch (error) {
    console.error(`❌ Error saving to ${table}:`, error);
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
      console.error(`Error deleting from ${table}:`, error);
      return false;
    }

    console.log(`Deleted from ${table}:`, itemId);
    return true;
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return false;
  }
}

export default {
  loadAllData,
  saveItem,
  deleteItem,
  FIELD_MAPPINGS,
};
