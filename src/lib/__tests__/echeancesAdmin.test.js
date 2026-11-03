import { describe, it, expect } from 'vitest';
import {
  profilAdmin, questionsManquantes, echeancesPour, prochainesEcheances, joursAvant, couvertureBientotFinie,
  COUVERTURE_DEBUT, COUVERTURE_FIN, dateEcheanceLue, libelleQuestion,
} from '../echeancesAdmin';

const ids = (liste) => liste.map((x) => x.id);
const AUJOURDHUI = new Date(2026, 10, 3); // 3 nov. 2026, heure locale

describe('échéances administratives : profil', () => {
  it('micro-entreprise : franchise de TVA, rythme Urssaf demandé, salariés demandés', () => {
    const p = profilAdmin({ formeJuridique: 'Micro-entreprise' });
    expect(p).toMatchObject({ micro: true, tva: 'franchise', periodiciteUrssaf: null, impot: 'ir' });
    expect(questionsManquantes(p)).toEqual(['periodiciteUrssaf', 'salaries']);
  });
  it('société : TVA, impôt et salariés demandés ; réponse « je ne sais pas » gardée, plus redemandée', () => {
    const p = profilAdmin({ formeJuridique: 'SARL' }, { tva: 'inconnu' });
    expect(p.tva).toBe('inconnu');
    expect(questionsManquantes(p)).toEqual(['impot', 'salaries']);
  });
  it('réponse invalide ignorée ; forme juridique inconnue : aucune question, seulement les échéances communes', () => {
    expect(profilAdmin({ formeJuridique: 'EI' }, { tva: 'hebdo' }).tva).toBeNull();
    const p = profilAdmin({});
    expect(questionsManquantes(p)).toEqual([]);
    const l = echeancesPour(p, {});
    expect(l.every((x) => x.id.startsWith('cfe-') || x.id.startsWith('efacture-'))).toBe(true);
  });
});

