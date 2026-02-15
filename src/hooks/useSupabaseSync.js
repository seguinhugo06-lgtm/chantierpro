/**
 * useSupabaseSync - Hook for syncing data with Supabase
 * Handles loading data on mount and saving changes
 */

import { useEffect, useCallback, useRef } from 'react';
import supabase, { isDemo } from '../supabaseClient';
import { logger } from '../lib/logger';

/**
 * Deep-sanitize a value so it is safely JSON-serializable.
 * Strips DOM nodes, React fibers, functions, circular refs, Symbols, etc.
 * Returns a plain JSON-safe clone.
 */
function sanitizeForJSON(value, _seen) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (t === 'function' || t === 'symbol' || t === 'bigint') return undefined;

  // DOM nodes / React elements — discard entirely
  if (typeof Element !== 'undefined' && value instanceof Element) return undefined;
  if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
  if (value?.$$typeof) return undefined; // React element
  if (value?._reactInternals || value?._reactFiber) return undefined;

  // Circular reference guard
  const seen = _seen || new Set();
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(v => sanitizeForJSON(v, seen)).filter(v => v !== undefined);
  }

  if (t === 'object') {
    // Date → ISO string
    if (value instanceof Date) return value.toISOString();
    // Other non-plain objects (Blob, File, RegExp, etc.) → skip
    if (value.constructor && value.constructor !== Object && !Array.isArray(value)) {
      // Allow plain-ish objects (from Object.create(null) or {})
      try { JSON.stringify(value); return value; } catch { return undefined; }
    }
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      // Skip React internal props
      if (k.startsWith('__react') || k.startsWith('_react') || k === '$$typeof') continue;
      const sanitized = sanitizeForJSON(v, seen);
      if (sanitized !== undefined) clean[k] = sanitized;
    }
    return clean;
  }

  return undefined;
}

/**
 * Map of local field names to Supabase column names
 */
