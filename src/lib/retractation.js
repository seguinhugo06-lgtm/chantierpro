/**
 * Droit de rétractation d'un client particulier (C. conso. L221-5, L221-18 à L221-28, D221-5) : qui est concerné,
 * fin du délai, textes imprimés sur le devis. Textes relevés sur Légifrance le 12 oct. 2026 (versions en vigueur)
 * et relus par juriste-btp. Même calcul du délai côté base : fin_delai_retractation (migration 086).
 */
import { echapperHtml as h } from './echapperHtml';
import { nomImprime } from './identiteEntreprise';
import { urlPublique } from './urlPublique';
import { delaiDeConditions } from './paiementsFacture';

/**
 * Lendemain de la mise en production de l'avis complet (avis type et formulaire) sur les trois générateurs, le
 * 12 oct. 2026 : un devis signé sur place avant ce jour a pu porter l'ancien avis, incomplet ; au doute, son délai
 * est compté prolongé de douze mois (L221-20).
 */
export const DATE_AVIS_COMPLET = '2026-10-13';

/**
 * Client consommateur : catégorie « Particulier », ou ni catégorie ni entreprise. Une copropriété (catégorie
 * « Syndic ») est une personne morale, pas un consommateur : lui imprimer le bloc lui donnerait par contrat un droit
 * qu'elle n'a pas (relecture juriste-btp du 12 oct. 2026). Même règle côté base (migration 086).
 */
export function estClientParticulier(client) {
  if (!client) return false;
  const categorie = String(client.categorie || '').trim().toLowerCase();
  if (categorie) return categorie === 'particulier';
  return !String(client.entreprise || '').trim();
}

/** Devis d'un client particulier, hors facture et avoir : le seul document qui porte le droit de rétractation. */
export function estConcerneParRetractation({ doc, client } = {}) {
  if (!doc || doc.type === 'facture' || doc.facture_type === 'avoir') return false;
  return estClientParticulier(client);
}

const jourIso = (d) => d.toISOString().slice(0, 10);

/** Le jour « AAAA-MM-JJ » à Paris d'un instant (horodatage, Date). */
export function jourParis(instant) {
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return '';
  const parties = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d).map((p) => [p.type, p.value]));
  return `${parties.year}-${parties.month}-${parties.day}`;
}

/** « 12/10/2026 à 14 h 32 » à Paris. */
export function dateHeureParis(instant) {
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return '';
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const [hh, mm] = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(d).split(':');
  return `${date} à ${hh} h ${mm}`;
}

/** Dimanche de Pâques (calendrier grégorien, algorithme anonyme de Meeus, Jones et Butcher), en UTC. */
export function paques(annee) {
  const a = annee % 19; const b = Math.floor(annee / 100); const c = annee % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3);
  const h2 = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h2 - k) % 7; const m = Math.floor((a + 11 * h2 + 22 * l) / 451);
  const n = h2 + l - 7 * m + 114;
  return new Date(Date.UTC(annee, Math.floor(n / 31) - 1, (n % 31) + 1));
}

/**
 * Jours fériés de l'article L3133-1 du code du travail, plus le Vendredi saint et le 26 décembre (fériés en Moselle
 * et en Alsace, L3134-13) : le délai calculé n'est jamais plus court que celui du client.
 */
export function joursFeries(annee) {
  const p = paques(annee);
  const decale = (jours) => jourIso(new Date(p.getTime() + jours * 86400000));
  return new Set([
    `${annee}-01-01`, decale(-2), decale(1), `${annee}-05-01`, `${annee}-05-08`, decale(39), decale(50),
    `${annee}-07-14`, `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`, `${annee}-12-26`,
  ]);
}

/** Premier jour ouvrable à partir d'une date UTC (samedi, dimanche et jours fériés sautés). */
function premierJourOuvrable(d) {
  let jour = d;
  for (;;) {
    const j = jour.getUTCDay();
    if (j !== 0 && j !== 6 && !joursFeries(jour.getUTCFullYear()).has(jourIso(jour))) return jour;
    jour = new Date(jour.getTime() + 86400000);
  }
}

