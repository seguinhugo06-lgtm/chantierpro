import { describe, it, expect } from 'vitest';
import { rappelsAEnvoyer, emailRappelRamonage, decalerJour, jourParis } from '../../../supabase/functions/send-scheduled-relances/ramonage.ts';
import { rappelsDus } from '../ramonage';

// Données fictives seulement
const clients = [
  { id: 'c1', prenom: 'Lucie', nom: 'Exemple', email: 'lucie@exemple.fr' },
  { id: 'c2', prenom: 'Paul', nom: 'Exemple', email: '' },
  { id: 'c3', prenom: 'Rose', nom: 'Exemple', email: 'rose@exemple.fr', rappels_refuses_le: '2026-05-01T00:00:00Z' },
];
const r = (o) => ({ id: o.id, client_id: o.client || 'c1', appareil_ref: o.ref, realise_le: o.le, prochain_avant: o.prochain,
  appareil_type: 'poele_bois', localisation: 'Salon', annulee_le: o.annulee || null, rappel_fait_le: o.fait || null, jeton_rappel: `j-${o.id}` });
const ramonages = [
  r({ id: 'a-ancien', ref: 'a', le: '2025-10-20T10:00:00Z', prochain: '2026-10-20' }),
  r({ id: 'a-recent', ref: 'a', le: '2025-11-10T10:00:00Z', prochain: '2026-11-10' }),
  r({ id: 'b', ref: 'b', le: '2025-11-15T10:00:00Z', prochain: '2026-11-15', fait: '2026-10-16T08:00:00Z' }),
  r({ id: 'c', ref: 'c', client: 'c2', le: '2025-11-12T10:00:00Z', prochain: '2026-11-12' }),
  r({ id: 'd', ref: 'd', client: 'c3', le: '2025-11-12T10:00:00Z', prochain: '2026-11-12' }),
  r({ id: 'e', ref: 'e', le: '2025-11-30T10:00:00Z', prochain: '2026-11-30' }),
  r({ id: 'f', ref: 'f', le: '2025-10-01T10:00:00Z', prochain: '2026-10-01' }),
  r({ id: 'g', ref: 'g', le: '2026-10-20T10:00:00Z', prochain: '2027-10-20', annulee: '2026-10-20T11:00:00Z' }),
];

describe('rappels automatiques de ramonage (cron) : règles', () => {
  it('le dernier passage de chaque appareil, une fois par échéance, avec e-mail, sans refus, jusqu’à la date', () => {
    const dus = rappelsAEnvoyer(ramonages, clients, { jours: 30, aujourdhui: '2026-10-25' });
    // a-ancien : remplacé par a-recent ; b : déjà fait ; c : pas d'e-mail ; d : refus ; e : trop tôt ; f : échéance passée ; g : annulé
    expect(dus.map((d) => d.ramonage.id)).toEqual(['a-recent']);
  });

  it('une adresse invalide est écartée (elle échouerait chaque nuit) ; le délai est borné à 1-120 jours', () => {
    const invalide = [{ ...clients[0], email: 'pas-une-adresse@' }];
    expect(rappelsAEnvoyer(ramonages, invalide, { jours: 30, aujourdhui: '2026-10-25' })).toEqual([]);
    // 100 000 jours demandés → 120 : a-recent (10/11) entre le 13/07, f (01/10) dès le 03/06
    expect(rappelsAEnvoyer(ramonages, clients, { jours: 100000, aujourdhui: '2026-07-14' }).map((d) => d.ramonage.id)).toEqual(['f', 'a-recent']);
    expect(rappelsAEnvoyer(ramonages, clients, { jours: 100000, aujourdhui: '2026-07-12' }).map((d) => d.ramonage.id)).toEqual(['f']);
  });

  it('même règle que l’app pour les clients joignables par e-mail (avant la date)', () => {
    const app = rappelsDus(ramonages, clients, { jours: 30, aujourdhui: '2026-10-25' })
      .filter((d) => d.client.email && !d.enRetard).map((d) => d.ramonage.id);
    expect(rappelsAEnvoyer(ramonages, clients, { jours: 30, aujourdhui: '2026-10-25' }).map((d) => d.ramonage.id)).toEqual(app);
  });

  it('dates : décalage sans effet d’heure d’été, jour de Paris', () => {
    expect(decalerJour('2026-11-10', -30)).toBe('2026-10-11');
    expect(decalerJour('2027-03-31', -30)).toBe('2027-03-01');
    expect(jourParis(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
  });
});

describe('rappels automatiques de ramonage (cron) : e-mail', () => {
  const { objet, html, texte } = emailRappelRamonage({
    entreprise: { nom: 'Ramonage Exemple — Jean Exemple EI', adresse: '1 rue de l’Exemple, 24000 Imaginaire', telephone: '05 00 00 00 00', email: 'contact@exemple.fr' },
    client: clients[0],
    ramonage: ramonages[1],
    lien: 'https://mallettico.fr/rappel-ramonage/j-a-recent',
  });

  it('objet : l’échéance et l’artisan ; jamais « obligatoire » ni « avis »', () => {
    expect(objet).toBe('Ramonage à prévoir avant le 10/11/2026 — Ramonage Exemple — Jean Exemple EI');
    expect(`${objet} ${texte}`).not.toMatch(/obligatoire|avis/i);
  });

  it('pied : pourquoi ce rappel, lien de désinscription sans compte, ou STOP', () => {
    expect(texte).toContain('Vous recevez ce rappel parce que Ramonage Exemple — Jean Exemple EI (1 rue de l’Exemple, 24000 Imaginaire, 05 00 00 00 00) a ramoné votre conduit le 10/11/2025.');
    expect(texte).toContain('Le ramonage de votre poêle à bois, Salon est à prévoir avant le 10/11/2026.');
    expect(texte).toContain('Pour ne plus recevoir de rappel : https://mallettico.fr/rappel-ramonage/j-a-recent — ou répondez STOP à cet e-mail.');
    expect(html).toContain('href="https://mallettico.fr/rappel-ramonage/j-a-recent"');
  });

  it('échappe les textes saisis', () => {
    const { html: h } = emailRappelRamonage({ entreprise: { nom: '<b>X</b>' }, client: { id: 'x', prenom: '<script>' }, ramonage: { ...ramonages[1], localisation: '"><img>' }, lien: 'https://x' });
    expect(h).not.toContain('<script>');
    expect(h).not.toContain('<b>X</b>');
    expect(h).toContain('&lt;script&gt;');
  });
});
