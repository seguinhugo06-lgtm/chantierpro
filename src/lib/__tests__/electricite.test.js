import { describe, it, expect } from 'vitest';
import {
  limiteEnvoiConsuel, tacheConsuel, tacheConsuelDuChantier, etatConsuel, AIDE_CONSUEL, TACHE_CONSUEL,
  TITRE_COMPTE_RENDU, MENTION_PORTEE, MOTS_INTERDITS, NATURES, MESURES, manquantsCompteRendu, nouveauCompteRendu,
  mesuresImprimees, phraseCompteRendu, numeroCompteRenduDemo, ligneFactureCompteRendu, qualificationIrve, avecEmetteur,
  TITRE_SANS_MESURE, TAUX_A_VERIFIER, TEXTE_TAUX_A_VERIFIER, TEXTE_DEPANNAGE_SANS_DEVIS, DUREE_AVERTISSEMENT_DEPANNAGE_MS, avertissementFactureCompteRendu,
  suggestionTvaBorne, estLigneBorne, REGIME_BORNE, TEXTE_FOURNITURE, POINTS_DE_CHARGE, LOCAUX,
} from '../electricite';
import { buildCompteRenduElectriciteHtml } from '../compteRenduElectriciteHtml';
import { tauxReduitsPresents, mentionTvaReduiteHtml, MENTION_BORNE, portePoseBorne } from '../mentionTvaReduite';
import { donneesFactureCompteRendu, corpsEmailCompteRendu } from '../../components/electricite/actionsCompteRendu';

// Données fictives seulement
const chantier = { id: 'ch1', nom: 'Rénovation Exemple', client_id: 'c1', adresse: '3 chemin de l’Exemple', codePostal: '33000', ville: 'Imaginaire' };
const client = { id: 'c1', prenom: 'Lucie', nom: 'Exemple', telephone: '06 00 00 00 01' };
const entreprise = { nom: 'Électricité Exemple', formeJuridique: 'EI', nomEntrepreneur: 'Paul Exemple', siret: '00000000000000', tvaDefaut: 10 };

describe('Consuel — rappel à J-20 (arrêté du 17 oct. 1973, art. 2)', () => {
  it('la date limite est la mise en service moins 20 jours', () => {
    expect(limiteEnvoiConsuel('2026-11-30')).toBe('2026-11-10');
    expect(limiteEnvoiConsuel('2027-01-05')).toBe('2026-12-16');
    expect(limiteEnvoiConsuel('')).toBe('');
  });

  it('la tâche est datée de J-20 : elle entre dans « À faire » le 10/11 et passe en retard le 11/11 (mise en service le 30/11)', () => {
    const t = tacheConsuel({ chantier, miseEnService: '2026-11-30' });
    expect(t.due_date).toBe('2026-11-10');
    expect(t.chantier_id).toBe('ch1');
    expect(t.client_id).toBe('c1');
    expect(t.text.startsWith(TACHE_CONSUEL)).toBe(true);
    // Filtre du tableau de bord (Dashboard.jsx, memosJour) : non faite et due_date <= aujourd'hui ; en retard si <
    const dansAFaire = (jour) => !t.is_done && t.due_date <= jour;
    const enRetard = (jour) => t.due_date < jour;
    expect(dansAFaire('2026-11-09')).toBe(false);
    expect(dansAFaire('2026-11-10')).toBe(true);
    expect(enRetard('2026-11-10')).toBe(false);
    expect(enRetard('2026-11-11')).toBe(true);
  });

  it('contre-essai : sans date de mise en service, aucune tâche', () => {
    expect(tacheConsuel({ chantier, miseEnService: '' })).toBeNull();
  });

  it('retrouve la tâche du chantier, et l’état suit : à envoyer, en retard, envoyée, attestation jointe', () => {
    const t = { id: 'm1', ...tacheConsuel({ chantier, miseEnService: '2026-11-30' }), created_at: '2026-11-01' };
    const autre = { id: 'm2', ...tacheConsuel({ chantier: { ...chantier, id: 'ch2' }, miseEnService: '2026-11-30' }) };
    expect(tacheConsuelDuChantier([autre, t, { id: 'm3', chantier_id: 'ch1', text: 'Acheter du câble' }], 'ch1').id).toBe('m1');
    expect(etatConsuel({ tache: t }, { aujourdhui: '2026-11-05' }).ton).toBe('alerte');
    expect(etatConsuel({ tache: t }, { aujourdhui: '2026-11-11' }).ton).toBe('danger');
    expect(etatConsuel({ tache: { ...t, is_done: true } }).ton).toBe('info');
    expect(etatConsuel({ tache: t, documents: [{ nom: 'Attestation Consuel visée' }] }).ton).toBe('succes');
    expect(etatConsuel({}).ton).toBe('neutre');
  });

  it('le rappel est pour l’artisan : aucun texte ne dit « conforme » ni n’imite le Consuel', () => {
    const t = tacheConsuel({ chantier, miseEnService: '2026-11-30' });
    for (const texte of [t.text, t.notes]) {
      for (const mot of MOTS_INTERDITS) expect(texte).not.toMatch(mot);
    }
    // L'aide nomme le document du Consuel par son nom officiel (juriste-btp au texte, 4 nov.) : c'est la seule
    // occurrence admise, jamais pour le document de l'artisan
    const resteAide = AIDE_CONSUEL.replace('attestation de conformité visée par le Consuel', '');
    for (const mot of MOTS_INTERDITS) expect(resteAide).not.toMatch(mot);
    expect(t.notes).toContain('arrêté du 17 octobre 1973, art. 2');
    expect(t.notes).toContain('À faire parvenir au Consuel');
    expect(t.notes).toContain('mise sous tension');
    expect(t.notes).not.toContain('mise en service');
    // Juriste-btp au texte (4 nov.) : le délai vient de l'arrêté de 1973, pas de D342-19 ; « bâtiment d'habitation collectif »
    expect(AIDE_CONSUEL).toContain('vingt jours avant la date prévue de la mise sous tension par le distributeur (arrêté du 17 octobre 1973, art. 2)');
    expect(AIDE_CONSUEL).toContain('bâtiment d’habitation collectif');
    expect(AIDE_CONSUEL).not.toMatch(/immeuble collectif|mise en service/);
    expect(etatConsuel({ tache: t }, { aujourdhui: '2026-11-05' }).texte).toBe('Attestation à faire parvenir au Consuel au plus tard le 10 novembre 2026.');
  });
});

