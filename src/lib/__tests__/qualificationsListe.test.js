import { describe, it, expect } from 'vitest';
import { lignesQualifications, qualificationsDe, raisonNonImprimee, champsRgeDeLaListe, echeancesQualifications, TYPES_QUALIFICATION, nouvelleQualification, ouParDefaut } from '../qualifications';
import { buildDevisHtml } from '../devisHtmlBuilder';
import { buildDocumentHTML } from '../pdfHtmlBuilder';

// « Mes qualifications » (lot 1, docs/metiers/synthese.md § 3.7) : le champ RGE unique devient une liste.
const AUJ = '2026-11-04';
const RGE = { id: 'a', type: 'rge', intitule: 'QualiPAC chauffage et eau chaude sanitaire', organisme: 'Qualit\'EnR', numero: 'QPAC-1', fin: '2027-06-30' };
const IRVE = { id: 'b', type: 'irve', intitule: 'IRVE P1', organisme: 'Qualifelec', numero: 'IRVE-22', fin: '2027-03-31' };
const LIGNE_RGE = 'Entreprise RGE (Reconnu garant de l\'environnement) — Qualification : QualiPAC chauffage et eau chaude sanitaire — Qualit\'EnR — N° QPAC-1 — Valide jusqu\'au 30/06/2027';
const LIGNE_IRVE = 'IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° IRVE-22 — Valide jusqu\'au 31/03/2027';

