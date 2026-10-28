import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Edit3, Plus, Star, Zap } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import Pastille from '../ui/Pastille';
import { achatConnu, margeBrute, niveauMarge, CLASSES_TON_MARGE } from '../../lib/margeArticle';
import { formatMoney } from '../../lib/formatters';

export const UNITES = [
  { value: 'u', label: 'u (unité)' }, { value: 'm²', label: 'm² (mètre carré)' },
  { value: 'ml', label: 'ml (mètre linéaire)' }, { value: 'h', label: 'h (heure)' },
  { value: 'forfait', label: 'Forfait' }, { value: 'jour', label: 'Jour' },
  { value: 'kg', label: 'kg' }, { value: 'L', label: 'L (litre)' },
  { value: 'sac', label: 'Sac' }, { value: 'pot', label: 'Pot' },
  { value: 'rouleau', label: 'Rouleau' }, { value: 'm³', label: 'm³' },
  { value: 'palette', label: 'Palette' },
];

const TAUX_TVA = [
  { value: '20', label: '20 % (standard)' },
  { value: '10', label: '10 % (rénovation)' },
  { value: '5.5', label: '5,5 % (rénovation énergétique)' },
  { value: '2.1', label: '2,1 %' },
  { value: '0', label: '0 % (exonéré)' },
];


/**
 * Le formulaire d'un article du catalogue (création ou modification). `Champ` partout (libellé au-dessus, 48 px, « facultatif »
 * au lieu de l'astérisque), la marge en direct par la règle de src/lib/margeArticle.js, et le suivi de stock replié : il ne
 * s'ouvre de lui-même que pour un article qui est déjà suivi (le réglage « Je gère un stock » attend la décision d'Hugo).
 * Refonte du 26 oct. 2026 (Task 7 « ancien code »).
 */
