/**
 * Électricité (lot 4 de docs/metiers/synthese.md) : rappel de la demande d'attestation Consuel, compte rendu
 * d'intervention et d'autocontrôle, TVA d'une borne de recharge suggérée selon le local. Logique pure, sans React ni
 * Supabase : testée dans src/lib/__tests__/electricite.test.js.
 *
 * Vocabulaire (juriste-btp, 3 nov. 2026, docs/metiers/avis-juriste-2026-11-03.md et -soir.md) :
 *   - l'attestation Consuel est un document d'un organisme tiers : l'app RAPPELLE de la demander et permet d'en joindre
 *     le fichier, elle ne la fabrique ni ne l'imite (ni couleurs, ni CERFA, ni mise en page) ;
 *   - le document de l'artisan s'appelle « compte rendu d'intervention et d'autocontrôle » ; jamais « attestation de
 *     conformité », jamais le mot « conforme » (`MOTS_INTERDITS`, vérifié par les tests sur les textes produits ici) ;
 *   - TVA d'une borne : le critère est le LOCAL (à usage d'habitation, borne destinée aux résidents), pas la qualité du
 *     client ; toujours une suggestion, jamais un blocage (D-36, docs/decisions.md).
 * Cadrage relu par critique-produit le 4 nov. 2026 : rappel Consuel par une tâche datée (moteur existant des tâches),
 * TVA de la borne sur la ligne du devis (le taux se décide sur le devis signé), pas dans le compte rendu.
 */
import { jourLocal, dateLue } from './dates';
import { ajouterJours, jourDe, emetteurDe } from './ramonage';

const liste = (paires) => paires.map(([valeur, libelle]) => ({ valeur, libelle }));
export const libelleDe = (options, valeur) => options.find((o) => o.valeur === valeur)?.libelle || '';

/** Mots que l'app n'écrit jamais dans un texte de ce module (juriste-btp, 3 nov. 2026). */
export const MOTS_INTERDITS = [/conform/i, /certifi/i];

const dateFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// ─── Consuel ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Arrêté du 17 octobre 1973, art. 2 (version du 12/12/2024) : l'attestation doit parvenir au Consuel vingt jours au moins avant la mise sous tension prévue. */
export const CONSUEL_DELAI_JOURS = 20;

/**
 * Une aide (D342-19 ; décret n° 2017-26, art. 23 pour les bornes ; arrêté du 17 octobre 1973, art. 2 pour le délai) :
 * l'artisan décide. Texte de juriste-btp, relu au texte le 4 nov. 2026 (docs/metiers/avis-juriste-2026-11-04-electricien.md).
 */
export const AIDE_CONSUEL = 'L’attestation de conformité visée par le Consuel est due notamment pour une installation neuve '
  + 'raccordée au réseau, une installation de production de moins de 250 kVA (photovoltaïque) qui demande une modification '
  + 'de l’installation intérieure, une installation entièrement rénovée après mise hors tension par le distributeur à la '
  + 'demande du client (code de l’énergie, art. D342-19), et une borne de recharge de plus de 36 kW ou située dans un '
  + 'bâtiment d’habitation collectif, quelle que soit sa puissance (décret n° 2017-26, art. 23). Elle doit parvenir au '
  + 'Consuel au moins vingt jours avant la date prévue de la mise sous tension par le distributeur (arrêté du 17 octobre '
  + '1973, art. 2).';

/** Date limite d'envoi de la demande au Consuel : mise en service − 20 jours. */
export const limiteEnvoiConsuel = (miseEnService) => (miseEnService ? ajouterJours(miseEnService, -CONSUEL_DELAI_JOURS) : '');

/** Début du texte de la tâche : il sert à la retrouver parmi les tâches du chantier. */
export const TACHE_CONSUEL = 'Envoyer la demande d’attestation Consuel';

/**
 * La tâche de rappel, pour l'artisan (aucun message au client) : datée du dernier jour d'envoi (mise en service − 20
 * jours), elle entre dans « À faire » ce jour-là et passe en retard le lendemain (moteur existant des tâches, Dashboard).
 * Cocher la tâche vaut « demande envoyée ».
 */