describe('Mes qualifications', () => {
  it('couvre RGE, IRVE, capacité fluides, PG gaz, Certibiocide, Certiphyto, SAP (et « autre »)', () => {
    expect(TYPES_QUALIFICATION.map((t) => t.id)).toEqual(['rge', 'irve', 'fluides', 'pg_gaz', 'certibiocide', 'certiphyto', 'sap', 'autre']);
  });

  it('plusieurs qualifications imprimées, dans l’ordre ; le RGE garde le libellé du lot 0', () => {
    expect(lignesQualifications({ qualifications: [RGE, IRVE] }, AUJ)).toEqual([LIGNE_RGE, LIGNE_IRVE]);
  });

  it('jamais sans numéro, et jamais le mot « certifié »', () => {
    // La déclaration SAP est posée « sur tous mes documents » : sans choix, elle vaut « seulement si » (D-41, plus bas)
    for (const q of [RGE, IRVE, { ...IRVE, type: 'sap', ou: 'tous' }]) {
      expect(lignesQualifications({ qualifications: [{ ...q, numero: ' ' }] }, AUJ)).toEqual([]);
      expect(raisonNonImprimee({ ...q, numero: '' }, AUJ)).toMatch(/numéro/);
    }
    for (const t of TYPES_QUALIFICATION) {
      const l = lignesQualifications({ qualifications: [{ ...IRVE, type: t.id, organisme: t.id === 'rge' ? 'Qualibat' : 'X' }] }, AUJ);
      expect(l.join(' ')).not.toMatch(/certifi[ée]/i);
    }
  });

  it('date de fin exigée, lisible et non passée (sauf déclaration SAP) ; jugée à la date du document', () => {
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '31/03/2027' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '2026-11-03' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '2026-11-03' }] }, '2026-10-01')).toEqual(['IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° IRVE-22 — Valide jusqu\'au 03/11/2026']);
    // SAP : numéro ET date de la déclaration (C. trav. D7233-1, avis juriste du 4 nov. 2026), jamais une échéance
    expect(lignesQualifications({ qualifications: [{ type: 'sap', ou: 'tous', numero: 'SAP123456789', fin: '2019-03-01' }] }, AUJ)).toEqual(['Services à la personne : déclaration enregistrée sous le n° SAP123456789 le 01/03/2019']);
    expect(lignesQualifications({ qualifications: [{ type: 'sap', ou: 'tous', numero: 'SAP123456789' }] }, AUJ)).toEqual([]);
    expect(raisonNonImprimee({ type: 'sap', ou: 'tous', numero: 'SAP1' }, AUJ)).toMatch(/date d’enregistrement de la déclaration/);
  });

  it('certificats individuels : « détenu par » le titulaire (avis juriste du 4 nov. 2026)', () => {
    expect(lignesQualifications({ qualifications: [{ ...IRVE, type: 'certibiocide', intitule: 'Jean Exemple, TP8' }] }, AUJ)[0])
      .toBe('Certificat individuel biocides (Certibiocide) détenu par : Jean Exemple, TP8 — Qualifelec — N° IRVE-22 — Valide jusqu\'au 31/03/2027');
  });

  it('hors RGE : intitulé et organisme exigés ; Qualiopi refusé', () => {
    expect(raisonNonImprimee({ ...IRVE, intitule: '' }, AUJ)).toMatch(/intitulé/);
    expect(raisonNonImprimee({ ...IRVE, organisme: '' }, AUJ)).toMatch(/organisme/);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, organisme: 'Qualiopi' }] }, AUJ)).toEqual([]);
  });

  it('le RGE garde les règles du lot 0 dans la liste (intitulé et organisme RGE exigés)', () => {
    expect(lignesQualifications({ qualifications: [{ ...RGE, intitule: '' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...RGE, organisme: 'Qualiopi' }] }, AUJ)).toEqual([]);
    expect(raisonNonImprimee({ ...RGE, organisme: 'Autre' }, AUJ)).toMatch(/organisme/);
  });

  it('case « imprimer » décochée : rien', () => {
    expect(lignesQualifications({ qualifications: [{ ...IRVE, imprimer: false }, RGE] }, AUJ)).toEqual([LIGNE_RGE]);
  });

  it('« seulement si une ligne contient… » : sur un devis de borne oui, de plomberie non ; jamais pour le RGE', () => {
    const e = { qualifications: [{ ...IRVE, motsCles: 'borne, recharge' }, { ...RGE, motsCles: 'pompe' }] };
    const borne = { lignes: [{ description: 'Fourniture et pose d\'une Borne de recharge 7 kW' }] };
    const plomberie = { lignes: [{ description: 'Remplacement d\'un mitigeur' }] };
    const enSection = { sections: [{ lignes: [{ designation: 'Pose de bornes' }] }] };
    expect(lignesQualifications(e, AUJ, borne)).toEqual([LIGNE_IRVE, LIGNE_RGE]);
    expect(lignesQualifications(e, AUJ, plomberie)).toEqual([LIGNE_RGE]);
    expect(lignesQualifications(e, AUJ, enSection)).toContain(LIGNE_IRVE);
  });

  it('« seulement si » sans mot n’imprime rien (SAP et Autre), même sur tous les documents ; contre-essai avec un mot', () => {
    const SAP = { id: 's', type: 'sap', numero: 'SAP123456789', fin: '2019-03-01', imprimer: true, ou: 'si', motsCles: '' };
    const AUTRE = { ...IRVE, id: 'o', type: 'autre', intitule: 'Qualibat 5111', organisme: 'Qualibat', ou: 'si', motsCles: '' };
    const plomberie = { lignes: [{ description: 'Remplacement d\'un mitigeur' }] };
    const menage = { lignes: [{ description: 'Ménage à domicile' }] };
    expect(lignesQualifications({ qualifications: [SAP, AUTRE] }, AUJ, plomberie)).toEqual([]);
    expect(lignesQualifications({ qualifications: [SAP, AUTRE] }, AUJ, menage)).toEqual([]);
    expect(raisonNonImprimee(SAP, AUJ)).toMatch(/mots cherchés/);
    expect(raisonNonImprimee(AUTRE, AUJ)).toMatch(/mots cherchés/);
    const sapMenage = { ...SAP, motsCles: 'ménage' };
    expect(lignesQualifications({ qualifications: [sapMenage] }, AUJ, plomberie)).toEqual([]);
    expect(lignesQualifications({ qualifications: [sapMenage] }, AUJ, menage)).toHaveLength(1);
    // sans document connu, « seulement si » n'imprime rien
    expect(lignesQualifications({ qualifications: [sapMenage] }, AUJ)).toEqual([]);
  });

  it('le choix « où » est gardé à part des mots ; une fiche d’avant `ou` est lue comme avant', () => {
    expect(qualificationsDe({ qualifications: [{ ...IRVE, motsCles: 'borne' }] })[0].ou).toBe('si');
    expect(qualificationsDe({ qualifications: [{ ...IRVE }] })[0].ou).toBe('tous');
    expect(qualificationsDe({ qualifications: [{ ...IRVE, imprimer: false, motsCles: 'borne' }] })[0].ou).toBe('non');
    expect(qualificationsDe({ qualifications: [{ ...IRVE, ou: 'tous', motsCles: 'borne' }] })[0].ou).toBe('tous');
    expect(qualificationsDe({ qualifications: [{ ...RGE, ou: 'si', motsCles: 'pompe' }] })[0].ou).toBe('tous');
    expect(qualificationsDe({ qualifications: [{ ...IRVE, ou: 'non' }] })[0].imprimer).toBe(false);
  });

  it('une fiche d’avant la liste : ses champs rge* valent une qualification RGE ; la liste, même vide, l’emporte', () => {
    const ancien = { rge: 'E-1', rgeOrganisme: 'Qualibat', rgeDomaine: 'QualiPAC', rgeValidite: '2027-01-31' };
    expect(qualificationsDe(ancien)).toHaveLength(1);
    expect(lignesQualifications(ancien, AUJ)).toHaveLength(1);
    expect(lignesQualifications({ ...ancien, qualifications: [] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ ...ancien, qualifications: null }, AUJ)).toHaveLength(1);
  });

  it('le premier RGE imprimable est recopié dans les champs rge* (page de signature d’avant la migration 110)', () => {
    expect(champsRgeDeLaListe([IRVE, RGE])).toEqual({ rge: 'QPAC-1', rgeOrganisme: 'Qualit\'EnR', rgeDomaine: RGE.intitule, rgeValidite: '2027-06-30' });
    expect(champsRgeDeLaListe([IRVE])).toEqual({ rge: '', rgeOrganisme: '', rgeDomaine: '', rgeValidite: '' });
  });

  it('alerte avant l’échéance, comme la décennale (60 jours), et après', () => {
    const e = { qualifications: [{ ...IRVE, fin: '2026-12-01' }, { ...RGE, fin: '2026-10-01' }, { ...RGE, id: 'c', fin: '2028-01-01' }] };
    expect(echeancesQualifications(e, AUJ).map((x) => [x.id, x.jours])).toEqual([['a', -34], ['b', 27]]);
  });

  it('les deux générateurs impriment la liste (échappée) ; la page de signature passe par buildDevisHtml', () => {
    const doc = { type: 'devis', numero: 'DEV-1', date: AUJ, lignes: [{ description: 'Pose de borne', quantite: 1, unite: 'u', prixUnitaire: 1000, tva: 5.5 }], total_ht: 1000, tva: 55, total_ttc: 1055 };
    const e = { nom: 'Élec', siret: '12345678900011', qualifications: [{ ...IRVE, intitule: 'IRVE <P1>' }] };
    const html = buildDevisHtml({ doc, client: { nom: 'X' }, entreprise: e });
    expect(html).toContain('IRVE (infrastructures de recharge) : IRVE &lt;P1&gt; — Qualifelec — N° IRVE-22');
    const rapide = buildDocumentHTML(doc, { nom: 'X' }, null, e);
    expect(rapide).toContain('IRVE (infrastructures de recharge) : IRVE &lt;P1&gt;');
  });
});

