import { describe, it, expect } from 'vitest';
import { canViewPrices, canPerformAction, canEditData, canAccessPage, hasFullAccess, getPagePermission, getAccessiblePages } from '../permissions';

describe('les prix selon le rôle : une seule règle (canViewPrices)', () => {
  it('chef de chantier et ouvrier ne voient aucun prix', () => {
    expect(canViewPrices('chef_chantier')).toBe(false);
    expect(canViewPrices('ouvrier')).toBe(false);
  });

  it('un rôle inconnu ou pas encore lu ne voit aucun prix', () => {
    expect(canViewPrices(null)).toBe(false);
    expect(canViewPrices(undefined)).toBe(false);
    expect(canViewPrices('stagiaire')).toBe(false);
  });

  it('un rôle pas encore lu ne modifie rien', () => {
    expect(canEditData(null)).toBe(false);
    expect(canEditData(undefined)).toBe(false);
    expect(canEditData('readonly')).toBe(false);
    expect(canEditData('owner')).toBe(true);
  });

  it('le gérant, l’administrateur, le comptable et la lecture seule les voient', () => {
    for (const role of ['owner', 'admin', 'comptable', 'readonly']) expect(canViewPrices(role)).toBe(true);
  });
});

describe('les droits sur les tâches, les dépenses et les pointages (canPerform)', () => {
  it('une tâche (memo) : créer, modifier, supprimer pour le gérant, l’administrateur et le chef de chantier seulement', () => {
    for (const action of ['create', 'edit', 'delete']) {
      for (const role of ['owner', 'admin', 'chef_chantier']) expect(canPerformAction(role, 'memo', action), `${role} ${action}`).toBe(true);
      for (const role of ['ouvrier', 'readonly', 'comptable']) expect(canPerformAction(role, 'memo', action), `${role} ${action}`).toBe(false);
    }
  });

  it('une dépense : le chef de chantier peut en saisir et corriger, pas supprimer', () => {
    expect(canPerformAction('chef_chantier', 'depense', 'create')).toBe(true);
    expect(canPerformAction('chef_chantier', 'depense', 'edit')).toBe(true);
    expect(canPerformAction('chef_chantier', 'depense', 'delete')).toBe(false);
    expect(canPerformAction('readonly', 'depense', 'edit')).toBe(false);
  });

  it('un pointage : l’ouvrier en saisit, mais ne le modifie ni ne le supprime ; le chef modifie, pas supprime', () => {
    expect(canPerformAction('ouvrier', 'pointage', 'create')).toBe(true);
    expect(canPerformAction('ouvrier', 'pointage', 'edit')).toBe(false);
    expect(canPerformAction('ouvrier', 'pointage', 'delete')).toBe(false);
    expect(canPerformAction('chef_chantier', 'pointage', 'edit')).toBe(true);
    expect(canPerformAction('chef_chantier', 'pointage', 'delete')).toBe(false);
  });
});

// Décision d'Hugo du 5 nov. 2026 (D-37) : la dictée (page « ia-devis ») est réservée au propriétaire et à
// l'administrateur. Le comptable ne pourrait pas retirer son accord (Paramètres lui est fermé).
describe('la dictée (page « ia-devis ») : propriétaire et administrateur seulement', () => {
  it('le propriétaire et l’administrateur y accèdent pleinement', () => {
    for (const role of ['owner', 'admin']) {
      expect(canAccessPage(role, 'ia-devis'), role).toBe(true);
      expect(hasFullAccess(role, 'ia-devis'), role).toBe(true);
    }
  });

  it('le comptable, le chef de chantier, l’ouvrier, la lecture seule et un rôle inconnu n’y accèdent pas', () => {
    for (const role of ['comptable', 'chef_chantier', 'ouvrier', 'readonly', 'inconnu', null, undefined]) {
      expect(canAccessPage(role, 'ia-devis'), String(role)).toBe(false);
    }
    expect(getAccessiblePages('comptable')).not.toContain('ia-devis');
    expect(getAccessiblePages('admin')).toContain('ia-devis');
  });

  it('le comptable garde tous ses autres droits sur les devis, les factures et les clients', () => {
    expect(getPagePermission('comptable', 'devis')).toBe('full');
    expect(getPagePermission('comptable', 'clients')).toBe('full');
    expect(getPagePermission('comptable', 'finances')).toBe('full');
    for (const action of ['create', 'edit', 'send', 'view']) expect(canPerformAction('comptable', 'devis', action), action).toBe(true);
    expect(canPerformAction('comptable', 'devis', 'delete')).toBe(false);
    expect(canViewPrices('comptable')).toBe(true);
  });
});