describe('Compte rendu d’intervention et d’autocontrôle', () => {
  const cr = {
    ...nouveauCompteRendu({ chantier, client, entreprise, maintenant: new Date('2026-11-04T10:00:00') }),
    numero: 'CRI-2026-00001', nature: 'renovation_partielle', travaux: 'Remplacement du tableau\nPose de 2 circuits',
    mesures: { terre_ohms: '42', differentiels: 'declenchement', continuite: '' }, prix_ht: '450', created_at: '2026-11-04T10:00:00Z',
  };

  it('s’appelle « compte rendu », jamais « attestation de conformité »', () => {
    expect(TITRE_COMPTE_RENDU).toBe('Compte rendu d’intervention et d’autocontrôle');
    const html = buildCompteRenduElectriciteHtml({ compteRendu: cr, entreprise });
    expect(html).toContain(TITRE_COMPTE_RENDU);
    expect(html).toContain('Autocontrôle réalisé le');
    expect(html).not.toMatch(/attestation de conformit/i);
  });

  it('aucun texte produit (document, libellés, mention, phrase) ne contient « conforme » ni « certifié »', () => {
    const html = buildCompteRenduElectriciteHtml({ compteRendu: { ...cr, reserves: 'Prise à reprendre', observations: 'RAS' }, entreprise })
      .replace(/<style>[\s\S]*?<\/style>/, '');
    const libelles = [...NATURES.map((n) => n.libelle), ...MESURES.flatMap((m) => [m.libelle, ...(m.options || []).map((o) => o.libelle)]),
      MENTION_PORTEE, phraseCompteRendu(cr, 'X'), ...POINTS_DE_CHARGE.map((p) => p.libelle), ...LOCAUX.map((l) => l.libelle), TEXTE_FOURNITURE];
    for (const mot of MOTS_INTERDITS) {
      expect(html).not.toMatch(mot);
      for (const l of libelles) expect(l).not.toMatch(mot);
    }
  });

  it('contre-essai : le contrôle des mots interdits attrape bien « conforme »', () => {
    expect(MOTS_INTERDITS.some((m) => m.test('Installation conforme NF C 15-100'))).toBe(true);
    expect(MOTS_INTERDITS.some((m) => m.test('Attestation de conformité'))).toBe(true);
  });

  it('dit ce qu’il ne remplace pas (Consuel, diagnostic)', () => {
    const html = buildCompteRenduElectriciteHtml({ compteRendu: cr, entreprise });
    expect(html).toContain('Il ne remplace pas l’attestation visée par le Consuel');
  });

  it('n’imprime que les mesures saisies', () => {
    expect(mesuresImprimees(cr.mesures)).toEqual([
      { libelle: 'Résistance de la prise de terre (Ω)', valeur: '42' },
      { libelle: 'Dispositifs différentiels (test de déclenchement)', valeur: 'Déclenchement constaté' },
    ]);
    expect(mesuresImprimees({})).toEqual([]);
  });

  it('reprend le client et l’adresse du chantier ; liste ce qui manque', () => {
    const b = nouveauCompteRendu({ chantier, client, entreprise });
    expect(b.client_nom).toBe('Lucie Exemple');
    expect(b.adresse_intervention).toBe('3 chemin de l’Exemple, 33000 Imaginaire');
    expect(b.intervenant_nom).toBe('Paul Exemple');
    expect(manquantsCompteRendu(b).map((m) => m.champ)).toEqual(['nature', 'travaux']);
    expect(manquantsCompteRendu(cr)).toEqual([]);
    expect(manquantsCompteRendu({ ...cr, prix_ht: 'abc' }).map((m) => m.champ)).toEqual(['prix_ht']);
  });

  it('numéro de démo CRI-AAAA-NNNNN, à la suite', () => {
    expect(numeroCompteRenduDemo([], new Date('2026-11-04'))).toBe('CRI-2026-00001');
    expect(numeroCompteRenduDemo([{ numero: 'CRI-2026-00007' }, { numero: 'CRI-2025-00099' }], new Date('2026-11-04'))).toBe('CRI-2026-00008');
  });

  it('la facture tirée du compte rendu : une ligne datée qui cite le compte rendu, au taux de l’entreprise', () => {
    expect(ligneFactureCompteRendu(cr)).toEqual({
      description: 'Rénovation partielle du 4 novembre 2026 — Remplacement du tableau — compte rendu n° CRI-2026-00001',
      quantite: 1, unite: 'forfait', prixUnitaire: 450,
    });
    const f = donneesFactureCompteRendu({ compteRendu: { ...cr, id: 'cr1' }, entreprise, aujourdhui: '2026-11-04' });
    expect(f.type).toBe('facture');
    expect(f.statut).toBe('brouillon');
    expect(f.chantier_id).toBe('ch1');
    expect(f.client_id).toBe('c1');
    expect(f.total_ht).toBe(450);
    expect(f.total_ttc).toBe(495);
  });

  describe('qualification IRVE (forme de « Mes qualifications », migration 110)', () => {
    const irve = { type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'Q-123', fin: '2027-06-30', imprimer: true };
    const avec = { ...entreprise, qualifications: [irve] };
    const ligne = 'IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° Q-123 — Valide jusqu\'au 30/06/2027';
    const ligneHtml = ligne.replace("'", '&#39;');

    it('valide à la date du document : imprimée ; figée dans l’émetteur à l’enregistrement', () => {
      expect(qualificationIrve(avec, '2026-11-04')).toBe(ligne);
      const fige = avecEmetteur({ ...cr, nature: 'borne' }, avec);
      expect(fige.emetteur.qualificationIrve).toBe(ligne);
      expect(buildCompteRenduElectriciteHtml({ compteRendu: fige, entreprise })).toContain(ligneHtml);
      // La fiche du jour n'est plus lue : retirer la qualification de la fiche ne change pas le document enregistré
      expect(buildCompteRenduElectriciteHtml({ compteRendu: fige, entreprise: { ...entreprise, qualifications: [] } })).toContain(ligneHtml);
    });

    it('contre-essais : expirée à la date du document, « ne pas imprimer », sans numéro, ou autre nature', () => {
      expect(qualificationIrve(avec, '2027-07-01')).toBe('');
      expect(avecEmetteur({ ...cr, nature: 'borne', realise_le: '2027-07-01T10:00:00' }, avec).emetteur.qualificationIrve).toBeUndefined();
      expect(qualificationIrve({ qualifications: [{ ...irve, imprimer: false }] }, '2026-11-04')).toBe('');
      expect(qualificationIrve({ qualifications: [{ ...irve, numero: '' }] }, '2026-11-04')).toBe('');
      expect(qualificationIrve({ qualifications: [{ ...irve, fin: '30/06/2027' }] }, '2026-11-04')).toBe('');
      expect(qualificationIrve(entreprise)).toBe('');
      expect(avecEmetteur(cr, avec).emetteur.qualificationIrve).toBeUndefined();
      expect(buildCompteRenduElectriciteHtml({ compteRendu: avecEmetteur(cr, avec), entreprise: avec })).not.toContain('IRVE');
    });
  });

  it('échappe le texte saisi', () => {
    const html = buildCompteRenduElectriciteHtml({ compteRendu: { ...cr, travaux: '<script>x</script>' }, entreprise });
    expect(html).not.toContain('<script>x');
  });
});

