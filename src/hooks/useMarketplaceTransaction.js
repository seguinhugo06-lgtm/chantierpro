/**
 * useMarketplaceTransaction Hook
 * Manages marketplace transaction state and actions
 *
 * @module useMarketplaceTransaction
 */

import { useState, useEffect, useCallback } from 'react';
import supabase, { isDemo } from '../supabaseClient';

/**
 * @typedef {'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'} TransactionStatus
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} listing_id
 * @property {string} buyer_id
 * @property {string} seller_id
 * @property {number} quantite_achetee
 * @property {number} prix_unitaire_final
 * @property {number} montant_total
 * @property {TransactionStatus} status
 * @property {'pickup' | 'delivery'} mode_retrait
 * @property {number} [frais_livraison]
 * @property {string} [date_retrait_prevue]
 * @property {string} [date_retrait_effective]
 * @property {string} [notes]
 * @property {string} [adresse_retrait]
 * @property {string} created_at
 * @property {string} [confirmed_at]
 * @property {string} [completed_at]
 * @property {Object} [listing]
 * @property {Object} [buyer]
 * @property {Object} [seller]
 */

/**
 * @typedef {Object} Evaluation
 * @property {string} id
 * @property {string} transaction_id
 * @property {string} evaluator_id
 * @property {string} evaluated_id
 * @property {number} note_globale
 * @property {number} [note_communication]
 * @property {number} [note_delais]
 * @property {number} [note_produit]
 * @property {string} [commentaire]
 * @property {string} created_at
 */

// Transaction status flow
const STATUS_FLOW = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'disputed'],
  in_progress: ['completed', 'disputed'],
  completed: [], // Final state
  cancelled: [], // Final state
  disputed: ['completed', 'cancelled'], // Admin resolution
};

// Status labels in French
export const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
};

// Status colors
export const STATUS_COLORS = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  confirmed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  in_progress: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  disputed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

// Transaction steps
export const TRANSACTION_STEPS = [
  { id: 'proposal', label: 'Proposition', description: 'Proposition envoyée' },
  { id: 'acceptance', label: 'Acceptation', description: 'Attente acceptation vendeur' },
  { id: 'details', label: 'Détails', description: 'Confirmation des détails' },
  { id: 'pickup', label: 'Retrait', description: 'Rencontre/Retrait' },
  { id: 'confirmation', label: 'Réception', description: 'Confirmation réception' },
  { id: 'evaluation', label: 'Évaluation', description: 'Évaluation mutuelle' },
];

// Get current step from status
export function getCurrentStep(status) {
  switch (status) {
    case 'pending':
      return 1; // Waiting for acceptance
    case 'confirmed':
      return 2; // Details confirmation
    case 'in_progress':
      return 3; // Pickup in progress
    case 'completed':
      return 5; // Evaluation
    default:
      return 0;
  }
}

// Demo transactions
const DEMO_TRANSACTIONS = [
  {
    id: 'txn-001',
    listing_id: '1',
    buyer_id: 'demo-user-id',
    seller_id: 'demo-seller',
    quantite_achetee: 25,
    prix_unitaire_final: 2.00,
    montant_total: 50.00,
    status: 'confirmed',
    mode_retrait: 'pickup',
    date_retrait_prevue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Je passerai vers 10h',
    adresse_retrait: '15 rue des Artisans, 33000 Bordeaux',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    confirmed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    listing: {
      id: '1',
      titre: '50 Parpaings 20x20x50',
      photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
      prix_unitaire: 2.00,
      unite: 'unité',
    },
    buyer: { id: 'demo-user-id', nom: 'Vous', avatar: null },
    seller: { id: 'demo-seller', nom: 'Jean Dupont', avatar: null, telephone: '06 12 34 56 78' },
  },
  {
    id: 'txn-002',
    listing_id: '2',
    buyer_id: 'demo-buyer-2',
    seller_id: 'demo-user-id',
    quantite_achetee: 50,
    prix_unitaire_final: 1.50,
    montant_total: 75.00,
    status: 'pending',
    mode_retrait: 'delivery',
    frais_livraison: 15.00,
    date_retrait_prevue: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Livraison possible ?',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    listing: {
      id: '2',
      titre: '100 Tuiles terre cuite',
      photos: ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'],
      prix_unitaire: 1.50,
      unite: 'unité',
    },
    buyer: { id: 'demo-buyer-2', nom: 'Pierre Martin', avatar: null },
    seller: { id: 'demo-user-id', nom: 'Vous', avatar: null },
  },
];

/**
 * Generate transaction number
 */
