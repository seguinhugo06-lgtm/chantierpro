import { describe, it, expect } from 'vitest';
import { statutPrevision, normaliserPrevision, estPrevisionMiroir } from '../previsions';

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
