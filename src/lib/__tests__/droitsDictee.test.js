import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { droitsDictee } from '../droitsDictee';
import { canAccessPage, canPerformAction, canViewPrices } from '../permissions';
import { tauxTvaParDefaut } from '../franchiseTva';

const pour = (role) => droitsDictee({
  canAccess: (page) => canAccessPage(role, page),
  canPerform: (e, a) => canPerformAction(role, e, a),
  canViewPrices: canViewPrices(role),
});

describe('dictée : droits par rôle (comme reserver_usage_ia)', () => {
  it('owner, admin, comptable dictent, voient les montants et peuvent saisir à la main', () => {
    for (const role of ['owner', 'admin', 'comptable']) {
      expect(pour(role), role).toEqual({ peutDicter: true, peutSaisirAMain: true, voitPrix: true });
    }
  });
  it('chef de chantier, ouvrier, lecture seule et rôle inconnu ne dictent pas', () => {
    for (const role of ['chef_chantier', 'ouvrier', 'readonly', null, 'inconnu']) {
      const d = pour(role);
      expect(d.peutDicter, String(role)).toBe(false);
      expect(d.peutSaisirAMain, String(role)).toBe(false);
    }
    expect(pour('chef_chantier').voitPrix).toBe(false);
    expect(pour('ouvrier').voitPrix).toBe(false);
  });
  it('sans permissions fournies : rien n’est permis', () => {
    expect(droitsDictee()).toEqual({ peutDicter: false, peutSaisirAMain: false, voitPrix: false });
  });
});

describe('dictée : taux de TVA par défaut (CGI art. 283, 3 ; franchise art. 293 B)', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/voice/DicteeModal.jsx'), 'utf8');
  it('la fenêtre de dictée prend tauxTvaParDefaut, pas tvaDefaut ?? 10', () => {
    expect(source).toMatch(/const tvaDefaut = tauxTvaParDefaut\(entreprise\)/);
    expect(source).not.toMatch(/entreprise\?\.tvaDefaut \?\? 10/);
  });
  it('micro-entreprise : 0 % ; sinon le taux de l’entreprise', () => {
    expect(tauxTvaParDefaut({ formeJuridique: 'Micro-entreprise', tvaDefaut: 10 })).toBe(0);
    expect(tauxTvaParDefaut({ formeJuridique: 'SARL', tvaDefaut: 20 })).toBe(20);
  });
  it('les montants de la relecture sont derrière voitPrix', () => {
    expect(source).toMatch(/voitPrix = false/);
    // euros( n'apparaît qu'à sa définition et dans prix(), qui rend '' sans le droit
    expect((source.match(/euros\(/g) || []).length).toBe(1);
    expect(source).toMatch(/const prix = \(n\) => \(voitPrix \? euros\(n\) : ''\)/);
  });
});
