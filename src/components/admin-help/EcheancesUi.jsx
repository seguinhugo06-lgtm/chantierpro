import { ExternalLink, AlertTriangle } from 'lucide-react';
import { QUESTIONS, LIBELLES_CERTITUDE, dateEcheanceLue } from '../../lib/echeancesAdmin';

/** Compte à rebours d'une échéance : « Aujourd'hui », « J-12 », « Expirée depuis 3 j ». */
export function compteARebours(x) {
  if (x.joursRestants === null || x.joursRestants === undefined) return null;
  if (x.joursRestants < 0) return { texte: `Dépassée de ${Math.abs(x.joursRestants)} j`, ton: 'danger' };
  if (x.joursRestants === 0) return { texte: 'Aujourd’hui', ton: 'danger' };
  return { texte: `J-${x.joursRestants}`, ton: x.joursRestants <= 7 ? 'danger' : x.joursRestants <= 14 ? 'alerte' : 'neutre' };
}

const TONS = {
  danger: 'bg-danger-fond text-danger-texte',
  alerte: 'bg-alerte-fond text-alerte-texte',
  neutre: 'bg-surface-2 text-encre-2',
};

/** Une échéance : titre, date, ce qu'il faut savoir, source. */
export function LigneEcheance({ echeance: x, detaillee = false }) {
  const rebours = compteARebours(x);
  const certitude = LIBELLES_CERTITUDE[x.certitude];
  return (
    <div data-echeance={x.id} className="p-3 rounded-lg bg-fond border border-bord">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-encre flex items-center gap-1.5">
            {rebours?.ton === 'danger' && <AlertTriangle size={14} className="flex-shrink-0 text-danger-texte" aria-hidden="true" />}
            <span>{x.titre}</span>
          </p>
          <p className="text-xs text-encre-2 mt-0.5 first-letter:uppercase">{dateEcheanceLue(x)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {rebours && <span className={`px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums ${TONS[rebours.ton]}`}>{rebours.texte}</span>}
          {certitude && <span className="px-2 py-0.5 rounded-lg text-xs bg-info-fond text-info-texte whitespace-nowrap">{certitude}</span>}
        </div>
      </div>
      {detaillee && x.detail && <p className="text-xs text-encre-2 mt-2">{x.detail}</p>}
      {detaillee && x.source?.url && (
        <a href={x.source.url} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-texte underline min-h-[44px]">
          <ExternalLink size={12} aria-hidden="true" />
          {x.source.libelle}
        </a>
      )}
      {detaillee && !x.source?.url && x.source?.libelle && <p className="text-xs text-encre-3 mt-2">Source : {x.source.libelle}</p>}
    </div>
  );
}

/** Les questions encore sans réponse, posées une fois (réponses gardées sur cet appareil). */
export function QuestionsProfil({ questions, onRepondre }) {
  if (!questions.length) return null;
  return (
    <div data-questions-profil className="p-3 rounded-lg bg-info-fond space-y-3">
      <p className="text-sm text-info-texte">Pour des dates justes, {questions.length === 1 ? 'une question' : `${questions.length} questions`} (posées une seule fois) :</p>
      {questions.map((cle) => (
        <div key={cle}>
          <p className="text-sm font-medium text-encre mb-1.5">{QUESTIONS[cle].libelle}</p>
          <div role="group" aria-label={QUESTIONS[cle].libelle} className="flex flex-wrap gap-2">
            {QUESTIONS[cle].options.map((o) => (
              <button key={o.valeur} type="button" onClick={() => onRepondre(cle, o.valeur)}
                className="min-h-[44px] px-3 rounded-lg text-sm font-medium bg-surface text-encre border border-bord-fort hover:bg-surface-2">
                {o.libelle}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
