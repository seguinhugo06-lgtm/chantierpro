import { Camera, X } from 'lucide-react';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { dateLue } from '../../lib/dates';

export const CATEGORIES_PHOTO = ['avant', 'pendant', 'après', 'litige'];

/**
 * Onglet « Photos » de la fiche chantier : le carnet photos (avant, pendant, après, litige), chaque photo datée à
 * l'heure près. La limite de photos du plan se lit au-dessus ; au premier usage, un seul bouton plein, « Prendre une photo ».
 */
export default function OngletPhotos({ photos = [], totalPhotos, peutModifier, onAjouter, onSupprimer, onVoir }) {
  const limite = useSubscriptionStore.getState().getLimit('photos');
  const limiteAtteinte = limite !== -1 && totalPhotos >= limite;
  const limiteProche = limite !== -1 && totalPhotos >= limite * 0.8;

  return (
    <Carte>
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-encre">Carnet photos</h2>
          <p className="text-sm text-encre-2 mt-0.5">Chaque photo garde sa date et son heure : utile en cas de désaccord.</p>
        </div>
        {limite !== -1 && (
          <button
            type="button"
            onClick={limiteAtteinte ? () => useSubscriptionStore.getState().openUpgradeModal('photos') : undefined}
            className={`text-sm font-semibold px-3 min-h-[32px] rounded-full whitespace-nowrap ${limiteAtteinte || limiteProche ? 'bg-alerte-fond text-alerte-texte' : 'bg-surface-2 text-encre-2'}`}
            title={limiteAtteinte ? 'Limite atteinte : voir les plans' : `${totalPhotos} photos sur ${limite}`}
          >
            {totalPhotos} / {limite} photos{limiteAtteinte ? ' · voir les plans' : ''}
          </button>
        )}
      </div>

      {peutModifier && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {CATEGORIES_PHOTO.map((cat) => (
            <label
              key={cat}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl cursor-pointer font-semibold min-h-[64px] border transition-colors ${cat === 'litige' ? 'border-alerte-point/50 text-alerte-texte hover:bg-alerte-fond' : 'border-bord-fort text-encre hover:bg-surface-2'}`}
            >
              <Camera size={20} aria-hidden="true" />
              <span className="text-sm first-letter:uppercase">{cat}</span>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => onAjouter(e, cat)} className="hidden" />
            </label>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="rounded-xl bg-surface-2">
          <EtatVide
            icone={Camera} titre="Aucune photo pour l'instant"
            texte="Une photo avant de commencer garde l'état des lieux, avec sa date et son heure."
            action={peutModifier ? (
              <label className="cursor-pointer">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onAjouter(e, 'pendant')} />
                <span className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-base font-semibold bg-surface text-encre border border-bord-fort hover:bg-surface-2">
                  <Camera size={20} aria-hidden="true" /> Prendre une photo
                </span>
              </label>
            ) : null}
            className="py-8"
          />
        </div>
      ) : (
        <div className="space-y-5">
          {[...CATEGORIES_PHOTO, 'autres'].map((cat) => {
            const dansCategorie = photos.filter((p) => (cat === 'autres' ? !CATEGORIES_PHOTO.includes(p.categorie) : p.categorie === cat));
            if (dansCategorie.length === 0) return null;
            return (
              <div key={cat}>
                <p className={`text-sm font-semibold mb-2 first-letter:uppercase ${cat === 'litige' ? 'text-alerte-texte' : 'text-encre'}`}>
                  {cat} <span className="font-medium text-encre-3 tabular-nums">{dansCategorie.length}</span>
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {dansCategorie.map((p) => (
                    <div key={p.id} className="relative group flex-shrink-0">
                      <button type="button" className="relative block cursor-pointer focus-visible:ring-2 outline-none rounded-xl" onClick={() => onVoir(p)} aria-label={`Voir la photo (${cat})`}>
                        <img
                          src={p.src}
                          className={`w-28 h-28 object-cover rounded-xl hover:opacity-90 transition-opacity border-2 ${cat === 'litige' ? 'border-alerte-point' : 'border-bord'}`}
                          alt={`Photo ${cat} du chantier - ${p.date ? dateLue(p.date).toLocaleDateString('fr-FR') : ''}`}
                        />
                        {/* Horodatage : la preuve en cas de litige */}
                        <span className="absolute bottom-0 left-0 right-0 px-2 py-1 rounded-b-xl text-xs text-white font-medium bg-black/70">
                          {p.date ? dateLue(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''}
                          {p.date && <span className="ml-1 opacity-75">{new Date(p.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </span>
                      </button>
                      {peutModifier && (
                        /* Supprimer : à côté de la photo, pas dedans (un bouton dans un bouton est invalide) */
                        <button
                          type="button" onClick={() => onSupprimer(p.id)} aria-label="Supprimer la photo"
                          className="absolute -top-2 -right-2 w-11 h-11 bg-surface border border-bord-fort text-danger-texte rounded-full sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 flex items-center justify-center shadow-e2 transition-opacity"
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Carte>
  );
}
