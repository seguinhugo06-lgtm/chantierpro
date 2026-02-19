/**
 * useNotifications — Generates app notifications from data state
 *
 * Extracts the notification generation logic from App.jsx into a reusable hook.
 * Generates notifications for:
 *  - Overdue invoices (> 30 days unpaid)
 *  - Stale devis (sent > 10 days without response)
 *  - Expired insurance (RC Pro, Décennale)
 *  - Incomplete profile
 *  - Trial expiring (J-3 and less)
 */

import { useState, useEffect } from 'react';
import { safeString, validateRenderableFields } from '../lib/formatters';

export default function useNotifications({ devis, entreprise, isTrial, trialDaysLeft }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const notifs = [];
    const now = new Date();

    // Overdue invoices (factures unpaid > 30 days)
    (devis || []).filter(d => d.type === 'facture' && d.statut !== 'payee').forEach(f => {
      const days = Math.floor((now - new Date(f.date)) / 86400000);
      if (days > 30) {
        notifs.push({
          id: `overdue-${safeString(f.id, 'unknown', 'notif.overdue.id')}`,
          message: `Facture ${safeString(f.numero, '#', 'notif.overdue.numero')} impayee depuis ${days} jours`,
          date: `${days}j de retard`,
          read: false,
          type: 'urgent'
        });
      }
    });

    // Stale devis (sent > 10 days without response)
    (devis || []).filter(d => d.type === 'devis' && d.statut === 'envoye').forEach(d => {
      const days = Math.floor((now - new Date(d.date)) / 86400000);
      if (days > 10) {
        notifs.push({
          id: `stale-${safeString(d.id, 'unknown', 'notif.stale.id')}`,
          message: `Devis ${safeString(d.numero, '#', 'notif.stale.numero')} sans reponse depuis ${days} jours`,
          date: 'A relancer',
          read: false,
          type: 'warning'
        });
      }
    });

    // Expired insurance
    if (entreprise?.rcProValidite && new Date(entreprise.rcProValidite) < now) {
      notifs.push({ id: 'rc-expired', message: 'Votre assurance RC Pro est expiree', date: 'Action requise', read: false, type: 'urgent' });
    }
    if (entreprise?.decennaleValidite && new Date(entreprise.decennaleValidite) < now) {
      notifs.push({ id: 'dec-expired', message: 'Votre assurance Decennale est expiree', date: 'Action requise', read: false, type: 'urgent' });
    }

    // Incomplete profile
    const requiredFields = ['nom', 'adresse', 'siret', 'tel', 'email'];
    const missingFields = requiredFields.filter(k => !entreprise?.[k] || String(entreprise[k]).trim() === '');
    if (missingFields.length > 0) {
      notifs.push({
        id: 'profile-incomplete',
        message: `${missingFields.length} champ${missingFields.length > 1 ? 's' : ''} obligatoire${missingFields.length > 1 ? 's' : ''} manquant${missingFields.length > 1 ? 's' : ''} dans votre profil`,
        date: 'Parametres',
        read: false,
        type: 'info'
      });
    }

    // Trial expiring soon (J-3 and less)
    if (isTrial && trialDaysLeft > 0 && trialDaysLeft <= 3) {
      notifs.push({
        id: 'trial-expiring',
        message: trialDaysLeft === 1
          ? 'Dernier jour de votre essai Pro ! Passez au Pro pour ne rien perdre.'
          : `Plus que ${trialDaysLeft} jours d'essai Pro. Choisissez votre plan.`,
        date: 'Abonnement',
        read: false,
        type: 'urgent'
      });
    }

    // Validate all notification fields are strings before setting state
    const validatedNotifs = notifs.map(n =>
      validateRenderableFields(n, ['id', 'message', 'date', 'type'], 'notification')
    );

    // Preserve read status from previous notifications
    setNotifications(prev => {
      const readIds = new Set(prev.filter(n => n.read).map(n => n.id));
      return validatedNotifs.map(n => ({ ...n, read: readIds.has(n.id) }));
    });
  }, [devis, entreprise?.rcProValidite, entreprise?.decennaleValidite, entreprise?.nom, entreprise?.adresse, entreprise?.siret, entreprise?.tel, entreprise?.email, isTrial, trialDaysLeft]);

  const markNotifRead = (id) => setNotifications(prev =>
    prev.map(n => n.id === id ? { ...n, read: true } : n)
  );

  const markAllNotifsRead = () => setNotifications(prev =>
    prev.map(n => ({ ...n, read: true }))
  );

  const unreadNotifs = notifications.filter(n => !n.read);

  return { notifications, unreadNotifs, markNotifRead, markAllNotifsRead };
}
