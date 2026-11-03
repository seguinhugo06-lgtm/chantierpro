import { ChevronRight } from 'lucide-react';
import { Volet } from '../ui/Filtres';
import { PastilleStatut } from '../ui/Pastille';
import { formatMoney } from '../../lib/formatters';

/**
 * ChoixStatut — « Changer le statut » d'un devis ou d'une facture, depuis la liste ou la fiche (retours d'Hugo du
 * 3 nov. 2026). Les choix viennent de choixDeStatut (src/lib/changementStatut.js) ; ce que fait chacun est dit sous
 * son nom quand il engage plus qu'un statut (encaissement, émission). Feuille du bas sur téléphone.
 *
 * @param {object|null} doc document dont on change le statut (null : fermé)
 * @param {string} statutAffiche statut de la pastille (celui de la liste : une facture payée en partie, en retard…)
 * @param {Array} choix sortie de choixDeStatut
 * @param {boolean} voirMontants canViewPrices
 * @param {Function} onChoisir (choix) => void
 * @param {Function} onFermer
 */
export default function ChoixStatut({ doc, statutAffiche, choix = [], voirMontants = false, onChoisir, onFermer }) {
  const genre = doc?.type === 'facture' ? 'facture' : 'devis';
  const detail = (c) => {
    if (c.geste === 'encaisser') return voirMontants ? `Enregistre le paiement reçu du reste dû : ${formatMoney(c.reste, 2)}` : 'Enregistre le paiement reçu du reste dû';
    // Émettre n'envoie rien au client (relecture juriste-btp du 3 nov. 2026)
    if (c.geste === 'emettre') return 'Émet la facture : son numéro devient définitif. Pensez à l’envoyer à votre client.';
    if (c.cle === 'accepte') return 'Votre client a signé le devis sur papier';
    return '';
  };
  return (
    <Volet ouvert={!!doc} onFermer={onFermer} titre="Changer le statut" largeur={340}>
      {doc ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-encre-2">
            Statut actuel <PastilleStatut genre={genre} statut={statutAffiche || doc.statut} />
          </p>
          <ul className="-mx-2 space-y-1" aria-label="Nouveau statut">
            {choix.map((c) => (
              <li key={c.cle}>
                <button
                  type="button"
                  onClick={() => onChoisir(c)}
                  className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-surface-2 active:bg-surface-2"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-encre">{c.libelle}</span>
                    {detail(c) ? <span className="block text-sm text-encre-2">{detail(c)}</span> : null}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Volet>
  );
}