describe('TVA d’une borne : suggérée selon le local, pas selon le client (CGI 278-0 bis, N)', () => {
  const ok = { local: 'habitation', residents: true, pointDeCharge: 'type2', installateurQualifie: true };

  it('suggère 5,5 % pour la pose dans un local d’habitation, destinée aux résidents', () => {
    const s = suggestionTvaBorne(ok);
    expect(s.taux).toBe(5.5);
    expect(s.texte).toContain('278-0 bis, N');
    expect(s.texte).toContain('le taux reste votre choix');
    expect(suggestionTvaBorne({ ...ok, pointDeCharge: 'prise_e_renforcee' }).taux).toBe(5.5);
  });

  it('le client n’entre pas en compte : un syndic, une SCI ou un professionnel ont la même suggestion', () => {
    for (const client of [{ type: 'professionnel' }, { type: 'particulier' }, { entreprise: 'SCI Exemple' }]) {
      expect(suggestionTvaBorne({ ...ok, client }).taux).toBe(5.5);
      expect(suggestionTvaBorne({ ...ok, local: 'autre', client }).taux).toBeNull();
    }
  });

  it('contre-essai : hors local d’habitation, non destinée aux résidents, autre prise ou sans qualification, aucun taux suggéré', () => {
    expect(suggestionTvaBorne({ ...ok, local: 'autre' }).taux).toBeNull();
    expect(suggestionTvaBorne({ ...ok, residents: false }).taux).toBeNull();
    expect(suggestionTvaBorne({ ...ok, pointDeCharge: 'autre' }).taux).toBeNull();
    expect(suggestionTvaBorne({ ...ok, installateurQualifie: false }).taux).toBeNull();
    expect(suggestionTvaBorne({}).manque).toHaveLength(4);
  });

  it('jamais un blocage, jamais « conforme » ; la part fourniture n’a aucun taux suggéré', () => {
    for (const r of [suggestionTvaBorne(ok), suggestionTvaBorne({})]) {
      expect(r.texte).toMatch(/votre choix/);
      for (const mot of MOTS_INTERDITS) expect(r.texte).not.toMatch(mot);
    }
    expect(TEXTE_FOURNITURE).toMatch(/aucun/);
  });

  it('reconnaît une ligne de borne', () => {
    expect(estLigneBorne('F&P borne de recharge 7kW (Type 2)')).toBe(true);
    expect(estLigneBorne('Installation IRVE 22 kW')).toBe(true);
    expect(estLigneBorne('Wallbox garage')).toBe(true);
    expect(estLigneBorne('Tableau électrique 3 rangées')).toBe(false);
  });

  it('reconnaît le pluriel et écarte les bornes d’éclairage (relecture du 4 nov., point 12)', () => {
    expect(estLigneBorne('Pose de 2 bornes de recharge')).toBe(true);
    expect(estLigneBorne('Pose de 2 bornes')).toBe(true);
    expect(estLigneBorne('Deux points de charge parking')).toBe(true);
    expect(estLigneBorne('Pose de 3 bornes d’éclairage extérieur')).toBe(false);
    expect(estLigneBorne('Borne d\'éclairage allée')).toBe(false);
    expect(estLigneBorne('Bornes lumineuses de jardin')).toBe(false);
    // …sauf si la ligne parle aussi de recharge
    expect(estLigneBorne('Borne d’éclairage avec prise de recharge véhicule')).toBe(true);
  });
});

