import { describe, it, expect } from 'vitest';
import { messageExemplaire, nomFichierExemplaire, pdfAcceptable } from '../../../supabase/functions/notify-signature/exemplaire.ts';

// Exemplaire signé envoyé au client (tâche confirmation-client ; C. conso. L221-9, L221-13). Règles de
// notify-signature (signature par le lien) et de l'envoi par l'artisan (signature sur place).
const devis = { numero: 'DEV-2026-00012', date: '2026-10-08', total_ttc: 1100, signature_date: '2026-10-09T08:15:00Z' };
const pro = { nom: 'Élec du Sud', adresse: '3 rue des Lilas\n33000 Bordeaux', telephone: '06 00 00 00 00', email: 'contact@elec.fr' };
const client = { prenom: 'Léa', nom: 'Martin', email: 'Lea@Exemple.fr' };

describe('e-mail de l’exemplaire signé', () => {
  it('part à l’adresse de la fiche du client, réponse à l’entreprise, avec les faits du contrat', () => {
    const m = messageExemplaire({ devis, pro, client, particulier: false });
    expect(m.a).toBe('lea@exemple.fr');
    expect(m.repondreA).toBe('contact@elec.fr');
    expect(m.sujet).toBe('Votre exemplaire signé — devis DEV-2026-00012 — Élec du Sud');
    expect(m.texte).toMatch(/Vous avez signé en ligne, le 09\/10\/2026 à 10 h 15 \(heure de Paris\), le devis n° DEV-2026-00012 du 08\/10\/2026, établi par Élec du Sud, d'un montant total de 1\s100,00\s€\./);
    expect(m.texte).toMatch(/Par ce message, Élec du Sud vous confirme le contrat conclu, aux conditions du devis joint\./);
    expect(m.texte).toMatch(/Message envoyé par Mallettico pour le compte de l'entreprise Élec du Sud/);
    expect(m.texte).toMatch(/ci-joint votre exemplaire du devis signé \(PDF\)/);
    expect(m.texte).not.toMatch(/rétractation/);
  });

  it('particulier signé en ligne : renvoie au formulaire et au bouton en ligne', () => {
    const m = messageExemplaire({ devis, pro, client, particulier: true, lienRetractation: 'https://mallettico.fr/devis/signer/abc' });
    expect(m.texte).toMatch(/Le devis joint comprend l'information sur votre droit de rétractation et le formulaire de rétractation\./);
    expect(m.texte).toMatch(/vous pouvez aussi renoncer au contrat en ligne, sur cette page : https:\/\/mallettico\.fr\/devis\/signer\/abc/);
  });

  it('particulier signé sur place : le devis joint porte l’avis et le formulaire', () => {
    const m = messageExemplaire({ devis: { ...devis, signature_date: null, signatureDate: '2026-10-09T08:15:00Z' }, pro, client, particulier: true, surPlace: true, accordEmail: true });
    expect(m.texte).toMatch(/Vous avez signé, le 09\/10\/2026 à 10 h 15 \(heure de Paris\), le devis n° DEV-2026-00012/);
    expect(m.texte).toMatch(/comprend l'information sur votre droit de rétractation et le formulaire de rétractation/);
    expect(m.texte).toMatch(/Comme vous l'avez accepté lors de la signature, cet exemplaire vous est remis par e-mail\./);
    expect(m.texte).not.toMatch(/en ligne, sur cette page/);
  });

  it('reprend la demande expresse et le dépannage urgent', () => {
    const m = messageExemplaire({ devis: { ...devis, execution_anticipee_le: '2026-10-09T08:15:00Z', travaux_urgents: true }, pro, client, particulier: true });
    expect(m.texte).toMatch(/Vous avez demandé que les travaux commencent avant la fin du délai de rétractation de quatorze jours \(demande faite le 09\/10\/2026 à 10 h 15, heure de Paris\) et reconnu qu'une fois les travaux entièrement exécutés, vous n'aurez plus le droit de vous rétracter\. Si vous vous rétractez après le début des travaux, vous paierez un montant proportionnel/);
    expect(m.texte).toMatch(/réalisés en urgence à votre domicile\. Pour les pièces et travaux strictement nécessaires .*L221-28, 8°/);
  });

  it('échappe le HTML ; sans adresse valide, rien ne part', () => {
    const m = messageExemplaire({ devis: { ...devis, numero: '<b>X</b>' }, pro: { ...pro, nom: 'A <script>' }, client, particulier: false });
    expect(m.html).not.toMatch(/<script>|<b>X/);
    expect(messageExemplaire({ devis, pro, client: { ...client, email: 'pas une adresse' } })).toBeNull();
    expect(messageExemplaire({ devis, pro, client: { ...client, email: 'a@b.fr, c@d.fr' } })).toBeNull();
  });
});

describe('PDF reçu de la page du client', () => {
  it('n’accepte qu’un PDF en base64, de taille bornée', () => {
    expect(pdfAcceptable('JVBERi0xLjMKJcTl8uXr')).toBe(true);
    // Refusés par atob (longueur non multiple de 4) : à écarter avant toute réservation (relecture gardien-securite)
    expect(pdfAcceptable('JVBERi0xA')).toBe(false);
    expect(pdfAcceptable('JVBERi=')).toBe(false);
    expect(pdfAcceptable('JVBER')).toBe(false);
    expect(pdfAcceptable('PGh0bWw+')).toBe(false); // <html>
    expect(pdfAcceptable('JVBER<script>')).toBe(false);
    expect(pdfAcceptable(`JVBER${'A'.repeat(14_000_000)}`)).toBe(false);
    expect(pdfAcceptable(null)).toBe(false);
  });
  it('nom de fichier sûr', () => {
    expect(nomFichierExemplaire('DEV-2026-00012')).toBe('Devis-DEV-2026-00012-signe.pdf');
    expect(nomFichierExemplaire('../../x y')).toBe('Devis-x-y-signe.pdf');
  });
});