export const FIELD_MAPPINGS = {
  clients: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      prenom: item.prenom || '',
      email: item.email || '',
      telephone: item.telephone || '',
      adresse: item.adresse || '',
      entreprise: item.entreprise || '',
      categorie: item.categorie || '',
      notes: item.notes || '',
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone,
      adresse: row.adresse,
      entreprise: row.entreprise || '',
      categorie: row.categorie || '',
      notes: row.notes || '',
      type: 'particulier', // Default value for local use
      createdAt: row.created_at,
    }),
  },
  chantiers: {
    toSupabase: (item) => ({
      id: item.id,
      client_id: item.clientId || item.client_id || null,
      nom: item.nom,
      description: item.description || null,
      adresse: item.adresse || null,
      ville: item.ville || null,
      code_postal: item.codePostal || item.code_postal || null,
      statut: item.statut,
      date_debut: item.dateDebut || item.date_debut || null,
      date_fin: item.dateFin || item.date_fin || null,
      budget_prevu: item.budgetPrevu || item.budget_estime || 0,
      notes: item.notes || null,
      type: item.type || null,
      avancement: item.avancement || 0,
      // Sanitize JSONB fields to prevent circular references (SVG/React DOM nodes)
      taches: sanitizeForJSON(item.taches || []),
      photos: sanitizeForJSON(item.photos || []),
      documents: sanitizeForJSON(item.documents || []),
      messages: sanitizeForJSON(item.messages || []),
      budget_materiaux: item.budget_materiaux || 0,
      heures_estimees: item.heures_estimees || 0,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      clientId: row.client_id,
      client_id: row.client_id,
      nom: row.nom,
      description: row.description,
      adresse: row.adresse,
      ville: row.ville,
      codePostal: row.code_postal,
      code_postal: row.code_postal,
      statut: row.statut,
      dateDebut: row.date_debut,
      date_debut: row.date_debut,
      dateFin: row.date_fin,
      date_fin: row.date_fin,
      budgetPrevu: row.budget_prevu,
      budget_estime: row.budget_prevu,
      notes: row.notes,
      type: row.type,
      avancement: row.avancement || 0,
      taches: row.taches || [],
      photos: row.photos || [],
      documents: row.documents || [],
      messages: row.messages || [],
      budget_materiaux: row.budget_materiaux || 0,
      heures_estimees: row.heures_estimees || 0,
      latitude: row.latitude || null,
      longitude: row.longitude || null,
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
        client_nom: item.client_nom || null,
        chantier_id: item.chantier_id || null,
        numero: item.numero,
        type: item.type,
        statut: item.statut,
        date: item.date,
        date_validite: item.date_validite,
        date_echeance: item.date_echeance || null,
        objet: item.objet || item.titre,
        lignes: JSON.stringify(allLignes),
        sections: JSON.stringify(item.sections || []),
        conditions: item.conditions,
        remise_globale: item.remise || 0,
        tva_rate: item.tvaRate || 10,
        tva_details: item.tvaParTaux ? JSON.stringify(item.tvaParTaux) : (item.tvaDetails ? JSON.stringify(item.tvaDetails) : null),
        total_ht: item.total_ht || 0,
        total_tva: item.tva || 0,
        total_ttc: item.total_ttc || 0,
        // Signature fields
        signature: item.signature || null,
        signature_date: item.signatureDate || null,
        signataire: item.signataire || null,
        // Facture-specific fields
        facture_type: item.facture_type || null,
        devis_source_id: item.devis_source_id || null,
        acompte_facture_id: item.acompte_facture_id || null,
        acompte_pct: item.acompte_pct || null,
        montant_paye: item.montant_paye || 0,
      };
    },
    fromSupabase: (row) => ({
      id: row.id,
      client_id: row.client_id,
      client_nom: row.client_nom || '',
      chantier_id: row.chantier_id || null,
      numero: row.numero,
      type: row.type || 'devis',
      statut: row.statut || 'brouillon',
      date: row.date,
      date_validite: row.date_validite,
      date_echeance: row.date_echeance || null,
      objet: row.objet,
      titre: row.objet,
      lignes: typeof row.lignes === 'string' ? JSON.parse(row.lignes || '[]') : (row.lignes || []),
      sections: typeof row.sections === 'string' ? JSON.parse(row.sections || '[]') : (row.sections || []),
      conditions: row.conditions,
      remise: row.remise_globale || 0,
      tvaRate: row.tva_rate || 10,
      tvaParTaux: row.tva_details ? (typeof row.tva_details === 'string' ? JSON.parse(row.tva_details) : row.tva_details) : null,
      tvaDetails: row.tva_details ? (typeof row.tva_details === 'string' ? JSON.parse(row.tva_details) : row.tva_details) : null,
      total_ht: row.total_ht || 0,
      tva: row.total_tva || 0,
      total_ttc: row.total_ttc || 0,
      // Signature fields
      signature: row.signature || null,
      signatureDate: row.signature_date || null,
      signataire: row.signataire || null,
      // Facture-specific fields
      facture_type: row.facture_type || null,
      devis_source_id: row.devis_source_id || null,
      acompte_facture_id: row.acompte_facture_id || null,
      acompte_pct: row.acompte_pct ? parseFloat(row.acompte_pct) : null,
      montant_paye: row.montant_paye ? parseFloat(row.montant_paye) : 0,
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
      montant_ht: item.montantHt || null,
      taux_tva: item.tauxTva ?? null,
      montant_tva: item.montantTva || null,
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
      montantHt: row.montant_ht,
      tauxTva: row.taux_tva,
      montantTva: row.montant_tva,
      createdAt: row.created_at,
    }),
  },
  equipe: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      prenom: item.prenom || '',
      role: item.role || '',
      email: item.email || '',
      telephone: item.telephone || '',
      taux_horaire: item.tauxHoraire || null,
      cout_horaire_charge: item.coutHoraireCharge || null,
      contrat: item.contrat || '',
      date_embauche: item.dateEmbauche || item.date_embauche || null,
      competences: item.competences || '',
      certifications: item.certifications || '',
      notes: item.notes || '',
      actif: item.actif !== false,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom || '',
      role: row.role || '',
      email: row.email || '',
      telephone: row.telephone || '',
      tauxHoraire: row.taux_horaire,
      coutHoraireCharge: row.cout_horaire_charge,
      contrat: row.contrat || '',
      dateEmbauche: row.date_embauche || '',
      date_embauche: row.date_embauche || '',
      competences: row.competences || '',
      certifications: row.certifications || '',
      notes: row.notes || '',
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
      prix_unitaire_ht: item.prixUnitaire || item.prix_unitaire_ht || item.prix,
      prix_achat: item.prixAchat,
      tva_rate: item.tva || item.tva_rate || 20,
      categorie: item.categorie,
      favori: item.favori || false,
      actif: item.actif !== false,
      stock_actuel: item.stock_actuel != null ? item.stock_actuel : null,
      stock_minimum: item.stock_seuil_alerte != null ? item.stock_seuil_alerte : (item.stock_minimum != null ? item.stock_minimum : null),
    }),
    fromSupabase: (row) => ({
      id: row.id,
      reference: row.reference,
      nom: row.designation,
      designation: row.designation,
      description: row.description,
      unite: row.unite || 'u',
      prix: row.prix_unitaire_ht,
      prixUnitaire: row.prix_unitaire_ht,
      prix_unitaire_ht: row.prix_unitaire_ht,
      prixAchat: row.prix_achat,
      tva: row.tva_rate || 20,
      tva_rate: row.tva_rate || 20,
      categorie: row.categorie,
      favori: row.favori || false,
      actif: row.actif,
      stock_actuel: row.stock_actuel,
      stock_seuil_alerte: row.stock_minimum,
      createdAt: row.created_at,
    }),
  },
  fournisseurs: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      telephone: item.telephone,
      email: item.email,
      adresse: item.adresse,
      delai_livraison_jours: parseInt(item.delaiLivraison) || 3,
      conditions_paiement: item.conditions,
      notes: item.notes,
      actif: item.actif !== false,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      telephone: row.telephone,
      email: row.email,
      adresse: row.adresse,
      delaiLivraison: String(row.delai_livraison_jours || 3),
      conditions: row.conditions_paiement,
      notes: row.notes,
      actif: row.actif,
      createdAt: row.created_at,
    }),
  },
  fournisseur_articles: {
    toSupabase: (item) => ({
      id: item.id,
      fournisseur_id: item.fournisseurId,
      article_id: item.articleId,
      prix_fournisseur: parseFloat(item.prixAchat) || 0,
      reference_fournisseur: item.referenceFournisseur,
      delai_specifique: item.delaiSpecifique,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      fournisseurId: row.fournisseur_id,
      articleId: row.article_id,
      prixAchat: row.prix_fournisseur,
      referenceFournisseur: row.reference_fournisseur,
      delaiSpecifique: row.delai_specifique,
      createdAt: row.created_at,
    }),
  },
  packs: {
    toSupabase: (item) => ({
      id: item.id,
      nom: item.nom,
      description: item.description,
      prix_vente_override: item.prixVente ? parseFloat(item.prixVente) : null,
      actif: item.actif !== false,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      nom: row.nom,
      description: row.description,
      prixVente: row.prix_vente_override,
      actif: row.actif,
      articles: [], // Loaded separately from pack_items
      createdAt: row.created_at,
    }),
  },
  pack_items: {
    toSupabase: (item) => ({
      id: item.id,
      pack_id: item.packId,
      article_id: item.articleId,
      quantite: item.quantite || 1,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      packId: row.pack_id,
      articleId: row.article_id,
      quantite: row.quantite,
      createdAt: row.created_at,
    }),
  },
  stock_mouvements: {
    toSupabase: (item) => ({
      id: item.id,
      produit_id: item.articleId,
      type: item.type === 'in' ? 'entree' : item.type === 'out' ? 'sortie' : item.type === 'return' ? 'entree' : 'ajustement',
      quantite: item.quantite,
      quantite_avant: item.quantiteAvant,
      quantite_apres: item.quantiteApres,
      motif: item.raison || item.motif,
      reference: item.reference,
      chantier_id: item.chantierId || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      articleId: row.produit_id,
      type: row.type === 'entree' ? 'in' : row.type === 'sortie' ? 'out' : row.type === 'inventaire' ? 'adjustment' : 'adjustment',
      quantite: row.quantite,
      quantiteAvant: row.quantite_avant,
      quantiteApres: row.quantite_apres,
      raison: row.motif,
      reference: row.reference,
      chantierId: row.chantier_id,
      date: row.created_at,
      createdAt: row.created_at,
    }),
  },
  catalogue_coefficients: {
    toSupabase: (item) => ({
      id: item.id,
      categorie: item.categorie,
      coefficient: item.coefficient,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      categorie: row.categorie,
      coefficient: row.coefficient,
      createdAt: row.created_at,
    }),
  },
  tresorerie_previsions: {
    toSupabase: (item) => ({
      id: item.id,
      type: item.type,
      description: item.description,
      montant: item.montant,
      date_prevue: item.date || item.datePrevue,
      categorie: item.categorie || 'Divers',
      statut: item.statut || 'prevu',
      recurrence: item.recurrence || 'unique',
      recurrence_parent_id: item.recurrenceParentId || null,
      chantier_id: item.chantierId || null,
      devis_id: item.devisId || null,
      depense_id: item.depenseId || null,
      notes: item.notes,
      montant_ht: item.montantHt || null,
      taux_tva: item.tauxTva ?? 20,
      montant_tva: item.montantTva || null,
      client_id: item.clientId || null,
      is_recurring: item.isRecurring || false,
      source: item.source || null,
      linked_id: item.linkedId || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      montant: row.montant,
      date: row.date_prevue,
      datePrevue: row.date_prevue,
      categorie: row.categorie,
      statut: row.statut,
      recurrence: row.recurrence,
      recurrenceParentId: row.recurrence_parent_id,
      chantierId: row.chantier_id,
      devisId: row.devis_id,
      depenseId: row.depense_id,
      notes: row.notes,
      montantHt: row.montant_ht,
      tauxTva: row.taux_tva,
      montantTva: row.montant_tva,
      clientId: row.client_id,
      isRecurring: row.is_recurring,
      source: row.source,
      linkedId: row.linked_id,
      createdAt: row.created_at,
    }),
  },
  tresorerie_settings: {
    toSupabase: (item) => ({
      id: item.id,
      seuil_alerte: item.seuilAlerte ?? 5000,
      solde_initial: item.soldeInitial ?? 0,
      solde_date: item.soldeDate || new Date().toISOString().slice(0, 10),
      regime_tva: item.regimeTva || 'trimestriel',
      numero_tva: item.numeroTva || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      seuilAlerte: row.seuil_alerte ?? 5000,
      soldeInitial: row.solde_initial ?? 0,
      soldeDate: row.solde_date,
      regimeTva: row.regime_tva || 'trimestriel',
      numeroTva: row.numero_tva,
      createdAt: row.created_at,
    }),
  },
  reglements: {
    toSupabase: (item) => ({
      id: item.id,
      devis_id: item.devisId,
      montant: item.montant,
      date_reglement: item.dateReglement || item.date || new Date().toISOString().slice(0, 10),
      mode_paiement: item.modePaiement || 'virement',
      reference: item.reference,
      notes: item.notes,
      type: item.type || 'paiement',
      prevision_id: item.previsionId || null,
      tresorerie_mouvement_id: item.tresorerieMouvementId || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      devisId: row.devis_id,
      montant: row.montant,
      dateReglement: row.date_reglement,
      date: row.date_reglement,
      modePaiement: row.mode_paiement,
      reference: row.reference,
      notes: row.notes,
      type: row.type,
      previsionId: row.prevision_id,
      tresorerieMouvementId: row.tresorerie_mouvement_id,
      createdAt: row.created_at,
    }),
  },
  tresorerie_mouvements: {
    toSupabase: (item) => ({
      id: item.id,
      description: item.description,
      montant: item.montant,
      date: item.date,
      type: item.type || 'sortie',
      categorie: item.categorie || null,
      statut: item.statut || 'prevu',
      is_recurring: item.isRecurring || false,
      recurring_frequency: item.recurringFrequency || null,
      recurring_end_date: item.recurringEndDate || null,
      parent_recurring_id: item.parentRecurringId || null,
      devis_id: item.devisId || null,
      chantier_id: item.chantierId || null,
      client_id: item.clientId || null,
      depense_id: item.depenseId || null,
      montant_ht: item.montantHt || null,
      taux_tva: item.tauxTva ?? 20,
      montant_tva: item.montantTva || null,
      autoliquidation: item.autoliquidation || false,
      notes: item.notes || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      description: row.description,
      montant: parseFloat(row.montant) || 0,
      date: row.date,
      type: row.type,
      categorie: row.categorie,
      statut: row.statut,
      isRecurring: row.is_recurring,
      recurringFrequency: row.recurring_frequency,
      recurringEndDate: row.recurring_end_date,
      parentRecurringId: row.parent_recurring_id,
      devisId: row.devis_id,
      chantierId: row.chantier_id,
      clientId: row.client_id,
      depenseId: row.depense_id,
      montantHt: row.montant_ht ? parseFloat(row.montant_ht) : null,
      tauxTva: row.taux_tva != null ? parseFloat(row.taux_tva) : 20,
      montantTva: row.montant_tva ? parseFloat(row.montant_tva) : null,
      autoliquidation: row.autoliquidation || false,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  },

  planning_events: {
    toSupabase: (item) => ({
      id: item.id,
      title: item.title,
      date: item.date || null,
      time: item.time || null,
      type: item.type || 'rdv',
      employe_id: item.employeId || item.employe_id || null,
      client_id: item.clientId || item.client_id || null,
      description: item.description || '',
    }),
    fromSupabase: (row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      time: row.time || '',
      type: row.type || 'rdv',
      employeId: row.employe_id || '',
      client_id: row.client_id || '',
      clientId: row.client_id || '',
      description: row.description || '',
      createdAt: row.created_at,
    }),
  },

  // ── Paiements (payments on invoices/devis) ───────────────────────
  paiements: {
    toSupabase: (item) => ({
      id: item.id,
      devis_id: item.devisId || item.facture_id || item.devis_id || null,
      document_numero: item.documentNumero || item.document || null,
      montant: item.montant || item.amount || 0,
      date: item.date || (item.createdAt ? item.createdAt.slice(0, 10) : null),
      mode: item.mode || item.modePaiement || 'virement',
      reference: item.reference || null,
      notes: item.notes || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      devisId: row.devis_id,
      facture_id: row.devis_id,
      devis_id: row.devis_id,
      documentNumero: row.document_numero,
      document: row.document_numero,
      montant: row.montant ? parseFloat(row.montant) : 0,
      amount: row.montant ? parseFloat(row.montant) : 0,
      date: row.date,
      mode: row.mode,
      modePaiement: row.mode,
      reference: row.reference,
      notes: row.notes,
      createdAt: row.created_at,
    }),
  },

  // ── Échanges (client communications / notes) ────────────────────
  echanges: {
    toSupabase: (item) => ({
      id: item.id,
      client_id: item.clientId || item.client_id || null,
      chantier_id: item.chantierId || item.chantier_id || null,
      devis_id: item.devisId || item.devis_id || null,
      type: item.type || 'note',
      contenu: item.contenu || item.message || '',
      date: item.date || item.createdAt || null,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      clientId: row.client_id,
      client_id: row.client_id,
      chantierId: row.chantier_id,
      chantier_id: row.chantier_id,
      devisId: row.devis_id,
      devis_id: row.devis_id,
      type: row.type || 'note',
      contenu: row.contenu,
      message: row.contenu,
      date: row.date,
      createdAt: row.created_at,
    }),
  },

  // ── Ajustements (chantier margin adjustments) ────────────────────
  ajustements: {
    toSupabase: (item) => ({
      id: item.id,
      chantier_id: item.chantierId || item.chantier_id || null,
      description: item.description || item.label || '',
      montant: item.montant || 0,
      type: item.type || 'ajustement',
      date: item.date || (item.createdAt ? item.createdAt.slice(0, 10) : null),
    }),
    fromSupabase: (row) => ({
      id: row.id,
      chantierId: row.chantier_id,
      chantier_id: row.chantier_id,
      description: row.description,
      label: row.description,
      montant: row.montant ? parseFloat(row.montant) : 0,
      type: row.type || 'ajustement',
      date: row.date,
      createdAt: row.created_at,
    }),
  },

  // ── Ouvrages (works library / composed items) ────────────────────
  ouvrages: {
    toSupabase: (item) => ({
      id: item.id,
      reference: item.reference || '',
      designation: item.designation || '',
      description: item.description || '',
      unite: item.unite || 'u',
      categorie: item.categorie || '',
      composants: JSON.stringify(item.composants || []),
      prix_revient_ht: item.prixRevientHT || 0,
      coefficient_vente: item.coefficientVente || 1.3,
      prix_vente_ht: item.prixVenteHT || 0,
      temps_pose_heures: item.tempsPoseHeures || 0,
      difficulte: item.difficulte || 1,
      actif: item.actif !== false,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      reference: row.reference || '',
      designation: row.designation || '',
      description: row.description || '',
      unite: row.unite || 'u',
      categorie: row.categorie || '',
      composants: typeof row.composants === 'string' ? JSON.parse(row.composants || '[]') : (row.composants || []),
      prixRevientHT: row.prix_revient_ht ? parseFloat(row.prix_revient_ht) : 0,
      coefficientVente: row.coefficient_vente ? parseFloat(row.coefficient_vente) : 1.3,
      prixVenteHT: row.prix_vente_ht ? parseFloat(row.prix_vente_ht) : 0,
      tempsPoseHeures: row.temps_pose_heures ? parseFloat(row.temps_pose_heures) : 0,
      difficulte: row.difficulte || 1,
      actif: row.actif !== false,
      createdAt: row.created_at,
    }),
  },

  // ── Memos (quick notes / inbox) ────────────────────
  memos: {
    toSupabase: (item) => ({
      id: item.id,
      text: item.text || '',
      notes: item.notes || null,
      priority: item.priority || null,
      due_date: item.due_date || null,
      due_time: item.due_time || null,
      category: item.category || null,
      chantier_id: item.chantier_id || null,
      client_id: item.client_id || null,
      is_done: item.is_done || false,
      done_at: item.done_at || null,
      position: item.position || 0,
      subtasks: item.subtasks ? JSON.stringify(item.subtasks) : '[]',
      recurrence: item.recurrence ? JSON.stringify(item.recurrence) : null,
      sort_order: item.sort_order || 0,
    }),
    fromSupabase: (row) => ({
      id: row.id,
      text: row.text || '',
      notes: row.notes || null,
      priority: row.priority || null,
      due_date: row.due_date || null,
      due_time: row.due_time || null,
      category: row.category || null,
      chantier_id: row.chantier_id || null,
      client_id: row.client_id || null,
      is_done: row.is_done || false,
      done_at: row.done_at || null,
      position: row.position || 0,
      subtasks: row.subtasks ? (typeof row.subtasks === 'string' ? JSON.parse(row.subtasks) : row.subtasks) : [],
      recurrence: row.recurrence ? (typeof row.recurrence === 'string' ? JSON.parse(row.recurrence) : row.recurrence) : null,
      sort_order: row.sort_order || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }),
  },
};