describe('Certification du client : une pose de borne à 5,5 % ne la déclenche pas', () => {
  const borne = { description: 'Pose borne de recharge', quantite: 1, prixUnitaire: 600, tva: 5.5, regimeTva: REGIME_BORNE };
  const isolation = { description: 'Isolation des combles', quantite: 1, prixUnitaire: 1000, tva: 5.5 };

  it('borne seule à 5,5 % : aucune certification 278-0 bis A, dans le bloc commun aux deux générateurs ; seule la mention de la borne', () => {
    const tvaDetails = { 5.5: { base: 600, montant: 33 } };
    expect(tauxReduitsPresents(tvaDetails, { lignes: [borne], tauxDefaut: 10 }).cinqCinq).toBe(false);
    const html = mentionTvaReduiteHtml({ tvaDetails, lignes: [borne], tauxDefaut: 10 });
    expect(html).not.toContain('CERTIFICATION DU CLIENT');
    expect(html).not.toContain('rénovation énergétique');
    // Depuis la décision d'Hugo du 5 nov. 2026 (D-39), la borne imprime sa propre mention (avant : rien)
    expect(html).toContain(MENTION_BORNE);
  });

  it('contre-essai : la même ligne sans la marque « borne » déclenche la certification (comportement d’avant)', () => {
    const { regimeTva, ...sansMarque } = borne; // eslint-disable-line no-unused-vars
    const tvaDetails = { 5.5: { base: 600, montant: 33 } };
    expect(mentionTvaReduiteHtml({ tvaDetails, lignes: [sansMarque], tauxDefaut: 10 })).toContain('rénovation énergétique');
    expect(mentionTvaReduiteHtml({ tvaDetails })).toContain('rénovation énergétique');
  });

  it('borne et isolation à 5,5 % : la certification reste pour l’isolation ; un 10 % reste aussi', () => {
    const tvaDetails = { 5.5: { base: 1600, montant: 88 }, 10: { base: 300, montant: 30 } };
    const lignes = [borne, isolation, { description: 'Mise en sécurité', quantite: 1, prixUnitaire: 300 }];
    const p = tauxReduitsPresents(tvaDetails, { lignes, tauxDefaut: 10 });
    expect(p).toEqual({ dix: true, cinqCinq: true });
  });
});