export function tacheConsuel({ chantier, miseEnService }) {
  const limite = limiteEnvoiConsuel(miseEnService);
  if (!limite) return null;
  return {
    text: `${TACHE_CONSUEL}${chantier?.nom ? ` — ${chantier.nom}` : ''}`,
    notes: `À faire parvenir au Consuel au plus tard le ${dateFr(limite)}, vingt jours avant la mise sous tension prévue le `
      + `${dateFr(miseEnService)} (arrêté du 17 octobre 1973, art. 2). Joignez ensuite l’attestation visée aux fichiers du chantier.`,
    due_date: limite,
    category: 'rappel',
    priority: 'haute',
    chantier_id: chantier?.id || null,
    client_id: chantier?.client_id || chantier?.clientId || null,
  };
}

/** La tâche Consuel d'un chantier (la plus récente), ou null. */
export function tacheConsuelDuChantier(memos, chantierId) {
  return (memos || [])
    .filter((m) => m.chantier_id === chantierId && String(m.text || '').startsWith(TACHE_CONSUEL))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
}

export const estFichierConsuel = (doc) => /consuel/i.test(String(doc?.nom || ''));

/** L'état Consuel d'un chantier, en une ligne (onglet Électricité). */
export function etatConsuel({ tache = null, documents = [] } = {}, { aujourdhui = jourLocal() } = {}) {
  // Un nom de fichier ne prouve rien : l'app dit ce qu'elle voit (juriste-btp, 4 nov. 2026)
  if ((documents || []).some(estFichierConsuel)) return { ton: 'succes', texte: 'Un fichier « Consuel » est joint aux fichiers du chantier.' };
  if (!tache) return { ton: 'neutre', texte: 'Aucun rappel Consuel pour ce chantier.' };
  if (tache.is_done) return { ton: 'info', texte: 'Demande envoyée au Consuel : joignez l’attestation visée quand vous la recevez.' };
  return String(tache.due_date || '') < aujourdhui
    ? { ton: 'danger', texte: `Attestation à faire parvenir au Consuel : la date limite du ${dateFr(tache.due_date)} est passée.` }
    : { ton: 'alerte', texte: `Attestation à faire parvenir au Consuel au plus tard le ${dateFr(tache.due_date)}.` };
}

// ─── Compte rendu d'intervention et d'autocontrôle ───────────────────────────────────────────────────────────────

export const TITRE_COMPTE_RENDU = 'Compte rendu d’intervention et d’autocontrôle';
/** Sans aucune mesure saisie, le document ne parle pas d'autocontrôle (relecture du 4 nov. 2026, point 11). */
export const TITRE_SANS_MESURE = 'Compte rendu d’intervention';

export const NATURES = liste([
  ['neuf', 'Installation neuve'], ['renovation_totale', 'Rénovation totale'], ['renovation_partielle', 'Rénovation partielle'],
  ['depannage', 'Dépannage'], ['borne', 'Borne de recharge'], ['photovoltaique', 'Photovoltaïque (partie électrique)'], ['autre', 'Autre'],
]);

/** Mesures et vérifications d'autocontrôle : facultatives, un point laissé vide n'est pas imprimé ; des constats, jamais un jugement. */
export const MESURES = [
  { cle: 'terre_ohms', libelle: 'Résistance de la prise de terre (Ω)', valeur: true },
  { cle: 'isolement_mohms', libelle: 'Résistance d’isolement (MΩ)', valeur: true },
  { cle: 'differentiels', libelle: 'Dispositifs différentiels (test de déclenchement)', options: liste([['declenchement', 'Déclenchement constaté'], ['defaut', 'Défaut de déclenchement relevé'], ['non_teste', 'Non testés']]) },
  { cle: 'continuite', libelle: 'Continuité des conducteurs de protection', options: liste([['verifiee', 'Vérifiée'], ['defaut', 'Défaut relevé'], ['non_verifiee', 'Non vérifiée']]) },
  { cle: 'reperage', libelle: 'Repérage des circuits au tableau', options: liste([['fait', 'Fait'], ['partiel', 'Partiel'], ['non_fait', 'Non fait']]) },
];

