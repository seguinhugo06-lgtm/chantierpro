import { describe, it, expect } from 'vitest';
import { MODELES_DEVIS, prepareModeleLignes } from '../data/modeles';
import { sansTva } from '../franchiseTva';

// Climatisation (PAC air/air, gainable) : la fourniture du système est exclue du taux de 10 % (CGI 279-0 bis, 1 ;
// juriste-btp, 4 nov. 2026) ; la pose reste au taux de l'entreprise. Relecture du 4 nov. : les modèles « chauffage »
// sortaient tout au taux de l'entreprise (10 % par défaut), fourniture comprise. Choix d'Hugo du 5 nov. 2026 (D-41) : fourniture à 20 %, pose à 10 %.

const estClim = (m) => /climatisation|air\/air/i.test(m.nom);
const modelesClim = () => Object.entries(MODELES_DEVIS).flatMap(([metier, f]) => (f.modeles || []).filter(estClim).map((m) => ({ metier, m })));

describe('modèles de devis : climatisation', () => {
  it('les modèles de climatisation existent (balayage non vide)', () => {
    expect(modelesClim().map(({ m }) => m.id)).toEqual(expect.arrayContaining(['pac-mono', 'pac-multi-2-3', 'pac-multi-4-5', 'gainable']));
  });

  it('aucune ligne « F&P » : fourniture et pose sont séparées', () => {
    for (const { m } of modelesClim()) for (const l of m.lignes) expect(l.description, m.id).not.toMatch(/^F&P/);
  });

  it('fourniture à 20 %, pose et le reste au taux de l’entreprise (10 % par défaut)', () => {
    for (const { m } of modelesClim()) {
      const lignes = prepareModeleLignes(m, 10);
      const fourn = lignes.filter((l) => /^Fourniture/.test(l.description));
      expect(fourn.length, m.id).toBeGreaterThan(0);
      for (const l of lignes) expect([l.description, l.tva]).toEqual([l.description, /^Fourniture/.test(l.description) ? 20 : 10]);
    }
  });

  it('entreprise en franchise : tout repasse à 0 %', () => {
    for (const { m } of modelesClim()) expect(sansTva(prepareModeleLignes(m, 0)).every((l) => l.tva === 0)).toBe(true);
  });

  it('contre-essai : un modèle sans taux par ligne garde le taux de l’entreprise', () => {
    const m = { lignes: [{ description: 'Pose', quantite: 1, unite: 'u', prixUnitaire: 10 }] };
    expect(prepareModeleLignes(m, 5.5)[0].tva).toBe(5.5);
    expect(prepareModeleLignes({ ...m, tva: 20 }, 10)[0].tva).toBe(20);
  });
});