describe('Générateur de la page de signature (devisHtmlBuilder) : une pose de borne marquée n’imprime pas la certification', async () => {
  const { buildDevisHtml } = await import('../devisHtmlBuilder');
  const doc = (marque) => ({
    id: 'd1', type: 'devis', numero: 'DEV-2026-00001', date: '2026-11-04', statut: 'brouillon', tvaRate: 10,
    lignes: [{ id: 'l1', description: 'Pose borne de recharge 7 kW', quantite: 1, unite: 'u', prixUnitaire: 600, montant: 600, tva: 5.5, ...(marque ? { regimeTva: REGIME_BORNE } : {}) }],
    total_ht: 600, tva: 33, total_ttc: 633,
  });
  const ent = { ...entreprise, tvaDefaut: 10 };

  it('marquée : pas de certification de rénovation énergétique', () => {
    expect(buildDevisHtml({ doc: doc(true), client, entreprise: ent })).not.toContain('CERTIFICATION DU CLIENT');
  });
  it('contre-essai : non marquée, la certification est imprimée', () => {
    expect(buildDevisHtml({ doc: doc(false), client, entreprise: ent })).toContain('CERTIFICATION DU CLIENT');
  });
});

describe('Corrections de juriste-btp (4 nov. 2026)', () => {
  it('une ligne marquée « borne » mais au taux de l’entreprise (10 %) garde la certification 10 % (risque de rappel à 20 %)', () => {
    const ligne = { description: 'Pose borne', quantite: 1, prixUnitaire: 600, regimeTva: REGIME_BORNE };
    expect(tauxReduitsPresents({ 10: { base: 600, montant: 60 } }, { lignes: [ligne], tauxDefaut: 10 }).dix).toBe(true);
    expect(tauxReduitsPresents({ 10: { base: 600, montant: 60 } }, { lignes: [{ ...ligne, tva: 10 }], tauxDefaut: 20 }).dix).toBe(true);
  });

  it('sans mesure saisie, le compte rendu ne parle pas d’autocontrôle', () => {
    const sans = { intervenant_nom: 'Paul', realise_le: '2026-11-04T10:00:00', mesures: {}, nature: 'depannage', travaux: 'Remplacement d’un disjoncteur', client_nom: 'C', adresse_intervention: 'A' };
    expect(phraseCompteRendu(sans, 'X')).not.toMatch(/autocontrôle/);
    const html = buildCompteRenduElectriciteHtml({ compteRendu: sans, entreprise });
    expect(html).not.toMatch(/Autocontrôle réalisé/);
    // Le titre aussi (relecture du 4 nov., point 11) : « Compte rendu d'intervention », sans « et d'autocontrôle »
    expect(html).toContain(`<h1>${TITRE_SANS_MESURE}</h1>`);
    expect(html).not.toMatch(/autocontrôle/i);
    expect(buildCompteRenduElectriciteHtml({ compteRendu: { ...sans, mesures: { terre_ohms: '30' } }, entreprise })).toContain(`<h1>${TITRE_COMPTE_RENDU}</h1>`);
    const avec = { ...sans, mesures: { terre_ohms: '30' } };
    expect(phraseCompteRendu(avec, 'X')).toMatch(/autocontrôle dont les résultats/);
  });

  it('photovoltaïque : la facture tirée avertit, sans proposer de taux (relecture du 4 nov., point 13)', () => {
    expect(TAUX_A_VERIFIER).toEqual(expect.arrayContaining(['neuf', 'borne', 'photovoltaique']));
    expect(TAUX_A_VERIFIER).not.toContain('depannage');
    expect(TEXTE_TAUX_A_VERIFIER).toContain('photovoltaïque');
  });

  it('le texte de l’aide Consuel cite le décret des bornes, et un fichier « Consuel » est dit tel quel', () => {
    expect(AIDE_CONSUEL).toContain('décret n° 2017-26, art. 23');
    expect(etatConsuel({ documents: [{ nom: 'Consuel.pdf' }] }).texte).toBe('Un fichier « Consuel » est joint aux fichiers du chantier.');
  });
});