export function generateTransactionNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TXN-${year}-${random}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0);
}

/**
 * Format date
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  const defaultOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  };
  return new Date(dateStr).toLocaleDateString('fr-FR', defaultOptions);
}

/**
 * Hook for managing a single transaction
 *
 * @param {string} transactionId - Transaction ID
 * @param {string} userId - Current user ID
 * @returns {Object} Transaction state and actions
 */
export function useMarketplaceTransaction(transactionId, userId) {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Fetch transaction
  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return;

    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const found = DEMO_TRANSACTIONS.find(t => t.id === transactionId);
        setTransaction(found || null);
      } else {
        const { data, error: fetchError } = await supabase
          .from('marketplace_transactions')
          .select(`
            *,
            listing:listing_id(*),
            buyer:buyer_id(id, nom, avatar, telephone),
            seller:seller_id(id, nom, avatar, telephone)
          `)
          .eq('id', transactionId)
          .single();

        if (fetchError) throw fetchError;
        setTransaction(data);
      }
    } catch (err) {
      console.error('Error fetching transaction:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  // Check if user is buyer or seller
  const isBuyer = transaction?.buyer_id === userId;
  const isSeller = transaction?.seller_id === userId;
  const otherUser = isBuyer ? transaction?.seller : transaction?.buyer;

  // Can transition to status
  const canTransitionTo = useCallback((newStatus) => {
    if (!transaction) return false;
    const allowedTransitions = STATUS_FLOW[transaction.status] || [];
    return allowedTransitions.includes(newStatus);
  }, [transaction]);

  // Update transaction status
  const updateStatus = useCallback(async (newStatus, additionalData = {}) => {
    if (!transaction || !canTransitionTo(newStatus)) {
      return { success: false, error: 'Transition non autorisée' };
    }

    setUpdating(true);

    try {
      const updateData = {
        status: newStatus,
        ...additionalData,
      };

      // Add timestamps based on status
      if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.date_retrait_effective = new Date().toISOString();
      }

      if (isDemo || !supabase) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setTransaction(prev => ({ ...prev, ...updateData }));
        return { success: true };
      }

      const { data, error: updateError } = await supabase
        .from('marketplace_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (updateError) throw updateError;

      setTransaction(data);
      return { success: true };
    } catch (err) {
      console.error('Error updating transaction:', err);
      return { success: false, error: err.message };
    } finally {
      setUpdating(false);
    }
  }, [transaction, transactionId, canTransitionTo]);

  // Accept proposal (seller)
  const acceptProposal = useCallback(async (adresse_retrait) => {
    return updateStatus('confirmed', { adresse_retrait });
  }, [updateStatus]);

  // Reject proposal (seller)
  const rejectProposal = useCallback(async (reason) => {
    return updateStatus('cancelled', { cancellation_reason: reason, cancelled_by: userId });
  }, [updateStatus, userId]);

  // Start pickup (both)
  const startPickup = useCallback(async () => {
    return updateStatus('in_progress');
  }, [updateStatus]);

  // Confirm receipt (buyer)
  const confirmReceipt = useCallback(async () => {
    return updateStatus('completed');
  }, [updateStatus]);

  // Cancel transaction
  const cancelTransaction = useCallback(async (reason) => {
    return updateStatus('cancelled', { cancellation_reason: reason, cancelled_by: userId });
  }, [updateStatus, userId]);

  // Report dispute
  const reportDispute = useCallback(async (reason) => {
    return updateStatus('disputed', { dispute_reason: reason, disputed_by: userId });
  }, [updateStatus, userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchTransaction();

    if (isDemo || !supabase || !transactionId) return;

    const channel = supabase
      .channel(`transaction:${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketplace_transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          setTransaction(prev => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [transactionId, fetchTransaction]);

  return {
    transaction,
    loading,
    error,
    updating,
    isBuyer,
    isSeller,
    otherUser,
    currentStep: transaction ? getCurrentStep(transaction.status) : 0,
    canTransitionTo,
    acceptProposal,
    rejectProposal,
    startPickup,
    confirmReceipt,
    cancelTransaction,
    reportDispute,
    refresh: fetchTransaction,
  };
}

/**
 * Hook for fetching user's transactions
 *
 * @param {string} userId - User ID
 * @param {'all' | 'buying' | 'selling'} filter - Filter transactions
 * @returns {Object} Transactions state
 */
export function useUserTransactions(userId, filter = 'all') {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      if (isDemo || !supabase) {
        await new Promise(resolve => setTimeout(resolve, 300));
        let filtered = [...DEMO_TRANSACTIONS];
        if (filter === 'buying') {
          filtered = filtered.filter(t => t.buyer_id === userId);
        } else if (filter === 'selling') {
          filtered = filtered.filter(t => t.seller_id === userId);
        } else {
          filtered = filtered.filter(t => t.buyer_id === userId || t.seller_id === userId);
        }
        setTransactions(filtered);
      } else {
        let query = supabase
          .from('marketplace_transactions')
          .select(`
            *,
            listing:listing_id(id, titre, photos, prix_unitaire, unite),
            buyer:buyer_id(id, nom, avatar),
            seller:seller_id(id, nom, avatar)
          `)
          .order('created_at', { ascending: false });

        if (filter === 'buying') {
          query = query.eq('buyer_id', userId);
        } else if (filter === 'selling') {
          query = query.eq('seller_id', userId);
        } else {
          query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
  };
}

/**
 * Create a new transaction proposal
 *
 * @param {Object} proposal - Proposal data
 * @param {string} userId - Buyer user ID
 * @returns {Promise<Object>} Created transaction
 */
export async function createProposal(proposal, userId) {
  try {
    const transactionData = {
      listing_id: proposal.listing_id,
      buyer_id: userId,
      seller_id: proposal.seller_id,
      quantite_achetee: proposal.quantite,
      prix_unitaire_final: proposal.prix_propose || proposal.prix_original,
      montant_total: proposal.quantite * (proposal.prix_propose || proposal.prix_original),
      status: 'pending',
      mode_retrait: proposal.mode_retrait,
      frais_livraison: proposal.mode_retrait === 'delivery' ? proposal.frais_livraison : 0,
      date_retrait_prevue: proposal.date_retrait,
      notes: proposal.notes,
    };

    if (isDemo || !supabase) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newTransaction = {
        id: `txn-${Date.now()}`,
        ...transactionData,
        created_at: new Date().toISOString(),
      };
      return { success: true, transaction: newTransaction };
    }

    const { data, error } = await supabase
      .from('marketplace_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) throw error;

    // Notify seller
    await notifyNewProposal(proposal.seller_id, data.id);

    return { success: true, transaction: data };
  } catch (err) {
    console.error('Error creating proposal:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit evaluation for a transaction
 *
 * @param {Object} evaluation - Evaluation data
 * @param {string} userId - Evaluator user ID
 * @returns {Promise<Object>} Result
 */
export async function submitEvaluation(evaluation, userId) {
  try {
    const evaluationData = {
      transaction_id: evaluation.transaction_id,
      evaluator_id: userId,
      evaluated_id: evaluation.evaluated_id,
      note_globale: evaluation.note_globale,
      note_communication: evaluation.note_communication,
      note_delais: evaluation.note_delais,
      note_produit: evaluation.note_produit,
      commentaire: evaluation.commentaire,
    };

    if (isDemo || !supabase) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    }

    const { error } = await supabase
      .from('marketplace_evaluations')
      .insert(evaluationData);

    if (error) throw error;

    // Update user rating
    await updateUserRating(evaluation.evaluated_id);

    return { success: true };
  } catch (err) {
    console.error('Error submitting evaluation:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update user's average rating
 */
async function updateUserRating(userId) {
  if (isDemo || !supabase) return;

  try {
    // Calculate average from evaluations
    const { data: evaluations } = await supabase
      .from('marketplace_evaluations')
      .select('note_globale')
      .eq('evaluated_id', userId);

    if (evaluations && evaluations.length > 0) {
      const avgRating = evaluations.reduce((sum, e) => sum + e.note_globale, 0) / evaluations.length;

      await supabase
        .from('profiles')
        .update({
          marketplace_rating: avgRating,
          marketplace_reviews_count: evaluations.length,
        })
        .eq('id', userId);
    }
  } catch (err) {
    console.error('Error updating user rating:', err);
  }
}

/**
 * Notify seller of new proposal
 */
async function notifyNewProposal(sellerId, transactionId) {
  if (isDemo || !supabase) return;

  try {
    await supabase.functions.invoke('send-transaction-notification', {
      body: {
        type: 'new_proposal',
        user_id: sellerId,
        transaction_id: transactionId,
      },
    });
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

/**
 * Send transaction notification
 */
export async function sendTransactionNotification(type, userId, transactionId, data = {}) {
  if (isDemo || !supabase) return;

  try {
    await supabase.functions.invoke('send-transaction-notification', {
      body: {
        type,
        user_id: userId,
        transaction_id: transactionId,
        ...data,
      },
    });
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

export default useMarketplaceTransaction;
