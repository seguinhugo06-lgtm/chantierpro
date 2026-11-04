/**
 * Le régime de TVA réglé dans la Trésorerie (`tresorerie_settings.regime_tva` : franchise, trimestriel ou mensuel),
 * lu seul, pour l'Administratif (src/lib/echeancesAdmin.js) : un choix explicite n'y est pas redemandé.
 * - Démo : le réglage de la Trésorerie en localStorage (clé de useTresorerie.js).
 * - Réel : une lecture de la ligne de l'utilisateur ; supabase-js ne lève pas, on teste `error`.
 * Aucun réglage enregistré, ou lecture en échec : `regimeTva` null (la question reste posée).
 */
import { useEffect, useState } from 'react';
import supabase, { isDemo, auth } from '../supabaseClient';
import { captureException } from '../lib/sentry';

const SETTINGS_KEY = 'cp_tresorerie_settings';

function lireDemo() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')?.regimeTva || null; } catch { return null; }
}

export function useRegimeTvaTresorerie() {
  const [etat, setEtat] = useState(() => (isDemo || !supabase ? { regimeTva: isDemo ? lireDemo() : null, charge: true } : { regimeTva: null, charge: false }));

  useEffect(() => {
    if (isDemo || !supabase) return undefined;
    let annule = false;
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        if (!user?.id) { if (!annule) setEtat({ regimeTva: null, charge: true }); return; }
        const { data, error } = await supabase.from('tresorerie_settings').select('regime_tva').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (!annule) setEtat({ regimeTva: data?.regime_tva || null, charge: true });
      } catch (err) {
        captureException(err, { context: 'administratif : lecture du régime de TVA de la trésorerie' });
        if (!annule) setEtat({ regimeTva: null, charge: true });
      }
    })();
    return () => { annule = true; };
  }, []);

  return etat;
}
