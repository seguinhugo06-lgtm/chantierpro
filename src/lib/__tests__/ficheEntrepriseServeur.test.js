import { describe, it, expect } from 'vitest';
import { choisirFicheEntreprise, organisationSure } from '../../../supabase/functions/_shared/ficheEntreprise.ts';

// Même règle que les pages publiques (migration 106) : l'entreprise de la pièce, pas la fiche personnelle de son auteur
const PATRON = 'patron';
const SALARIE = 'salarie';
const ORG = 'org-patron';
const PERSO = 'org-perso-salarie';
const ficheEntreprise = { id: 'f-ent', user_id: PATRON, organization_id: ORG, created_at: '2026-01-01' };
const ficheDepannage = { id: 'f-dep', user_id: PATRON, organization_id: ORG, created_at: '2026-03-01' };
const fichePerso = { id: 'f-perso', user_id: SALARIE, organization_id: PERSO, is_default: true, created_at: '2025-01-01' };
const toutes = [fichePerso, ficheDepannage, ficheEntreprise];
const membres = [PATRON, SALARIE];

describe('fiche entreprise d\'une pièce, côté serveur (notify-signature)', () => {
  it('le devis d\'un salarié montre l\'entreprise, même si sa fiche personnelle est « par défaut »', () => {
    expect(choisirFicheEntreprise(toutes, { user_id: SALARIE, organization_id: ORG }, membres).id).toBe('f-ent');
  });

  it('même s\'il désigne sa fiche personnelle', () => {
    expect(choisirFicheEntreprise(toutes, { user_id: SALARIE, organization_id: ORG, entreprise_id: 'f-perso' }, membres).id).toBe('f-ent');
  });

  it('la fiche de l\'entreprise que la pièce désigne, parmi plusieurs ; une archivée passe après', () => {
    expect(choisirFicheEntreprise(toutes, { user_id: SALARIE, organization_id: ORG, entreprise_id: 'f-dep' }, membres).id).toBe('f-dep');
    const archivee = { ...ficheEntreprise, archived_at: '2026-05-01' };
    expect(choisirFicheEntreprise([archivee, ficheDepannage], { user_id: PATRON, organization_id: ORG }, membres).id).toBe('f-dep');
  });

  it('dans son organisation personnelle, sa fiche personnelle', () => {
    expect(choisirFicheEntreprise(toutes, { user_id: SALARIE, organization_id: PERSO }, [SALARIE]).id).toBe('f-perso');
  });

  it('une pièce dont l\'auteur n\'est pas membre de l\'organisation qu\'elle porte : son compte seulement', () => {
    const intrus = { id: 'f-intrus', user_id: 'intrus', organization_id: null };
    const piece = { user_id: 'intrus', organization_id: ORG };
    expect(organisationSure(piece, membres)).toBeNull();
    expect(choisirFicheEntreprise([...toutes, intrus], piece, membres).id).toBe('f-intrus');
  });

  it('une fiche glissée dans l\'organisation par un non-membre n\'est jamais présentée', () => {
    const glissee = { id: 'f-glissee', user_id: 'intrus', organization_id: ORG, is_default: true, created_at: '2020-01-01' };
    expect(choisirFicheEntreprise([glissee, ficheEntreprise], { user_id: SALARIE, organization_id: ORG }, membres).id).toBe('f-ent');
  });

  it('l\'organisation sans fiche : celle de l\'auteur ; aucune : rien', () => {
    expect(choisirFicheEntreprise([fichePerso], { user_id: SALARIE, organization_id: ORG }, membres).id).toBe('f-perso');
    expect(choisirFicheEntreprise([], { user_id: SALARIE, organization_id: ORG }, membres)).toBeNull();
  });

  it('l\'artisan seul : sa fiche, comme avant', () => {
    const solo = { id: 'f-solo', user_id: 'solo', organization_id: 'org-solo' };
    expect(choisirFicheEntreprise([solo], { user_id: 'solo', organization_id: 'org-solo', entreprise_id: 'f-solo' }, ['solo']).id).toBe('f-solo');
  });
});