/**
 * Load all data from Supabase for the current user
 */
export async function loadAllData(userId) {
  if (isDemo || !supabase || !userId) {
    logger.debug('Skipping Supabase load - demo mode or no user');
    return null;
  }

  try {
    logger.debug('Loading data from Supabase for user:', userId);

    const [
      clientsRes,
      chantiersRes,
      devisRes,
      depensesRes,
      equipeRes,
      pointagesRes,
      catalogueRes,
      fournisseursRes,
      fournisseurArticlesRes,
      packsRes,
      packItemsRes,
      stockMouvementsRes,
      coefficientsRes,
      tresoreriePrevRes,
      tresorerieSettingsRes,
      reglementsRes,
      tresorerieMouvRes,
      planningEventsRes,
      paiementsRes,
      echangesRes,
      ajustementsRes,
      ouvragesRes,
      memosRes,
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load clients failed:', e); return { data: [] }; }),
      supabase.from('chantiers').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load chantiers failed:', e); return { data: [] }; }),
      supabase.from('devis').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load devis failed:', e); return { data: [] }; }),
      supabase.from('depenses').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load depenses failed:', e); return { data: [] }; }),
      supabase.from('equipe').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load equipe failed:', e); return { data: [] }; }),
      supabase.from('pointages').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load pointages failed:', e); return { data: [] }; }),
      supabase.from('catalogue').select('*').eq('user_id', userId).then(r => r, (e) => { console.error('Load catalogue failed:', e); return { data: [] }; }),
      supabase.from('fournisseurs').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('fournisseur_articles').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('packs').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('pack_items').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('stock_mouvements').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200).then(r => r, () => ({ data: [] })),
      supabase.from('catalogue_coefficients').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('tresorerie_previsions').select('*').eq('user_id', userId).order('date_prevue', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('tresorerie_settings').select('*').eq('user_id', userId).maybeSingle().then(r => r, () => ({ data: null })),
      supabase.from('reglements').select('*').eq('user_id', userId).order('date_reglement', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('tresorerie_mouvements').select('*').eq('user_id', userId).order('date', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('planning_events').select('*').eq('user_id', userId).order('date', { ascending: true }).then(r => r, () => ({ data: [] })),
      supabase.from('paiements').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('echanges').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('ajustements').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(r => r, () => ({ data: [] })),
      supabase.from('ouvrages').select('*').eq('user_id', userId).then(r => r, () => ({ data: [] })),
      supabase.from('memos').select('*').eq('user_id', userId).order('position', { ascending: true }).then(r => r, () => ({ data: [] })),
    ]);

    // Log any query errors from core tables
    if (clientsRes.error) console.error('⚠️ Supabase clients query error:', clientsRes.error.message);
    if (chantiersRes.error) console.error('⚠️ Supabase chantiers query error:', chantiersRes.error.message);
    if (devisRes.error) console.error('⚠️ Supabase devis query error:', devisRes.error.message);

    const data = {
      clients: (clientsRes.data || []).map(FIELD_MAPPINGS.clients.fromSupabase),
      chantiers: (chantiersRes.data || []).map(FIELD_MAPPINGS.chantiers.fromSupabase),
      devis: (devisRes.data || []).map(FIELD_MAPPINGS.devis.fromSupabase),
      depenses: (depensesRes.data || []).map(FIELD_MAPPINGS.depenses.fromSupabase),
      equipe: (equipeRes.data || []).map(FIELD_MAPPINGS.equipe.fromSupabase),
      pointages: (pointagesRes.data || []).map(FIELD_MAPPINGS.pointages.fromSupabase),
      catalogue: (catalogueRes.data || []).map(FIELD_MAPPINGS.catalogue.fromSupabase),
      fournisseurs: (fournisseursRes?.data || []).map(FIELD_MAPPINGS.fournisseurs.fromSupabase),
      fournisseurArticles: (fournisseurArticlesRes?.data || []).map(FIELD_MAPPINGS.fournisseur_articles.fromSupabase),
      packs: (packsRes?.data || []).map(FIELD_MAPPINGS.packs.fromSupabase),
      packItems: (packItemsRes?.data || []).map(FIELD_MAPPINGS.pack_items.fromSupabase),
      stockMouvements: (stockMouvementsRes?.data || []).map(FIELD_MAPPINGS.stock_mouvements.fromSupabase),
      coefficients: (coefficientsRes?.data || []).map(FIELD_MAPPINGS.catalogue_coefficients.fromSupabase),
      tresoreriePrevisions: (tresoreriePrevRes?.data || []).map(FIELD_MAPPINGS.tresorerie_previsions.fromSupabase),
      tresorerieSettings: tresorerieSettingsRes?.data ? FIELD_MAPPINGS.tresorerie_settings.fromSupabase(tresorerieSettingsRes.data) : null,
      reglements: (reglementsRes?.data || []).map(FIELD_MAPPINGS.reglements.fromSupabase),
      tresorerieMouvements: (tresorerieMouvRes?.data || []).map(FIELD_MAPPINGS.tresorerie_mouvements.fromSupabase),
      planningEvents: (planningEventsRes?.data || []).map(FIELD_MAPPINGS.planning_events.fromSupabase),
      paiements: (paiementsRes?.data || []).map(FIELD_MAPPINGS.paiements.fromSupabase),
      echanges: (echangesRes?.data || []).map(FIELD_MAPPINGS.echanges.fromSupabase),
      ajustements: (ajustementsRes?.data || []).map(FIELD_MAPPINGS.ajustements.fromSupabase),
      ouvrages: (ouvragesRes?.data || []).map(FIELD_MAPPINGS.ouvrages.fromSupabase),
      memos: (memosRes?.data || []).map(FIELD_MAPPINGS.memos.fromSupabase),
    };

    logger.debug('Loaded data from Supabase:', {
      clients: data.clients.length,
      chantiers: data.chantiers.length,
      devis: data.devis.length,
      depenses: data.depenses.length,
      equipe: data.equipe.length,
      pointages: data.pointages.length,
      catalogue: data.catalogue.length,
      fournisseurs: data.fournisseurs.length,
      packs: data.packs.length,
      stockMouvements: data.stockMouvements.length,
      tresoreriePrevisions: data.tresoreriePrevisions.length,
      planningEvents: data.planningEvents.length,
    });

    return data;
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
    return null;
  }
}

/**
 * Get the next available numero for a devis or facture
 * Queries Supabase for the max sequence to avoid duplicates
 */
export async function getNextNumero(type, userId, localDevis = []) {
  const prefix = type === 'facture' ? 'FAC' : type === 'avoir' ? 'AV' : 'DEV';
  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

  // Local max from in-memory devis
  const localMax = localDevis
    .filter(d => type === 'avoir'
      ? d.facture_type === 'avoir'
      : (d.type || 'devis') === type && d.facture_type !== 'avoir')
    .map(d => { const m = (d.numero || '').match(pattern); return m ? parseInt(m[1], 10) : 0; })
    .reduce((max, n) => Math.max(max, n), 0);

  let supabaseMax = 0;
  if (!isDemo && supabase && userId) {
    try {
      const likePattern = `${prefix}-${year}-%`;
      // Fetch ALL numeros for this year to find true max (string sort can miss 00010 vs 00002)
      const { data } = await supabase
        .from('devis')
        .select('numero')
        .eq('user_id', userId)
        .like('numero', likePattern);
      if (data && data.length > 0) {
        supabaseMax = data.reduce((max, row) => {
          const m = (row.numero || '').match(pattern);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
      }
    } catch (e) {
      console.warn('getNextNumero: Supabase query failed, using local max', e);
    }
  }

  const nextSeq = Math.max(localMax, supabaseMax) + 1;
  return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;
}

/**
 * Extract a bad column name from a Supabase/PostgreSQL error message.
 * Handles: schema cache misses, missing columns, trigger "new" field errors.
 */
function extractBadColumn(msg) {
  if (!msg) return null;
  const patterns = [
    /Could not find.*?column.*?['"](\w+)['"]/i,
    /column "(\w+)" of relation/i,
    /column ['"]?(\w+)['"]? does not exist/i,
    /record "new" has no field "(\w+)"/i,        // trigger error
    /Unknown column ['"]?(\w+)['"]?/i,
  ];
  for (const re of patterns) {
    const m = msg.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * Save a single item to Supabase.
 * Resilient: if a column doesn't exist (or a trigger references a missing column),
 * strips it from the payload and retries (up to 5 times).
 */
export async function saveItem(table, item, userId) {
  if (isDemo || !supabase || !userId) return item;

  const mapping = FIELD_MAPPINGS[table];
  if (!mapping) {
    console.warn(`No mapping for table: ${table}`);
    return item;
  }

  let supabaseData;
  try {
    supabaseData = {
      ...mapping.toSupabase(item),
      user_id: userId,
      // Always include updated_at — many tables have a BEFORE UPDATE trigger
      // (update_updated_at_column) that sets NEW.updated_at = NOW().
      // If the column exists, the trigger overwrites this value; if it doesn't,
      // the retry logic below will strip it automatically.
      updated_at: new Date().toISOString(),
    };
    // Verify serializable — if not, deep-sanitize
    JSON.stringify(supabaseData);
  } catch (serErr) {
    console.warn(`⚠️ ${table}: payload not serializable, sanitizing...`, serErr.message);
    supabaseData = sanitizeForJSON({
      ...mapping.toSupabase(item),
      user_id: userId,
      updated_at: new Date().toISOString(),
    });
  }

  const MAX_ATTEMPTS = 8;
  const strippedCols = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      logger.debug(`💾 Saving to ${table} (attempt ${attempt + 1}/${MAX_ATTEMPTS}):`, Object.keys(supabaseData).join(', '));

      const { data, error } = await supabase
        .from(table)
        .upsert(supabaseData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        const badCol = extractBadColumn(error.message);
        if (badCol && attempt < MAX_ATTEMPTS - 1) {
          if (supabaseData.hasOwnProperty(badCol)) {
            // Column is in payload but not in DB → strip it
            console.warn(`⚠️ ${table}: column "${badCol}" not in DB, stripping and retrying`);
            delete supabaseData[badCol];
            strippedCols.push(badCol);
          } else {
            // Column is NOT in payload but a trigger references it → add it
            // This happens when a DB trigger does NEW.col = ... but the column
            // doesn't exist in the table (or hasn't been added via migration yet).
            console.warn(`⚠️ ${table}: trigger references "${badCol}" not in payload, adding default and retrying`);
            supabaseData[badCol] = badCol.includes('_at') || badCol === 'updated_at' || badCol === 'created_at'
              ? new Date().toISOString()
              : null;
            strippedCols.push(`+${badCol}`);
          }
          continue;
        }
        console.error(`❌ Error saving to ${table}:`, error.message);
        throw new Error(`Failed to save to ${table}: ${error.message}`);
      }

      if (strippedCols.length > 0) {
        console.info(`✅ ${table}: saved after adjusting columns: [${strippedCols.join(', ')}]`);
      }
      logger.debug(`✅ Saved to ${table}:`, data?.id);
      return mapping.fromSupabase(data);
    } catch (error) {
      const msg = error.message || '';
      const badCol = extractBadColumn(msg);
      if (badCol && attempt < MAX_ATTEMPTS - 1) {
        if (supabaseData.hasOwnProperty(badCol)) {
          console.warn(`⚠️ ${table}: stripping "${badCol}" and retrying`);
          delete supabaseData[badCol];
          strippedCols.push(badCol);
        } else {
          console.warn(`⚠️ ${table}: trigger references "${badCol}", adding default and retrying`);
          supabaseData[badCol] = badCol.includes('_at') || badCol === 'updated_at' || badCol === 'created_at'
            ? new Date().toISOString()
            : null;
          strippedCols.push(`+${badCol}`);
        }
        continue;
      }
      if (attempt >= MAX_ATTEMPTS - 1) {
        console.error(`❌ Error saving to ${table} after ${attempt + 1} attempts:`, error);
      }
      throw error;
    }
  }
  return item;
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

    logger.debug(`Deleted from ${table}:`, itemId);
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
