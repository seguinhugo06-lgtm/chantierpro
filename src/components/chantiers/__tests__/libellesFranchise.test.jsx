import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import OngletApercu from '../OngletApercu';
import OngletFinances from '../OngletFinances';
import FormulaireArticle from '../../catalogue/FormulaireArticle';
import { estFranchiseTva } from '../../../lib/franchiseTva';

/**
 * Avis juriste du 28 oct. 2026 : en franchise en base de TVA (art. 293 B du CGI), aucun libellé de la fiche chantier ni du
 * catalogue n'écrit « HT », et un prix d'achat est « TVA comprise » (rien ne se déduit). Hors franchise, « HT » reste.
 * Le drapeau vient de la règle unique `estFranchiseTva` (src/lib/franchiseTva.js), exactement comme FicheChantier et
 * Catalogue le calculent : le test part de l'entreprise, pas d'un booléen posé à la main.
 */
const texte = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ').trim();
const formatMoney = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;
const formatPct = (n) => `${Math.round(n)} %`;

const MICRO = { formeJuridique: 'Micro-entreprise' };
const SARL = { formeJuridique: 'SARL' };

const bilan = { totalDepenses: 400, hasDepenses: true, margeBrute: 600, tauxMarge: 60, depensesMateriel: 400, depensesMainOeuvre: 0, depensesAutres: 0 };
const chantier = {
  id: 'c1', nom: 'Rénovation', statut: 'en_cours', avancement: 40,
  // Un chantier facturé par situations : « Facturé : X » sous la barre d'avancement
  situations_data: {
    mode: 'situation',
    situations: [{ numero: 1, statut: 'facturee', lignes: [], totaux: { montantSituationHT: 3000, netAPayer: 3600 } }],
  },
};

const apercu = (entreprise) => texte(renderToStaticMarkup(
  <OngletApercu
    chantier={chantier} client={null} bilan={bilan} revenuTotal={1000} totalFacture={3000} resteAFacturer={500} avancement={40}
    tasksDone={1} tasksTotal={2} franchiseTva={estFranchiseTva(entreprise)} modeDiscret={false} formatMoney={formatMoney} formatPct={formatPct}
    weather={null} alertes={[]} voitPrix
  />,
));

const finances = (entreprise) => texte(renderToStaticMarkup(
  <OngletFinances
    chantier={chantier} bilan={bilan} revenuTotal={1000} avancement={40} resteAFacturer={500} franchiseTva={estFranchiseTva(entreprise)}
    modeDiscret={false} formatMoney={formatMoney} formatPct={formatPct}
  />,
));

const FORM = { nom: 'Tube PER', prix: '12', prixAchat: '8', coefAuto: false, categorie: 'Plomberie', unite: 'u', tva_rate: '20', reference: '', description: '', stock_actuel: '', stock_seuil_alerte: '' };
const formulaire = (entreprise) => texte(renderToStaticMarkup(
  <FormulaireArticle
    form={FORM} setForm={() => {}} editId={null} erreurs={{}} effacerErreur={() => {}} categories={['Tous', 'Plomberie']}
    coefficients={{}} similaires={[]} modeDiscret={false} franchiseTva={estFranchiseTva(entreprise)} prixAchatFlash={false} enCours={false}
    onPrixAchat={() => {}} onCategorie={() => {}} onCoefAuto={() => {}} onEnregistrer={() => {}} onAnnuler={() => {}}
  />,
));

describe('libellés de prix : pas de « HT » en franchise en base (avis du 28 oct. 2026)', () => {
  it('fiche chantier, aperçu : « Facturé » et « Reste à facturer » sans HT en franchise, avec HT sinon', () => {
    const franchise = apercu(MICRO);
    expect(franchise).toContain('Facturé : 3000,00 €');
    expect(franchise).toContain('Reste 500,00 € à facturer');
    expect(franchise).not.toMatch(/\bHT\b/);

    const assujetti = apercu(SARL);
    expect(assujetti).toContain('Facturé : 3000,00 € HT');
    expect(assujetti).toContain('Reste 500,00 € HT à facturer');
  });

  it('fiche chantier, finances : « Reste à facturer » sans HT en franchise, avec HT sinon', () => {
    const franchise = finances(MICRO);
    expect(franchise).toContain('Reste à facturer :');
    expect(franchise).not.toMatch(/\bHT\b/);

    expect(finances(SARL)).toContain('Reste à facturer HT :');
  });

  it('catalogue, formulaire d\'article : prix d\'achat « TVA comprise » et prix de vente sans HT en franchise, avec HT sinon', () => {
    const franchise = formulaire(MICRO);
    expect(franchise).toContain("Prix d'achat (TVA comprise)");
    expect(franchise).toContain('Prix de vente');
    expect(franchise).not.toMatch(/\bHT\b/);

    const assujetti = formulaire(SARL);
    expect(assujetti).toContain("Prix d'achat HT");
    expect(assujetti).toContain('Prix de vente HT');
    expect(assujetti).not.toContain('TVA comprise');
  });

  it('la règle est celle de franchiseTva.js : « Auto-entrepreneur » (ancienne valeur) est aussi en franchise', () => {
    expect(apercu({ formeJuridique: 'Auto-entrepreneur' })).not.toMatch(/\bHT\b/);
    expect(apercu({ forme_juridique: 'Micro-entreprise' })).not.toMatch(/\bHT\b/);
    expect(apercu({})).toMatch(/\bHT\b/);
  });
});
