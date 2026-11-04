/**
 * Paramètres › Données : l'accord donné avant la première dictée (migration 109), et son retrait. Après un retrait,
 * l'écran « Avant votre première dictée » revient à la dictée suivante (App.jsx relit l'accord à chaque « Dicter »).
 * Rien ne s'affiche comme fait avant la réponse de la base (on teste `error`).
 */
import React, { useCallback, useEffect, useState } from 'react';
import supabase from '../../supabaseClient';
import { Bouton } from '../ui/Bouton';
import { lireAccordIa, retirerAccordIa } from '../../lib/accordIa';
import { captureException } from '../../lib/sentry';

export default function AccordIaReglage({ userId, showToast }) {
  const [etat, setEtat] = useState({ charge: false, accord: false, depuis: null, erreur: false });
  const [envoi, setEnvoi] = useState(false);

  const relire = useCallback(async () => {
    const r = await lireAccordIa(supabase, userId);
    setEtat({ charge: true, accord: r.accord, depuis: r.depuis, erreur: !!r.error });
  }, [userId]);
  useEffect(() => { relire(); }, [relire]);

  const retirer = async () => {
    setEnvoi(true);
    try {
      const r = await retirerAccordIa(supabase, userId);
      if (!r.ok) {
        captureException(new Error(r.error?.message || 'retrait de l’accord IA impossible'), { context: 'accord IA' });
        showToast?.('Le retrait de votre accord n’a pas pu être enregistré. Réessayez.', 'error');
        return;
      }
      await relire();
      showToast?.('Accord retiré : il vous sera redemandé avant votre prochaine dictée.', 'success');
    } finally {
      setEnvoi(false);
    }
  };

  if (!etat.charge) return <p className="text-sm text-encre-3">Lecture de votre accord…</p>;
  if (etat.erreur) return <p className="text-sm text-encre-2">Votre accord n’a pas pu être lu. Réessayez plus tard.</p>;
  if (!etat.accord) {
    return (
      <p className="text-sm text-encre-2" data-accord-ia="absent">
        Aucun accord en cours. Il vous sera demandé avant votre prochaine dictée.
      </p>
    );
  }
  return (
    <div className="space-y-3" data-accord-ia="donne">
      <p className="text-sm text-encre-2">
        Vous avez accepté l’analyse de vos dictées par une intelligence artificielle (Claude, d’Anthropic)
        {etat.depuis ? ` le ${new Date(etat.depuis).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
        {/* Texte de juriste-btp, 4 nov. 2026 */}
        {' '}Si vous retirez votre accord, plus rien n'est envoyé à Anthropic tant que vous ne l'avez pas donné de nouveau : l'écran
        d'accord vous sera présenté avant la prochaine dictée. Vos devis, clients et chantiers restent tels quels ; ce qu'Anthropic
        a déjà reçu est effacé selon ses règles (Politique de confidentialité, article 4).
      </p>
      <Bouton onClick={retirer} chargement={envoi} disabled={envoi}>Retirer mon accord</Bouton>
    </div>
  );
}
