import { describe, it, expect } from 'vitest';
import { accuseReception, avisArtisan, dateEtHeure, libelleContrat, quatorzeJoursApres, DECLARATION } from '../../../supabase/functions/notify-signature/retractation.ts';
import { DEMANDE_EXPRESSE } from '../retractation';

// Accusé de réception de la rétractation en ligne (D221-5, dernier alinéa) : contenu de la déclaration, date et
// heure de son envoi ; avis à l'artisan. Règles de la fonction Edge notify-signature (migration 086).
const devis = {
  numero: 'DEV-2026-00012',
  date: '2026-10-08',
  signature_date: '2026-10-09T08:15:00Z',
  retractation_le: '2026-10-12T12:32:00Z',
  retractation_nom: 'Léa Martin',
  retractation_email: 'lea@exemple.fr',
};
const pro = { nom: 'Élec du Sud', adresse: '3 rue des Lilas\n33000 Bordeaux', telephone: '06 00 00 00 00', email: 'contact@elec.fr' };

describe('accusé de réception au client', () => {
  const m = accuseReception(devis, pro);

  it('part à l’adresse donnée par le client, réponse à l’entreprise', () => {
    expect(m.a).toBe('lea@exemple.fr');
    expect(m.repondreA).toBe('contact@elec.fr');
    expect(m.sujet).toBe('Accusé de réception de votre rétractation — devis DEV-2026-00012');
  });

  it('reprend le contenu de la déclaration et sa date et son heure (Paris)', () => {
    expect(dateEtHeure(devis.retractation_le)).toEqual({ date: '12/10/2026', heure: '14 h 32' });
    expect(m.texte).toContain('envoyée en ligne le 12/10/2026 à 14 h 32 (heure de Paris)');
    expect(m.texte).toContain('- Nom et prénom : Léa Martin');
    expect(m.texte).toContain('- Contrat : Devis n° DEV-2026-00012 du 08/10/2026 signé en ligne le 09/10/2026 — Élec du Sud');
    expect(m.texte).toContain('- Adresse électronique pour l\'accusé de réception : lea@exemple.fr');
    expect(m.texte).toContain(`- Déclaration : ${DECLARATION}`);
    expect(m.texte).toContain('remboursées au plus tard quatorze jours après cette date (article L221-24');
    expect(m.html).toContain('Accusé de réception de votre rétractation');
  });

  it('demande expresse : le remboursement se fait déduction faite des travaux réalisés ; dépannage urgent : l\'exception', () => {
    const m2 = accuseReception({ ...devis, execution_anticipee_le: '2026-10-09T08:15:00Z', travaux_urgents: true }, pro);
    expect(m2.texte).toContain('déduction faite, le cas échéant, du montant des travaux réalisés à votre demande avant votre rétractation (article L221-25');
    expect(m2.texte).toContain('sauf pour les pièces et travaux strictement nécessaires au dépannage urgent (article L221-28, 8°');
    expect(m.texte).not.toContain('déduction faite');
    expect(m.texte).not.toContain('dépannage urgent');
  });

  it('le texte du client est échappé dans le HTML', () => {
    const piege = accuseReception({ ...devis, retractation_nom: '<a href="https://hameçon.fr">cliquez</a>' }, pro);
    expect(piege.html).not.toContain('<a href="https://hameçon');
    expect(piege.html).toContain('&lt;a href=');
  });

  it('adresse invalide ou rétractation absente : rien n’est envoyé', () => {
    expect(accuseReception({ ...devis, retractation_email: 'pas une adresse' }, pro)).toBeNull();
    expect(accuseReception({ ...devis, retractation_email: 'a@b.fr, c@d.fr' }, pro)).toBeNull();
    expect(accuseReception({ ...devis, retractation_le: null }, pro)).toBeNull();
  });

  it('libellé du contrat sans dates connues', () => {
    expect(libelleContrat({ numero: 'DEV-1' }, {})).toBe('Devis n° DEV-1');
  });
});

describe('avis à l’artisan', () => {
  it('dit quoi faire : rembourser au plus tard 14 jours après, avoir', () => {
    const a = avisArtisan(devis, 'artisan@elec.fr', 'https://mallettico.fr');
    expect(quatorzeJoursApres(devis.retractation_le)).toBe('26/10/2026');
    expect(a.a).toBe('artisan@elec.fr');
    expect(a.texte).toContain('Léa Martin s\'est rétracté du devis DEV-2026-00012 le 12/10/2026 à 14 h 32');
    expect(a.texte).toContain('Remboursez les sommes reçues au plus tard le 26/10/2026');
    expect(a.texte).not.toContain('L221-25');
  });

  it('demande expresse : seuls les travaux réellement exécutés peuvent être facturés (pas un montant affirmé dû)', () => {
    const a = avisArtisan({ ...devis, execution_anticipee_le: '2026-10-09T08:15:00Z' }, 'artisan@elec.fr', 'https://mallettico.fr');
    expect(a.texte).toContain('seuls les travaux réellement exécutés jusqu\'à sa rétractation peuvent lui être facturés, au prorata du prix total (art. L221-25)');
    expect(a.texte).not.toContain('reste dû');
  });

  it('sans adresse d’artisan valide : rien', () => {
    expect(avisArtisan(devis, null, 'https://mallettico.fr')).toBeNull();
  });

  it('la demande expresse de la page et celle de l’accusé ne se contredisent pas', () => {
    expect(DEMANDE_EXPRESSE).toContain('avant la fin du délai de rétractation');
  });
});
