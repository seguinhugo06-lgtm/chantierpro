import { useState } from 'react';
import { ChevronRight, ArrowUpRight, ArrowDownRight, Package, UserCog, Target, BarChart3, Plus, Wallet, Trash2, X } from 'lucide-react';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { TitreSection } from '../ui/EnTete';
import { montantsDepense, TAUX_DEPENSE } from '../../lib/tvaDepenses';
import { dateLue } from '../../lib/dates';

// Une marge négative est « à surveiller » (ambre) : le rouge est réservé à ce qui est en retard
const couleurMarge = (taux) => (taux < 15 ? 'text-alerte-texte' : 'text-succes-texte');

/**
 * Onglet « Finances » de la fiche chantier : avancement et budget consommé, revenus et dépenses, situations de travaux.
 * Les quatre chiffres (budget, dépensé, facturé, marge) sont dans l'Aperçu : avant, la fiche les redisait dans un bloc
 * « Finances » au milieu de la page ET dans un onglet « Finances » (audit UX du 20 oct. 2026). Le dépassement n'est plus
 * dit ici : la marge de l'Aperçu le porte.
 */
export default function OngletFinances({
  chantier: ch, bilan, revenuTotal, avancement, resteAFacturer, franchiseTva, modeDiscret, formatMoney, formatPct,
  depensesChantier = [], ajustementsRevenus = [], ajustementsDepenses = [], depensePrevision,
  peutDepense, peutDepenseModifier = peutDepense, peutDepenseSupprimer = false, peutModifier, onAjouterRevenu, onAjouterDepense, onVoirHeures, onSupprimerAjustement, onChangerTaux, onSupprimerDepense, onDepenseAutres,
  situations,
}) {
  const [ouverts, setOuverts] = useState({});
  const bascule = (cle) => setOuverts((p) => ({ ...p, [cle]: !p[cle] }));
  const montant = (v) => (modeDiscret ? '•••••' : v);
  const pctBudget = revenuTotal > 0 ? Math.round((bilan.totalDepenses / revenuTotal) * 100) : 0;
  const manquantes = franchiseTva ? 0 : depensesChantier.filter((d) => !montantsDepense(d).connue).length;
  const prevision = depensePrevision;

  const rangee = (cle, icone, libelle, total, contenu, couleurIcone = 'text-encre-3') => {
    const Icone = icone;
    return (
      <>
        <button type="button" onClick={() => bascule(cle)} aria-expanded={!!ouverts[cle]} className="w-full min-h-[48px] flex items-center gap-2 px-2 rounded-lg text-left transition-colors hover:bg-surface-2">
          <ChevronRight size={16} aria-hidden="true" className={`flex-shrink-0 text-encre-3 transition-transform ${ouverts[cle] ? 'rotate-90' : ''}`} />
          <Icone size={16} aria-hidden="true" className={couleurIcone} />
          <span className="text-sm font-medium flex-1 text-encre">{libelle}</span>
          {total !== undefined && <span className="text-sm font-bold text-encre tabular-nums">{total}</span>}
        </button>
        {ouverts[cle] && contenu}
      </>
    );
  };

  return (
    <div className="space-y-8">
      <Carte>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-encre">Budget et avancement</h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-encre-2">Avancement</span>
              <span className="font-semibold tabular-nums text-encre">{avancement} %</span>
            </div>
            <div className="mt-1 h-2 rounded-full overflow-hidden bg-surface-2"><div className="h-full rounded-full transition-all bg-accent" style={{ width: `${Math.min(100, avancement)}%` }} /></div>
          </div>
          {revenuTotal > 0 && (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-encre-2">Budget consommé</span>
                <span className="font-semibold tabular-nums text-encre">{montant(`${pctBudget} %`)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full overflow-hidden bg-surface-2"><div className="h-full rounded-full transition-all bg-neutre-point" style={{ width: `${Math.min(100, pctBudget)}%` }} /></div>
            </div>
          )}
          {resteAFacturer > 0 && !modeDiscret && (
            <p className="text-sm text-encre-2">Reste à facturer{franchiseTva ? '' : ' HT'} : <strong className="text-encre tabular-nums">{formatMoney(resteAFacturer)}</strong></p>
          )}
        </div>

        {(peutModifier || peutDepense) && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {peutModifier && <Bouton icone={Plus} onClick={onAjouterRevenu}>Revenu</Bouton>}
            {peutDepense && <Bouton icone={Plus} onClick={onAjouterDepense}>Dépense</Bouton>}
          </div>
        )}

        <div className="mt-3 space-y-0.5">
          {rangee('revenus', ArrowUpRight, 'Revenus', montant(formatMoney(revenuTotal)), (
            <div className="ml-6 p-3 rounded-lg space-y-2 bg-surface-2">
              <div className="flex justify-between text-sm"><span className="text-encre-2">Montant devis</span><span className="font-medium text-encre">{bilan.revenuPrevu > 0 ? montant(formatMoney(bilan.revenuPrevu)) : 'Non défini'}</span></div>
              {(bilan.adjRevenus || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-encre-2">Travaux suppl.</span><span className="font-medium text-succes-texte">+{montant(formatMoney(bilan.adjRevenus))}</span></div>}
              {bilan.revenuEncaisse > 0 && <div className="flex justify-between text-sm"><span className="text-encre-2">Encaissé</span><span className="font-medium text-succes-texte">{montant(formatMoney(bilan.revenuEncaisse))}</span></div>}
            </div>
          ), 'text-succes-texte')}

          {rangee('depenses', ArrowDownRight, 'Dépenses', montant(formatMoney(bilan.totalDepenses)), (
            <div className="ml-6 p-3 rounded-lg space-y-1 bg-surface-2">
              <button type="button" className="flex justify-between items-center w-full min-h-[44px] text-left px-1.5 rounded hover:bg-surface" onClick={onAjouterDepense} disabled={!peutDepense}>
                <span className="text-sm text-encre-2 flex items-center gap-1.5"><Package size={14} aria-hidden="true" /> Matériaux</span>
                <span className="text-sm font-medium text-encre">{montant(formatMoney(bilan.coutMateriaux))}</span>
              </button>
              <button type="button" className="flex justify-between items-center w-full min-h-[44px] text-left px-1.5 rounded hover:bg-surface" onClick={onVoirHeures}>
                <span className="text-sm text-encre-2 flex items-center gap-1.5"><UserCog size={14} aria-hidden="true" /> Main d'œuvre ({bilan.heuresTotal}h)</span>
                <span className="text-sm font-medium text-encre">{montant(formatMoney(bilan.coutMO))}</span>
              </button>
              {(bilan.heuresSansCout || 0) > 0 && (
                <p className="text-sm px-1.5 text-alerte-texte">
                  {bilan.heuresSansCout.toLocaleString('fr-FR')} h sans coût horaire : la marge est incomplète. Renseignez le coût dans Équipe.
                </p>
              )}
              {(bilan.coutAutres || 0) > 0 && (
                <button type="button" className="flex justify-between items-center w-full min-h-[44px] text-left px-1.5 rounded hover:bg-surface" onClick={onDepenseAutres}>
                  <span className="text-sm text-encre-2">Autres frais</span>
                  <span className="text-sm font-medium text-encre">{montant(formatMoney(bilan.coutAutres))}</span>
                </button>
              )}
            </div>
          ))}

          {(ch.budget_materiaux > 0 || ch.heures_estimees > 0) && rangee('objectifs', Target, 'Objectifs et réel', undefined, (
            <div className="ml-6 p-3 rounded-lg space-y-3 bg-surface-2">
              {ch.budget_materiaux > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-encre-2">Matériaux</span>
                    <span className={`font-medium tabular-nums ${bilan.coutMateriaux > ch.budget_materiaux ? 'text-alerte-texte' : 'text-encre'}`}>{montant(`${formatMoney(bilan.coutMateriaux)} / ${formatMoney(ch.budget_materiaux)}`)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-surface"><div className={`h-full rounded-full ${bilan.coutMateriaux > ch.budget_materiaux ? 'bg-alerte-point' : 'bg-accent'}`} style={{ width: `${Math.min(100, (bilan.coutMateriaux / ch.budget_materiaux) * 100)}%` }} /></div>
                </div>
              )}
              {ch.heures_estimees > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-encre-2">Heures</span>
                    <span className={`font-medium tabular-nums ${bilan.heuresTotal > ch.heures_estimees ? 'text-alerte-texte' : 'text-encre'}`}>{bilan.heuresTotal}h / {ch.heures_estimees}h</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-surface"><div className={`h-full rounded-full ${bilan.heuresTotal > ch.heures_estimees ? 'bg-alerte-point' : 'bg-accent'}`} style={{ width: `${Math.min(100, (bilan.heuresTotal / ch.heures_estimees) * 100)}%` }} /></div>
                </div>
              )}
            </div>
          ))}

          {prevision && rangee('projection', BarChart3, 'Projection fin de chantier', undefined, (
            <div className="ml-6 p-3 rounded-lg bg-surface-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-sm text-encre-2">Dépenses est.</p><p className="font-bold text-sm text-encre tabular-nums">{montant(formatMoney(prevision.depensesFinales))}</p></div>
                <div><p className="text-sm text-encre-2">Bénéfice</p><p className={`font-bold text-sm tabular-nums ${prevision.tauxMarge != null ? couleurMarge(prevision.tauxMarge) : 'text-encre-3'}`}>{bilan.hasDepenses ? montant(formatMoney(prevision.benefice)) : '—'}</p></div>
                <div><p className="text-sm text-encre-2">Marge</p><p className={`font-bold text-sm tabular-nums ${prevision.tauxMarge != null ? couleurMarge(prevision.tauxMarge) : 'text-encre-3'}`}>{prevision.tauxMarge != null ? montant(formatPct(prevision.tauxMarge)) : '—'}</p></div>
              </div>
            </div>
          ), 'text-accent-texte')}
        </div>
      </Carte>

      <section>
        <TitreSection titre="Revenus et dépenses saisis" />
        {ajustementsRevenus.length === 0 && ajustementsDepenses.length === 0 && depensesChantier.length === 0 ? (
          <Carte marge="aucun">
            <EtatVide
              icone={Wallet} titre="Aucune donnée financière"
              texte="Ajoutez des revenus ou des dépenses pour suivre la rentabilité de ce chantier."
              action={peutDepense ? <Bouton variante="secondaire" icone={Plus} onClick={onAjouterDepense}>Ajouter une dépense</Bouton> : null}
              className="py-8"
            />
          </Carte>
        ) : (
          <div className="space-y-3">
            {[{ liste: ajustementsRevenus, titre: 'Ajustements de revenus', signe: '+', ton: 'text-succes-texte' }, { liste: ajustementsDepenses, titre: 'Ajustements de dépenses', signe: '-', ton: 'text-encre' }]
              .filter((g) => g.liste.length > 0).map((g) => (
                <Carte key={g.titre}>
                  <h3 className="text-base font-semibold mb-2 text-encre">{g.titre}</h3>
                  <ul className="divide-y divide-bord">
                    {g.liste.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 min-h-[48px]">
                        <span className="text-sm text-encre min-w-0 break-words">{a.libelle || a.description || 'Sans libellé'}</span>
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <span className={`font-bold tabular-nums ${g.ton}`}>{g.signe}{montant(formatMoney(a.montant_ht ?? a.montant))}</span>
                          {peutModifier && <BoutonIcone icone={X} libelle={`Supprimer l'ajustement ${a.libelle || a.description || ''}`.trim()} taille={16} onClick={() => onSupprimerAjustement(a.id)} />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Carte>
              ))}

            {depensesChantier.length > 0 && (
              <Carte>
                <h3 className="text-base font-semibold mb-3 text-encre">Dépenses</h3>
                {manquantes > 0 && (
                  <p role="status" className="mb-3 p-3 rounded-xl text-sm bg-alerte-fond text-alerte-texte">
                    {manquantes === 1 ? '1 dépense n’a pas sa TVA saisie : aucune TVA n’est déduite pour elle.' : `${manquantes} dépenses n’ont pas leur TVA saisie : aucune TVA n’est déduite pour elles.`}
                    {' '}Choisissez le taux porté sur la facture du fournisseur.
                  </p>
                )}
                <div className="space-y-2">
                  {depensesChantier.map((d) => {
                    const m = montantsDepense(d);
                    const valeur = m.connue && m.taux !== null ? String(m.taux) : '';
                    const options = TAUX_DEPENSE.some((t) => t.valeur === valeur) ? TAUX_DEPENSE : [...TAUX_DEPENSE, { valeur, libelle: `TVA ${valeur.replace('.', ',')} %` }];
                    return (
                      <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl bg-surface-2">
                        <span className="text-sm w-24 text-encre-3">{dateLue(d.date).toLocaleDateString('fr-FR')}</span>
                        <span className="flex-1 min-w-[8rem] text-sm text-encre">{d.description}</span>
                        <span className="font-bold text-encre tabular-nums">
                          {montant(formatMoney(d.montant))}
                          {!franchiseTva && <span className="text-sm font-normal text-encre-2"> HT{m.connue ? ` · TVA ${modeDiscret ? '·····' : `${m.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}` : ''}</span>}
                        </span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-sm px-2 py-1 rounded bg-bord text-encre-2">{d.categorie}</span>
                          {!franchiseTva && (
                            <select
                              value={valeur} disabled={!peutDepenseModifier} onChange={(e) => onChangerTaux(d, e.target.value)}
                              className="px-2 border border-bord-fort rounded-lg text-sm h-11 bg-surface text-encre" aria-label={`TVA de la facture : ${d.description}`}
                            >
                              {options.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
                            </select>
                          )}
                          {peutDepenseSupprimer && <BoutonIcone icone={Trash2} libelle={`Supprimer la dépense ${d.description}`} taille={16} onClick={() => onSupprimerDepense(d)} className="ml-auto sm:ml-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Carte>
            )}
          </div>
        )}
      </section>

      <section aria-label="Situations de travaux">{situations}</section>
    </div>
  );
}
