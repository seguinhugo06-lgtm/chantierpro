/**
 * Échéances administratives de l'artisan (écran Administratif) — un seul module pour le calendrier et la liste
 * « Prochaines échéances » de l'accueil.
 *
 * Avant (constat du 31 oct. 2026) : `ECHEANCES_2026` s'arrêtait en septembre 2026 et l'accueil n'affichait rien.
 *
 * Règles :
 * - aucune date inventée : une date non publiée a `certitude: 'a_confirmer'` (et parfois pas de date du tout) ;
 * - une date qui dépend d'un choix de l'artisan inconnu de l'app a `certitude: 'selon_option'` ;
 * - quand la date officielle est une fourchette (CA3 « entre le 15 et le 24 »), on retient la PREMIÈRE date
 *   possible : déclarer en avance n'est jamais une faute, en retard oui ;
 * - chaque échéance cite sa source (URL, date de consultation).
 *
 * Couverture : novembre 2026 → décembre 2027 (`COUVERTURE_FIN`). Au-delà, rien n'est affiché et l'écran le dit.
 * Les sources ont été relues sur les pages elles-mêmes le 3 nov. 2026 (relecture juriste-btp en local) ; urssaf.fr et
 * autoentrepreneur.urssaf.fr, injoignables, sont remplacés par Légifrance, net-entreprises.fr et
 * entreprendre.service-public.gouv.fr.
 */
import { estFranchiseTva } from './franchiseTva';
import { estEntrepreneurIndividuel, estEirl } from './identiteEntreprise';
import { estSociete } from './mentionsFacture';
import { dateLue, jourLocal } from './dates';

export const COUVERTURE_DEBUT = '2026-11-01';
export const COUVERTURE_FIN = '2027-12-31';
const CONSULTE = '2026-11-03';

const src = (libelle, url) => ({ libelle, url, consulte: CONSULTE });