/** Mention imprimée sous la déclaration : ce que le compte rendu n'est pas. */
export const MENTION_PORTEE = 'Ce compte rendu est établi par l’entreprise qui a réalisé les travaux. Il ne remplace pas '
  + 'l’attestation visée par le Consuel lorsqu’elle est due (code de l’énergie, art. D342-19), ni l’état de l’installation '
  + 'intérieure d’électricité établi par un diagnostiqueur pour une vente ou une location.';

/** La déclaration de l'intervenant ; sans mesure saisie, elle ne parle pas d'autocontrôle (juriste-btp, 4 nov. 2026). */
export function phraseCompteRendu(cr, nomEntreprise) {
  const debut = `Je soussigné(e) ${cr?.intervenant_nom || ''}, pour ${nomEntreprise || ''}, déclare avoir réalisé le `
    + `${dateFr(jourDe(cr?.realise_le))} les travaux décrits ci-dessus`;
  return mesuresImprimees(cr?.mesures).length ? `${debut}, puis un autocontrôle dont les résultats sont relevés ci-dessus.` : `${debut}.`;
}

/** Le titre imprimé : « … et d'autocontrôle » seulement si une mesure est saisie. */
export const titreCompteRendu = (cr) => (mesuresImprimees(cr?.mesures).length ? TITRE_COMPTE_RENDU : TITRE_SANS_MESURE);

/** Les mesures saisies, prêtes à imprimer : [{ libelle, valeur }] (vides exclues). */
export function mesuresImprimees(mesures = {}) {
  return MESURES.map((m) => {
    const brut = String(mesures?.[m.cle] ?? '').trim();
    const valeur = m.options ? libelleDe(m.options, brut) : brut;
    return { libelle: m.libelle, valeur };
  }).filter((x) => x.valeur);
}

const texteNet = (v) => (typeof v === 'string' ? v.trim() : '');
const jourValide = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texteNet(v)) && jourLocal(dateLue(texteNet(v))) === texteNet(v);

/**
 * La ligne IRVE imprimée sur le compte rendu d'une borne, ou '' : liste « Mes qualifications » de la branche
 * `cloud/metier-qualifications` (migration 110, forme `{ type: 'irve', intitule, organisme, numero, fin, imprimer }`).
 * Mêmes règles que `raisonNonImprimee` et `ligneImprimee` de son `src/lib/qualifications.js`, recopiées ici tant que
 * ce fichier n'est pas sur main (À LA FUSION : les importer à la place de cette fonction) : case « imprimer » respectée,
 * intitulé, organisme et numéro exigés, date de fin lisible et non passée À LA DATE DU DOCUMENT (`jour`).
 */
export function qualificationIrve(entreprise, jour = jourLocal()) {
  const liste = Array.isArray(entreprise?.qualifications) ? entreprise.qualifications : [];
  for (const q of liste) {
    if (!q || typeof q !== 'object' || texteNet(q.type) !== 'irve' || q.imprimer === false) continue;
    const [intitule, organisme, numero, fin] = [q.intitule, q.organisme, q.numero, q.fin].map(texteNet);
    if (!intitule || !organisme || !numero || !jourValide(fin) || fin < String(jour).slice(0, 10)) continue;
    return `IRVE (infrastructures de recharge) : ${intitule} — ${organisme} — N° ${numero} — Valide jusqu'au ${dateLue(fin).toLocaleDateString('fr-FR')}`;
  }
  return '';
}

const vide = (v) => !String(v ?? '').trim();

/** Ce qui manque avant d'enregistrer. Liste vide = enregistrable. */
export function manquantsCompteRendu(cr) {
  const m = [];
  if (vide(cr?.client_nom)) m.push({ champ: 'client_nom', message: 'Le nom du client' });
  if (vide(cr?.adresse_intervention)) m.push({ champ: 'adresse_intervention', message: 'L’adresse de l’intervention' });
  if (vide(cr?.nature)) m.push({ champ: 'nature', message: 'La nature des travaux' });
  if (vide(cr?.travaux)) m.push({ champ: 'travaux', message: 'Les travaux réalisés' });
  if (vide(cr?.realise_le)) m.push({ champ: 'realise_le', message: 'La date de l’intervention' });
  if (vide(cr?.intervenant_nom)) m.push({ champ: 'intervenant_nom', message: 'Le nom de l’intervenant' });
  if (!vide(cr?.prix_ht) && !(Number(String(cr.prix_ht).replace(',', '.')) >= 0)) m.push({ champ: 'prix_ht', message: 'Un prix en euros (chiffres seulement)' });
  return m;
}

