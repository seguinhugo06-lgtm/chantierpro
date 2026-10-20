import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPages from '../../LegalPages';

// Un plan qui porterait un libellé `included: false` (une ligne « non comprise » des comparatifs) : les CGV ne le
// montrent pas comme compris. Le reste de PLANS est le vrai.
vi.mock('../../../stores/subscriptionStore', async (importOriginal) => {
  const reel = await importOriginal();
  const gratuit = {
    ...reel.PLANS.gratuit,
    featureLabels: [...reel.PLANS.gratuit.featureLabels, { name: 'Fonction témoin non comprise', included: false }],
  };
  return { ...reel, PLANS: { ...reel.PLANS, gratuit } };
});

describe('CGV, article 4 : seulement ce que chaque plan comprend', () => {
  it('un libellé `included: false` n\'apparaît pas', () => {
    const html = renderToStaticMarkup(<LegalPages page="cgv" couleur="#12336F" setPage={() => {}} />);
    expect(html).toContain('5 devis par mois');
    expect(html).not.toContain('Fonction témoin non comprise');
  });
});
