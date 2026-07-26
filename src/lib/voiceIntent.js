/**
 * voiceIntent — Passerelle entre la dictée et les données de l'app.
 *
 * Trois responsabilités :
 *   1. analyserDictee   → envoie le texte à l'Edge Function (Claude) et récupère
 *                          une intention structurée. En mode démo, bascule sur un
 *                          analyseur local (plus simple mais réel, pas simulé).
 *   2. rapprocherClient → retrouve un client existant plutôt que d'en créer un doublon.
 *   3. enrichirLignes   → complète les prix manquants depuis le catalogue de l'artisan.
 */

import { supabase, isDemo } from '../supabaseClient';
import { captureException } from './sentry';

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────────────────────

/** Minuscule sans accents ni ponctuation — pour comparer des libellés dictés. */
export const norm = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Analyse
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie la dictée à Claude et renvoie l'intention structurée.
 * @returns {Promise<{intention: object, source: 'ia'|'local'}>}
 * @throws  {Error} message déjà en français, affichable tel quel
 */
export async function analyserDictee(transcript, { clients = [], catalogue = [] } = {}) {
  const texte = (transcript || '').trim();
  if (texte.length < 3) {
    throw new Error("La dictée est vide. Appuyez sur le micro et décrivez votre besoin.");
  }

  // Mode démo : pas de session Supabase, donc pas d'appel IA possible.
  // On analyse localement — moins fin, mais réellement analysé.
  if (isDemo || !supabase) {
    return { intention: analyseLocale(texte), source: 'local' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('voice-intent', {
      body: {
        transcript: texte,
        contexte: {
          clients: clients.map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim()).filter(Boolean),
          articles: catalogue.map((a) => a.nom).filter(Boolean),
        },
      },
    });

    if (error) throw new Error(error.message || 'Analyse indisponible');
    if (data?.error) throw new Error(data.error);
    if (!data?.intention) throw new Error('Réponse inattendue du service de dictée.');

    return { intention: data.intention, source: 'ia' };
  } catch (e) {
    captureException(e, { context: 'analyserDictee' });
    // On ne bascule pas silencieusement sur l'analyse locale : l'artisan doit
    // savoir que le résultat sera moins bon, sinon il fera confiance à tort.
    throw new Error(
      e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')
        ? "Pas de réseau — la dictée a besoin d'une connexion pour être analysée."
        : e.message || "La dictée n'a pas pu être analysée."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyseur local (mode démo) — extraction par motifs, sans IA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ramène une unité dictée à sa forme canonique.
 * Attention : on ne peut pas passer par norm(), qui supprime les ² et ³ et
 * transformerait « m² » en « m ».
 */
function normUnite(brut) {
  const u = (brut || '').toLowerCase().trim();
  if (/^m²$|^m2$|carr/.test(u)) return 'm²';
  if (/^m³$|^m3$|cube/.test(u)) return 'm³';
  if (/^ml$|lin[ée]/.test(u)) return 'ml';
  if (/^heures?$|^h$/.test(u)) return 'h';
  if (/^jours?$|^j$/.test(u)) return 'j';
  if (/pi[èe]ces?/.test(u)) return 'pièce';
  if (/forfait/.test(u)) return 'forfait';
  return u || 'u';
}

const CHIFFRES = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15,
  seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  cent: 100, cents: 100, mille: 1000,
};

/** « quarante-cinq » → 45. Gère les composés courants du chiffrage BTP. */
function motsVersNombre(expr) {
  const mots = norm(expr).split(/[\s-]+/).filter(Boolean);
  if (!mots.length) return null;
  let total = 0, courant = 0, vu = false;
  for (const m of mots) {
    const v = CHIFFRES[m];
    if (v == null) { if (m !== 'et') return vu ? total + courant : null; continue; }
    vu = true;
    if (v === 1000) { total += (courant || 1) * 1000; courant = 0; }
    else if (v === 100) { courant = (courant || 1) * 100; }
    else courant += v;
  }
  return vu ? total + courant : null;
}

const nombreDepuis = (txt) => {
  if (txt == null) return null;
  const direct = parseFloat(String(txt).replace(',', '.'));
  if (!Number.isNaN(direct)) return direct;
  return motsVersNombre(txt);
};

/**
 * Analyse locale : reconnaît les motifs les plus fréquents d'une dictée d'artisan.
 * Volontairement conservatrice — mieux vaut ne rien remplir qu'inventer.
 */
export function analyseLocale(texte) {
  const brut = texte.trim();
  const n = norm(brut);

  // ── Client : « madame/monsieur X » ou « pour X »
  let client = null;
  const mNom = brut.match(/\b(?:madame|monsieur|mme|mr|m\.)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)/i);
  if (mNom) {
    const parts = mNom[1].trim().split(/\s+/);
    client = {
      nom: (parts.length > 1 ? parts[parts.length - 1] : parts[0]),
      prenom: parts.length > 1 ? parts.slice(0, -1).join(' ') : null,
      telephone: null, email: null, adresse: null, codePostal: null, ville: null,
    };
  }

  const mTel = brut.match(/\b0\s?[1-9](?:[\s.-]?\d{2}){4}\b/);
  if (mTel) {
    const d = mTel[0].replace(/\D/g, '');
    if (d.length === 10) {
      client = client || { nom: 'Client', prenom: null, email: null, adresse: null, codePostal: null, ville: null };
      client.telephone = d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
  }

  const mMail = brut.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (mMail) {
    client = client || { nom: 'Client', prenom: null, telephone: null, adresse: null, codePostal: null, ville: null };
    client.email = mMail[0];
  }

  const mAdr = brut.match(/\b(\d{1,4}(?:\s?(?:bis|ter))?\s+(?:rue|avenue|av|boulevard|bd|chemin|impasse|allee|allée|place|route)\s+[^,.;]{2,60})/i);
  if (mAdr) {
    client = client || { nom: 'Client', prenom: null, telephone: null, email: null, codePostal: null, ville: null };
    client.adresse = mAdr[1].trim();
  }

  const mCp = brut.match(/\b(\d{5})\b/);
  if (mCp && client) client.codePostal = mCp[1];

  // ── Lignes chiffrées : « 15 m² de carrelage à 45 € » / « la plomberie 800 euros »
  const lignes = [];
  const nb = `[\\d.,]+|\\b(?:${Object.keys(CHIFFRES).join('|')})(?:[\\s-](?:${Object.keys(CHIFFRES).join('|')}))*`;
  // Les accents comptent : la dictée produit « mètres carrés », pas « metres carres »
  const uniteRe = 'm²|m2|m³|m3|ml|m[èe]tres? carr[ée]s?|m[èe]tres? cubes?|m[èe]tres? lin[ée]aires?|heures?|jours?|pi[èe]ces?';
  // Les séparateurs incluent « : » — une dictée dit souvent « salle de bain : 15 m²… »
  const SEP = '[^,.;:]';

  const reQte = new RegExp(
    `(${nb})\\s*(${uniteRe})\\s+(?:de\\s+|d')?(${SEP}{2,50}?)\\s+(?:[àa]|pour)\\s+(${nb})\\s*(?:euros?|€)`,
    'gi'
  );
  let m;
  while ((m = reQte.exec(brut)) !== null) {
    const q = nombreDepuis(m[1]);
    const pu = nombreDepuis(m[4]);
    if (q == null || pu == null) continue;
    lignes.push({
      description: m[3].trim().replace(/^(de|d')\s*/i, ''),
      quantite: q,
      unite: normUnite(m[2]),
      prixUnitaire: pu,
    });
  }

  // Tournure inverse, tout aussi fréquente : « poser du placo : 45 m² à 12 € ».
  // La désignation précède la quantité, entre le séparateur et le nombre.
  const reInverse = new RegExp(
    `([^,.;:]{3,45}?)\\s*[:,]\\s*(${nb})\\s*(${uniteRe})\\s+(?:[àa]|pour)\\s+(${nb})\\s*(?:euros?|€)`,
    'gi'
  );
  while ((m = reInverse.exec(brut)) !== null) {
    const q = nombreDepuis(m[2]);
    const pu = nombreDepuis(m[4]);
    if (q == null || pu == null) continue;
    const desc = m[1].trim().replace(/^(?:et\s+|puis\s+)/i, '');
    if (lignes.some((l) => norm(l.description) === norm(desc))) continue;
    lignes.push({ description: desc, quantite: q, unite: normUnite(m[3]), prixUnitaire: pu });
  }

  // Forfaits : « la plomberie 800 euros » (aucune quantité dictée)
  const reForfait = new RegExp(
    `(?:^|[,.;:]|\\bet\\b)\\s*(?:la|le|les|l')?\\s*([a-zà-ÿ][^,.;:\\d]{2,40}?)\\s+(?:[àa]\\s+)?(${nb})\\s*(?:euros?|€)`,
    'gi'
  );
  const RE_UNITE_SEULE = new RegExp(`^(?:${nb})?\\s*(?:${uniteRe})$`, 'i');
  while ((m = reForfait.exec(brut)) !== null) {
    const desc = m[1].trim();
    // « quarante-cinq mètres carrés » n'est pas une désignation : c'est une
    // quantité déjà traitée par les motifs ci-dessus. On l'écarte.
    if (RE_UNITE_SEULE.test(desc)) continue;
    if (lignes.some((l) => norm(l.description).includes(norm(desc)) || norm(desc).includes(norm(l.description)))) continue;
    const pu = nombreDepuis(m[2]);
    if (pu == null) continue;
    lignes.push({ description: desc, quantite: 1, unite: 'forfait', prixUnitaire: pu });
  }

  // ── Chantier : évoqué si des travaux sont décrits
  let chantier = null;
  // On coupe au premier séparateur ET avant tout chiffre : « refaire sa salle de
  // bain : 15 m² de carrelage… » doit donner « Refaire sa salle de bain », pas la
  // phrase entière avec le chiffrage dedans.
  const mTravaux = brut.match(
    /\b((?:refaire|r[ée]nover|r[ée]novation|installer|installation|poser|pose|construire|am[ée]nager|am[ée]nagement|d[ée]pannage|ravalement)\s+[^,.;:\d]{3,40})/i
  );
  if (mTravaux) {
    const nom = mTravaux[1].trim().replace(/\s+(de|du|des|la|le|les|d'|à|a)$/i, '').trim();
    if (nom.length > 3) {
      chantier = {
        nom: nom.charAt(0).toUpperCase() + nom.slice(1),
        adresse: null, ville: null, description: null,
      };
    }
  }

  const resume = [
    client ? `client ${[client.prenom, client.nom].filter(Boolean).join(' ')}` : null,
    chantier ? 'un chantier' : null,
    lignes.length ? `${lignes.length} ligne${lignes.length > 1 ? 's' : ''} chiffrée${lignes.length > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(', ');

  return {
    resume: resume ? `Reconnu : ${resume}.` : "Rien de reconnu automatiquement — complétez à la main.",
    client,
    chantier,
    document: lignes.length ? { type: /\bfacture\b/i.test(n) ? 'facture' : 'devis', lignes, notes: null } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rapprochement client
// ─────────────────────────────────────────────────────────────────────────────

/** Retrouve un client existant pour éviter les doublons. null si aucun. */
export function rapprocherClient(dicte, clients = []) {
  if (!dicte?.nom) return null;
  const cible = norm(`${dicte.prenom || ''} ${dicte.nom}`);
  const cibleNom = norm(dicte.nom);
  const telCible = (dicte.telephone || '').replace(/\D/g, '');

  // Un numéro identique est le signal le plus fiable
  if (telCible.length === 10) {
    const parTel = clients.find((c) => (c.telephone || '').replace(/\D/g, '') === telCible);
    if (parTel) return parTel;
  }
  if (dicte.email) {
    const parMail = clients.find((c) => norm(c.email) === norm(dicte.email));
    if (parMail) return parMail;
  }
  return (
    clients.find((c) => norm(`${c.prenom || ''} ${c.nom || ''}`) === cible) ||
    clients.find((c) => norm(c.nom) === cibleNom) ||
    null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Enrichissement depuis le catalogue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complète chaque ligne avec l'article du catalogue correspondant :
 * prix d'achat, TVA et prix unitaire quand l'artisan ne l'a pas dicté.
 * Un prix dicté n'est jamais écrasé — c'est lui qui fait foi.
 */
export function enrichirLignes(lignes = [], catalogue = []) {
  if (!catalogue.length) return lignes.map((l) => ({ ...l, _source: null }));

  const index = catalogue.map((a) => ({ article: a, mots: norm(a.nom).split(' ').filter((w) => w.length > 2) }));

  return lignes.map((ligne) => {
    const motsLigne = norm(ligne.description).split(' ').filter((w) => w.length > 2);
    if (!motsLigne.length) return { ...ligne, _source: null };

    let meilleur = null;
    let meilleurScore = 0;
    for (const { article, mots } of index) {
      if (!mots.length) continue;
      const communs = mots.filter((w) => motsLigne.includes(w)).length;
      const score = communs / Math.max(mots.length, motsLigne.length);
      if (score > meilleurScore) { meilleurScore = score; meilleur = article; }
    }

    // Seuil volontairement haut : un mauvais rapprochement injecterait un
    // prix faux dans un devis, ce qui est pire que pas de prix du tout.
    if (!meilleur || meilleurScore < 0.5) return { ...ligne, _source: null };

    return {
      ...ligne,
      prixUnitaire: ligne.prixUnitaire ?? meilleur.prix ?? null,
      prixAchat: meilleur.prixAchat ?? undefined,
      tvaRate: meilleur.tva_rate ?? undefined,
      unite: ligne.unite || meilleur.unite,
      _source: meilleur.nom, // affiché à l'artisan : « repris du catalogue »
    };
  });
}

export default { analyserDictee, rapprocherClient, enrichirLignes, analyseLocale, norm };