/** Brouillon d'un compte rendu pour un chantier (client et adresse repris du chantier et de sa fiche client). */
export function nouveauCompteRendu({ chantier = null, client = null, entreprise = null, intervenant = '', maintenant = new Date() }) {
  const ville = [chantier?.codePostal || chantier?.code_postal, chantier?.ville].filter(Boolean).join(' ');
  const adresseChantier = [chantier?.adresse, ville].filter(Boolean).join(', ');
  return {
    chantier_id: chantier?.id || null,
    client_id: client?.id || chantier?.client_id || chantier?.clientId || null,
    client_nom: [client?.prenom, client?.nom].filter(Boolean).join(' ').trim() || client?.entreprise || '',
    client_contact: [client?.telephone, client?.email].filter(Boolean).join(' · '),
    adresse_intervention: adresseChantier || client?.adresse || '',
    nature: '',
    travaux: '',
    realise_le: maintenant.toISOString(),
    intervenant_nom: intervenant || entreprise?.nomEntrepreneur || '',
    mesures: {},
    reserves: '',
    observations: '',
    prix_ht: null,
  };
}

/**
 * Avec l'émetteur figé (identité imprimée, comme l'attestation de ramonage) ; pour une borne, la ligne IRVE valide à la
 * date de l'intervention y est figée aussi : le PDF ne lit plus la fiche du jour.
 */
export function avecEmetteur(cr, entreprise) {
  const emetteur = emetteurDe(entreprise);
  const irve = cr?.nature === 'borne' ? qualificationIrve(entreprise, jourDe(cr?.realise_le) || jourLocal()) : '';
  return { ...cr, emetteur: emetteur && irve ? { ...emetteur, qualificationIrve: irve } : emetteur };
}

/** Mode démo : CRI-AAAA-NNNNN, à la suite du plus grand (la base fait de même, migration 111). */
export function numeroCompteRenduDemo(comptesRendus, maintenant = new Date()) {
  const an = new Date(maintenant).getFullYear() || new Date().getFullYear();
  const motif = new RegExp(`^CRI-${an}-(\\d{5})$`);
  const dernier = Math.max(0, ...(comptesRendus || []).map((r) => Number(String(r.numero || '').match(motif)?.[1] || 0)));
  return `CRI-${an}-${String(dernier + 1).padStart(5, '0')}`;
}

/** La ligne de la facture tirée d'un compte rendu (prix HT, un forfait) : nature, date, travaux, numéro. */
export function ligneFactureCompteRendu(cr) {
  const le = cr?.realise_le ? ` du ${dateFr(jourDe(cr.realise_le))}` : '';
  const travaux = String(cr?.travaux || '').trim().split('\n')[0];
  const prix = Number(String(cr?.prix_ht ?? '').replace(',', '.'));
  return {
    description: `${libelleDe(NATURES, cr?.nature) || 'Travaux d’électricité'}${le}${travaux ? ` — ${travaux}` : ''}${cr?.numero ? ` — compte rendu n° ${cr.numero}` : ''}`,
    quantite: 1,
    unite: 'forfait',
    prixUnitaire: Number.isFinite(prix) && prix > 0 ? Math.round(prix * 100) / 100 : 0,
  };
}

// ─── TVA d'une borne de recharge (sur la ligne du devis) ─────────────────────────────────────────────────────────

/**
 * Régime de TVA posé sur une ligne de pose de borne (CGI 278-0 bis, N) : la ligne est exclue de la certification du
 * client (278-0 bis A / 279-0 bis, `mentionTvaReduite.js`), qui ne vise pas une borne.
 */
export const REGIME_BORNE = 'borne_278_0_bis_N';