// Décision d'Hugo du 5 nov. 2026 (D-41) : la mention « services à la personne » n'est imprimée que sur un document dont
// une ligne la concerne ; par défaut, « Seulement si une ligne contient… » avec une liste de mots vide. Texte imprimé :
// C. trav. D7233-1, 2° (« le numéro et la date d'enregistrement de la déclaration »), mot pour mot de l'avis du 4 nov.
describe('services à la personne : « seulement si » par défaut (D-41)', () => {
  const PHRASE = 'Services à la personne : déclaration enregistrée sous le n° SAP123456789 le 01/03/2019';
  const sapAjoutee = (champs = {}) => ({ ...nouvelleQualification('sap', 's1'), numero: 'SAP123456789', fin: '2019-03-01', ...champs });
  const menage = { lignes: [{ description: 'Ménage à domicile, 2 h' }] };
  const jardinage = { sections: [{ lignes: [{ designation: 'Tonte de la pelouse' }] }] };
  const plomberie = { lignes: [{ description: 'Remplacement d’un mitigeur' }] };
  const electricite = { lignes: [{ description: 'Pose d’une prise 16 A et d’un interrupteur' }] };

  it('ajoutée depuis Paramètres : « seulement si », liste de mots vide ; les autres types restent sur tous les documents', () => {
    const q = nouvelleQualification('sap', 's1');
    expect(q).toMatchObject({ type: 'sap', imprimer: true, ou: 'si', motsCles: '' });
    expect(ouParDefaut('sap')).toBe('si');
    for (const t of TYPES_QUALIFICATION.filter((x) => x.id !== 'sap')) expect(nouvelleQualification(t.id, 'x').ou, t.id).toBe('tous');
    expect(nouvelleQualification('inconnu', 'x').type).toBe('autre');
  });

  it('mots vides : rien d’imprimé, sur aucun document, avec ou sans numéro et date', () => {
    for (const doc of [menage, jardinage, plomberie, electricite, null]) {
      expect(lignesQualifications({ qualifications: [sapAjoutee()] }, AUJ, doc)).toEqual([]);
    }
    expect(raisonNonImprimee(sapAjoutee(), AUJ)).toBe('Ajoutez les mots cherchés dans les lignes : tant qu’il n’y en a aucun, rien n’est imprimé.');
  });

  it('un mot présent dans une ligne (ligne ou lot) : la mention ; absent : rien', () => {
    const e = { qualifications: [sapAjoutee({ motsCles: 'ménage, tonte' })] };
    expect(lignesQualifications(e, AUJ, menage)).toEqual([PHRASE]);
    expect(lignesQualifications(e, AUJ, jardinage)).toEqual([PHRASE]);
    expect(lignesQualifications(e, AUJ, plomberie)).toEqual([]);
    // sans accent ni casse, comme les autres mots cherchés
    expect(lignesQualifications({ qualifications: [sapAjoutee({ motsCles: 'MENAGE' })] }, AUJ, menage)).toEqual([PHRASE]);
  });

  it('jamais sur un travail exclu : un devis d’électricité ou de plomberie n’imprime rien, mots de services à la personne ou non', () => {
    const e = { qualifications: [sapAjoutee({ motsCles: 'ménage, tonte, jardinage, courses' })] };
    expect(lignesQualifications(e, AUJ, electricite)).toEqual([]);
    expect(lignesQualifications(e, AUJ, plomberie)).toEqual([]);
    expect(lignesQualifications({ qualifications: [sapAjoutee()] }, AUJ, electricite)).toEqual([]);
  });

  it('les deux générateurs : la mention sur un devis de ménage, pas sur un devis de plomberie', () => {
    const devis = (description) => ({ type: 'devis', numero: 'DEV-1', date: AUJ, lignes: [{ description, quantite: 2, unite: 'h', prixUnitaire: 30, tva: 10 }], total_ht: 60, tva: 6, total_ttc: 66 });
    const e = (motsCles) => ({ nom: 'Multi', siret: '12345678900011', qualifications: [sapAjoutee({ motsCles })] });
    for (const [motsCles, description, attendu] of [['ménage', 'Ménage à domicile', true], ['ménage', 'Remplacement d’un mitigeur', false], ['', 'Ménage à domicile', false]]) {
      const doc = devis(description);
      expect(buildDevisHtml({ doc, client: { nom: 'X' }, entreprise: e(motsCles) }).includes(PHRASE), `buildDevisHtml ${motsCles}/${description}`).toBe(attendu);
      expect(buildDocumentHTML(doc, { nom: 'X' }, null, e(motsCles)).includes(PHRASE), `buildDocumentHTML ${motsCles}/${description}`).toBe(attendu);
    }
  });

  it('une déclaration enregistrée sans choix (fiche importée) vaut « seulement si » ; un « tous » choisi est respecté', () => {
    expect(qualificationsDe({ qualifications: [{ type: 'sap', numero: 'SAP1', fin: '2019-03-01' }] })[0].ou).toBe('si');
    expect(qualificationsDe({ qualifications: [{ type: 'sap', numero: 'SAP1', fin: '2019-03-01', imprimer: true }] })[0].ou).toBe('si');
    expect(qualificationsDe({ qualifications: [{ type: 'sap', ou: 'tous' }] })[0].ou).toBe('tous');
    expect(qualificationsDe({ qualifications: [{ type: 'sap', ou: 'non' }] })[0].ou).toBe('non');
    expect(lignesQualifications({ qualifications: [{ type: 'sap', numero: 'SAP123456789', fin: '2019-03-01' }] }, AUJ, plomberie)).toEqual([]);
  });

  it('contre-essai : en « tous mes documents » (l’ancien comportement), la mention sort sur un devis de plomberie', () => {
    expect(lignesQualifications({ qualifications: [sapAjoutee({ ou: 'tous' })] }, AUJ, plomberie)).toEqual([PHRASE]);
  });
});