// ─── Décisions d'Hugo du 5 nov. 2026 (D-39) ──────────────────────────────────────────────────────────────────────────

describe('Mention de la pose d’une borne à 5,5 % sur le devis et la facture (décision 3)', () => {
  const borne = { description: 'Pose borne de recharge 7 kW', quantite: 1, prixUnitaire: 600, tva: 5.5, regimeTva: REGIME_BORNE };
  const isolation = { description: 'Isolation des combles', quantite: 1, prixUnitaire: 1000, tva: 5.5 };
  const mention = (lignes, o = {}) => mentionTvaReduiteHtml({ tvaDetails: { 5.5: { base: 1600, montant: 88 } }, lignes, tauxDefaut: 10, ...o });

  it('le texte est celui de l’avis de juriste-btp du 5 nov. 2026 (point 4), mot pour mot, apostrophes typographiques et point final compris', () => {
    expect(MENTION_BORNE).toBe('TVA à 5,5 % : pose d’une infrastructure de recharge pour véhicules électriques dans un local à '
      + 'usage d’habitation, destinée aux résidents (CGI, art. 278-0 bis, N).');
    // Seul écart avec la proposition de D-39 : « pour véhicules électriques », qui figure dans le N de l'art. 278-0 bis
    expect(MENTION_BORNE).toContain('infrastructure de recharge pour véhicules électriques');
    expect(MENTION_BORNE.endsWith('(CGI, art. 278-0 bis, N).')).toBe(true);
    for (const mot of MOTS_INTERDITS) expect(MENTION_BORNE).not.toMatch(mot);
  });

  it('une ligne de borne marquée à 5,5 % : la mention est imprimée, seule (devis, facture, facture d’acompte dont les lignes portent la marque)', () => {
    for (const o of [{}, { isFacture: true }, { isFacture: true, isAcompte: true }]) {
      const html = mention([borne], o);
      expect(html).toContain(MENTION_BORNE);
      expect(html).not.toContain('CERTIFICATION DU CLIENT'); // pas de certification de rénovation énergétique pour la borne
    }
    expect(portePoseBorne([borne], 10)).toBe(true);
  });

  it('une autre ligne à 5,5 % (isolation) : pas de mention, la certification reste', () => {
    const html = mention([isolation]);
    expect(html).not.toContain('pose d’une infrastructure de recharge');
    expect(html).toContain('CERTIFICATION DU CLIENT');
    expect(portePoseBorne([isolation], 10)).toBe(false);
  });

  it('borne et isolation à 5,5 % : la certification pour l’isolation ET la mention pour la borne', () => {
    const html = mention([borne, isolation]);
    expect(html).toContain('CERTIFICATION DU CLIENT');
    expect(html).toContain(MENTION_BORNE);
    // la mention suit la certification (même présentation)
    expect(html.indexOf('CERTIFICATION DU CLIENT')).toBeLessThan(html.indexOf(MENTION_BORNE));
  });

  it('contre-essais : ligne marquée mais passée à 10 %, ligne sans la marque, montant nul, sans les lignes, franchise, avoir', () => {
    const non = (html) => expect(html).not.toContain(MENTION_BORNE);
    non(mention([{ ...borne, tva: 10 }], { tvaDetails: { 10: { base: 600, montant: 60 } } }));
    const { regimeTva, ...sansMarque } = borne; // eslint-disable-line no-unused-vars
    non(mention([sansMarque]));
    non(mention([{ ...borne, prixUnitaire: 0 }]));
    non(mention(undefined));
    non(mention([borne], { isMicro: true }));
    non(mention([borne], { isFacture: true, isAvoir: true }));
    expect(portePoseBorne(undefined, 10)).toBe(false);
    expect(portePoseBorne([{ ...borne, tva: 10 }], 20)).toBe(false);
    // la ligne sans taux propre prend celui du document : 5,5 % posé par défaut → c'est une pose à 5,5 %
    const { tva, ...sansTaux } = borne; // eslint-disable-line no-unused-vars
    expect(portePoseBorne([sansTaux], 5.5)).toBe(true);
    expect(portePoseBorne([sansTaux], 10)).toBe(false);
  });

  it('les deux générateurs impriment la même mention : la page de signature (devisHtmlBuilder) en direct', async () => {
    const { buildDevisHtml } = await import('../devisHtmlBuilder');
    const doc = (marque) => ({
      id: 'd1', type: 'devis', numero: 'DEV-2026-00001', date: '2026-11-05', statut: 'brouillon', tvaRate: 10,
      lignes: [{ ...borne, id: 'l1', unite: 'u', montant: 600, ...(marque ? {} : { regimeTva: undefined }) }],
      total_ht: 600, tva: 33, total_ttc: 633,
    });
    const ent = { ...entreprise, tvaDefaut: 10 };
    expect(buildDevisHtml({ doc: doc(true), client, entreprise: ent })).toContain(MENTION_BORNE);
    // contre-essai : la même ligne sans la marque n'imprime pas la mention de la borne (mais la certification, comme avant)
    const sans = buildDevisHtml({ doc: doc(false), client, entreprise: ent });
    expect(sans).not.toContain(MENTION_BORNE);
    expect(sans).toContain('CERTIFICATION DU CLIENT');
    // une facture tirée du devis garde ses lignes (donc la marque) : la mention y est aussi
    const facture = { ...doc(true), type: 'facture', facture_type: 'totale', numero: 'FAC-2026-00001' };
    expect(buildDevisHtml({ doc: facture, client, entreprise: ent })).toContain(MENTION_BORNE);
  });
});

