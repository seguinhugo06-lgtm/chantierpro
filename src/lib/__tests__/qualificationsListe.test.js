import { describe, it, expect } from 'vitest';
import { lignesQualifications, qualificationsDe, raisonNonImprimee, champsRgeDeLaListe, echeancesQualifications, TYPES_QUALIFICATION } from '../qualifications';
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
    for (const q of [RGE, IRVE, { ...IRVE, type: 'sap' }]) {
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
    expect(lignesQualifications({ qualifications: [{ type: 'sap', numero: 'SAP123456789', fin: '2019-03-01' }] }, AUJ)).toEqual(['Services à la personne : déclaration enregistrée sous le n° SAP123456789 le 01/03/2019']);
    expect(lignesQualifications({ qualifications: [{ type: 'sap', numero: 'SAP123456789' }] }, AUJ)).toEqual([]);
    expect(raisonNonImprimee({ type: 'sap', numero: 'SAP1' }, AUJ)).toMatch(/date d’enregistrement de la déclaration/);
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
