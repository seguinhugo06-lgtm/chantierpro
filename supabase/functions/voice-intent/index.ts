/**
 * voice-intent — Transforme une phrase dictée par l'artisan en données structurées.
 *
 * L'artisan parle librement depuis le chantier :
 *   « Madame Dupont au 12 rue des Lilas à Bordeaux, 06 12 34 56 78, elle veut
 *     refaire sa salle de bain : 15 m² de carrelage à 45 €, la plomberie 800 €. »
 *
 * On renvoie ce qu'on y a reconnu — un client, un chantier, un devis — sans
 * jamais rien créer : c'est l'app qui fait relire puis valider par l'artisan.
 *
 * MODÈLE — Claude Haiku 5.5, effort `low`, sortie structurée (JSON garanti par le schéma) : `consignes.ts`.
 * RÈGLES — authentification, quota mensuel de l'organisation, erreurs propres : `regles.ts` (testé sous vitest).
 * QUOTA ET COÛTS — table `usage_ia` et fonctions `reserver_usage_ia` / `terminer_usage_ia` (migration 107), appelées
 * avec la clé de service APRÈS vérification du jeton de l'utilisateur.
 *
 * Secrets : ANTHROPIC_API_KEY (réglé par Hugo). Sans clé, sans crédits ou API en panne : 503 « Dictée indisponible
 * pour le moment. Saisissez votre devis à la main. »
 *
 * Usage : supabase.functions.invoke('voice-intent', { body: { transcript, contexte, organisation } })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.68.0';
import { admin, CLE_SERVEUR, journaliser, utilisateurDuJeton } from '../_shared/branchements.ts';
import { traiterDictee, type Reservation } from './regles.ts';

// Compteur absent (migration 107 pas appliquée) : fonction ou table introuvable.
const COMPTEUR_ABSENT = /PGRST202|PGRST205|42883|42P01/;

const cleApi = Deno.env.get('ANTHROPIC_API_KEY') || undefined;
// Une seule tentative de plus, et 15 s au plus par tentative : l'artisan attend devant son écran ; au-delà, on lui
// propose la saisie à la main plutôt qu'un sablier.
const anthropic = cleApi ? new Anthropic({ apiKey: cleApi, maxRetries: 1, timeout: 15_000 }) : null;

serve((req) => traiterDictee(req, {
  cleServeur: CLE_SERVEUR || undefined,
  cleApi,
  utilisateur: utilisateurDuJeton,
  journal: journaliser('voice-intent'),

  async reserver({ userId, organisation, fonction, limites }): Promise<Reservation> {
    const { data, error } = await admin.rpc('reserver_usage_ia', {
      p_user_id: userId, p_org: organisation, p_fonction: fonction, p_limites: limites,
    });
    if (error) {
      if (COMPTEUR_ABSENT.test(`${error.code} ${error.message}`)) return { indisponible: true };
      if (/HORS_ORGANISATION/.test(error.message || '')) return { horsOrganisation: true };
      throw new Error(error.message);
    }
    const r = (data || {}) as { autorise?: boolean; id?: number; limite?: number | null; utilise?: number; plan?: string };
    if (r.autorise === true && r.id != null) {
      return { autorise: true, id: Number(r.id), limite: r.limite ?? null, utilise: Number(r.utilise ?? 0), plan: r.plan || 'gratuit' };
    }
    if (r.autorise === false) return { autorise: false, limite: r.limite ?? null, utilise: Number(r.utilise ?? 0), plan: r.plan || 'gratuit' };
    throw new Error('réponse inattendue de reserver_usage_ia');
  },

  async terminer(id, fin) {
    const { data, error } = await admin.rpc('terminer_usage_ia', {
      p_id: id, p_statut: fin.statut, p_modele: fin.modele, p_jetons_entree: fin.jetonsEntree ?? null,
      p_jetons_sortie: fin.jetonsSortie ?? null, p_duree_ms: fin.dureeMs, p_motif: fin.motif ?? null,
    });
    if (error) throw new Error(error.message);
    if (data !== true) throw new Error('usage introuvable ou déjà clos');
  },

  async appeler(requete) {
    if (!anthropic) throw new Error('client Anthropic absent');
    // deno-lint-ignore no-explicit-any
    return await anthropic.messages.create(requete as any) as any;
  },
}));
