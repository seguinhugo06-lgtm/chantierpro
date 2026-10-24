import { describe, it, expect } from 'vitest';
import { buildAttestationRamonageHtml, PIED_CONSERVATION, MENTION_ENTRETIEN, MENTION_CONSEILS } from '../attestationRamonageHtml';

// Données fictives seulement
const entreprise = {
  nom: 'Ramonage Exemple', formeJuridique: 'Micro-entreprise', nomEntrepreneur: 'Jean Exemple', adresse: '1 rue de l’Exemple',
  codePostal: '24000', ville: 'Imaginaire', tel: '05 00 00 00 00', email: 'contact@exemple.fr', siret: '00000000000000',
  rcProAssureur: 'Assureur (exemple)', rcProNumero: 'RC-000',
};
const ramonage = {
  numero: 'RAM-2026-00001', realise_le: '2026-10-19T14:00:00', intervenant_nom: 'Jean Exemple', client_nom: 'Lucie Exemple',
  client_contact: '06 00 00 00 01', qualite_client: 'proprietaire', adresse_intervention: '3 chemin de l’Exemple, 24000 Imaginaire',
  appareil_type: 'poele_bois', combustible: 'bois', conduit: 'tube_chemise', precisions: 'Marque X modèle Y', localisation: 'Salon, RDC',
  methode: 'mecanique_rotative', complement_chimique: true, raccordement: 'ramone', vacuite: 'assuree',
  constats: { etat_conduit: 'bon', depots: 'normaux' }, observations: 'Bois humide', conseils: { choix: ['combustible'], texte: '' },
  prochain_avant: '2027-10-19', nb_dans_annee: 1, created_at: '2026-10-19T15:00:00',
};