export default function FormulaireArticle({
  form, setForm, editId, erreurs, effacerErreur, categories, coefficients, similaires, modeDiscret, franchiseTva = false, prixAchatFlash, enCours,
  onPrixAchat, onCategorie, onCoefAuto, onEnregistrer, onAnnuler,
}) {
  const [stockOuvert, setStockOuvert] = useState(() => form.stock_actuel !== '' || form.stock_seuil_alerte !== '');
  const coef = coefficients[form.categorie] || 1.5;
  const tva = parseFloat(form.tva_rate || 20);
  const marge = form.prix && achatConnu(form.prixAchat) > 0 ? margeBrute(form.prix, form.prixAchat) : null;
  const achatInconnu = !!form.prix && achatConnu(form.prixAchat) === null;
  const niveau = niveauMarge(marge);
  const classes = CLASSES_TON_MARGE[niveau.ton];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <BoutonIcone icone={ArrowLeft} libelle="Retour au catalogue" onClick={onAnnuler} className="-ml-2" />
        <h2 className="text-2xl font-bold text-encre">{editId ? 'Modifier' : 'Nouvel'} article</h2>
      </div>

      <Carte marge="large">
        <div className="space-y-5">
          <div>
            <Champ
              id="article-nom" libelle="Nom" placeholder="Ex: Tube PER 16mm, Câble R2V 3G2.5..." aria-required="true" erreur={erreurs.nom} value={form.nom}
              onChange={(e) => { setForm((p) => ({ ...p, nom: e.target.value })); if (erreurs.nom) effacerErreur('nom'); }}
            />
            {similaires.length > 0 && (
              <div className="mt-2 p-3 rounded-xl text-sm bg-alerte-fond text-alerte-texte">
                <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertTriangle size={14} aria-hidden="true" /> Articles similaires :</p>
                {similaires.map((s) => <p key={s.id} className="ml-5">• {s.nom} ({s.categorie}, {formatMoney(s.prix)}/{s.unite})</p>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Champ id="article-reference" libelle="Référence / SKU" facultatif placeholder="Ex: PLB-TUB-016" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} />
            <Champ id="article-description" as="textarea" libelle="Description" facultatif rows={2} placeholder="Description détaillée" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Champ id="article-prix-achat" libelle={franchiseTva ? "Prix d'achat (TVA comprise)" : "Prix d'achat HT"} facultatif type="number" inputMode="decimal" min="0" step="0.01" value={form.prixAchat} onChange={(e) => onPrixAchat(e.target.value)} />
            <div>
              <Champ
                id="article-prix" libelle={form.coefAuto ? `Prix de vente${franchiseTva ? '' : ' HT'} (× ${coef})` : `Prix de vente${franchiseTva ? '' : ' HT'}`} aria-required="true" type="number" inputMode="decimal" min="0.01" step="0.01"
                erreur={erreurs.prix} value={form.prix} className={prixAchatFlash ? 'rounded-xl ring-4 ring-accent/30' : ''}
                onChange={(e) => { setForm((p) => ({ ...p, prix: e.target.value, coefAuto: false })); if (erreurs.prix) effacerErreur('prix'); }}
              />
              {form.coefAuto && form.prixAchat && <p className="mt-1.5 text-sm flex items-center gap-1 text-accent-texte"><Zap size={13} aria-hidden="true" /> Calculé avec le coefficient × {coef}</p>}
            </div>
            <Champ id="article-unite" as="select" libelle="Unité" value={form.unite} onChange={(e) => setForm((p) => ({ ...p, unite: e.target.value }))}>
              {UNITES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </Champ>
            <Champ id="article-categorie" as="select" libelle="Catégorie" value={form.categorie} onChange={(e) => onCategorie(e.target.value)}>
              {categories.filter((c) => c !== 'Tous').map((c) => <option key={c}>{c}</option>)}
            </Champ>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <Champ id="article-tva" as="select" libelle="Taux de TVA" value={form.tva_rate} onChange={(e) => setForm((p) => ({ ...p, tva_rate: e.target.value }))}>
              {TAUX_TVA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Champ>
            <p className="text-base text-encre-2 pb-3 tabular-nums">{form.prix ? `Soit ${formatMoney(parseFloat(form.prix) * (1 + tva / 100), 2)} TTC` : ''}</p>
          </div>

          <label className="flex items-start gap-3 text-sm text-encre-2 cursor-pointer min-h-[44px]">
            <input type="checkbox" checked={form.coefAuto} onChange={(e) => onCoefAuto(e.target.checked)} className="mt-0.5 w-5 h-5 rounded accent-accent" />
            <span>Calculer le prix de vente avec le coefficient (× {coef} pour {form.categorie})</span>
          </label>

          {/* La marge en direct : sans prix d'achat, elle n'est pas calculée (jamais « 100 % ») */}
          {achatInconnu && <p className="text-sm text-encre-3">Marge non calculée : renseignez le prix d'achat pour la voir.</p>}
          {marge !== null && (
            <div className="p-4 rounded-xl border border-bord bg-surface-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-encre">Marge en direct</span>
                <Pastille ton={niveau.ton}>{niveau.libelle}</Pastille>
              </div>
              <div className="flex items-end gap-4 mb-2">
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${classes.texte}`}>{marge.toFixed(1).replace('.', ',')} %</p>
                  <p className="text-sm text-encre-3">{modeDiscret ? '·····' : `${formatMoney(parseFloat(form.prix) - parseFloat(form.prixAchat), 2)} par ${form.unite}`}</p>
                </div>
                <div className="text-sm text-encre-3">
                  <p>Coefficient réel : <strong className="text-encre">× {(parseFloat(form.prix) / parseFloat(form.prixAchat)).toFixed(2).replace('.', ',')}</strong></p>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-bord" role="progressbar" aria-valuenow={Math.max(0, Math.min(Math.round(marge), 100))} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`Marge ${niveau.libelle.toLowerCase()} : ${marge.toFixed(1)} %`}>
                <div className={`h-full rounded-full transition-all duration-300 ${classes.fond}`} style={{ width: `${Math.max(0, Math.min(marge, 100))}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-encre-3"><span>0 %</span><span>25 % correcte</span><span>40 % bonne</span><span>60 % et plus</span></div>
            </div>
          )}

          {/* Suivi du stock : facultatif, replié sauf pour un article déjà suivi */}
          <div className="rounded-xl border border-bord">
            <button type="button" onClick={() => setStockOuvert((o) => !o)} aria-expanded={stockOuvert} className="w-full min-h-[48px] px-4 flex items-center justify-between text-sm font-medium text-encre-2 hover:bg-surface-2 rounded-xl">
              Suivre le stock de cet article
              <span className="text-encre-3">{stockOuvert ? 'Masquer' : 'Facultatif'}</span>
            </button>
            {stockOuvert && (
              <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-4">
                <Champ id="article-stock" libelle="Stock actuel" facultatif type="number" inputMode="numeric" value={form.stock_actuel} onChange={(e) => setForm((p) => ({ ...p, stock_actuel: e.target.value }))} />
                <Champ id="article-stock-min" libelle="Stock minimum" facultatif type="number" inputMode="numeric" value={form.stock_seuil_alerte} onChange={(e) => setForm((p) => ({ ...p, stock_seuil_alerte: e.target.value }))} />
              </div>
            )}
          </div>

          <button
            type="button" aria-pressed={form.favori} onClick={() => setForm((p) => ({ ...p, favori: !p.favori }))}
            className={`h-11 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium transition-colors ${form.favori ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:bg-bord'}`}
          >
            <Star size={16} aria-hidden="true" fill={form.favori ? 'currentColor' : 'none'} /> Favori
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-bord">
          <Bouton variante="secondaire" onClick={onAnnuler} disabled={enCours}>Annuler</Bouton>
          <Bouton variante="principal" icone={editId ? Edit3 : Plus} onClick={onEnregistrer} chargement={enCours}>{editId ? 'Enregistrer' : 'Ajouter'}</Bouton>
        </div>
      </Carte>
    </div>
  );
}
