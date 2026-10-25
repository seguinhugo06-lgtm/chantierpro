import { useRef } from 'react';
import { Settings, CreditCard, Sun, Moon, Smartphone, HelpCircle, MessageCircle, LogOut } from 'lucide-react';
import useKeepInViewport from '../../hooks/useKeepInViewport';

/**
 * Menu de l'avatar (en-tête) : le compte et les réglages de l'appareil. Audit UX du 20 oct. 2026, § 2.1 : l'en-tête
 * du bureau portait 7 commandes (thème, aide, confidentiel, installer, notifications, « + Nouveau », avatar) ; le thème,
 * l'installation et l'aide viennent ici, une seule fois.
 *
 * @param {{ settings?: boolean, plan?: boolean }} acces  rubriques ouvertes au rôle
 */
export default function MenuCompte({ ouvert, onFermer, email, nomEntreprise, acces = {}, onAller, sombre, onTheme, installable, onInstaller, onAide, onRetour, onDeconnexion }) {
  const panneau = useRef(null);
  useKeepInViewport(panneau, ouvert);
  if (!ouvert) return null;

  const entree = (Icone, libelle, action, { danger = false } = {}) => (
    <button
      key={libelle}
      type="button"
      role="menuitem"
      onClick={() => { onFermer(); action(); }}
      className={`w-full min-h-[48px] flex items-center gap-3 px-4 text-left text-base sm:text-sm font-medium transition-colors ${
        danger ? 'text-danger-texte hover:bg-danger-fond' : 'text-encre hover:bg-surface-2'
      }`}
    >
      <Icone size={18} className={`flex-shrink-0 ${danger ? '' : 'text-encre-3'}`} aria-hidden="true" />
      <span>{libelle}</span>
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={onFermer} />
      <div
        ref={panneau}
        role="menu"
        aria-label="Mon compte"
        onKeyDown={(e) => { if (e.key === 'Escape') onFermer(); }}
        className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-2xl shadow-e3 z-50 py-1.5 overflow-hidden bg-surface border border-bord"
      >
        <div className="px-4 pt-2 pb-3 border-b border-bord">
          {nomEntreprise ? <p className="text-sm font-semibold text-encre truncate">{nomEntreprise}</p> : null}
          <p className="text-sm text-encre-3 truncate">{email}</p>
        </div>
        <div className="py-1">
          {acces.settings && entree(Settings, 'Paramètres', () => onAller('settings'))}
          {acces.plan && entree(CreditCard, 'Mon plan', () => onAller('plan'))}
          {entree(sombre ? Sun : Moon, sombre ? 'Mode clair' : 'Mode sombre', onTheme)}
          {installable && entree(Smartphone, 'Installer l’application', onInstaller)}
          {entree(HelpCircle, 'Aide', onAide)}
          {entree(MessageCircle, 'Un bug ? Une idée ?', onRetour)}
        </div>
        <div className="py-1 border-t border-bord">
          {entree(LogOut, 'Se déconnecter', onDeconnexion, { danger: true })}
        </div>
      </div>
    </>
  );
}
