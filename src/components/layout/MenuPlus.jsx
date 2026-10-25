import { MessageCircle, Sun, Moon, LogOut } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalBody } from '../ui/Modal';
import { PastilleCompte } from './PastilleCompte';

/**
 * « Plus » de la barre du bas (téléphone) : une feuille du bas qui ne montre QUE les rubriques absentes de la barre
 * (Planning, Catalogue, Équipe, Finances, Paramètres, Mon plan), en tuiles de 64 px, puis « Un bug ? », le thème et
 * la déconnexion. Audit UX du 20 oct. 2026, § 2.1 : « Plus » ouvrait toute la barre latérale depuis la gauche, loin
 * du pouce, et répétait les quatre onglets déjà visibles.
 *
 * @param {Array<{id, icon, label, badge?, badgeTon?, badgeTitle?}>} rubriques  déjà filtrées par les droits du rôle
 */
export default function MenuPlus({ ouvert, onFermer, rubriques, page, onAller, sombre, onTheme, onRetour, onDeconnexion }) {
  return (
    <Modal isOpen={ouvert} onClose={onFermer} size="sm">
      <ModalHeader>
        <ModalTitle>Autres rubriques</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <nav aria-label="Autres rubriques" className="grid grid-cols-3 gap-2">
          {rubriques.map((r) => {
            const actif = page === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onAller(r.id)}
                aria-current={actif ? 'page' : undefined}
                /* cible-compacte : la règle tactile des 44 px (index.css) écraserait la hauteur de la tuile, qui est plus grande */
                className={`cible-compacte relative min-h-[76px] flex flex-col items-center justify-center gap-1.5 px-1 py-2 rounded-2xl text-sm font-medium text-center leading-tight transition-colors ${
                  actif ? 'bg-accent/15 text-accent-texte font-semibold' : 'bg-surface-2 text-encre hover:bg-bord'
                }`}
              >
                <r.icon size={22} aria-hidden="true" />
                <span>{r.label}</span>
                {r.badge > 0 && (
                  <PastilleCompte n={r.badge} ton={r.badgeTon} titre={r.badgeTitle} className="absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-bord divide-y divide-bord overflow-hidden">
          <button type="button" onClick={onRetour} className="w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-base font-medium text-encre hover:bg-surface-2">
            <MessageCircle size={20} className="text-encre-3 flex-shrink-0" aria-hidden="true" />
            Un bug ? Une idée ?
          </button>
          <button type="button" onClick={onTheme} className="w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-base font-medium text-encre hover:bg-surface-2">
            {sombre ? <Sun size={20} className="text-encre-3 flex-shrink-0" aria-hidden="true" /> : <Moon size={20} className="text-encre-3 flex-shrink-0" aria-hidden="true" />}
            {sombre ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button type="button" onClick={onDeconnexion} className="w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-base font-medium text-danger-texte hover:bg-danger-fond">
            <LogOut size={20} className="flex-shrink-0" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
}
