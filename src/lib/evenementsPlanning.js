/**
 * Événements du planning : les récurrences développées et les événements d'un jour, en un seul endroit.
 * Avant : le calcul vivait dans Planning.jsx, et le sous-titre de la page (« N rendez-vous aujourd'hui ») ne pouvait pas
 * le lire : l'en-tête disait « 0 tâches », le compteur « 38 évén. » et la tuile « 4 » (audit UX du 20 oct. 2026).
 */
import { jourLocal } from './dates';
import { formatMoney } from './formatters';
import { estFacture, estOuverte, estEnRetard } from './ventes';
import { echeance, resteAPayer } from './paiementsFacture';

const TROIS_MOIS_MAX = 3;

/** « AAAA-MM-JJ » → Date locale à minuit. */
const lireJour = (jour) => new Date(`${String(jour).slice(0, 10)}T00:00:00`);

/**
 * Les événements saisis, avec leurs occurrences à venir (jusqu'à `jusquA`, par défaut dans trois mois).
 * Une occurrence porte `isRecurrence`, `originalId` et son propre jour ; l'événement d'origine reste dans la liste.
 * @param {Array} evenements
 * @param {{ jusquA?: string }} [options] dernier jour développé, « AAAA-MM-JJ »
 */
export function developperRecurrences(evenements = [], { jusquA } = {}) {
  let limite = jusquA;
  if (!limite) {
    const dans3Mois = new Date();
    dans3Mois.setMonth(dans3Mois.getMonth() + TROIS_MOIS_MAX);
    limite = jourLocal(dans3Mois);
  }
  const developpes = [];
  for (const ev of evenements) {
    developpes.push(ev);
    if (!ev.recurrence || ev.recurrence === 'never' || !ev.date) continue;
    const fin = ev.recurrenceEnd || limite;
    const maxOccurrences = ev.recurrenceEndType === 'count' && ev.recurrenceOccurrences ? parseInt(ev.recurrenceOccurrences, 10) : Infinity;
    const courant = lireJour(ev.date);
    const maxIterations = (ev.recurrence === 'daily' || ev.recurrence === 'custom') ? 365 : 100;
    let occurrences = 0;
    for (let i = 0; i < maxIterations; i++) {
      if (ev.recurrence === 'custom') {
        // Personnalisé : jour après jour, seuls les jours choisis comptent (lundi = 0)
        courant.setDate(courant.getDate() + 1);
        const indexJour = (courant.getDay() + 6) % 7;
        if (!ev.recurrenceDays || !ev.recurrenceDays.includes(indexJour)) continue;
      } else if (ev.recurrence === 'daily') courant.setDate(courant.getDate() + 1);
      else if (ev.recurrence === 'weekly') courant.setDate(courant.getDate() + 7);
      else if (ev.recurrence === 'biweekly') courant.setDate(courant.getDate() + 14);
      else courant.setMonth(courant.getMonth() + 1);
      const jour = jourLocal(courant);
      if (ev.recurrenceEndType !== 'count' && jour > fin) break;
      occurrences++;
      if (occurrences > maxOccurrences) break;
      developpes.push({ ...ev, id: `${ev.id}_rec_${jour}`, date: jour, isRecurrence: true, originalId: ev.id });
    }
  }
  return developpes;
}

/**
 * Les événements d'un jour : celui qui commence ce jour-là, ou dont la période (date → dateEnd) le couvre.
 * @param {Array} evenements saisis (les récurrences sont développées ici)
 * @param {string} [jour] « AAAA-MM-JJ », aujourd'hui par défaut
 */
export function evenementsDuJour(evenements = [], jour = jourLocal()) {
  return developperRecurrences(evenements, { jusquA: jour }).filter((e) => {
    if (!e.date) return false;
    if (e.dateEnd) return jour >= e.date && jour <= e.dateEnd;
    return e.date === jour;
  });
}

/**
 * Les tâches datées (non faites) vues comme des événements du planning. `employeId` vient de `assigned_to` : sans lui, le filtre
 * « Moi » ne retrouvait aucune tâche (il garde les événements sans personne), et le filtre d'une personne non plus (relecture
 * de la Task 6, tour 1).
 */
export function evenementsDesTaches(memos = []) {
  return memos.filter((m) => m.due_date && !m.is_done).map((m) => ({
    id: `memo_${m.id}`, memoId: m.id, title: m.text?.substring(0, 50) || 'Tâche', date: m.due_date, time: m.due_time || '', type: 'memo', isMemo: true,
    description: m.notes || '', priority: m.priority || '', category: m.category || '', subtasks: m.subtasks || [], chantier_id: m.chantier_id || '',
    is_done: m.is_done || false, fullText: m.text || '', employeId: m.assigned_to || '',
  }));
}

/**
 * Les échéances de documents : le devis envoyé dont la validité se termine, la facture à encaisser. Le titre porte le type et le
 * numéro (le client est dans `clientId`, affiché dessous) ; la facture est « en retard » (rouge) selon la règle de ventes.js, et son
 * montant est le reste dû. Sans le droit de voir les prix (`voitMontants` faux), aucun montant n'est écrit ; sans accès aux devis,
 * appeler avec une liste vide.
 * @param {Array} documents  devis et factures
 * @param {{ paiements?: Array, maintenant?: Date, voitMontants?: boolean }} [options]
 */
export function evenementsDesDocuments(documents = [], { paiements = [], maintenant = new Date(), voitMontants = true } = {}) {
  const liste = [];
  for (const d of documents) {
    if (d.type === 'devis' && d.date_validite && ['envoye', 'vu'].includes(d.statut)) {
      liste.push({
        id: `devis_${d.id}`, title: `Devis ${d.numero || ''}`.trim(), date: d.date_validite, type: 'deadline', isDeadline: true, ton: 'neutre', clientId: d.client_id || '',
        description: voitMontants && d.total_ttc ? `Fin de validité du devis — ${formatMoney(d.total_ttc)}` : 'Fin de validité du devis', devisId: d.id,
      });
    }
    if (estFacture(d) && estOuverte(d, paiements, maintenant)) {
      const ech = echeance(d);
      if (!ech) continue;
      liste.push({
        id: `facture_${d.id}`, title: `Facture ${d.numero || ''}`.trim(), date: jourLocal(ech), type: 'deadline', isDeadline: true, clientId: d.client_id || '',
        ton: estEnRetard(d, paiements, maintenant) ? 'danger' : 'neutre',
        description: voitMontants ? `Échéance facture — reste dû ${formatMoney(resteAPayer(d, paiements))}` : 'Échéance facture', devisId: d.id,
      });
    }
  }
  return liste;
}
