import { describe, it, expect } from 'vitest';
import { traduireErreurAuth, motDePasseValide } from '../authErreurs';

describe('traduireErreurAuth', () => {
  it('traduit les erreurs de connexion courantes', () => {
    expect(traduireErreurAuth({ message: 'Invalid login credentials' })).toBe('E-mail ou mot de passe incorrect.');
    expect(traduireErreurAuth({ message: 'Email not confirmed' })).toMatch(/pas encore confirmée/);
    expect(traduireErreurAuth({ message: 'User already registered' })).toMatch(/existe déjà/);
  });

  it('reconnaît les codes même si le message change', () => {
    expect(traduireErreurAuth({ code: 'weak_password', message: 'whatever' })).toMatch(/trop faible/);
    expect(traduireErreurAuth({ code: 'over_email_send_rate_limit' })).toMatch(/patientez une minute/);
  });

  it('traduit un lien expiré venu du fragment d’URL', () => {
    expect(traduireErreurAuth({ error_code: 'otp_expired', error_description: 'Email link is invalid or has expired' }))
      .toMatch(/a expiré/);
  });

  it('distingue la limite d’envoi d’e-mails de la limite générale', () => {
    expect(traduireErreurAuth({ message: 'For security purposes, you can only request this after 42 seconds.' }))
      .toMatch(/une minute/);
    expect(traduireErreurAuth({ message: 'Request rate limit reached' })).toMatch(/quelques minutes/);
  });

  it('ne montre jamais de texte technique inconnu', () => {
    expect(traduireErreurAuth({ message: 'AuthApiError: unexpected_failure 500' })).toBe('Une erreur est survenue. Réessayez dans un instant.');
    expect(traduireErreurAuth(null, 'repli')).toBe('repli');
    expect(traduireErreurAuth('Failed to fetch')).toMatch(/Internet/);
  });
});

describe('motDePasseValide', () => {
  it('exige 8 caractères avec lettres et chiffres', () => {
    expect(motDePasseValide('abc12345')).toBe(true);
    expect(motDePasseValide('abc1234')).toBe(false);
    expect(motDePasseValide('abcdefgh')).toBe(false);
    expect(motDePasseValide('12345678')).toBe(false);
    expect(motDePasseValide(undefined)).toBe(false);
  });
});
