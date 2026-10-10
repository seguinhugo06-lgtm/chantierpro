import { describe, it, expect } from 'vitest';
import { fromSupabase, toSupabase, REGLAGES_SANS_COLONNE } from '../entrepriseService';

// Ligne de production telle que relue : assurances anciennes, réglages déjà rangés dans settings_json
const LIGNE = {
  id: 'e1', nom: 'Élec Durand', decennale_assureur: 'AXA Ancien', decennale_numero: 'D-OLD', decennale_validite: '2026-01-01',
  rc_pro_assureur: 'MAAF Ancien', settings_json: { relanceConfig: { enabled: true }, reglages: { mediateur: 'CNPM', acompteDefaut: 40 } },
};

describe('entreprise : ce qui est saisi dans les Paramètres revient au rechargement', () => {
  it('assurances : la nouvelle valeur l\'emporte sur l\'alias relu (avant : l\'ancienne réécrasait la saisie)', () => {
    // Paramètres envoie l'objet complet ({...prev, decennaleAssureur: 'SMABTP'}), alias relus compris
    const envoye = toSupabase({ ...fromSupabase(LIGNE), decennaleAssureur: 'SMABTP', decennaleNumero: 'D-NEW', rcProAssureur: 'AXA Pro' });
    expect(envoye.decennale_assureur).toBe('SMABTP');
    expect(envoye.decennale_numero).toBe('D-NEW');
    expect(envoye.rc_pro_assureur).toBe('AXA Pro');
  });

  it('un formulaire qui n\'envoie que les alias (Multi-entreprise) écrit toujours', () => {
    expect(toSupabase({ assuranceDecennaleCompagnie: 'SMABTP' }).decennale_assureur).toBe('SMABTP');
  });

  it('réglages sans colonne : relus depuis settings_json.reglages, avec leurs valeurs par défaut', () => {
    const e = fromSupabase(LIGNE);
    expect(e.mediateur).toBe('CNPM');
    expect(e.acompteDefaut).toBe(40);
    expect(e.mentionRetractation).toBe(true); // défaut
    expect(e.tauxPenalites).toBe(''); // défaut : le taux légal s'applique
  });

  it('réglages sans colonne : regroupés pour l\'écriture, jamais envoyés comme colonnes', () => {
    const envoye = toSupabase({ ...fromSupabase(LIGNE), rcsNumero: '123 456 789', tauxPenalites: 15, banque: 'Crédit Agricole', mentionGaranties: false });
    expect(envoye.__reglages).toMatchObject({ rcsNumero: '123 456 789', tauxPenalites: 15, banque: 'Crédit Agricole', mentionGaranties: false });
    for (const cle of Object.keys(REGLAGES_SANS_COLONNE)) expect(envoye).not.toHaveProperty(cle);
    expect(envoye).not.toHaveProperty('acompte_defaut'); // colonne inexistante en production
  });

  it('travaux non soumis à la décennale (D-24) : non par défaut, la case cochée est écrite puis relue', () => {
    expect(fromSupabase(LIGNE).decennaleNonSoumis).toBe(false);
    expect(toSupabase({ ...fromSupabase(LIGNE), decennaleNonSoumis: true }).__reglages).toMatchObject({ decennaleNonSoumis: true });
    expect(fromSupabase({ ...LIGNE, settings_json: { reglages: { decennaleNonSoumis: true } } }).decennaleNonSoumis).toBe(true);
  });
});
