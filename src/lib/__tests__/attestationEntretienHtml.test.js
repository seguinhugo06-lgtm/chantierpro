import { describe, it, expect } from 'vitest';
import { buildAttestationEntretienHtml } from '../attestationEntretienHtml';
import { nouveauBrouillon, PHRASES_CO, PHRASE_CONSEILS_CHAUDIERE } from '../entretien';

// Données fictives seulement
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', adresse: '3 chemin de l’Exemple, 24000 Imaginaire' };
const entreprise = { nom: 'Chauffage Exemple', formeJuridique: 'EI', nomEntrepreneur: 'Paul Exemple', adresse: '1 rue Fictive', tel: '05 00 00 00 00', siret: '00000000000000' };

function attestation(categorieValeur, o = {}) {
  const b = nouveauBrouillon({ client, categorieValeur, entreprise, maintenant: new Date('2026-11-04T10:00:00') });
  return {
    ...b, numero: 'ENT-2026-00001', local: 'Cuisine', appareils_mesure: 'Analyseur Exemple A1', puissance_kw: '24',
    appareils: [{ ...b.appareils[0], energie: categorieValeur === 'chaudiere' ? 'gaz' : b.appareils[0].energie, marque: 'Marque<script>', modele: 'M1',
      evacuation: 'ventouse', type: categorieValeur === 'pac' ? 'air_eau' : b.appareils[0].type, points: { 'boucle.pression': true, 'commun.decendrage': true, 'generateur.tensions': true } }],
    operations: 'Nettoyage du brûleur', co_ppm: '30', rendement: { evalue: '91 %', reference: '94 %' }, emissions: { evalue: '60 mg/kWh' }, classe_energetique: 'C',
    conseils: { usage: 'Baisser la nuit', ameliorations: '', remplacement: '', choix: ['fluide', 'stockage'], texte: '' },
    etancheite: 'controle', defauts: 'Aucun', actions: 'Aucune',
    ...o,
  };
}

describe('attestation d’entretien — trois documents distincts', () => {
  it('un titre et un pied propres à chaque appareil', () => {
    const ch = buildAttestationEntretienHtml({ entretien: attestation('chaudiere'), entreprise });
    const pac = buildAttestationEntretienHtml({ entretien: attestation('pac'), entreprise });
    const po = buildAttestationEntretienHtml({ entretien: attestation('poele'), entreprise });
    expect(ch).toContain('Attestation d’entretien de chaudière');
    expect(pac).toContain('Attestation d’entretien de pompe à chaleur ou de climatisation');
    expect(po).toContain('Attestation d’entretien de poêle ou d’insert');
    expect(ch).toContain('À conserver au moins deux ans et à tenir à la disposition des agents chargés du contrôle (article R. 224-41-8');
    // PAC : aucune durée de conservation fixée (R. 224-44-4)
    expect(pac).toContain('(article R. 224-44-4 du code de l’environnement)');
    expect(pac).not.toContain('deux ans');
    expect(po).toContain('article R. 1331-75 du code de la santé publique');
    for (const html of [ch, pac, po]) {
      expect(html).not.toMatch(/conforme|certificat|contrôle obligatoire/i);
      expect(html).not.toContain('<script>');
      expect(html).toContain('Marque&lt;script&gt;');
    }
  });
});

describe('attestation de chaudière — annexe 5', () => {
  const html = buildAttestationEntretienHtml({ entretien: attestation('chaudiere'), entreprise });
  it('imprime la phrase du CO correspondant à la mesure, mot pour mot', () => {
    expect(html).toContain(PHRASES_CO.b);
    expect(html).not.toContain(PHRASES_CO.a);
    const normal = buildAttestationEntretienHtml({ entretien: attestation('chaudiere', { co_ppm: '2' }), entreprise });
    expect(normal).toContain(PHRASES_CO.a);
    expect(normal).not.toContain(PHRASES_CO.b);
  });
  it('tableaux 9, 10, 11 et 13, classe, appareils de mesure, norme NF X50-010 pour le gaz', () => {
    expect(html).toContain('Rendement de référence (le rendement de référence correspond au rendement de la meilleure technologie équivalente');
    expect(html).toContain('sauf impossibilité liée aux caractéristiques techniques de l’installation');
    expect(html).toContain('NOx : 35 mg / kWh');
    expect(html).toContain(PHRASE_CONSEILS_CHAUDIERE);
    expect(html).toContain('Chaudière de type B1');
    expect(html).toContain('NF X50-010');
    expect(html).toContain('Analyseur Exemple A1');
    expect(html).toContain('Contrôle de la pression');
    expect(html).toContain('Date du dernier ramonage');
  });
  it('rien de la chaudière sur l’attestation d’une PAC ; défauts, actions et étanchéité y sont', () => {
    const pac = buildAttestationEntretienHtml({ entretien: attestation('pac'), entreprise });
    expect(pac).not.toContain('Chaudière de type B1');
    expect(pac).not.toContain('monoxyde');
    expect(pac).toContain('Défauts de fonctionnement constatés');
    expect(pac).toContain('relevé des pressions à l’entrée et à la sortie du compresseur');
    expect(pac).toContain('Le fluide frigorigène');
  });
  it('l’information sur les rappels disparaît si le client les a refusés', () => {
    expect(html).toContain('répondant STOP');
    expect(buildAttestationEntretienHtml({ entretien: attestation('chaudiere'), entreprise, rappelsRefuses: true })).not.toContain('répondant STOP');
  });
});