/**
 * Une ligne qui parle d'une borne de recharge (désignation libre) : « borne(s) », « IRVE », « wallbox », « point(s) de
 * charge », « recharge … véhicule/voiture ». Une borne d'éclairage (ou une « borne lumineuse ») n'en est pas une, sauf
 * si la ligne parle aussi de recharge.
 */
export function estLigneBorne(description) {
  const t = String(description || '');
  if (/\b(irve|wallbox(es)?|points? de charge)\b|recharge.*(v[ée]hicule|voiture)/i.test(t)) return true;
  if (!/\bbornes?\b/i.test(t)) return false;
  return !/\bbornes?\s+(d['’]\s*[ée]clairage|lumineuses?|de\s+jardin|d['’]\s*appel|incendie|fontaine)/i.test(t) || /recharge/i.test(t);
}

export const POINTS_DE_CHARGE = liste([
  ['type2', 'Socle ou connecteur de type 2'], ['prise_e_renforcee', 'Prise de type E « renforcée » (14 A au moins)'], ['autre', 'Autre'],
]);
export const LOCAUX = liste([['habitation', 'Local à usage d’habitation'], ['autre', 'Autre local (commerce, bureaux…)']]);

export const TEXTE_FOURNITURE = 'Si la ligne comprend aussi la fourniture de la borne, mettez la fourniture sur une ligne à part : '
  + 'le 5,5 % de l’art. 278-0 bis, N du CGI vise la pose, l’installation et l’entretien. Le taux de la fourniture reste votre '
  + 'choix ; Mallettico n’en suggère aucun.';

/** Natures dont le taux par défaut de l'entreprise (souvent 10 %) est à revoir sur la facture tirée du compte rendu. */
export const TAUX_A_VERIFIER = ['neuf', 'borne', 'photovoltaique'];
export const TEXTE_TAUX_A_VERIFIER = 'Vérifiez le taux de TVA de la facture : le 10 % ne vaut que pour un logement achevé '
  + 'depuis plus de deux ans ; pour une borne, voir la ligne de pose ; pour du photovoltaïque, Mallettico ne propose '
  + 'aucun taux : le taux reste votre choix.';

/**
 * TVA suggérée pour la pose, l'installation et l'entretien d'une borne (CGI art. 278-0 bis, N, relu au texte le 3 nov.
 * 2026) : 5,5 % pour une borne dans un local à usage d'habitation, destinée aux résidents, dans la configuration de
 * l'ann. IV art. 30-0 H (type 2, ou prise de type E « renforcée » d'au moins 14 A), posée par un installateur qui a
 * l'habilitation et, le cas échéant, la qualification de l'art. D. 353-2 du code de l'énergie (ann. IV, art. 30-0 H,
 * 3, a). Aucune condition d'ancienneté du logement. Le critère est le
 * local, JAMAIS la qualité du client : cette fonction ne reçoit pas le client.
 * @returns {{ taux: number|null, texte: string, manque: string[] }} une suggestion ; l'artisan choisit le taux
 */
export function suggestionTvaBorne({ local, residents, pointDeCharge, installateurQualifie } = {}) {
  const manque = [];
  if (local !== 'habitation') manque.push(local === 'autre' ? 'le local n’est pas à usage d’habitation' : 'le local n’est pas indiqué');
  if (residents !== true) manque.push('la borne n’est pas indiquée comme destinée aux résidents');
  if (!['type2', 'prise_e_renforcee'].includes(pointDeCharge)) manque.push('le point de charge n’est ni de type 2 ni une prise de type E « renforcée »');
  if (installateurQualifie !== true) manque.push('l’habilitation et, le cas échéant, la qualification de l’installateur (code de l’énergie, art. D. 353-2 ; CGI, annexe IV, art. 30-0 H) ne sont pas indiquées');
  if (manque.length) {
    return { taux: null, manque, texte: `Pas de taux réduit suggéré : ${manque.join(' ; ')}. Le taux reste votre choix.` };
  }
  return {
    taux: 5.5,
    manque,
    texte: 'Taux suggéré pour la pose : 5,5 % (borne dans un local à usage d’habitation, destinée aux résidents ; '
      + 'CGI art. 278-0 bis, N). Une suggestion : le taux reste votre choix.',
  };
}
