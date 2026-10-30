import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FormulaireArticle from '../FormulaireArticle';
import ArticleDetail from '../ArticleDetail';
import { estFranchiseTva, MENTION_FRANCHISE_ARTICLE } from '../../../lib/franchiseTva';

/**
 * Avis juriste du 28 oct. 2026 (point 8) : en franchise en base de TVA (art. 293 B du CGI), le catalogue ne calcule ni
 * n'affiche aucune TVA : pas de « Soit X € TTC », pas de taux à choisir, la mention « Pas de TVA : franchise en base »
 * (texte R1 de l'avis du 26 oct.) à la place. Hors franchise, le formulaire ne change pas.
 * Le drapeau vient de la règle unique `estFranchiseTva`, comme Catalogue.jsx le calcule : le test part de l'entreprise.
 * Le sélecteur du référentiel (ArticlePicker, à 0 % en franchise au lieu de 10 %) et le taux enregistré à la création sont
 * constatés par le parcours « catalogue : en franchise en base ni HT, ni prix d'achat HT, ni TVA… »
 * (scripts/parcours/clients-catalogue.cjs), qui lit la base : le test unitaire ne rend pas la fenêtre du référentiel.
 */
const texte = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ').trim();

const MICRO = { formeJuridique: 'Micro-entreprise' };
const SARL = { formeJuridique: 'SARL' };

const FORM = { nom: 'Tube PER', prix: '12', prixAchat: '8', coefAuto: false, categorie: 'Plomberie', unite: 'u', tva_rate: '20', reference: '', description: '', stock_actuel: '', stock_seuil_alerte: '' };
const formulaireHtml = (entreprise) => renderToStaticMarkup(
  <FormulaireArticle
    form={FORM} setForm={() => {}} editId={null} erreurs={{}} effacerErreur={() => {}} categories={['Tous', 'Plomberie']}
    coefficients={{}} similaires={[]} modeDiscret={false} franchiseTva={estFranchiseTva(entreprise)} prixAchatFlash={false} enCours={false}
    onPrixAchat={() => {}} onCategorie={() => {}} onCoefAuto={() => {}} onEnregistrer={() => {}} onAnnuler={() => {}}
  />,
);

const ARTICLE = { id: 'a1', nom: 'Tube PER', categorie: 'Plomberie', unite: 'u', prix: 12, prixAchat: 8, tva_rate: 0 };
const ficheHtml = (entreprise, item = ARTICLE) => renderToStaticMarkup(
  <ArticleDetail
    item={item} fournisseurs={[]} liens={[]} mouvements={[]} historique={[]} nbDevis={0} voitPrix modeDiscret={false}
    franchiseTva={estFranchiseTva(entreprise)} peutModifier={false} peutCreer={false} peutAjouterAuDevis={false}
    onRetour={() => {}} onModifier={() => {}} onDupliquer={() => {}} onAjouterAuDevis={() => {}} onLier={() => {}} onVoirFournisseurs={() => {}}
  />,
);

describe('catalogue : pas de TVA en franchise en base (avis du 28 oct. 2026)', () => {
  it('la mention est celle de l\'avis, mot pour mot', () => {
    expect(MENTION_FRANCHISE_ARTICLE).toBe('Pas de TVA : franchise en base');
  });

  it('formulaire d\'article, en franchise : la mention, ni « Soit X € TTC » ni taux de TVA à choisir', () => {
    const html = formulaireHtml(MICRO);
    const t = texte(html);
    expect(t).toContain('Pas de TVA : franchise en base');
    expect(t).not.toMatch(/Soit/);
    expect(t).not.toMatch(/TTC/);
    expect(t).not.toContain('Taux de TVA');
    expect(html).not.toContain('id="article-tva"');
  });

  it('formulaire d\'article, hors franchise (contre-essai) : le taux et « Soit X € TTC » restent, sans la mention', () => {
    const html = formulaireHtml(SARL);
    const t = texte(html);
    expect(t).toContain('Taux de TVA');
    expect(t).toMatch(/Soit 14,40 € TTC/);
    expect(html).toContain('id="article-tva"');
    expect(t).not.toContain('franchise en base');
  });

  it('la règle est celle de franchiseTva.js : « Auto-entrepreneur » (ancienne valeur) est aussi en franchise', () => {
    expect(texte(formulaireHtml({ formeJuridique: 'Auto-entrepreneur' }))).toContain('Pas de TVA : franchise en base');
    expect(texte(formulaireHtml({ forme_juridique: 'Micro-entreprise' }))).toContain('Pas de TVA : franchise en base');
    expect(texte(formulaireHtml({}))).toContain('Taux de TVA');
  });

  it('fiche d\'un article : en franchise aucun « TVA N % » ; hors franchise le taux annoncé est le vrai, 0 compris', () => {
    expect(texte(ficheHtml(MICRO))).not.toMatch(/TVA \d/);
    expect(texte(ficheHtml(SARL))).toContain('· TVA 0 %'); // `||` annonçait 20 % pour un article à 0 %
    expect(texte(ficheHtml(SARL, { ...ARTICLE, tva_rate: 5.5 }))).toContain('· TVA 5.5 %');
  });
});
