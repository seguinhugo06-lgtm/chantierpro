import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TabBar from '../TabBar';

// Relecture du 26 oct. 2026 : la pastille de l'onglet « Validation » d'Équipe (pointages à valider) était rouge ; le
// rouge dit « en retard » ou « erreur », l'ambre « à surveiller ».
describe('TabBar : le ton de la pastille', () => {
  const pastille = (tab) => {
    const html = renderToStaticMarkup(<TabBar tabs={[tab]} activeTab="autre" onTabChange={() => {}} />);
    return (html.match(/<span class="[^"]*rounded-full[^"]*">3<\/span>/) || [''])[0];
  };
  it('« à valider » (ton alerte) : ambre', () => {
    const p = pastille({ key: 'validation', label: 'Validation', badge: 3, ton: 'alerte' });
    expect(p).toContain('bg-alerte-fond');
    expect(p).not.toContain('bg-danger-fond');
  });
  it('en retard (alert) : rouge ; sans ton : neutre', () => {
    expect(pastille({ key: 'a', label: 'A', badge: 3, alert: true })).toContain('bg-danger-fond');
    expect(pastille({ key: 'b', label: 'B', badge: 3 })).toContain('bg-surface-2');
  });
  it('Équipe pose le ton alerte sur « Validation »', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(new URL('../../Equipe.jsx', import.meta.url), 'utf8');
    expect(source).toMatch(/key: 'validation', label: 'Validation'[^}]*ton: 'alerte'/);
  });
});
