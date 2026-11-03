import { describe, it, expect } from 'vitest';
import { statutPrevision, normaliserPrevision, estPrevisionMiroir, seuilAlerteRegle, moisProjetePrevision } from '../previsions';

describe('estPrevisionMiroir', () => {
  it('reconnaît les copies automatiques liées à un document', () => {
    expect(estPrevisionMiroir({ source: 'auto_facture', linkedId: 'f1' })).toBe(true);
    expect(estPrevisionMiroir({ source: 'auto_devis_accepte', linkedId: 'd1' })).toBe(true);
    expect(estPrevisionMiroir({ source: 'auto_depense', linkedId: 'x1' })).toBe(true);
  });

  it('garde les prévisions saisies, même ajoutées en un geste', () => {
    expect(estPrevisionMiroir({ source: null })).toBe(false);
    expect(estPrevisionMiroir({ source: 'btp_charge' })).toBe(false);
    expect(estPrevisionMiroir({ source: 'wizard' })).toBe(false);
    expect(estPrevisionMiroir({ source: 'auto_facture' })).toBe(false);
    expect(estPrevisionMiroir(undefined)).toBe(false);
  });
});

describe('statutPrevision', () => {
  it('garde les deux statuts enregistrés', () => {
    expect(statutPrevision('prevu')).toBe('prevu');
    expect(statutPrevision('paye')).toBe('paye');
  });

  it('ramène les libellés affichés enregistrés par erreur', () => {
    expect(statutPrevision('Payé')).toBe('paye');
    expect(statutPrevision('Prévu')).toBe('prevu');
    expect(statutPrevision('En retard')).toBe('prevu');
  });

  it('considère une prévision sans statut comme prévue', () => {
    expect(statutPrevision(undefined)).toBe('prevu');
    expect(statutPrevision('')).toBe('prevu');
  });
});

describe('normaliserPrevision', () => {
  it('rend la même prévision quand le statut est déjà bon', () => {
    const p = { id: 'a', statut: 'paye' };
    expect(normaliserPrevision(p)).toBe(p);
  });

  it('corrige une prévision abîmée sans toucher au reste', () => {
    expect(normaliserPrevision({ id: 'b', montant: 450, statut: 'En retard' })).toEqual({ id: 'b', montant: 450, statut: 'prevu' });
  });
});

describe('seuilAlerteRegle', () => {
  it('le seuil par défaut (5 000 €), vide ou 0 : aucun seuil', () => {
    expect(seuilAlerteRegle({ seuilAlerte: 5000 })).toBeNull();
    expect(seuilAlerteRegle({ seuilAlerte: 0 })).toBeNull();
    expect(seuilAlerteRegle({})).toBeNull();
    expect(seuilAlerteRegle(null)).toBeNull();
  });

  it('un seuil choisi par l\'artisan est gardé', () => {
    expect(seuilAlerteRegle({ seuilAlerte: 2000 })).toBe(2000);
    expect(seuilAlerteRegle({ seuilAlerte: '8000' })).toBe(8000);
  });
});

describe('moisProjetePrevision', () => {
  const le3nov = new Date(2026, 10, 3, 10);
  it('compte au premier mois projeté une prévision du mois en cours (règlement attendu le 26)', () => {
    expect(moisProjetePrevision({ date: '2026-11-26' }, le3nov)).toEqual({ month: 11, year: 2026 });
  });
  it('compte au premier mois projeté une prévision en retard', () => {
    expect(moisProjetePrevision({ date: '2026-10-24' }, le3nov)).toEqual({ month: 11, year: 2026 });
  });
  it('garde le mois d’une prévision à venir, y compris l’année suivante', () => {
    expect(moisProjetePrevision({ date: '2026-12-13' }, le3nov)).toEqual({ month: 11, year: 2026 });
    expect(moisProjetePrevision({ date: '2027-02-01' }, le3nov)).toEqual({ month: 1, year: 2027 });
  });
  it('le premier mois projeté de décembre est janvier', () => {
    expect(moisProjetePrevision({ date: '2026-12-20' }, new Date(2026, 11, 3))).toEqual({ month: 0, year: 2027 });
  });
  it('sans date lisible : null', () => {
    expect(moisProjetePrevision({}, le3nov)).toBeNull();
    expect(moisProjetePrevision({ date: 'n’importe quoi' }, le3nov)).toBeNull();
  });
});
