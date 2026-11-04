import { describe, it, expect } from 'vitest';
import {
  limiteEnvoiConsuel, tacheConsuel, tacheConsuelDuChantier, etatConsuel, AIDE_CONSUEL, TACHE_CONSUEL,
  TITRE_COMPTE_RENDU, MENTION_PORTEE, MOTS_INTERDITS, NATURES, MESURES, manquantsCompteRendu, nouveauCompteRendu,
  mesuresImprimees, phraseCompteRendu, numeroCompteRenduDemo, ligneFactureCompteRendu, qualificationIrve,
  suggestionTvaBorne, estLigneBorne, REGIME_BORNE, TEXTE_FOURNITURE, POINTS_DE_CHARGE, LOCAUX,
} from '../electricite';
import { buildCompteRenduElectriciteHtml } from '../compteRenduElectriciteHtml';
import { tauxReduitsPresents, mentionTvaReduiteHtml } from '../mentionTvaReduite';
import { donneesFactureCompteRendu } from '../../components/electricite/actionsCompteRendu';

// Données fictives seulement
const chantier = { id: 'ch1', nom: 'Rénovation Exemple', client_id: 'c1', adresse: '3 chemin de l’Exemple', codePostal: '33000', ville: 'Imaginaire' };
const client = { id: 'c1', prenom: 'Lucie', nom: 'Exemple', telephone: '06 00 00 00 01' };
const entreprise = { nom: 'Électricité Exemple', formeJuridique: 'EI', nomEntrepreneur: 'Paul Exemple', siret: '00000000000000', tvaDefaut: 10 };

describe('Consuel — rappel à J-20 (C. énergie D342-19)', () => {
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
    for (const texte of [t.text, t.notes, AIDE_CONSUEL]) {
      for (const mot of MOTS_INTERDITS) expect(texte).not.toMatch(mot);
    }
    expect(t.notes).toContain('D342-19');
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

  it('qualification IRVE : imprimée seulement avec un numéro (point d’accroche « Mes qualifications »)', () => {
    expect(qualificationIrve(entreprise)).toBeNull();
    expect(qualificationIrve({ qualifications: [{ type: 'IRVE', organisme: 'Qualifelec' }] })).toBeNull();
    const avec = { ...entreprise, qualifications: [{ type: 'IRVE', organisme: 'Qualifelec', numero: 'Q-123' }] };
    expect(qualificationIrve(avec)).toEqual({ organisme: 'Qualifelec', numero: 'Q-123', niveau: '' });
    expect(buildCompteRenduElectriciteHtml({ compteRendu: { ...cr, nature: 'borne' }, entreprise: avec })).toContain('Qualification IRVE (Qualifelec) : n° Q-123');
    expect(buildCompteRenduElectriciteHtml({ compteRendu: cr, entreprise: avec })).not.toContain('Qualification IRVE');
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
});

describe('Certification du client : une pose de borne à 5,5 % ne la déclenche pas', () => {
  const borne = { description: 'Pose borne de recharge', quantite: 1, prixUnitaire: 600, tva: 5.5, regimeTva: REGIME_BORNE };
  const isolation = { description: 'Isolation des combles', quantite: 1, prixUnitaire: 1000, tva: 5.5 };

  it('borne seule à 5,5 % : aucune certification 278-0 bis A, dans le bloc commun aux deux générateurs', () => {
    const tvaDetails = { 5.5: { base: 600, montant: 33 } };
    expect(tauxReduitsPresents(tvaDetails, { lignes: [borne], tauxDefaut: 10 }).cinqCinq).toBe(false);
    expect(mentionTvaReduiteHtml({ tvaDetails, lignes: [borne], tauxDefaut: 10 })).toBe('');
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
