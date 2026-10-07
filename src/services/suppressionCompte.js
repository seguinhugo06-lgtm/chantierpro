/**
 * Suppression définitive du compte (RGPD art. 17, App Store 5.1.1(v)).
 *
 * 1. Fichiers Storage de l'utilisateur, supprimés par l'API Storage (la suppression SQL directe
 *    est interdite par Supabase). Un `remove` refusé par les règles d'accès ne renvoie PAS
 *    d'erreur : on relit donc le dossier après coup, et ce qui reste est signalé.
 * 2. RPC `supprimer_mon_compte` (migration 072) : données, organisations, compte d'authentification.
 *    Elle refuse si un abonnement payant est actif ou si une équipe dépend du compte.
 */

// Dossiers par seau : préfixe = identifiant de l'utilisateur, ou de l'organisation qu'il possède.
const DOSSIERS = [
  { seau: 'chantier-photos', par: 'user' },
  { seau: 'chat-attachments', par: 'user' },
  { seau: 'subcontractor-docs', par: 'org' },
];

const SEAU_ABSENT = /bucket not found|not found|does not exist/i;

/** Liste récursivement les chemins de fichiers sous `prefixe`. */
export async function listerFichiers(storage, seau, prefixe) {
  const chemins = [];
  const aVisiter = [prefixe];
  while (aVisiter.length) {
    const dossier = aVisiter.shift();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.from(seau).list(dossier, { limit: 1000, offset });
      if (error) throw error;
      for (const entree of data || []) {
        const chemin = `${dossier}/${entree.name}`;
        // L'API renvoie les sous-dossiers comme des entrées sans id.
        if (entree.id === null || entree.id === undefined) aVisiter.push(chemin);
        else chemins.push(chemin);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return chemins;
}

/**
 * Supprime les fichiers d'un dossier et renvoie ceux qui restent (chemins « seau/chemin »).
 * Un seau inexistant n'est pas une erreur : la fonctionnalité n'a simplement jamais servi.
 */
export async function viderDossier(storage, seau, prefixe) {
  let chemins;
  try {
    chemins = await listerFichiers(storage, seau, prefixe);
  } catch (err) {
    if (SEAU_ABSENT.test(err?.message || '')) return [];
    throw err;
  }
  for (let i = 0; i < chemins.length; i += 100) {
    const { error } = await storage.from(seau).remove(chemins.slice(i, i + 100));
    if (error && !SEAU_ABSENT.test(error.message || '')) throw error;
  }
  if (!chemins.length) return [];
  // Vérification : un refus des règles d'accès est silencieux.
  const restants = await listerFichiers(storage, seau, prefixe).catch(() => chemins);
  return restants.map((c) => `${seau}/${c}`);
}

const MESSAGES = {
  ABONNEMENT_ACTIF: 'Votre abonnement payant est encore actif. Résiliez-le d’abord (Abonnement → Gérer mon abonnement), sinon il continuerait d’être prélevé.',
  EQUIPE_ACTIVE: 'Des membres de votre équipe utilisent encore votre espace. Retirez-les d’abord (Paramètres → Équipe).',
  NON_CONNECTE: 'Votre session a expiré. Reconnectez-vous puis recommencez.',
};

/** Message à afficher pour une erreur de la RPC (ou du Storage). */
export function messageErreurSuppression(err) {
  const texte = `${err?.message || ''} ${err?.details || ''}`;
  if (/supprimer_mon_compte/.test(texte) && /could not find|does not exist|PGRST202/i.test(`${texte} ${err?.code || ''}`)) {
    return 'La suppression n’est pas encore activée sur le serveur. Écrivez à contact@mallettico.fr : nous supprimons votre compte sous 72 h.';
  }
  for (const [code, message] of Object.entries(MESSAGES)) if (texte.includes(code)) return message;
  return 'La suppression n’a pas abouti et rien n’a été effacé. Réessayez, ou écrivez à contact@mallettico.fr.';
}

/**
 * @param {object} p
 * @param {import('@supabase/supabase-js').SupabaseClient} p.supabase
 * @param {string} p.userId
 * @param {string|null} p.orgIdProprietaire - organisation possédée (ses fichiers partent aussi)
 * @returns {Promise<object>} bilan renvoyé par la RPC
 */
export async function supprimerMonCompte({ supabase, userId, orgIdProprietaire }) {
  const restants = [];
  for (const { seau, par } of DOSSIERS) {
    const prefixe = par === 'user' ? userId : orgIdProprietaire;
    if (!prefixe) continue;
    restants.push(...(await viderDossier(supabase.storage, seau, prefixe)));
  }
  const { data, error } = await supabase.rpc('supprimer_mon_compte', {
    p_simulation: false,
    p_fichiers_restants: restants,
  });
  if (error) throw error;
  return data;
}
