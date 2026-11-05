import { describe, it, expect } from 'vitest';
import { lignesQualifications, qualificationsDe, raisonNonImprimee, champsRgeDeLaListe, echeancesQualifications, TYPES_QUALIFICATION, nouvelleQualification, ouFige, ligneImprimee } from '../qualifications';
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
    // La déclaration SAP n'est jamais imprimée (avis du lot 4, point 9) : sa raison est le texte du dernier groupe
    for (const q of [RGE, IRVE]) {
      expect(lignesQualifications({ qualifications: [{ ...q, numero: ' ' }] }, AUJ)).toEqual([]);
      expect(raisonNonImprimee({ ...q, numero: '' }, AUJ)).toMatch(/numéro/);
    }
    for (const t of TYPES_QUALIFICATION) {
      const l = lignesQualifications({ qualifications: [{ ...IRVE, type: t.id, organisme: t.id === 'rge' ? 'Qualibat' : 'X' }] }, AUJ);
      expect(l.join(' ')).not.toMatch(/certifi[ée]/i);
    }
  });

  it('date de fin exigée, lisible et non passée ; jugée à la date du document', () => {
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '31/03/2027' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '2026-11-03' }] }, AUJ)).toEqual([]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, fin: '2026-11-03' }] }, '2026-10-01')).toEqual(['IRVE (infrastructures de recharge) : IRVE P1 — Qualifelec — N° IRVE-22 — Valide jusqu\'au 03/11/2026']);
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

  it('« seulement si » sans mot n’imprime rien (Autre), même sur tous les documents ; contre-essai avec un mot', () => {
    const AUTRE = { ...IRVE, id: 'o', type: 'autre', intitule: 'Qualibat 5111', organisme: 'Qualibat', ou: 'si', motsCles: '' };
    const plomberie = { lignes: [{ description: 'Remplacement d\'un mitigeur' }] };
    const menage = { lignes: [{ description: 'Ménage à domicile' }] };
    expect(lignesQualifications({ qualifications: [AUTRE] }, AUJ, plomberie)).toEqual([]);
    expect(lignesQualifications({ qualifications: [AUTRE] }, AUJ, menage)).toEqual([]);
    expect(raisonNonImprimee(AUTRE, AUJ)).toMatch(/mots cherchés/);
    const autreMenage = { ...AUTRE, motsCles: 'ménage' };
    expect(lignesQualifications({ qualifications: [autreMenage] }, AUJ, plomberie)).toEqual([]);
    expect(lignesQualifications({ qualifications: [autreMenage] }, AUJ, menage)).toHaveLength(1);
    // sans document connu, « seulement si » n'imprime rien
    expect(lignesQualifications({ qualifications: [autreMenage] }, AUJ)).toEqual([]);
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

// Services à la personne : jamais imprimée, pour l'instant (avis juriste-btp du lot 4, 5 nov. 2026, point 9 ; décision de
// la session locale). Elle remplace le défaut « Seulement si une ligne contient… » à mots vides (D-41, premier jet) : imprimer
// la déclaration, c'est présenter la facture comme une facture de services à la personne, et C. trav. D7233-1 exige alors
// d'autres mentions (prix TTC, temps passé, identifiant de l'intervenant), puis D7233-4 une attestation fiscale annuelle,
// que l'app ne produit pas. Le texte de la ligne reste celui de l'avis du 4 nov. (D7233-1, 2°), prêt pour le jour où l'app
// saura produire le reste.
describe('services à la personne : jamais imprimée, quel que soit le choix enregistré (avis du lot 4, point 9)', () => {
  const RAISON = 'Cette déclaration ne s’imprime pas : une facture de services à la personne demande d’autres mentions (prix TTC, temps passé, intervenant) et une attestation fiscale chaque année, que Mallettico ne fait pas encore.';
  const PHRASE = 'Services à la personne : déclaration enregistrée sous le n° SAP123456789 le 01/03/2019';
  const sap = (champs = {}) => ({ id: 's1', type: 'sap', numero: 'SAP123456789', fin: '2019-03-01', ...champs });
  const menage = { lignes: [{ description: 'Ménage à domicile, 2 h' }] };
  const jardinage = { sections: [{ lignes: [{ designation: 'Tonte de la pelouse' }] }] };
  const plomberie = { lignes: [{ description: 'Remplacement d’un mitigeur' }] };
  const electricite = { lignes: [{ description: 'Pose d’une prise 16 A et d’un interrupteur' }] };
  const DOCUMENTS = [menage, jardinage, plomberie, electricite, null];
  // Tous les états que peut porter une fiche : ajoutée à la main, ancienne, importée, ou posée avant ce changement
  const CHOIX = [
    {}, { ou: 'tous' }, { ou: 'non' }, { ou: 'si', motsCles: '' }, { ou: 'si', motsCles: 'ménage, tonte, pose, mitigeur' },
    { imprimer: true }, { imprimer: false }, { imprimer: true, ou: 'tous', motsCles: 'ménage' }, { motsCles: 'ménage' },
  ];

  it('ajoutée depuis Paramètres : figée sur « ne pas l’imprimer » ; les autres types restent sur tous les documents', () => {
    expect(nouvelleQualification('sap', 's1')).toEqual({ id: 's1', type: 'sap', intitule: '', organisme: '', numero: '', fin: '', imprimer: false, ou: 'non', motsCles: '' });
    expect(ouFige('sap')).toBe('non');
    for (const t of TYPES_QUALIFICATION.filter((x) => x.id !== 'sap')) {
      expect(ouFige(t.id), t.id).toBeNull();
      expect(nouvelleQualification(t.id, 'x'), t.id).toMatchObject({ imprimer: true, ou: 'tous' });
    }
    expect(nouvelleQualification('inconnu', 'x').type).toBe('autre');
  });

  it('aucun choix enregistré ne l’imprime, sur aucun document, numéro et date renseignés', () => {
    for (const choix of CHOIX) {
      for (const doc of DOCUMENTS) {
        expect(lignesQualifications({ qualifications: [sap(choix)] }, AUJ, doc), JSON.stringify(choix)).toEqual([]);
      }
    }
  });

  it('la lecture force « ne pas l’imprimer » : une fiche qui aurait déjà un autre choix enregistré ne l’imprime pas non plus', () => {
    for (const choix of CHOIX) {
      expect(qualificationsDe({ qualifications: [sap(choix)] })[0], JSON.stringify(choix)).toMatchObject({ type: 'sap', ou: 'non', imprimer: false });
    }
  });

  it('l’écran dit pourquoi, avec le texte exact, quel que soit le choix, avec ou sans numéro et date', () => {
    for (const choix of CHOIX) {
      expect(raisonNonImprimee(sap(choix), AUJ), JSON.stringify(choix)).toBe(RAISON);
      expect(raisonNonImprimee({ type: 'sap', ...choix }, AUJ), JSON.stringify(choix)).toBe(RAISON);
    }
  });

  it('les deux générateurs n’impriment ni la mention ni le numéro, même « sur tous mes documents » ou avec un mot présent', () => {
    const devis = (description) => ({ type: 'devis', numero: 'DEV-1', date: AUJ, lignes: [{ description, quantite: 2, unite: 'h', prixUnitaire: 30, tva: 10 }], total_ht: 60, tva: 6, total_ttc: 66 });
    for (const choix of [{ ou: 'tous' }, { ou: 'si', motsCles: 'ménage' }, { imprimer: true }]) {
      const doc = devis('Ménage à domicile');
      const e = { nom: 'Multi', siret: '12345678900011', qualifications: [sap(choix)] };
      for (const html of [buildDevisHtml({ doc, client: { nom: 'X' }, entreprise: e }), buildDocumentHTML(doc, { nom: 'X' }, null, e)]) {
        expect(html, JSON.stringify(choix)).not.toContain('Services à la personne');
        expect(html, JSON.stringify(choix)).not.toContain('SAP123456789');
      }
    }
  });

  it('la ligne reste écrite mot pour mot (C. trav. D7233-1, 2°), prête pour le jour où l’app produira les autres mentions', () => {
    expect(ligneImprimee(sap())).toBe(PHRASE);
  });

  it('pas d’alerte d’échéance : la date de la déclaration n’est pas une échéance', () => {
    expect(echeancesQualifications({ qualifications: [sap({ fin: '2026-11-20' })] }, AUJ)).toEqual([]);
  });

  it('contre-essai : la règle ne vaut que pour ce type : « tous mes documents » imprime une IRVE, un document sans rapport compris', () => {
    expect(lignesQualifications({ qualifications: [{ ...IRVE, ou: 'tous' }] }, AUJ, plomberie)).toEqual([LIGNE_IRVE]);
    expect(lignesQualifications({ qualifications: [{ ...IRVE, ou: 'tous' }, sap({ ou: 'tous' })] }, AUJ, plomberie)).toEqual([LIGNE_IRVE]);
  });
});
