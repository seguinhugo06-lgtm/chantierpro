import { useState } from 'react';
import { PlugZap, ChevronDown } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import { estLigneBorne, suggestionTvaBorne, REGIME_BORNE, POINTS_DE_CHARGE, LOCAUX, TEXTE_FOURNITURE } from '../../lib/electricite';

function Choix({ libelle, options, valeur, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="block mb-1.5 text-sm font-medium text-encre-2">{libelle}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.valeur} type="button" aria-pressed={o.valeur === valeur} onClick={() => onChange(o.valeur === valeur ? '' : o.valeur)}
            className={`min-h-[44px] px-3 rounded-xl border text-sm font-medium text-left ${o.valeur === valeur ? 'bg-accent text-sur-accent border-accent' : 'bg-surface text-encre border-bord-fort hover:bg-surface-2'}`}>
            {o.libelle}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Case({ libelle, valeur, onChange }) {
  return (
    <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" checked={valeur === true} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-encre">{libelle}</span>
    </label>
  );
}

/**
 * Sous une ligne de devis qui parle d'une borne de recharge : la TVA de la pose suggérée selon le LOCAL (CGI 278-0 bis,
 * N), jamais selon le client, et jamais imposée (décision d'Hugo n° 22). « Appliquer » pose 5,5 % et marque la ligne
 * (`regimeTva`), ce qui la retire de la certification de rénovation énergétique imprimée par les deux générateurs.
 */
export default function TvaBorne({ ligne, onUpdate }) {
  const [ouvert, setOuvert] = useState(false);
  if (!estLigneBorne(ligne?.description)) return null;
  const reponses = ligne.borne || {};
  const repondre = (champ, v) => onUpdate('borne', { ...reponses, [champ]: v });
  const s = suggestionTvaBorne(reponses);
  const marquee = ligne.regimeTva === REGIME_BORNE;
  const aCinqCinqSansMarque = Number(ligne.tva) === 5.5 && !marquee;

  return (
    <div className="px-3 sm:px-4 pb-3" data-testid="tva-borne">
      <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((v) => !v)}
        className="w-full min-h-[44px] flex items-center gap-2 text-left text-sm font-medium text-accent-texte">
        <PlugZap size={16} aria-hidden="true" className="flex-shrink-0" />
        <span className="flex-1">{marquee ? 'Pose de borne à 5,5 % (CGI art. 278-0 bis, N)' : 'Borne de recharge : quel taux pour la pose ?'}</span>
        <ChevronDown size={16} aria-hidden="true" className={ouvert ? 'rotate-180' : ''} />
      </button>
      {aCinqCinqSansMarque && (
        <p className="text-sm text-alerte-texte">À 5,5 %, le devis imprime la certification de travaux de rénovation énergétique, qui ne vise pas une borne : répondez aux questions ci-dessous.</p>
      )}
      {ouvert && (
        <div className="mt-2 space-y-3 rounded-2xl border border-bord bg-surface-2 p-3">
          <Choix libelle="Où est posée la borne ?" options={LOCAUX} valeur={reponses.local} onChange={(v) => repondre('local', v)} />
          <Case libelle="La borne est destinée aux résidents du logement" valeur={reponses.residents} onChange={(v) => repondre('residents', v)} />
          <Choix libelle="Point de charge" options={POINTS_DE_CHARGE} valeur={reponses.pointDeCharge} onChange={(v) => repondre('pointDeCharge', v)} />
          <Case libelle="J’ai l’habilitation et, au-delà de 3,7 kW, la qualification IRVE (décret n° 2017-26, art. 22)" valeur={reponses.installateurQualifie} onChange={(v) => repondre('installateurQualifie', v)} />
          <Case libelle="Cette ligne ne comprend que la pose (la fourniture est sur une autre ligne)" valeur={reponses.poseSeule} onChange={(v) => repondre('poseSeule', v)} />
          <p role="status" className={`text-sm ${s.taux ? 'text-succes-texte' : 'text-encre-2'}`}>{s.texte}</p>
          <p className="text-sm text-encre-3">{TEXTE_FOURNITURE}</p>
          {s.taux && !marquee && reponses.poseSeule !== true && (
            <p className="text-sm text-alerte-texte">Pour appliquer 5,5 %, la ligne ne doit comprendre que la pose : mettez la fourniture sur une autre ligne, puis cochez la case ci-dessus.</p>
          )}
          {s.taux && !marquee && reponses.poseSeule === true && (
            <Bouton variante="secondaire" taille="compacte" onClick={() => { onUpdate('tva', s.taux); onUpdate('regimeTva', REGIME_BORNE); }}>
              Appliquer 5,5 % à cette ligne (pose)
            </Bouton>
          )}
          {marquee && <p className="text-sm text-encre-2">Pour changer, choisissez un autre taux sur la ligne.</p>}
        </div>
      )}
    </div>
  );
}
