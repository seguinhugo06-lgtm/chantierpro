import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRADE_LIBRARY } from '../../../lib/templates/trade-library.js';
import { buildDevisHtml } from '../../../lib/devisHtmlBuilder.js';
import { calculerTotaux } from '../../../lib/totauxDocument.js';
import { DEFAULT_DEVIS_STEPS } from '../../../lib/scenariosRelance.js';
import { objetDeRelance } from '../../../lib/objetRelance.js';
import { resolveVariables } from '../../../lib/relanceUtils.js';
import { DEFAULT_DEVIS_STEPS as SCENARIO_DES_REGLAGES } from '../../settings/RelanceConfigTab.jsx';
import { NUMERO_DEVIS, lotDemonstration } from '../devisVivantEtapes.js';
import { ENTREPRISE_FICTIVE, CLIENT_FICTIF, FACTURE_FICTIVE, PAS_ENCAISSEMENT_CENTIMES } from '../exemples/donneesFictives.js';
import {
  parametresDuDocument,
  mentionsDuDocument,
  montantDuDevis,
  totauxDuDevis,
  tamponDeSignature,
  longueurDesTraits,
  TRACE_MINIMAL_PX,
  texteDuDocument,
  ligneDuMetre,
  montantDuMetre,
  friseDesRelances,
  premierePhraseDuMessage,
  paiementsDeDepart,
  etatDesEncaissements,
  encaisser,
  libelleEncaisser,
} from '../exemples/exemples.js';
import { ONGLETS, ongletVoisin } from '../fonctionnalitesOnglets.js';

/**
 * « Les fonctionnalités en action » du site public (refonte d'octobre 2026, spec section du même nom) : la logique des
 * cinq exemples, sans React. Chaque montant vient du code de l'app ou de la bibliothèque des métiers ; l'identité
 * est celle, fictive, des captures du site (scripts/site-captures.cjs).
 */

const RACINE = fileURLToPath(new URL('../../../../', import.meta.url));
const lire = (relatif) => fs.readFileSync(`${RACINE}${relatif}`, 'utf8');
const lot = lotDemonstration(TRADE_LIBRARY);
const MAINTENANT = new Date(2026, 9, 20, 9, 5);