describe('attestation de ramonage — contenu imprimé', () => {
  const html = buildAttestationRamonageHtml({ ramonage, entreprise, precedent: { realise_le: '2025-10-10T09:00:00', numero: 'RAM-2025-00007' } });

  it('identité du professionnel : nom avec « EI », SIRET, RC pro', () => {
    expect(html).toContain('Ramonage Exemple — Jean Exemple EI');
    expect(html).toContain('SIRET 00000000000000');
    expect(html).toContain('Assurance responsabilité civile professionnelle : Assureur (exemple), n° RC-000');
  });

  it('titre, numéro et article ; vacuité et phrase d’attestation dans les mots du texte', () => {
    expect(html).toContain('Attestation de ramonage');
    expect(html).toContain('N° RAM-2026-00001');
    expect(html).toContain('Article R. 1331-75 du code de la santé publique');
    expect(html).toContain('Vacuité du conduit sur toute sa longueur</th><td>Assurée');
    expect(html).toContain('atteste avoir procédé le 19 octobre 2026 au ramonage, par action mécanique directe, du ou des conduits désignés ci-dessus et avoir assuré la vacuité du conduit sur toute sa longueur.');
    expect(html).not.toMatch(/conforme/i);
  });

  it('client, lieu, qualité, appareil, méthode, complément chimique, dernier ramonage, prochain ramonage', () => {
    for (const t of ['Lucie Exemple', '3 chemin de l’Exemple', 'Propriétaire', 'Poêle à bois', 'Marque X modèle Y', 'Tubé-chemisé',
      'Salon, RDC', 'Mécanique rotative', 'Produit chimique utilisé en complément du ramonage mécanique', '10 octobre 2025 (attestation n° RAM-2025-00007)',
      'Prochain ramonage conseillé avant le', '19 octobre 2027', 'Fait le 19 octobre 2026']) {
      expect(html).toContain(t);
    }
  });

  it('constats remplis seulement ; conseils (R. 1331-77) avec leur mention ; foyer fermé : pas une attestation d’entretien', () => {
    expect(html).toContain('État apparent du conduit</th><td>Bon');
    expect(html).not.toContain('06 00 00 00 01'); // contact du client : gardé en base, pas imprimé (RGPD art. 5.1.c)
    expect(html).not.toContain('Tubage</th>');
    expect(html).toContain('Conseils donnés (article R. 1331-77 du code de la santé publique)');
    expect(html).toContain(MENTION_CONSEILS);
    expect(html).toContain(MENTION_ENTRETIEN);
  });

  it('pied : conservation deux ans et agents de contrôle ; information sur les rappels', () => {
    expect(html).toContain(PIED_CONSERVATION);
    expect(html).not.toContain('transmettre à votre assurance');
    expect(html).toContain('pourra vous rappeler par e-mail ou par SMS la date de votre prochain ramonage. Vous pouvez le refuser gratuitement');
    expect(html).not.toMatch(/pourra vous (contacter|appeler)/);
    expect(buildAttestationRamonageHtml({ ramonage, entreprise, rappelsRefuses: true })).not.toContain('pourra vous rappeler');
  });

  it('vacuité non assurée : la précision dans la phrase ; cheminée ouverte : pas de mention d’entretien', () => {
    const h2 = buildAttestationRamonageHtml({ ramonage: { ...ramonage, appareil_type: 'cheminee_ouverte', vacuite: 'non_assuree', vacuite_precision: 'Bouchon au coude' }, entreprise });
    expect(h2).toContain('La vacuité du conduit sur toute sa longueur n’a pas pu être assurée : Bouchon au coude.');
    expect(h2).not.toContain(MENTION_ENTRETIEN);
  });

  it('échappe les textes saisis et n’imprime qu’une vraie image de signature', () => {
    const h3 = buildAttestationRamonageHtml({ ramonage: { ...ramonage, observations: '<img src=x onerror=alert(1)>', signature: 'javascript:alert(1)' }, entreprise });
    expect(h3).not.toContain('<img src=x');
    expect(h3).toContain('&lt;img src=x');
    expect(h3).not.toContain('alt="Signature"');
    const h4 = buildAttestationRamonageHtml({ ramonage: { ...ramonage, signature: 'data:image/png;base64,iVBORw0KGgo=' }, entreprise });
    expect(h4).toContain('alt="Signature"');
  });

  it('annulée : le bandeau ; remplaçante : « annule et remplace »', () => {
    const h5 = buildAttestationRamonageHtml({ ramonage: { ...ramonage, annulee_le: '2026-10-19T15:00:00', annulation_motif: 'Erreur de saisie' }, entreprise });
    expect(h5).toContain('Attestation annulée le 19 octobre 2026 : Erreur de saisie');
    expect(buildAttestationRamonageHtml({ ramonage, entreprise, remplace: { numero: 'RAM-2026-00009' } })).toContain('Annule et remplace l’attestation n° RAM-2026-00009');
  });

  it('compte de démonstration : filigrane « EXEMPLE »', () => {
    expect(buildAttestationRamonageHtml({ ramonage, entreprise: { ...entreprise, donneesFictives: true } })).toContain('data-filigrane="EXEMPLE"');
  });
});

describe('attestation de ramonage — émetteur figé', () => {
  it('imprime l’émetteur recopié à l’enregistrement, pas la fiche du moment', () => {
    const emetteur = { nom: 'Ancien nom', formeJuridique: 'SARL', capital: '5000', siret: '11111111111111', rcsVille: 'Périgueux', rcsNumero: '111 111 111', rcProAssureur: 'Ancien assureur' };
    const h = buildAttestationRamonageHtml({ ramonage: { ...ramonage, emetteur }, entreprise: { ...entreprise, nom: 'Nouveau nom', rcProAssureur: 'Nouvel assureur' } });
    expect(h).toContain('Ancien nom');
    expect(h).toContain('SARL au capital de 5000 €');
    expect(h).toContain('RCS Périgueux B 111 111 111');
    expect(h).toContain('Ancien assureur');
    expect(h).not.toContain('Nouvel assureur');
  });
});