/**
 * Dernier jour du délai de rétractation d'un contrat de prestation de services conclu le `jourConclusion`
 * (« AAAA-MM-JJ ») : quatorze jours, le jour de la conclusion non compté (L221-18, L221-19), reporté au premier
 * jour ouvrable ; sans l'avis complet (`informe` faux), douze mois de plus (L221-20). Il finit à 23 h 59 (Paris).
 */
export function finDelaiRetractation(jourConclusion, informe = true) {
  const m = String(jourConclusion || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const initial = premierJourOuvrable(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 14)));
  if (informe) return jourIso(initial);
  // + 12 mois, jour ramené au dernier du mois s'il n'existe pas (comme l'intervalle de PostgreSQL)
  const cible = new Date(Date.UTC(initial.getUTCFullYear(), initial.getUTCMonth() + 12, 1));
  const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
  return jourIso(premierJourOuvrable(new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth(), Math.min(initial.getUTCDate(), dernier)))));
}

// ─── Textes ─────────────────────────────────────────────────────────────────

/**
 * Case de la page de signature : demande expresse de commencer avant la fin du délai (L221-25, al. 1 : le
 * professionnel recueille la demande et fait reconnaître la perte du droit après exécution complète). Rédaction
 * juriste-btp du 12 oct. 2026.
 */
export const DEMANDE_EXPRESSE = 'Je demande que les travaux commencent avant la fin du délai de rétractation de quatorze jours. Je reconnais qu\'une fois les travaux entièrement exécutés, je n\'aurai plus le droit de me rétracter.';
/** Sous la case : information L221-5, 9° (frais dus en cas de rétractation après une demande expresse). */
export const DEMANDE_EXPRESSE_AIDE = 'Si je me rétracte après le début des travaux, je paierai un montant proportionnel aux travaux réalisés jusqu\'à ma rétractation.';
/** Réparation urgente (L221-28, 8°) : la phrase que le client signe. */
export const DEMANDE_URGENCE = 'À ma demande, ces travaux de dépannage sont réalisés en urgence à mon domicile.';

/** Information L221-5, 10° : circonstances dans lesquelles le client perd le droit (L221-28, 1°). Rédaction libre. */
const PERTE_DU_DROIT = 'Vous perdez le droit de rétractation lorsque, à votre demande expresse, les travaux ont été entièrement exécutés avant la fin du délai de rétractation et que vous avez reconnu perdre ce droit (article L221-28, 1° du Code de la consommation).';

/**
 * Adresse de la rétractation en ligne à annoncer dans l'avis (phrase (3) de l'annexe R221-3) : le lien de
 * signature, sauf là où la fonctionnalité n'existe pas — devis signé sur place, ou signé en ligne sans y avoir
 * droit (avant le 19 juin 2026 : retractation_en_ligne faux) (relecture juriste-btp du 12 oct. 2026 : une
 * promesse imprimée doit être tenue).
 */
export function lienRetractationEnLigne(doc, jeton) {
  const t = jeton || doc?.signature_token;
  if (!t || doc?.signature || (doc?.signature_data && doc?.retractation_en_ligne === false)) return '';
  return urlPublique(`/devis/signer/${t}`);
}

/**
 * Délai de rétractation d'un devis signé, vu par l'artisan : dernier jour et s'il est prolongé (L221-20). Signé
 * par le lien : la base sait si l'avis complet a été montré (avis_retractation) ; sur place : l'avis complet est
 * imprimé sur les devis présentés à partir de DATE_AVIS_COMPLET.
 */
export function delaiRetractationDevis(devis, dateSignature) {
  const jour = dateSignature ? jourParis(dateSignature) : '';
  if (!jour) return null;
  const informe = devis?.signature_data ? devis.avis_retractation === true : jour >= DATE_AVIS_COMPLET;
  return { fin: finDelaiRetractation(jour, informe), prolonge: !informe };
}