describe('échéances administratives : calcul selon le profil', () => {
  it('micro trimestriel : 4 déclarations de CA aux fins de trimestre, pas de TVA, pas de DSN', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'Micro-entreprise' }, { periodiciteUrssaf: 'trimestrielle', salaries: 'non' }));
    const ca = l.filter((x) => x.id.startsWith('ca-micro-'));
    expect(ca.map((x) => x.date)).toEqual(['2027-01-31', '2027-04-30', '2027-07-31', '2027-10-31']);
    expect(ca.every((x) => x.certitude === 'officielle')).toBe(true);
    // 31 janvier 2027 = dimanche : l'artisan est prévenu
    expect(ca[0].detail).toMatch(/week-end/);
    expect(ca[1].detail).not.toMatch(/week-end/);
    expect(l.some((x) => x.id.startsWith('ca3-') || x.id.startsWith('ca12-'))).toBe(false);
    expect(l.some((x) => x.id.startsWith('dsn-'))).toBe(false);
    expect(ids(l)).toContain('ir-2027');
    expect(ids(l)).not.toContain('liasse-2031-2027');
    // Changement de rythme : avec la dernière déclaration de 2026, due le 31 janv. 2027 (CSS art. R613-7, juriste du 3 nov.)
    const rythme = l.find((x) => x.id === 'micro-periodicite-2027');
    expect(rythme).toMatchObject({ date: '2027-01-31', certitude: 'officielle' });
    expect(rythme.detail).toMatch(/R613-7/);
    // Note de week-end : sa source (service-public) est citée à côté de celle des dates (Légifrance)
    expect(ca[0].source.note.url).toBe('https://entreprendre.service-public.gouv.fr/actualites/A19087');
    expect(ca[1].source.note).toBeUndefined();
  });

  it('micro mensuel : 14 déclarations, chacune le dernier jour du mois pour le mois précédent', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'Micro-entreprise' }, { periodiciteUrssaf: 'mensuelle' }));
    const ca = l.filter((x) => x.id.startsWith('ca-micro-'));
    expect(ca).toHaveLength(14);
    expect(ca[0]).toMatchObject({ date: '2026-11-30', titre: 'Déclaration du chiffre d’affaires d’octobre 2026' });
    expect(ca.find((x) => x.date === '2027-02-28').titre).toMatch(/de janvier 2027$/);
    expect(ca.find((x) => x.date === '2027-09-30').titre).toMatch(/d’août 2027$/);
    expect(ca[13].date).toBe('2027-12-31');
  });

  it('micro sans rythme connu : dates trimestrielles marquées « selon votre situation »', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'Micro-entreprise' }));
    const ca = l.filter((x) => x.id.startsWith('ca-micro-'));
    expect(ca).toHaveLength(4);
    expect(ca.every((x) => x.certitude === 'selon_option')).toBe(true);
  });

  it('EI au réel avec TVA mensuelle : CA3 chaque mois au plus tôt le 15, liasse 2031, déclaration de revenus', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'EI' }, { tva: 'ca3_mensuelle', salaries: 'non' }));
    const ca3 = l.filter((x) => x.id.startsWith('ca3-'));
    expect(ca3).toHaveLength(14);
    expect(ca3.every((x) => x.date.endsWith('-15'))).toBe(true);
    expect(ca3[0].titre).toBe('Déclaration de TVA (CA3) d’octobre 2026');
    expect(ids(l)).toEqual(expect.arrayContaining(['liasse-2031-2027', 'ir-2027']));
    expect(l.some((x) => x.id.startsWith('is-'))).toBe(false);
    expect(l.some((x) => x.id.startsWith('ca-micro-'))).toBe(false);
  });

  it('EI au régime simplifié : acompte de décembre 2026, dernière CA12, puis CA3 trimestrielles en 2027 ; aucun acompte CA12 en 2027', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'EI' }, { tva: 'ca12' }));
    expect(ids(l)).toEqual(expect.arrayContaining(['ca12-acompte-2026-12', 'ca12-2026']));
    expect(l.filter((x) => x.id.startsWith('ca12-') && x.date >= '2027-06-01')).toHaveLength(0);
    expect(l.filter((x) => x.id.startsWith('ca3-')).map((x) => x.date)).toEqual(['2027-04-15', '2027-07-15', '2027-10-15']);
  });

  it('société avec salariés (IS) : DSN le 15 chaque mois, acomptes et solde d’IS, liasse 2065', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'SAS' }, { tva: 'ca3_trimestrielle', salaries: 'oui', impot: 'is' }));
    const dsn = l.filter((x) => x.id.startsWith('dsn-'));
    expect(dsn).toHaveLength(14);
    expect(dsn[0]).toMatchObject({ date: '2026-11-15', titre: 'DSN d’octobre 2026' });
    expect(l.filter((x) => x.id.startsWith('is-acompte-')).map((x) => x.date))
      .toEqual(['2026-12-15', '2027-03-15', '2027-06-15', '2027-09-15', '2027-12-15']);
    expect(ids(l)).toEqual(expect.arrayContaining(['is-solde-2027', 'liasse-2065-2027']));
    expect(l.filter((x) => x.id.startsWith('ca3-')).every((x) => x.certitude === 'officielle')).toBe(true);
    expect(ids(l)).not.toContain('ir-2027');
  });

  it('assurances : les dates des Paramètres deviennent des échéances, même hors couverture', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'SARL' }), { decennaleValidite: '2026-12-31', rcProValidite: '2028-03-01' });
    expect(l.find((x) => x.id === 'assurance-decennale').date).toBe('2026-12-31');
    expect(l.find((x) => x.id === 'assurance-rcpro').date).toBe('2028-03-01');
    expect(ids(echeancesPour(profilAdmin({ formeJuridique: 'SARL' }), { decennaleValidite: '' }))).not.toContain('assurance-decennale');
  });

  it('aucune date officielle hors de la couverture (sauf la réception de la facture électronique, déjà en vigueur)', () => {
    const profils = [
      profilAdmin({ formeJuridique: 'Micro-entreprise' }, { periodiciteUrssaf: 'mensuelle', salaries: 'oui' }),
      profilAdmin({ formeJuridique: 'SAS' }, { tva: 'ca3_mensuelle', salaries: 'oui', impot: 'is' }),
    ];
    for (const p of profils) {
      for (const x of echeancesPour(p).filter((y) => y.date && y.type !== 'assurance' && y.id !== 'efacture-reception')) {
        expect(x.date >= COUVERTURE_DEBUT && x.date <= COUVERTURE_FIN, x.id).toBe(true);
      }
    }
  });

  it('chaque échéance a une source avec une adresse officielle (sauf les Paramètres)', () => {
    const l = echeancesPour(profilAdmin({ formeJuridique: 'SAS' }, { tva: 'ca12', salaries: 'oui' }), { decennaleValidite: '2027-01-01' });
    for (const x of l) {
      if (x.type === 'assurance') continue;
      expect(x.source?.url, x.id).toMatch(/^https:\/\/(www\.)?(impots\.gouv\.fr|legifrance\.gouv\.fr|net-entreprises\.fr|entreprendre\.service-public\.gouv\.fr)\//);
      expect(x.source.consulte).toBe('2026-11-03');
    }
  });
});

