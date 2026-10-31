import { MapPin, Phone, Navigation, CheckCircle, Clock, Cloud, CloudRain, Sun, BarChart3, AlertTriangle, ChevronRight } from 'lucide-react';
import Carte from '../ui/Carte';
import TuileChiffre from '../ui/TuileChiffre';
import { Bouton } from '../ui/Bouton';
import { TitreSection } from '../ui/EnTete';
import { ouvrirLienExterne } from '../../lib/natif';
import { formatClientName } from '../../lib/formatters';
import { calculateGlobalAvancement, getCumulativeInvoiced } from '../../lib/situationUtils';

const LIBELLES_MARGE = (taux) => (taux < 0 ? 'Négative' : taux < 15 ? 'Faible' : taux < 30 ? 'Bonne' : 'Excellente');

/**
 * Onglet « Aperçu » de la fiche chantier : ce qu'il faut sur place (y aller, appeler, prévenir le client, pointer), puis
 * le résumé chiffré. Le dépassement du budget se dit UNE fois, sur la marge (audit UX du 20 oct. 2026) ; il se disait quatre
 * fois (bandeau rouge, pastille « Négatif », marge en rouge, barre rouge).
 */
export default function OngletApercu({
  chantier: ch, client, bilan, revenuTotal, totalFacture, resteAFacturer, avancement, tasksDone, tasksTotal, franchiseTva,
  modeDiscret, formatMoney, formatPct, weather, alertes = [], voitPrix = false, peutPointer, onPointer, onTaches, onFinances, notifierClient,
}) {
  const adresseComplete = [ch.adresse, [ch.codePostal, ch.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const tel = client?.telephone || client?.tel;
  const mention = franchiseTva ? '' : ' HT';
  const masque = (valeur) => (modeDiscret ? '•••••' : valeur);
  const pctBudget = revenuTotal > 0 ? Math.round((bilan.totalDepenses / revenuTotal) * 100) : 0;
  const margeNegative = bilan.hasDepenses && bilan.margeBrute < 0;

  return (
    <div className="space-y-6">
      {/* === SUR PLACE : y aller, appeler, prévenir le client, pointer === */}
      <Carte>
        <div className="grid grid-cols-2 gap-2">
          {[
            { cle: 'gps', icone: MapPin, libelle: 'Itinéraire', ok: !!adresseComplete, faire: () => ouvrirLienExterne(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete)}`), manque: 'Adresse non renseignée' },
            { cle: 'appel', icone: Phone, libelle: 'Appeler', ok: !!tel, faire: () => { window.location.href = `tel:${String(tel).replace(/\s/g, '')}`; }, manque: 'Aucun numéro' },
          ].map(({ cle, icone: Icone, libelle, ok, faire, manque }) => (
            <button
              key={cle} type="button" onClick={faire} disabled={!ok} title={ok ? libelle : manque}
              className="h-14 flex items-center justify-center gap-2 rounded-xl border border-bord-fort bg-surface text-encre text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Icone size={20} aria-hidden="true" /> {libelle}
            </button>
          ))}
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-sm text-encre-2">Adresse du chantier</dt>
            <dd className="text-base text-encre break-words">{adresseComplete || <span className="text-encre-3">Non renseignée</span>}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-encre-2">Client</dt>
            <dd className="text-base text-encre break-words">
              {client ? formatClientName(client) : <span className="text-encre-3">Aucun client associé</span>}
              {tel && <> · <a href={`tel:${String(tel).replace(/\s/g, '')}`} className="hover:underline tabular-nums">{tel}</a></>}
            </dd>
            {client?.email && <dd className="text-sm text-encre-2 truncate"><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></dd>}
          </div>
        </dl>

        <div className="mt-4 pt-4 border-t border-bord">
          <p className="text-sm font-semibold text-encre">Prévenir le client</p>
          <p className="text-sm text-encre-2">Le message est copié : collez-le dans vos SMS.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { cle: 'en_route', icone: Navigation, libelle: 'En route' },
              { cle: 'arrive', icone: MapPin, libelle: 'Arrivé' },
              { cle: 'termine', icone: CheckCircle, libelle: 'Fini' },
            ].map(({ cle, icone: Icone, libelle }) => (
              <button
                key={cle} type="button" onClick={() => notifierClient(cle)}
                className="h-12 flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 text-encre text-sm font-semibold transition-colors hover:bg-bord"
              >
                <Icone size={18} aria-hidden="true" /> {libelle}
              </button>
            ))}
          </div>
          {peutPointer && <Bouton variante="discret" icone={Clock} className="mt-2 -ml-2" onClick={onPointer}>Pointer des heures</Bouton>}
        </div>

        {weather === null && ch.adresse && (
          <div className="mt-3 rounded-xl p-3 flex items-center gap-2 bg-surface-2">
            <Cloud size={14} aria-hidden="true" className="text-encre-3" />
            <span className="text-sm text-encre-3">Météo indisponible pour ce chantier</span>
          </div>
        )}
        {weather?.daily?.length > 0 && !weather.isDefault && (
          <div className="mt-3 rounded-xl border p-3 bg-surface border-bord">
            <div className="flex items-center gap-2 mb-2">
              <Cloud size={14} aria-hidden="true" className="text-encre-3" />
              <span className="text-sm font-medium text-encre-2">Météo {weather.location || ch.ville || 'chantier'}</span>
            </div>
            <div className="flex gap-3">
              {weather.daily.slice(0, 3).map((jour, i) => {
                const libelles = ['Auj.', 'Dem.', 'J+2'];
                const Icone = jour.icon === 'sun' ? Sun : jour.icon === 'rain' ? CloudRain : Cloud;
                return (
                  <div key={i} className="text-center flex-1">
                    <p className="text-sm text-encre-3">{libelles[i]}</p>
                    <Icone size={18} aria-hidden="true" className={`mx-auto my-1 ${jour.icon === 'sun' ? 'text-alerte-texte' : jour.icon === 'rain' ? 'text-info-texte' : 'text-encre-3'}`} />
                    <p className="text-sm font-medium text-encre-2">{jour.temp}°C</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Carte>

      {/* === RÉSUMÉ CHIFFRÉ : quatre chiffres, une seule alerte (la marge) — réservé aux rôles qui voient les prix === */}
      {voitPrix && (
      <section aria-label="Résumé chiffré">
        <TitreSection titre="En chiffres" action="Voir les finances" onAction={onFinances} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TuileChiffre
            libelle={`Budget${mention}`} valeur={masque(formatMoney(revenuTotal))}
            contexte={revenuTotal > 0 ? undefined : 'Non défini'}
          />
          <TuileChiffre
            libelle={`Dépensé${mention}`} valeur={masque(formatMoney(bilan.totalDepenses))}
            contexte={revenuTotal > 0 ? `${pctBudget} % du budget` : undefined}
          />
          <TuileChiffre
            libelle={`Facturé${mention}`} valeur={masque(formatMoney(totalFacture))}
            contexte={resteAFacturer > 0 && !modeDiscret ? `Reste ${formatMoney(resteAFacturer)}${mention} à facturer` : undefined}
          />
          <TuileChiffre
            libelle="Marge brute" valeur={masque(bilan.hasDepenses ? formatPct(bilan.tauxMarge) : '—')}
            alerte={margeNegative && !modeDiscret ? (revenuTotal > 0 && bilan.totalDepenses > revenuTotal ? `Budget dépassé de ${pctBudget - 100}\u00a0%` : 'Marge négative') : undefined} tonAlerte="alerte"
            contexte={bilan.hasDepenses && !margeNegative ? LIBELLES_MARGE(bilan.tauxMarge) : bilan.hasDepenses ? undefined : 'Pas encore de dépense'}
          />
        </div>
      </section>
      )}

      {/* === AVANCEMENT === */}
      <Carte>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold text-encre">Avancement</p>
          <p className="text-base font-bold tabular-nums text-encre">{avancement} %</p>
        </div>
        <div className="mt-2 h-2 rounded-full overflow-hidden bg-surface-2" role="progressbar" aria-valuenow={avancement} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du chantier">
          <div className="h-full rounded-full transition-all duration-500 bg-accent" style={{ width: `${Math.min(100, Math.max(0, avancement))}%` }} />
        </div>
        <button type="button" onClick={onTaches} className="mt-2 w-full min-h-[44px] flex items-center justify-between gap-3 text-left text-sm text-encre-2 hover:text-encre">
          <span className="min-w-0">{tasksTotal > 0 ? `${tasksDone} tâche${tasksDone > 1 ? 's' : ''} faite${tasksDone > 1 ? 's' : ''} sur ${tasksTotal}` : 'Aucune tâche pour le moment'}</span>
          <span className="inline-flex items-center gap-1 flex-shrink-0 whitespace-nowrap font-semibold text-accent-texte">Les tâches <ChevronRight size={16} aria-hidden="true" /></span>
        </button>
      </Carte>

      {/* Avancement des travaux facturés par situations */}
      {ch.situations_data?.mode === 'situation' && (() => {
        const global = calculateGlobalAvancement(ch.situations_data);
        const nb = ch.situations_data?.situations?.length || 0;
        const facture = getCumulativeInvoiced(ch.situations_data?.situations || []);
        return (
          <Carte>
            <div className="flex items-center justify-between mb-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 size={16} aria-hidden="true" className="text-encre-3 flex-shrink-0" />
                <span className="text-sm font-semibold text-encre">Avancement travaux</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-2 text-encre-2">{nb} situation{nb > 1 ? 's' : ''}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums ${global >= 100 ? 'text-succes-texte' : 'text-accent-texte'}`}>{modeDiscret ? '***' : `${global.toFixed(0)}%`}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden bg-bord">
              <div className={`h-full rounded-full transition-all duration-500 ${global >= 100 ? 'bg-succes-point' : 'bg-accent'}`} style={{ width: `${Math.min(global, 100)}%` }} />
            </div>
            {voitPrix && !modeDiscret && facture.totalFactureHT > 0 && (
              <p className="text-sm text-encre-2 mt-1.5">
                Facturé : {formatMoney(facture.totalFactureHT)}{mention}
                {facture.retenueRetenue > 0 && <> · Retenue : {formatMoney(facture.retenueRetenue)}</>}
              </p>
            )}
          </Carte>
        );
      })()}

      {/* Alertes à surveiller (ambre) : un fait chacune */}
      {alertes.length > 0 && (
        <ul className="space-y-2">
          {alertes.map((a) => (
            <li key={a.cle} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-alerte-fond text-alerte-texte">
              <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" />
              <span className="text-sm font-semibold">{a.libelle}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