/**
 * Pas de paiement dans les sept jours d'un contrat signé hors établissement par un particulier (C. conso. L221-10 ;
 * L242-7 punit le fait d'« exiger ou d'obtenir » un paiement pendant ce délai) : ni acompte, ni paiement reçu, sous
 * quelque forme que ce soit, même si le client a demandé que les travaux commencent (la demande expresse ne lève pas
 * l'interdiction). Exception : dépannage urgent expressément demandé par le client (L221-10, 4°, case
 * `travaux_urgents`). Concerne la signature sur place (pavé de l'app : `signature`), pas la signature par le lien
 * (`signature_data`) ; l'app ne sait pas si la signature sur place a eu lieu dans les locaux de l'artisan : elle
 * bloque par prudence. Calcul (aucun texte propre à L221-10, appliqué par prudence) : le jour de la signature ne
 * compte pas (C. proc. civ. art. 641), le délai finit le 7e jour à minuit, reporté au premier jour ouvrable s'il
 * tombe un samedi, un dimanche ou un jour férié (art. 642) ; le paiement est possible le lendemain (tâche
 * sept-jours, relectures juriste-btp des 12 et 17 oct. 2026).
 *
 * @returns {null | { possibleLe: string, reporte: boolean }} le jour (AAAA-MM-JJ, Paris) à partir duquel un paiement
 *   est possible si on est avant, et si le délai a été reporté ; sinon null (aucune interdiction en cours)
 */
export function delaiSeptJours({ devis, client, maintenant = new Date() } = {}) {
  if (!devis || !estConcerneParRetractation({ doc: devis, client })) return null;
  if (!devis.signature || devis.signature_data || devis.travaux_urgents) return null;
  const jour = jourParis(devis.signature_date || devis.signatureDate || '');
  if (!jour) return null;
  const [a, m, j] = jour.split('-').map(Number);
  const septieme = new Date(Date.UTC(a, m - 1, j + 7));
  const fin = premierJourOuvrable(septieme);
  const possibleLe = jourIso(new Date(fin.getTime() + 86400000));
  return jourParis(maintenant) < possibleLe ? { possibleLe, reporte: fin.getTime() !== septieme.getTime() } : null;
}

/** Le jour (AAAA-MM-JJ) à partir duquel un paiement est possible, ou null (voir delaiSeptJours). */
export function paiementPossibleLe(p = {}) {
  return delaiSeptJours(p)?.possibleLe || null;
}

/**
 * Explication à l'artisan (texte juriste-btp du 17 oct. 2026). Reçoit le résultat de delaiSeptJours (ou une date
 * seule). Cite les formes de paiement que l'artisan croit permises (chèque non encaissé, virement).
 */
export function raisonSeptJours(delai) {
  const d = typeof delai === 'string' ? { possibleLe: delai, reporte: false } : delai;
  if (!d?.possibleLe) return '';
  const [a, m, j] = d.possibleLe.split('-');
  return `Devis signé sur place par un client particulier : n'acceptez aucun paiement avant le ${j}/${m}/${a}, ni acompte, ni chèque (même non encaissé), ni virement. Un contrat signé hors de vos locaux interdit tout paiement pendant les sept jours qui suivent la signature${d.reporte ? ', délai reporté au premier jour ouvrable s\'il finit un samedi, un dimanche ou un jour férié' : ''} (article L221-10 du Code de la consommation).`;
}

/**
 * Facture complète ou de solde émise pendant les sept jours (tâche sept-jours-factures) : elle peut être émise, mais
 * ne doit réclamer aucun paiement avant la fin du délai (L242-7 punit le fait d'« exiger »). Si l'échéance calculée
 * tombe avant le jour où le paiement devient possible, la facture prend ce jour pour échéance et imprime, à la place
 * de ses conditions (« à réception »…), la phrase de la relecture juriste-btp du 17 oct. 2026.
 * @param {{ possibleLe: string }|null} delai résultat de delaiSeptJours
 * @param {string|null} echeance échéance calculée (AAAA-MM-JJ)
 * @returns {null | { date_echeance: string, conditions: string, conditionsPaiement: null }} champs à poser, ou null
 */
export function echeanceApresSeptJours(delai, echeance, conditions) {
  if (!delai?.possibleLe) return null;
  const [a, m, j] = delai.possibleLe.split('-');
  const phrase = `Paiement au plus tôt le ${j}/${m}/${a} (article L221-10 du Code de la consommation)`;
  const e = String(echeance || '').slice(0, 10);
  if (e && e >= delai.possibleLe) {
    // Échéance déjà après le délai, mais conditions illisibles (« Paiement comptant ») : imprimées telles quelles,
    // elles exigeraient un paiement immédiat (L242-7) — relecture juriste-btp du 17 oct. 2026 (C4)
    const c = String(conditions || '').trim();
    return c && !delaiDeConditions(c) ? { conditions: phrase, conditionsPaiement: null } : null;
  }
  return { date_echeance: delai.possibleLe, conditions: phrase, conditionsPaiement: null };
}