describe('corrections du 3 nov. 2026', () => {
  it('régime de TVA explicite de la Trésorerie : franchise ou mensuel, plus redemandé ; « trimestriel » (défaut) ne compte pas', () => {
    const franchise = profilAdmin({ formeJuridique: 'EI' }, {}, 'franchise');
    expect(franchise.tva).toBe('franchise');
    expect(questionsManquantes(franchise)).not.toContain('tva');
    expect(echeancesPour(franchise).some((x) => x.id.startsWith('ca3-') || x.id.startsWith('ca12-'))).toBe(false);
    const mensuel = profilAdmin({ formeJuridique: 'SARL' }, { tva: 'ca12' }, 'mensuel');
    expect(mensuel.tva).toBe('ca3_mensuelle');
    expect(echeancesPour(mensuel).filter((x) => x.id.startsWith('ca3-'))).toHaveLength(14);
    const defaut = profilAdmin({ formeJuridique: 'EI' }, {}, 'trimestriel');
    expect(defaut.tva).toBeNull();
    expect(questionsManquantes(defaut)).toContain('tva');
  });
  it('formes juridiques reconnues par les fonctions communes ; SCI non prise en charge', () => {
    expect(profilAdmin({ formeJuridique: 'Entreprise individuelle' })).toMatchObject({ formeConnue: true, individuelle: true });
    expect(profilAdmin({ formeJuridique: 'SCI' })).toMatchObject({ formeConnue: false, nonPriseEnCharge: true });
    expect(profilAdmin({ formeJuridique: 'SASU' })).toMatchObject({ formeConnue: true, societe: true });
  });
  it('question des salariés : libellé du dirigeant assimilé salarié pour une société seulement', () => {
    expect(libelleQuestion('salaries', profilAdmin({ formeJuridique: 'SAS' }))).toMatch(/président de SAS ou SASU/);
    expect(libelleQuestion('salaries', profilAdmin({ formeJuridique: 'EI' }))).toBe('Avez-vous des salariés ?');
  });
  it('déclaration de revenus : encore affichée le 20 mai et le 4 juin 2027 (dateFin), plus le 1er juillet', () => {
    const micro = profilAdmin({ formeJuridique: 'Micro-entreprise' }, { periodiciteUrssaf: 'trimestrielle' });
    const l = echeancesPour(micro);
    expect(ids(prochainesEcheances(l, new Date(2027, 4, 20), 50))).toContain('ir-2027');
    expect(ids(prochainesEcheances(l, new Date(2027, 5, 4), 50))).toContain('ir-2027');
    expect(ids(prochainesEcheances(l, new Date(2027, 6, 1), 50))).not.toContain('ir-2027');
  });
  it('solde d’IS : daté du 15 mai 2027, report au mardi 18 mai cité (CGI ann. IV art. 199-0)', () => {
    const is = echeancesPour(profilAdmin({ formeJuridique: 'SAS' }, { impot: 'is' })).find((x) => x.id === 'is-solde-2027');
    expect(is.date).toBe('2027-05-15');
    expect(is.detail).toMatch(/mardi 18 mai/);
    expect(is.source.note.url).toMatch(/LEGIARTI000006301997/);
  });
  it('CFE 2027 : date fixe du 15 décembre, plus « à confirmer »', () => {
    const cfe = echeancesPour(profilAdmin({})).find((x) => x.id === 'cfe-paiement-2027');
    expect(cfe.certitude).toBe('officielle');
  });
});

describe('prochaines échéances', () => {
  const micro = profilAdmin({ formeJuridique: 'Micro-entreprise' }, { periodiciteUrssaf: 'trimestrielle', salaries: 'non' });
  it('le 3 nov. 2026 : la CFE d’abord, jamais une date passée', () => {
    const p = prochainesEcheances(echeancesPour(micro), AUJOURDHUI, 3);
    expect(p.map((x) => x.id)).toEqual(['cfe-prelevement-2026', 'cfe-paiement-2026', 'cfe-mensualisation-2027']);
    expect(p[0].joursRestants).toBe(27);
    expect(p.every((x) => x.joursRestants >= 0)).toBe(true);
  });
  it('une décennale expirée remonte en tête (à régulariser)', () => {
    const p = prochainesEcheances(echeancesPour(micro, { decennaleValidite: '2026-10-01' }), AUJOURDHUI, 3);
    expect(p[0]).toMatchObject({ id: 'assurance-decennale', joursRestants: -33 });
  });
  it('échéance sans date précise : classée par sa date de tri, sans compte à rebours', () => {
    const p = prochainesEcheances(echeancesPour(micro), new Date(2027, 4, 1), 5);
    const ir = p.find((x) => x.id === 'ir-2027');
    expect(ir.joursRestants).toBeNull();
    expect(dateEcheanceLue(ir)).toBe('mai-juin 2027');
  });
  it('fin du calendrier signalée deux mois avant', () => {
    expect(couvertureBientotFinie(AUJOURDHUI)).toBe(false);
    expect(couvertureBientotFinie(new Date(2027, 10, 15))).toBe(true);
    expect(prochainesEcheances(echeancesPour(micro), new Date(2028, 0, 2))).toEqual([]);
  });
  it('compte des jours en dates locales', () => {
    expect(joursAvant('2026-11-03', new Date(2026, 10, 3, 23, 30))).toBe(0);
    expect(joursAvant('2026-11-04', new Date(2026, 10, 3, 0, 5))).toBe(1);
  });
});