describe('Facture tirée d’un compte rendu de dépannage chez un particulier : avertir sans bloquer (décision 4)', () => {
  const particulier = { id: 'c1', nom: 'Exemple', categorie: 'Particulier' };

  it('le texte est celui de l’avis de juriste-btp du 5 nov. 2026 (point 5), mot pour mot ; « Devis », pas « Dépannage express » (écran absent de cette branche)', () => {
    expect(TEXTE_DEPANNAGE_SANS_DEVIS).toBe('Dépannage chez un particulier : un devis détaillé devait lui être remis avant l’intervention '
      + '(arrêté du 24 janvier 2017, article 4). Si le contrat a été conclu chez lui, aucun paiement ni '
      + 'aucune contrepartie ne peut être reçu avant sept jours à compter de sa conclusion, sauf travaux '
      + 'd’entretien ou de réparation urgents qu’il a expressément demandés, dans la limite des pièces de '
      + 'rechange et travaux strictement nécessaires pour répondre à l’urgence (code de la consommation, '
      + 'article L. 221-10). Pour le prochain dépannage, faites d’abord le devis depuis « Devis ».');
    expect(TEXTE_DEPANNAGE_SANS_DEVIS).not.toMatch(/Dépannage express/);
    // L'urgence ne dispense pas du devis : le texte rappelle le devis ET l'exception des travaux urgents (L. 221-10)
    expect(TEXTE_DEPANNAGE_SANS_DEVIS).toContain('un devis détaillé devait lui être remis avant l’intervention');
    expect(TEXTE_DEPANNAGE_SANS_DEVIS).toContain('sauf travaux d’entretien ou de réparation urgents');
  });

  it('dépannage + client particulier : l’avertissement, affiché 10 s (assez longtemps pour être lu)', () => {
    const attendu = { texte: TEXTE_DEPANNAGE_SANS_DEVIS, duree: 10000 };
    expect(DUREE_AVERTISSEMENT_DEPANNAGE_MS).toBe(10000);
    expect(avertissementFactureCompteRendu({ nature: 'depannage' }, particulier)).toEqual(attendu);
    // ni catégorie ni entreprise : un particulier (même règle que la rétractation)
    expect(avertissementFactureCompteRendu({ nature: 'depannage' }, { nom: 'Martin' })).toEqual(attendu);
  });

  it('contre-essais : syndic, professionnel, entreprise, client inconnu, autre nature → aucun avertissement de dépannage', () => {
    for (const c of [{ categorie: 'Syndic' }, { categorie: 'Professionnel' }, { categorie: 'Architecte' }, { entreprise: 'SARL X' }, null]) {
      expect(avertissementFactureCompteRendu({ nature: 'depannage' }, c)).toBeNull();
    }
    for (const nature of ['renovation_partielle', 'renovation_totale', 'autre']) {
      expect(avertissementFactureCompteRendu({ nature }, particulier)).toBeNull();
    }
  });

  it('un seul avertissement à la fois : pour le neuf, la borne et le photovoltaïque, le taux à vérifier, jamais celui du dépannage', () => {
    for (const nature of ['neuf', 'borne', 'photovoltaique']) {
      // Durée par défaut des notifications : seul l'avertissement du dépannage est allongé
      expect(avertissementFactureCompteRendu({ nature }, particulier)).toEqual({ texte: TEXTE_TAUX_A_VERIFIER });
      expect(avertissementFactureCompteRendu({ nature }, null)).toEqual({ texte: TEXTE_TAUX_A_VERIFIER });
    }
    expect(avertissementFactureCompteRendu({ nature: 'depannage' }, particulier).texte).not.toBe(TEXTE_TAUX_A_VERIFIER);
  });

  it('jamais « conforme » ni « certifié » ; c’est un texte à montrer, pas une erreur à lever', () => {
    for (const mot of MOTS_INTERDITS) expect(TEXTE_DEPANNAGE_SANS_DEVIS).not.toMatch(mot);
    expect(() => avertissementFactureCompteRendu(undefined, undefined)).not.toThrow();
  });
});