/** Réparation urgente (L221-28, 8°), en tête de l'avis. Rédaction libre. */
const URGENCE = 'Dépannage urgent : vous avez expressément demandé que ces travaux de réparation soient réalisés en urgence à votre domicile. Pour les pièces de rechange et les travaux strictement nécessaires pour répondre à l\'urgence, vous ne bénéficiez pas du droit de rétractation (article L221-28, 8° du Code de la consommation).';

const coordonnees = (entreprise) => ({
  nom: nomImprime(entreprise) || String(entreprise?.nom || '').trim(),
  adresse: String(entreprise?.adresse || '').replace(/\s*\n\s*/g, ', ').trim(),
  telephone: String(entreprise?.tel || entreprise?.telephone || '').trim(),
  email: String(entreprise?.email || '').trim(),
});

/**
 * Avis d'information et formulaire type, à imprimer sur le devis d'un client particulier.
 *
 * Avis : annexe à l'article R221-3, version en vigueur depuis le 19/06/2026 (décret n° 2026-3 du 5 janvier 2026),
 * MOT POUR MOT, complété pour une prestation de services : (1) a), (2) coordonnées de l'entreprise, (3) quand le
 * devis a un lien de signature en ligne, (6) ; (4) et (5) ne visent que la vente de biens. Puis l'information
 * L221-5, 10°. Formulaire : annexe à l'article R221-1, version en vigueur depuis le 28/05/2022 (décret n° 2022-424
 * du 25 mars 2022), MOT POUR MOT, « A l'attention de » complété. Imprimés, l'avis et le formulaire forment
 * l'information du 7° de L221-5 : sans eux, le délai est prolongé de douze mois (L221-20).
 *
 * @param {object} p
 * @param {object} p.entreprise  fiche de l'entreprise (valeurs brutes : échappées ici)
 * @param {object} [p.doc]       le devis (travaux_urgents)
 * @param {string} [p.lienEnLigne] adresse de la page de signature, où se trouve la fonctionnalité de rétractation
 */
