import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { remettreFichier, estNatif, estMobileWeb } from '../natif';

// Faux document : on relève les liens de téléchargement cliqués.
function fauxDocument() {
  const clics = [];
  return {
    clics,
    body: { appendChild: () => {} },
    createElement: () => {
      const a = { click() { clics.push({ href: a.href, download: a.download }); }, remove() {} };
      return a;
    },
  };
}

describe('remettreFichier', () => {
  let doc;
  beforeEach(() => {
    doc = fauxDocument();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
  });
  afterEach(() => vi.unstubAllGlobals());

  const ordinateur = () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)', canShare: () => true, share: vi.fn() });
  };
  const telephone = (share) => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone)', canShare: () => true, share });
  };

  it('sur ordinateur : téléchargement, même si le navigateur sait partager', async () => {
    ordinateur();
    expect(estNatif()).toBe(false);
    expect(await remettreFichier('a;b', 'export.csv', 'text/csv')).toBe('telecharge');
    expect(doc.clics).toEqual([{ href: 'blob:x', download: 'export.csv' }]);
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('sur téléphone : feuille de partage avec le fichier', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    telephone(share);
    expect(estMobileWeb()).toBe(true);
    expect(await remettreFichier(new Blob(['%PDF']), 'Devis_DEV-1.pdf', 'application/pdf', { titre: 'Devis DEV-1' })).toBe('partage');
    const [{ files, title }] = share.mock.calls[0];
    expect(files[0].name).toBe('Devis_DEV-1.pdf');
    expect(title).toBe('Devis DEV-1');
    expect(doc.clics).toHaveLength(0);
  });

  it('partage annulé par l’utilisateur : rien d’autre ne se passe', async () => {
    telephone(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })));
    expect(await remettreFichier('x', 'a.csv')).toBe('annule');
    expect(doc.clics).toHaveLength(0);
  });

  it('partage refusé (geste expiré) : repli sur le téléchargement', async () => {
    telephone(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })));
    expect(await remettreFichier('x', 'a.csv')).toBe('telecharge');
    expect(doc.clics).toHaveLength(1);
  });
});