describe('E-mail du compte rendu au client (décision 5) : texte', () => {
  const cr = {
    ...nouveauCompteRendu({ chantier, client, entreprise, maintenant: new Date('2026-11-04T10:00:00') }),
    numero: 'CRI-2026-00001', nature: 'renovation_partielle', travaux: 'Remplacement du tableau', mesures: { terre_ohms: '42' },
  };
  const ent = { ...entreprise, email: 'contact@exemple.fr', tel: '05 00 00 00 00' };

  it('annonce le document, son numéro, sa date et sa nature, signé du nom imprimé de l’entreprise', () => {
    const html = corpsEmailCompteRendu({ compteRendu: cr, entreprise: ent });
    expect(html).toContain('Veuillez trouver ci-joint le compte rendu d’intervention et d’autocontrôle n° CRI-2026-00001 du 4 novembre 2026 (Rénovation partielle).');
    expect(html).toContain('05 00 00 00 00 · contact@exemple.fr');
    for (const mot of MOTS_INTERDITS) expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(mot);
  });

  it('sans mesure, le texte ne parle pas d’autocontrôle (comme le document)', () => {
    const html = corpsEmailCompteRendu({ compteRendu: { ...cr, mesures: {} }, entreprise: ent });
    expect(html).toContain('le compte rendu d’intervention n° CRI-2026-00001');
    expect(html).not.toMatch(/autocontrôle/);
  });

  it('échappe ce que l’artisan a saisi (nom de l’entreprise)', () => {
    const html = corpsEmailCompteRendu({ compteRendu: cr, entreprise: { ...ent, nom: '<b>Élec</b>' } });
    expect(html).not.toContain('<b>Élec</b>');
  });
});