export function blocRetractationHtml({ entreprise, doc, lienEnLigne } = {}) {
  const c = coordonnees(entreprise);
  const notifier = [c.nom, c.adresse, c.telephone, c.email].filter(Boolean).map(h).join(', ');
  const attention = [c.nom, c.adresse, c.email].filter(Boolean).map(h).join(', ');
  const enLigne = lienEnLigne
    ? ` Vous pouvez également exercer votre droit de rétractation en ligne sur ${h(lienEnLigne)}. Si vous utilisez cette fonctionnalité en ligne, nous vous enverrons, dans les meilleurs délais, un accusé de réception de la rétractation sur un support durable (par exemple, par courriel), y compris son contenu ainsi que la date et l'heure de sa soumission.`
    : '';
  const p = (texte, style = '') => `<p style="margin:0 0 5px;${style}">${texte}</p>`;
  return `
  <!-- DROIT DE RÉTRACTATION : avis type (annexe R221-3) et formulaire type (annexe R221-1), client particulier -->
  <div class="retractation-annexe" style="break-before:page;page-break-before:always;margin-top:14px;font-size:8pt;color:#334155;line-height:1.45">
    ${doc?.travaux_urgents ? `<div style="border:1px solid #fcd34d;background:#fef3c7;color:#92400e;padding:8px 10px;border-radius:6px;margin-bottom:8px">${h(URGENCE)}</div>` : ''}
    <div style="border:1px solid #cbd5e1;padding:10px 12px;border-radius:6px">
      ${p('<strong>INFORMATIONS CONCERNANT L\'EXERCICE DU DROIT DE RÉTRACTATION</strong>', 'font-size:9pt')}
      ${p('<strong>Droit de rétractation</strong>')}
      ${p('Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un délai de quatorze jours.')}
      ${p('Le délai de rétractation expire quatorze jours après le jour de la conclusion du contrat.')}
      ${p(`Pour exercer le droit de rétractation, vous devez nous notifier (${notifier}) votre décision de rétractation du présent contrat au moyen d'une déclaration dénuée d'ambiguïté (par exemple, lettre envoyée par la poste ou courrier électronique). Vous pouvez utiliser le modèle de formulaire de rétractation mais ce n'est pas obligatoire.${enLigne}`)}
      ${p('Pour que le délai de rétractation soit respecté, il suffit que vous transmettiez votre communication relative à l\'exercice du droit de rétractation avant l\'expiration du délai de rétractation.')}
      ${p('<strong>Effets de rétractation</strong>')}
      ${p('En cas de rétractation de votre part du présent contrat, nous vous rembourserons tous les paiements reçus de vous, y compris les frais de livraison (à l\'exception des frais supplémentaires découlant du fait que vous avez choisi, le cas échéant, un mode de livraison autre que le mode moins coûteux de livraison standard proposé par nous) sans retard excessif et, en tout état de cause, au plus tard quatorze jours à compter du jour où nous sommes informés de votre décision de rétractation du présent contrat. Nous procéderons au remboursement en utilisant le même moyen de paiement que celui que vous aurez utilisé pour la transaction initiale, sauf si vous convenez expressément d\'un moyen différent ; en tout état de cause, ce remboursement n\'occasionnera pas de frais pour vous.')}
      ${p('Si vous avez demandé de commencer la prestation de services pendant le délai de rétractation, vous devrez nous payer un montant proportionnel à ce qui vous a été fourni jusqu\'au moment où vous nous avez informé de votre rétractation du présent contrat, par rapport à l\'ensemble des prestations prévues par le contrat.', 'margin-bottom:0')}
    </div>
    ${p(h(PERTE_DU_DROIT), 'margin:6px 2px 0')}
    <div style="border:1px dashed #94a3b8;padding:10px 12px;border-radius:6px;margin-top:10px">
      ${p('<strong>MODÈLE DE FORMULAIRE DE RÉTRACTATION</strong>', 'font-size:9pt')}
      ${p('(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)')}
      ${p(`A l'attention de ${attention} :`)}
      ${p('Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du bien (*)/pour la prestation de services (*) ci-dessous :')}
      ${p('Commandé le (*)/reçu le (*) :', 'margin-top:10px')}
      ${p('Nom du (des) consommateur(s) :', 'margin-top:10px')}
      ${p('Adresse du (des) consommateur(s) :', 'margin-top:10px')}
      ${p('Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :', 'margin-top:10px')}
      ${p('Date :', 'margin-top:18px')}
      ${p('(*) Rayez la mention inutile.', 'margin-top:10px;margin-bottom:0')}
    </div>
  </div>`;
}

/**
 * Sous la signature du client : la demande expresse (L221-25) et, pour un dépannage urgent, la phrase signée par
 * le client (L221-28, 8°). Rien quand la case n'a pas été cochée (une date de début écrite deviendrait fausse si le
 * délai est prolongé).
 */
export function mentionsSignatureClientHtml(doc) {
  const blocs = [];
  if (doc?.travaux_urgents) {
    blocs.push(`<div style="font-size:7.5pt;color:#334155;margin-top:6px">${h(DEMANDE_URGENCE)}</div>`);
  }
  if (doc?.execution_anticipee_le) {
    blocs.push(`<div style="font-size:7.5pt;color:#334155;margin-top:6px"><strong>Demande expresse du client</strong> (art. L221-25 du Code de la consommation) : « ${h(DEMANDE_EXPRESSE)} » — recueillie le ${h(dateHeureParis(doc.execution_anticipee_le))} (heure de Paris)${doc.signature_data ? ' lors de la signature en ligne' : ' lors de la signature sur place'}.</div>`);
  }
  // Accord du client pour recevoir son exemplaire par e-mail (L221-9), donné à la signature sur place (migration 090)
  if (doc?.exemplaire_email_accepte_le) {
    blocs.push(`<div style="font-size:7.5pt;color:#334155;margin-top:6px">Le client a accepté de recevoir son exemplaire par e-mail (art. L221-9 du Code de la consommation) — le ${h(dateHeureParis(doc.exemplaire_email_accepte_le))} (heure de Paris).</div>`);
  }
  return blocs.join('');
}