export const SOURCES = {
  microDates: src('Légifrance — Code de la sécurité sociale, art. R613-7 et R613-8', 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073189/LEGISCTA000006173706/'),
  microWeekend: src('entreprendre.service-public.gouv.fr — Avancement de la date limite de déclaration du chiffre d’affaires de septembre 2026', 'https://entreprendre.service-public.gouv.fr/actualites/A19087'),
  cfe2026: src('impots.gouv.fr — CFE 2026 : mise en ligne des avis', 'https://www.impots.gouv.fr/actualite/cfe-etou-ifer-2026-mise-en-ligne-des-avis-dimpot-dans-lespace-professionnel'),
  cfeFiche: src('impots.gouv.fr — Fiche CET-IFER 2026', 'https://www.impots.gouv.fr/sites/default/files/media/3_Documentation/depliants/pro_fiche_cet-ifer_2026.pdf'),
  tvaSimplifieSupprime: src('impots.gouv.fr — Le régime simplifié de TVA est supprimé au 1er janvier 2027', 'https://www.impots.gouv.fr/actualite/le-regime-simplifie-dimposition-la-tva-est-supprime-compter-du-1er-janvier-2027'),
  tvaCa3: src('impots.gouv.fr — Régime réel normal : dates limites des CA3', 'https://www.impots.gouv.fr/le-regime-reel-normal-dates-limites-de-transmission-des-ca3'),
  liasses: src('impots.gouv.fr — Résultat imposable (IR ou IS)', 'https://www.impots.gouv.fr/professionnel/resultat-imposable-limpot-sur-le-revenu-ir-ou-limpot-sur-les-societes'),
  revenus: src('impots.gouv.fr — Quelle date pour ma déclaration ?', 'https://www.impots.gouv.fr/toutes-les-questions/particulier/quelle-date-dois-je-faire-ma-declaration'),
  is: src('impots.gouv.fr — Imposition des résultats', 'https://www.impots.gouv.fr/professionnel/imposition-des-resultats'),
  dsn: src('net-entreprises.fr — Déclaration sociale nominative', 'https://www.net-entreprises.fr/declaration/dsn-info/'),
  cfeMensualisation: src('impots.gouv.fr — Le prélèvement mensuel ou à l’échéance de la CFE, de l’IFER et des taxes foncières', 'https://www.impots.gouv.fr/le-prelevement-mensuel-ou-lecheance-de-la-cfe-de-lifer-et-des-taxes-foncieres'),
  tvaAcompteDecembre: src('impots.gouv.fr — Agenda : TVA régime simplifié, 15/12/2026', 'https://www.impots.gouv.fr/pro-15122026-tva-regime-simplifie'),
  reportJourOuvrable: src('Légifrance — CGI, annexe IV, art. 199-0', 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006301997'),
  efacture: src('impots.gouv.fr — Je découvre la facturation électronique', 'https://www.impots.gouv.fr/professionnel/je-decouvre-la-facturation-electronique'),
  parametres: { libelle: 'Vos Paramètres (Assurances)', url: null, consulte: null },
};

// Sociétés civiles (SCI, SCM…) : hors du champ du calendrier (pas d'activité artisanale, régimes à part)
const estSocieteCivile = (forme) => /^SC[A-Z]?\b|^soci[ée]t[ée] civile/i.test(String(forme || '').trim());
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Les questions posées une fois (réponses gardées sur l'appareil). `inconnu` = « Je ne sais pas » : plus redemandé. */
export const QUESTIONS = {
  tva: {
    libelle: 'Comment déclarez-vous la TVA ?',
    options: [
      { valeur: 'ca3_mensuelle', libelle: 'Chaque mois (CA3)' },
      { valeur: 'ca3_trimestrielle', libelle: 'Chaque trimestre (CA3)' },
      { valeur: 'ca12', libelle: 'Une fois par an (CA12)' },
      { valeur: 'inconnu', libelle: 'Je ne sais pas' },
    ],
  },
  periodiciteUrssaf: {
    libelle: 'Vous déclarez votre chiffre d’affaires à l’Urssaf…',
    options: [
      { valeur: 'mensuelle', libelle: 'Chaque mois' },
      { valeur: 'trimestrielle', libelle: 'Chaque trimestre' },
      { valeur: 'inconnu', libelle: 'Je ne sais pas' },
    ],
  },
  salaries: {
    libelle: 'Avez-vous des salariés ?',
    // Société : le président de SAS ou SASU et le gérant minoritaire ou égalitaire de SARL sont assimilés salariés
    // (CSS art. L311-3, 11° et 23°) ; leur société dépose la DSN (CSS art. L133-5-3) — relecture juriste du 3 nov. 2026.
    libelleSociete: 'Avez-vous des salariés, ou un dirigeant assimilé salarié et rémunéré (président de SAS ou SASU, gérant minoritaire ou égalitaire de SARL) ?',
    options: [
      { valeur: 'oui', libelle: 'Oui' },
      { valeur: 'non', libelle: 'Non' },
    ],
  },
  impot: {
    libelle: 'Votre société est soumise à…',
    options: [
      { valeur: 'is', libelle: 'L’impôt sur les sociétés' },
      { valeur: 'ir', libelle: 'L’impôt sur le revenu (payé par les associés sur leur part du bénéfice)' },
      { valeur: 'inconnu', libelle: 'Je ne sais pas' },
    ],
  },
};

const reponse = (reponses, cle) => {
  const v = reponses?.[cle];
  return QUESTIONS[cle].options.some((o) => o.valeur === v) ? v : null;
};

/** Libellé d'une question pour ce profil (la question des salariés diffère pour une société). */
export function libelleQuestion(cle, profil) {
  const q = QUESTIONS[cle];
  return (profil?.societe && q.libelleSociete) || q.libelle;
}

/**
 * Régime de TVA choisi EXPLICITEMENT dans la Trésorerie (`tresorerie_settings.regime_tva`) : `franchise` ou
 * `mensuel`. La valeur par défaut `trimestriel` ne prouve pas un choix : la question reste posée.
 * Avant (relecture du 3 nov. 2026) : une EI réglée « Franchise en base » dans la Trésorerie voyait des CA3 ici.
 */
function tvaDeLaTresorerie(regimeTresorerie) {
  if (regimeTresorerie === 'franchise') return 'franchise';
  if (regimeTresorerie === 'mensuel') return 'ca3_mensuelle';
  return null;
}

// Libellés de la Trésorerie (TresorerieModule.jsx, réglage « Régime de TVA »)
const LIBELLES_TVA_TRESORERIE = { franchise: 'Franchise en base', mensuel: 'Réel normal (mensuel)' };

/**
 * Le libellé du régime de TVA quand il vient de la Trésorerie (la question n'est alors pas posée ici), sinon null.
 * Une micro-entreprise est en franchise par sa fiche entreprise, pas par la Trésorerie : null.
 */
export function tvaRegleeDansLaTresorerie(profil, regimeTresorerie) {
  if (!profil || profil.micro || !tvaDeLaTresorerie(regimeTresorerie)) return null;
  return LIBELLES_TVA_TRESORERIE[regimeTresorerie];
}

/**
 * Le profil administratif : tiré de la fiche entreprise (forme juridique), du régime de TVA de la Trésorerie
 * et des réponses de l'artisan. Une micro-entreprise est en franchise de TVA dans l'app (src/lib/franchiseTva.js).
 * Formes reconnues par les fonctions communes (identiteEntreprise.js, mentionsFacture.js) ; une société civile
 * (SCI…) est « non prise en charge ».
 */
export function profilAdmin(entreprise = {}, reponses = {}, regimeTresorerie = null) {
  const forme = entreprise?.formeJuridique || entreprise?.forme_juridique || '';
  const micro = estFranchiseTva(entreprise);
  const nonPriseEnCharge = !micro && estSocieteCivile(forme);
  const societe = !micro && !nonPriseEnCharge && estSociete(entreprise);
  const individuelle = !micro && (estEntrepreneurIndividuel(entreprise) || estEirl(entreprise));
  return {
    forme,
    formeConnue: micro || societe || individuelle,
    nonPriseEnCharge,
    micro,
    societe,
    individuelle,
    tva: micro ? 'franchise' : (tvaDeLaTresorerie(regimeTresorerie) || reponse(reponses, 'tva')),
    periodiciteUrssaf: micro ? reponse(reponses, 'periodiciteUrssaf') : null,
    salaries: reponse(reponses, 'salaries'),
    impot: societe ? reponse(reponses, 'impot') : (micro || individuelle ? 'ir' : null),
  };
}

/** Les questions encore sans réponse pour ce profil (dans l'ordre d'affichage). */
export function questionsManquantes(profil) {
  if (!profil?.formeConnue) return [];
  const q = [];
  if (profil.micro && !profil.periodiciteUrssaf) q.push('periodiciteUrssaf');
  if (!profil.micro && !profil.tva) q.push('tva');
  if (profil.societe && !profil.impot) q.push('impot');
  if (!profil.salaries) q.push('salaries');
  return q;
}

const iso = (a, m, j) => `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
const dernierJour = (a, m) => new Date(a, m, 0).getDate(); // m de 1 à 12
const estWeekend = (date) => { const j = dateLue(date).getDay(); return j === 0 || j === 6; };
const dansCouverture = (date) => date >= COUVERTURE_DEBUT && date <= COUVERTURE_FIN;

/** Les mois (année, mois de 1 à 12) de la couverture. */
function moisCouverts() {
  const out = [];
  for (let a = 2026, m = 11; a < 2028; m === 12 ? (a++, m = 1) : m++) out.push([a, m]);
  return out;
}
const deMois = (m, a) => (/^[aeiouéâ]/.test(MOIS[m - 1]) ? `d’${MOIS[m - 1]} ${a}` : `de ${MOIS[m - 1]} ${a}`);
const moisPrecedent = (a, m) => (m === 1 ? [a - 1, 12] : [a, m - 1]);

function e(champs) {
  return { certitude: 'officielle', detail: '', ...champs };
}

// ─── Échéances communes ──────────────────────────────────────────────────────────────────────────────
function cfe() {
  return [
    e({ id: 'cfe-prelevement-2026', date: '2026-11-30', type: 'fiscal', titre: 'CFE 2026 : adhérer au prélèvement à l’échéance',
      detail: 'Dernier jour pour adhérer au prélèvement à l’échéance de la CFE 2026 (sinon, paiement direct en ligne au plus tard le 15 décembre).', source: SOURCES.cfe2026 }),
    e({ id: 'cfe-paiement-2026', date: '2026-12-15', type: 'fiscal', titre: 'CFE 2026 : paiement',
      detail: 'Paiement dématérialisé obligatoire (prélèvement ou paiement en ligne), au plus tard le 15 décembre 2026. L’avis est dans votre espace professionnel sur impots.gouv.fr. Pas de CFE l’année de la création de l’entreprise. Si votre chiffre d’affaires de la période de référence (en général l’avant-dernière année : 2024 pour la CFE 2026) ne dépasse pas 5 000 €, vous êtes exonéré de la cotisation minimum ; la CFE reste due sur la valeur locative d’un local professionnel, si vous en avez un.', source: SOURCES.cfe2026 }),
    e({ id: 'cfe-mensualisation-2027', date: '2026-12-15', type: 'fiscal', titre: 'CFE 2027 : adhérer à la mensualisation', certitude: 'selon_option',
      detail: 'Si vous voulez payer la CFE 2027 par prélèvements mensuels à partir de janvier.', source: SOURCES.cfeMensualisation }),
    e({ id: 'cfe-acompte-2027', date: '2027-06-15', type: 'fiscal', titre: 'CFE : acompte de juin', certitude: 'selon_option',
      detail: 'Seulement si votre CFE 2026 atteint 3 000 € ou plus et que vous n’êtes pas mensualisé : acompte de 50 % de la CFE 2026.', source: SOURCES.cfeFiche }),
    e({ id: 'cfe-paiement-2027', date: '2027-12-15', type: 'fiscal', titre: 'CFE 2027 : paiement',
      detail: 'La CFE est due au 15 décembre de l’année d’imposition ; l’avis 2027 sera dans votre espace professionnel sur impots.gouv.fr.', source: SOURCES.cfeFiche }),
  ];
}

function facturationElectronique() {
  return [
    e({ id: 'efacture-reception', date: '2026-09-01', type: 'legal', titre: 'Facture électronique : réception obligatoire',
      detail: 'Depuis le 1er septembre 2026, toute entreprise, micro-entreprise comprise, doit pouvoir recevoir ses factures électroniques par une plateforme agréée. Mallettico n’est pas une plateforme agréée : choisissez-en une.', source: SOURCES.efacture, enVigueur: true }),
    e({ id: 'efacture-emission', date: '2027-09-01', type: 'legal', titre: 'Facture électronique : émission obligatoire (PME, micro)',
      // Dernière phrase (« pas encore ») : décision d'Hugo attendue (docs/cloud/administratif.md, « Décisions d'Hugo »)
      detail: 'À partir du 1er septembre 2027, les PME et micro-entreprises émettent par une plateforme agréée leurs factures électroniques aux entreprises assujetties à la TVA en France, et transmettent par elle à l’administration les données de leurs ventes aux particuliers et de leurs encaissements (e-reporting). Mallettico ne transmet pas encore vos factures à une plateforme agréée.', source: SOURCES.efacture }),
  ];
}

function revenus(profil) {
  const formulaire = profil.micro ? 'déclaration de revenus et 2042-C-PRO (chiffre d’affaires)' : 'déclaration de revenus et 2042-C-PRO';
  return [
    // dateFin : les dates limites 2026 allaient jusqu'au 4 juin (impots.gouv.fr, page du 09/04/2026) : le rappel reste
    // affiché jusqu'au 30 juin. Avant (relecture du 3 nov. 2026) : il disparaissait dès le 16 mai.
    e({ id: 'ir-2027', date: null, dateTri: '2027-05-15', dateFin: '2027-06-30', dateTexte: 'mai-juin 2027', type: 'fiscal', certitude: 'a_confirmer',
      titre: 'Impôt sur le revenu : déclaration des revenus 2026',
      detail: `${formulaire[0].toUpperCase()}${formulaire.slice(1)}. Trois dates limites selon votre département, publiées au printemps 2027.`, source: SOURCES.revenus }),
  ];
}

function liasse2031() {
  return e({ id: 'liasse-2031-2027', date: '2027-05-04', type: 'fiscal', certitude: 'selon_option',
    titre: 'Liasse fiscale 2031 (bénéfices 2026)',
    detail: 'Si votre exercice se clôt le 31 décembre : 2e jour ouvré après le 1er mai. Formulaire 2035 si vos revenus sont des BNC.',
    source: SOURCES.liasses });
}

// ─── Micro-entreprise : déclaration du chiffre d'affaires ───────────────────────────────────────────────
function declarationsMicro(profil) {
  const out = [];
  const noteWeekend = (date) => (estWeekend(date)
    ? ' Cette date tombe un week-end. En principe, l’Urssaf la reporte au lundi ou au jour qui suit, mais elle ne l’a pas fait en octobre 2026 : par prudence, déclarez au plus tard le vendredi précédent.' : '');
  // La note de week-end s'appuie sur SOURCES.microWeekend (service-public, 10 oct. 2026) ; les dates sur SOURCES.microDates
  const sourceDe = (date) => (estWeekend(date) ? { ...SOURCES.microDates, note: SOURCES.microWeekend } : SOURCES.microDates);
  if (profil.periodiciteUrssaf === 'mensuelle') {
    for (const [a, m] of moisCouverts()) {
      const date = iso(a, m, dernierJour(a, m));
      const [ap, mp] = moisPrecedent(a, m);
      out.push(e({ id: `ca-micro-${ap}-${mp}`, date, type: 'social', titre: `Déclaration du chiffre d’affaires ${deMois(mp, ap)}`,
        detail: `À l’Urssaf, avec le paiement des cotisations, au plus tard le dernier jour du mois.${noteWeekend(date)}`, source: sourceDe(date) }));
    }
  } else {
    const option = profil.periodiciteUrssaf === 'trimestrielle' ? 'officielle' : 'selon_option';
    const suffixe = option === 'officielle' ? '' : ' (si vous déclarez chaque trimestre)';
    for (const [date, libelle] of [['2027-01-31', '4e trimestre 2026'], ['2027-04-30', '1er trimestre 2027'], ['2027-07-31', '2e trimestre 2027'], ['2027-10-31', '3e trimestre 2027']]) {
      out.push(e({ id: `ca-micro-${date}`, date, type: 'social', certitude: option, titre: `Déclaration du chiffre d’affaires du ${libelle}${suffixe}`,
        detail: `À l’Urssaf, avec le paiement des cotisations.${noteWeekend(date)}`, source: sourceDe(date) }));
    }
  }
  out.push(e({ id: 'micro-periodicite-2027', date: '2027-01-31', type: 'social',
    titre: 'Changer de rythme de déclaration Urssaf pour 2027',
    detail: 'Pour changer de rythme (mois ou trimestre) en 2027, faites la demande à l’Urssaf avec une déclaration de chiffre d’affaires, au plus tard avec la dernière de 2026 (4e trimestre ou décembre), due le 31 janvier 2027 (Code de la sécurité sociale, art. R613-7). Le 31 janvier 2027 est un dimanche : par prudence, faites-la au plus tard le vendredi 29 janvier. La date du 31 octobre ne vaut que pour l’option des cotisations minimales.', source: SOURCES.microDates }));
  return out;
}

// ─── TVA (hors franchise) ────────────────────────────────────────────────────────────────────────────
// Agenda fiscal DGFiP 2026 : « Entre les 15 et 24 janvier 2026 », « Entre les 15 et 26 mai 2026 » : la borne haute varie
const NOTE_CA3 = 'Date limite à partir du 15 du mois, le plus souvent entre le 15 et le 24, selon votre entreprise : votre date exacte est dans votre espace professionnel. La date affichée est la plus tôt possible.';
const TRIMESTRES = [['2027-01-15', '4e trimestre 2026'], ['2027-04-15', '1er trimestre 2027'], ['2027-07-15', '2e trimestre 2027'], ['2027-10-15', '3e trimestre 2027']];

function tva(profil) {
  const out = [];
  if (profil.tva === 'ca3_mensuelle') {
    for (const [a, m] of moisCouverts()) {
      const [ap, mp] = moisPrecedent(a, m);
      out.push(e({ id: `ca3-${ap}-${mp}`, date: iso(a, m, 15), type: 'fiscal', titre: `Déclaration de TVA (CA3) ${deMois(mp, ap)}`, detail: NOTE_CA3, source: SOURCES.tvaCa3 }));
    }
    return out;
  }
  if (profil.tva === 'ca12') {
    out.push(e({ id: 'ca12-acompte-2026-12', date: '2026-12-15', type: 'fiscal', titre: 'TVA : acompte de décembre (régime simplifié)',
      detail: 'Acompte de décembre du régime simplifié : 40 % de la TVA due au titre de l’exercice précédent (avant déduction de la TVA sur les immobilisations), à télépayer entre le 15 et le 24 décembre, à la date indiquée dans votre espace professionnel ; la date affichée est la plus tôt possible. Pas d’acompte si cette TVA est inférieure à 1 000 €. Si votre exercice se clôt le 31 décembre, c’est le dernier acompte : le régime simplifié est supprimé au 1er janvier 2027. Si votre exercice se clôt entre juillet et novembre 2027, un acompte reste dû en juillet 2027 (si la TVA de l’exercice précédent dépasse 1 000 €).', source: SOURCES.tvaAcompteDecembre }));
    out.push(e({ id: 'ca12-2026', date: '2027-05-04', type: 'fiscal', certitude: 'selon_option', titre: 'Dernière déclaration annuelle de TVA (CA12 2026)',
      detail: 'Si votre exercice se clôt le 31 décembre. Le régime simplifié de TVA est supprimé à partir du 1er janvier 2027.', source: SOURCES.tvaSimplifieSupprime }));
    for (const [date, libelle] of TRIMESTRES.slice(1)) {
      out.push(e({ id: `ca3-${date}`, date, type: 'fiscal', certitude: 'selon_option', titre: `Déclaration de TVA (CA3) du ${libelle}`,
        detail: `Si votre exercice se clôt le 31 décembre. Depuis le 1er janvier 2027, la CA3 remplace la CA12 : chaque trimestre si votre chiffre d’affaires de l’année précédente n’a pas dépassé 1 000 000 € (1 100 000 € en cours d’année), sinon chaque mois. ${NOTE_CA3}`, source: SOURCES.tvaSimplifieSupprime }));
    }
    return out;
  }
  const certitude = profil.tva === 'ca3_trimestrielle' ? 'officielle' : 'selon_option';
  for (const [date, libelle] of TRIMESTRES) {
    out.push(e({ id: `ca3-${date}`, date, type: 'fiscal', certitude, titre: `Déclaration de TVA (CA3) du ${libelle}${certitude === 'officielle' ? '' : ' (selon votre régime)'}`,
      detail: certitude === 'officielle' ? NOTE_CA3 : `Selon votre régime de TVA : chaque mois ou chaque trimestre. Le régime simplifié (CA12) est supprimé à partir du 1er janvier 2027. ${NOTE_CA3}`,
      source: certitude === 'officielle' ? SOURCES.tvaCa3 : SOURCES.tvaSimplifieSupprime }));
  }
  return out;
}

// ─── Impôt sur les sociétés ──────────────────────────────────────────────────────────────────────────
function impotSocietes(profil) {
  const si = profil.impot === 'is' ? 'Si votre exercice se clôt le 31 décembre.' : 'Si votre société est à l’impôt sur les sociétés et clôt son exercice le 31 décembre.';
  const out = [];
  for (const date of ['2026-12-15', '2027-03-15', '2027-06-15', '2027-09-15', '2027-12-15']) {
    const d = dateLue(date);
    out.push(e({ id: `is-acompte-${date}`, date, type: 'fiscal', certitude: 'selon_option', titre: `Impôt sur les sociétés : acompte du ${d.getDate()} ${MOIS[d.getMonth()]}`,
      detail: `${si} Pas d’acompte la première année, ni si l’impôt de l’exercice précédent est inférieur à 3 000 €.`, source: SOURCES.is }));
  }
  // Date la plus tôt (15 mai) ; report légal au mardi 18 mai (CGI ann. IV art. 199-0 ; lundi de Pentecôte férié,
  // C. trav. L3133-1). À recouper avec le calendrier fiscal 2027 de la DGFiP quand il paraîtra.
  out.push(e({ id: 'is-solde-2027', date: '2027-05-15', type: 'fiscal', certitude: 'selon_option', titre: 'Impôt sur les sociétés : solde de 2026',
    detail: `${si} Date limite : le 15 mai. En 2027, c’est un samedi : elle est reportée au premier jour ouvrable suivant (CGI, annexe IV, art. 199-0), le mardi 18 mai, car le lundi 17 mai est le lundi de Pentecôte, jour férié. La date affichée est la plus tôt possible.`,
    source: { ...SOURCES.is, note: SOURCES.reportJourOuvrable } }));
  out.push(e({ id: 'liasse-2065-2027', date: '2027-05-04', type: 'fiscal', certitude: 'selon_option', titre: 'Liasse fiscale 2065 (résultat 2026)',
    detail: `${si} 2e jour ouvré après le 1er mai.`, source: SOURCES.liasses }));
  return out;
}

// ─── Salariés ────────────────────────────────────────────────────────────────────────────────────────
function dsn() {
  return moisCouverts().map(([a, m]) => {
    const [ap, mp] = moisPrecedent(a, m);
    return e({ id: `dsn-${ap}-${mp}`, date: iso(a, m, 15), type: 'social', titre: `DSN ${deMois(mp, ap)}`,
      detail: 'Au plus tard le 15 (le 5 pour une entreprise d’au moins 50 salariés qui paie les salaires dans le mois travaillé), sur net-entreprises.fr. Après une première DSN, elle est due chaque mois, même sans rémunération versée, tant que votre compte employeur Urssaf est ouvert.', source: SOURCES.dsn });
  });
}

// ─── Assurances (dates saisies dans les Paramètres) ───────────────────────────────────────────────────
function assurances(entreprise) {
  const out = [];
  const valide = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10)) ? v.slice(0, 10) : null;
  const decennale = valide(entreprise?.decennaleValidite || entreprise?.assuranceDecennaleValidite);
  const rc = valide(entreprise?.rcProValidite || entreprise?.assuranceRcProValidite);
  if (decennale) out.push(e({ id: 'assurance-decennale', date: decennale, type: 'assurance', titre: 'Fin de validité de votre décennale',
    detail: 'Date saisie dans vos Paramètres. Demandez la nouvelle attestation à votre assureur et mettez la date à jour : elle est imprimée sur vos devis.', source: SOURCES.parametres, horsCouverture: true }));
  if (rc) out.push(e({ id: 'assurance-rcpro', date: rc, type: 'assurance', titre: 'Fin de validité de votre RC pro',
    detail: 'Date saisie dans vos Paramètres. Demandez la nouvelle attestation à votre assureur et mettez la date à jour.', source: SOURCES.parametres, horsCouverture: true }));
  return out;
}

/**
 * Toutes les échéances du profil, triées. Les échéances officielles hors de la couverture sont écartées,
 * sauf la réception de la facture électronique (déjà en vigueur, gardée pour le calendrier) et les assurances.
 */
export function echeancesPour(profil, entreprise = {}) {
  const liste = [...cfe(), ...facturationElectronique(), ...assurances(entreprise)];
  if (profil?.formeConnue) {
    if (profil.micro) liste.push(...declarationsMicro(profil), ...revenus(profil));
    else if (profil.tva !== 'franchise') liste.push(...tva(profil));
    if (profil.individuelle) liste.push(liasse2031(), ...revenus(profil));
    if (profil.societe) {
      if (profil.impot === 'ir') liste.push(liasse2031(), ...revenus(profil));
      else liste.push(...impotSocietes(profil));
    }
    if (profil.salaries === 'oui') liste.push(...dsn());
  }
  return liste
    .filter((x) => x.horsCouverture || x.id === 'efacture-reception' || !x.date || dansCouverture(x.date))
    .map((x) => ({ ...x, dateTri: x.date || x.dateTri }))
    .sort((a, b) => (a.dateTri < b.dateTri ? -1 : a.dateTri > b.dateTri ? 1 : 0));
}

/** Nombre de jours entre aujourd'hui et la date (dates locales, sans heure). */
export function joursAvant(date, aujourdhui = new Date()) {
  const d = dateLue(date);
  const t = dateLue(jourLocal(aujourdhui));
  return Math.round((d - t) / 864e5);
}

/**
 * Les prochaines échéances : celles d'aujourd'hui ou à venir, plus les assurances déjà expirées (à régulariser).
 * Une échéance reste « à venir » jusqu'à sa date de fin quand elle en a une (`dateFin` : « mai-juin 2027 »), sinon
 * jusqu'à sa date de tri.
 */
export function prochainesEcheances(echeances, aujourdhui = new Date(), nombre = 3) {
  const jour = jourLocal(aujourdhui);
  return echeances
    .filter((x) => (x.type === 'assurance' && x.date) || (x.dateFin || x.dateTri) >= jour)
    .map((x) => ({ ...x, joursRestants: x.date ? joursAvant(x.date, aujourdhui) : null }))
    .slice(0, nombre);
}

/** Le calendrier arrive-t-il à sa fin (moins de deux mois de couverture) ? */
export function couvertureBientotFinie(aujourdhui = new Date()) {
  return joursAvant(COUVERTURE_FIN, aujourdhui) < 61;
}

/** Libellé de date d'une échéance : « mardi 15 décembre 2026 » ou le texte (« mai-juin 2027 »). */
export function dateEcheanceLue(x) {
  if (!x?.date) return x?.dateTexte || '';
  return dateLue(x.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export const LIBELLES_CERTITUDE = {
  officielle: null,
  selon_option: 'Selon votre situation',
  a_confirmer: 'Date à confirmer',
};