/** Texte lisible d'un document HTML (styles et balises retirés, entités usuelles décodées, espaces ramenés à un). */
function texteDu(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

describe('identité fictive : celle des captures du site', () => {
  // Le script de captures est en CommonJS et ouvre un navigateur au chargement : on lit ses valeurs dans le texte.
  const script = lire('scripts/site-captures.cjs');

  it('l’entreprise reprend exactement les valeurs de ENTREPRISE_FICTIVE (scripts/site-captures.cjs)', () => {
    const bloc = /const ENTREPRISE_FICTIVE = \{([\s\S]*?)\n\};/.exec(script)?.[1] || '';
    const valeurs = Object.fromEntries([...bloc.matchAll(/^\s+(\w+): (?:'([^']*)'|(\d+)),/gm)].map((m) => [m[1], m[2] ?? Number(m[3])]));
    expect(Object.keys(valeurs).length).toBeGreaterThan(15);
    const identite = { ...ENTREPRISE_FICTIVE };
    for (const [cle, valeur] of Object.entries(identite)) {
      expect(valeur, `ENTREPRISE_FICTIVE.${cle}`).toBe(valeurs[cle]);
    }
    for (const cle of ['nom', 'siret', 'telephone', 'email', 'adresse', 'decennale_assureur', 'decennale_numero']) {
      expect(identite[cle], cle).toBeTruthy();
    }
  });

  it('sans le réglage du compte de démonstration : pas de filigrane « EXEMPLE », comme les captures du site', () => {
    expect(ENTREPRISE_FICTIVE.donneesFictives).toBeUndefined();
  });

  it('le client est M. Martin, 2 rue de l’Exemple, 33000 Bordeaux (même adresse que la capture de la signature)', () => {
    const adresse = /client: \{[^}]*adresse: '([^']*)'/.exec(script)?.[1];
    expect(`${CLIENT_FICTIF.prenom} ${CLIENT_FICTIF.nom}`).toBe('M. Martin');
    expect(`${CLIENT_FICTIF.adresse}, ${CLIENT_FICTIF.code_postal} ${CLIENT_FICTIF.ville}`).toBe(adresse);
    expect(CLIENT_FICTIF.email).toBe('');
    expect(CLIENT_FICTIF.telephone).toBe('');
  });
});

describe('le document que reçoit le client : le vrai générateur', () => {
  const html = buildDevisHtml(parametresDuDocument(lot, MAINTENANT));
  const texte = texteDu(html);

  it('rend un devis d’Élec Exemple pour M. Martin, le lot « Mise aux normes du tableau électrique », TVA 10 %', () => {
    expect(texte).toContain('DEVIS');
    expect(texte).toContain('Élec Exemple');
    expect(texte).toContain('M. Martin');
    expect(texte).toContain(NUMERO_DEVIS);
    expect(texte).toContain(lot.nom);
    for (const ligne of lot.lignes) expect(texte).toContain(ligne.designation);
    expect(texte).toContain('TVA 10 %');
    expect(html).not.toContain('data-filigrane');
  });

  it('le total TTC est celui du code de l’app (calculerTotaux) : 2 081,20 €', () => {
    const lignes = parametresDuDocument(lot, MAINTENANT).doc.lignes;
    expect(montantDuDevis(lot)).toBe(calculerTotaux(lignes, { tauxDefaut: 10 }).totalTTC);
    expect(montantDuDevis(lot)).toBe(2081.2);
    expect(totauxDuDevis(lot)).toEqual({ totalHT: 1892, totalTVA: 189.2, totalTTC: 2081.2, taux: [10] });
    expect(texte).toMatch(/Total TTC 2\s081,20\s€/);
  });

  it('mentionsDuDocument trouve au moins « Assurance décennale », la TVA et la rétractation, avec les libellés du générateur', () => {
    const mentions = mentionsDuDocument(html);
    expect(mentions).toContain('Assurance décennale');
    expect(mentions.some((m) => m.includes('TVA'))).toBe(true);
    expect(mentions.some((m) => m.includes('rétractation'))).toBe(true);
    expect(mentions).toEqual([
      'SIRET',
      'Assurance décennale',
      'TVA à taux réduit (10 %)',
      'Délai de paiement',
      'Pénalités de retard',
      'Garanties légales',
      'Droit de rétractation',
    ]);
  });

  it('chaque mention annoncée est écrite dans le document (à la casse près : le générateur met certains titres en capitales)', () => {
    const minuscules = texte.toLowerCase();
    for (const mention of mentionsDuDocument(html)) expect(minuscules, mention).toContain(mention.toLowerCase());
  });

  it('une mention absente du document n’est pas annoncée', () => {
    expect(mentionsDuDocument('<html><body><p>Rien</p></body></html>')).toEqual([]);
    // Micro-entreprise (franchise en base) : pas de TVA, donc pas de certification de TVA réduite
    const micro = parametresDuDocument(lot, MAINTENANT);
    const sansTva = buildDevisHtml({ ...micro, entreprise: { ...micro.entreprise, forme_juridique: 'Micro-entreprise', tva_intra: '' } });
    expect(mentionsDuDocument(sansTva).some((m) => m.startsWith('TVA à taux réduit'))).toBe(false);
    // Un client professionnel n'a pas de droit de rétractation : la mention disparaît
    const pro = buildDevisHtml({ ...micro, client: { ...micro.client, categorie: 'professionnel', entreprise: 'SCI Exemple' } });
    expect(mentionsDuDocument(pro)).not.toContain('Droit de rétractation');
  });
});

describe('signature en ligne', () => {
  it('le tampon : « Signé le JJ/MM/AAAA à HH:MM », à l’heure locale', () => {
    expect(tamponDeSignature(MAINTENANT)).toBe('Signé le 20/10/2026 à 09:05');
    expect(tamponDeSignature(new Date(2026, 0, 3, 18, 42))).toBe('Signé le 03/01/2026 à 18:42');
  });

  it('la longueur tracée, en px de la zone : un simple toucher mesure 0, un vrai trait se mesure', () => {
    expect(longueurDesTraits([], 300, 200)).toBe(0);
    expect(longueurDesTraits([[{ x: 0.5, y: 0.5 }]], 300, 200)).toBe(0);
    expect(longueurDesTraits([[{ x: 0.5, y: 0.5 }], [{ x: 0.2, y: 0.2 }]], 300, 200)).toBe(0);
    // 30 px vers la droite puis 40 px vers le bas : 70 px
    expect(longueurDesTraits([[{ x: 0, y: 0 }, { x: 0.1, y: 0 }, { x: 0.1, y: 0.2 }]], 300, 200)).toBeCloseTo(70, 6);
    // Un tremblement de quelques pixels ne suffit pas à signer ; un trait de 12 px, si
    expect(longueurDesTraits([[{ x: 0.5, y: 0.5 }, { x: 0.51, y: 0.5 }]], 300, 200)).toBeLessThan(TRACE_MINIMAL_PX);
    expect(longueurDesTraits([[{ x: 0.5, y: 0.5 }, { x: 0.54, y: 0.5 }]], 300, 200)).toBeGreaterThanOrEqual(TRACE_MINIMAL_PX);
  });
});

describe('texteDuDocument : le texte que lit le visiteur', () => {
  it('retire styles, commentaires et balises, décode les entités usuelles', () => {
    const html = '<html><head><style>body{color:red}</style></head><body><!-- PAIEMENT EN LIGNE --><p>L&#39;artisan &amp; M.&nbsp;Martin</p></body></html>';
    expect(texteDuDocument(html).trim()).toBe("L'artisan & M. Martin");
  });
});

describe('métré express', () => {
  const ligne = ligneDuMetre(TRADE_LIBRARY);

  it('une vraie ligne de carrelage de la bibliothèque, au m², avec son prix moyen', () => {
    const lignesCarrelage = TRADE_LIBRARY.carrelage.lots.flatMap((l) => l.lignes);
    expect(lignesCarrelage).toContainEqual(ligne);
    expect(ligne.unite).toBe('m²');
    expect(ligne.designation).toMatch(/^Fourniture et pose/);
    expect(ligne.prixUnitaire).toBeGreaterThan(0);
  });

  it('le montant est quantité × prix unitaire, au centime', () => {
    expect(montantDuMetre(13.2, ligne.prixUnitaire)).toBe(Math.round(13.2 * ligne.prixUnitaire * 100) / 100);
    expect(montantDuMetre(13.2, 62)).toBe(818.4);
    expect(montantDuMetre(21.74, 62)).toBe(1347.88);
    expect(montantDuMetre(0, 62)).toBe(0);
  });
});

describe('relances : le scénario de devis proposé par l’app', () => {
  const frise = friseDesRelances(DEFAULT_DEVIS_STEPS, NUMERO_DEVIS);
  const actives = DEFAULT_DEVIS_STEPS.filter((e) => e.enabled);

  it('le scénario est celui de l’écran des réglages (même objet, réexporté par RelanceConfigTab)', () => {
    expect(SCENARIO_DES_REGLAGES).toBe(DEFAULT_DEVIS_STEPS);
  });

  it('les étapes actives du scénario, dans l’ordre, avec leurs délais et leurs noms lus dans le code', () => {
    expect(frise.length).toBe(actives.length);
    expect(frise.map((e) => e.delai)).toEqual(actives.map((e) => e.delay));
    expect(frise.map((e) => e.libelleDelai)).toEqual(actives.map((e) => e.delayLabel));
    expect(frise.map((e) => e.nom)).toEqual(actives.map((e) => e.name));
    expect(frise.every((e, i) => i === 0 || e.delai > frise[i - 1].delai)).toBe(true);
  });

  it('l’objet du message est celui que l’app envoie : « Relance : Devis <numéro> » faute d’objet propre à l’étape', () => {
    expect(frise.every((e) => e.objet === `Relance : Devis ${NUMERO_DEVIS}`)).toBe(true);
    const avecObjet = friseDesRelances([{ ...actives[0], objet_email: 'Votre devis {{devis_numero}}' }], NUMERO_DEVIS);
    expect(avecObjet[0].objet).toBe(`Votre devis ${NUMERO_DEVIS}`);
    // La fonction du moteur de relances de l'app, pas une copie
    const doc = { numero: NUMERO_DEVIS, type: 'devis', statut: 'envoye' };
    expect(frise.map((e) => e.objet)).toEqual(actives.map((e) => objetDeRelance(e, doc, CLIENT_FICTIF, ENTREPRISE_FICTIVE)));
  });

  it('la première phrase de chaque message est le modèle de l’app rempli par sa fonction (rien de recopié, relecture DA-12)', () => {
    const montant = montantDuDevis(lotDemonstration(TRADE_LIBRARY));
    const avecMontant = friseDesRelances(DEFAULT_DEVIS_STEPS, NUMERO_DEVIS, montant);
    const doc = { numero: NUMERO_DEVIS, type: 'devis', statut: 'envoye', total_ttc: montant };
    expect(avecMontant.map((e) => e.phrase)).toEqual(
      actives.map((e) => premierePhraseDuMessage(resolveVariables(e.template, doc, CLIENT_FICTIF, ENTREPRISE_FICTIVE))),
    );
    // Chaque phrase cite le devis et son montant (2 081,20 € pour le lot du tableau), trois phrases différentes
    for (const e of avecMontant) {
      expect(e.phrase).toContain(NUMERO_DEVIS);
      expect(e.phrase.replace(/[\s  ]/g, '')).toContain('2081,20');
      expect(e.phrase).not.toMatch(/\{\{|Bonjour/);
    }
    expect(new Set(avecMontant.map((e) => e.phrase)).size).toBe(avecMontant.length);
    // Sans montant (bibliothèque pas encore là), pas de phrase : jamais « 0,00 € »
    expect(frise.every((e) => e.phrase === null)).toBe(true);
    // Le texte n'est écrit dans aucun fichier du site
    const source = ['../exemples/ExempleRelances.jsx', '../exemples/exemples.js']
      .map((f) => fs.readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')).join('\n');
    expect(source).not.toMatch(/Je reviens vers vous|Je me permets de revenir|Je vous contacte une dernière fois/);
  });

  it('premierePhraseDuMessage : le paragraphe après la salutation, jusqu’au premier point', () => {
    expect(premierePhraseDuMessage('Bonjour M. Martin,\n\nPremière phrase. Deuxième.\n\nFin')).toBe('Première phrase.');
    expect(premierePhraseDuMessage('Une seule ligne ? Oui.')).toBe('Une seule ligne ?');
  });
});

describe('encaissements : une facture de 4 136,00 €', () => {
  const facture = FACTURE_FICTIVE;

  it('au départ : acompte de 30 % (1 240,80 €) et virement partiel reçus, « Payée en partie »', () => {
    const depart = paiementsDeDepart(facture);
    expect(facture.totalCentimes).toBe(413600);
    expect(depart.map((p) => p.centimes)).toEqual([124080, facture.virementCentimes]);
    expect(depart[0].libelle).toBe('Acompte de 30\u202f%');
    const etat = etatDesEncaissements(facture, depart);
    expect(etat.resteCentimes).toBe(413600 - 124080 - facture.virementCentimes);
    expect(etat.statut).toBe('partielle');
    expect(etat.libelle).toBe('Payée en partie');
  });

  it('chaque clic encaisse 500 € ou le reste s’il est plus petit ; « Payée » seulement au solde exact ; jamais plus que le dû', () => {
    let paiements = paiementsDeDepart(facture);
    const vus = [];
    for (let i = 0; i < 20; i++) {
      const avant = etatDesEncaissements(facture, paiements);
      if (avant.resteCentimes === 0) break;
      expect(avant.prochainCentimes).toBe(Math.min(PAS_ENCAISSEMENT_CENTIMES, avant.resteCentimes));
      paiements = encaisser(facture, paiements);
      const apres = etatDesEncaissements(facture, paiements);
      expect(apres.resteCentimes).toBe(avant.resteCentimes - avant.prochainCentimes);
      expect(apres.encaisseCentimes).toBeLessThanOrEqual(facture.totalCentimes);
      expect(apres.libelle === 'Payée').toBe(apres.resteCentimes === 0);
      vus.push(avant.prochainCentimes);
    }
    expect(vus).toEqual([50000, 50000, 39520]);
    const fin = etatDesEncaissements(facture, paiements);
    expect(fin).toMatchObject({ resteCentimes: 0, encaisseCentimes: 413600, statut: 'payee', libelle: 'Payée', prochainCentimes: 0 });
    // Soldée : encaisser ne change plus rien
    expect(encaisser(facture, paiements)).toEqual(paiements);
  });

  it('le libellé du bouton dit le montant encaissé par le clic', () => {
    expect(libelleEncaisser(50000)).toMatch(/^Encaisser 500\s€$/);
    expect(libelleEncaisser(39520)).toMatch(/^Encaisser 395,20\s€$/);
  });
});

describe('les onglets', () => {
  it('cinq onglets aux titres de la spec, dans l’ordre', () => {
    expect(ONGLETS.map((o) => o.titre)).toEqual([
      'Le document que reçoit votre client',
      'Signature en ligne',
      'Métré express',
      'Relances',
      'Encaissements',
    ]);
    expect(ONGLETS.every((o) => o.phrase && o.cadre && o.cadreCourt && o.id)).toBe(true);
  });

  it('flèches droite et bas : suivant ; gauche et haut : précédent (en boucle) ; Début et Fin ; autre touche : rien', () => {
    const ids = ONGLETS.map((o) => o.id);
    expect(ongletVoisin(ids, ids[0], 'ArrowRight')).toBe(ids[1]);
    expect(ongletVoisin(ids, ids[0], 'ArrowDown')).toBe(ids[1]);
    expect(ongletVoisin(ids, ids[0], 'ArrowLeft')).toBe(ids[4]);
    expect(ongletVoisin(ids, ids[2], 'ArrowUp')).toBe(ids[1]);
    expect(ongletVoisin(ids, ids[4], 'ArrowRight')).toBe(ids[0]);
    expect(ongletVoisin(ids, ids[2], 'Home')).toBe(ids[0]);
    expect(ongletVoisin(ids, ids[2], 'End')).toBe(ids[4]);
    expect(ongletVoisin(ids, ids[2], 'Enter')).toBe(null);
    expect(ongletVoisin(ids, 'inconnu', 'ArrowRight')).toBe(null);
  });
});
