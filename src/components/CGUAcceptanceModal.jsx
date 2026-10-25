/**
 * CGUAcceptanceModal — acceptation des conditions générales d'utilisation (LEGAL-001).
 *
 * Les CGU s'acceptent à l'inscription, par une case (App.jsx, décision du 25 oct. 2026). Cette fenêtre reste pour :
 * - un compte créé avant la case, au premier document (garde unique de DataContext, `exigerCgu`) ;
 * - une nouvelle version des CGU.
 * L'acceptation est enregistrée dans les métadonnées du compte de l'utilisateur (cgu_version, cgu_accepted_at) : un
 * membre invité accepte pour lui-même. Tant qu'elle ne l'est pas, la fenêtre reste ouverte et dit pourquoi.
 * Avant (retour d'Hugo sur « Au Bon Volt », 21-23 oct. 2026), elle surgissait au premier réglage enregistré.
 */

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton } from './ui/Bouton';

const CGU_VERSION = '2025-02'; // Bump this when CGU content changes
const CGU_VERSION_DATE = 'février 2025'; // la date de cette version, telle que l'affichent la case et la fenêtre

/**
 * @param {(version: string) => Promise<true|string>} onAccept  enregistre l'acceptation ; sinon, le message qui dit pourquoi
 * @param {() => void} onAnnuler  l'artisan renonce au geste (le document n'est pas créé)
 * @param {'premier'|'version'} [motif]  premier document, ou nouvelle version des conditions
 */
export default function CGUAcceptanceModal({ onAccept, onAnnuler, motif = 'premier' }) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [erreur, setErreur] = useState('');
  const scrollRef = useRef(null);

  // La case ne s'active qu'une fois le texte lu jusqu'au bout
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setHasScrolledToEnd(true);
  };

  // Texte assez court pour tenir sans défiler (grand écran) : la case est active d'emblée
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 40) {
      setHasScrolledToEnd(true);
    }
  }, []);

  const handleAccept = async () => {
    if (!checked || isAccepting) return;
    setIsAccepting(true);
    setErreur('');
    try {
      const enregistree = await onAccept(CGU_VERSION);
      if (enregistree !== true) setErreur(typeof enregistree === 'string' ? enregistree : 'Acceptation non enregistrée. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Modal isOpen onClose={() => { if (!isAccepting) onAnnuler?.(); }} size="lg" closeOnBackdrop={false}>
      <ModalHeader>
        <ModalTitle>Conditions générales d'utilisation</ModalTitle>
        <ModalDescription>
          {motif === 'version'
            ? `Les conditions d'utilisation ont changé (version de ${CGU_VERSION_DATE}). Lisez-les et acceptez-les pour continuer à créer des documents. Vos données et vos documents restent accessibles et exportables, que vous acceptiez ou non.`
            : 'Avant votre premier document, lisez et acceptez les conditions d’utilisation de Mallettico.'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody ref={scrollRef} onScroll={handleScroll} className="text-sm text-encre-2 leading-relaxed space-y-5">
          <section>
            <h3 className="text-base font-semibold text-encre mb-2">1. Objet</h3>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service Mallettico. Elles sont acceptées en cochant la case prévue à la création du compte ; pour un compte créé avant cette case, elles sont acceptées avant la création d'un premier document.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">2. Description du service</h3>
            <p>
              Mallettico est un logiciel en ligne (SaaS) de gestion de chantier destiné aux artisans et entreprises du BTP. Il permet notamment la création et gestion de devis et factures, le suivi de chantier et de rentabilité, la gestion d'équipe, le suivi de trésorerie, la gestion d'un catalogue de prestations, et la planification.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">3. Inscription et compte</h3>
            <p>
              L'accès au service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'utilisateur est responsable de la confidentialité de ses identifiants. Toute utilisation du compte est réputée faite par l'utilisateur.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">4. Offres et tarification</h3>
            <p>
              Mallettico propose plusieurs formules d'abonnement, dont une offre gratuite avec des fonctionnalités limitées. Les tarifs des offres payantes sont indiqués sur la page Tarifs et peuvent être modifiés avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">5. Données de l'utilisateur</h3>
            <p>
              L'utilisateur reste propriétaire de l'ensemble des données qu'il saisit dans le service. Mallettico s'engage à ne pas utiliser ces données à des fins commerciales. L'utilisateur peut à tout moment exporter ou supprimer ses données. En cas de résiliation, les données seront conservées pendant 30 jours puis supprimées définitivement.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">6. Protection des données (RGPD)</h3>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), Mallettico s'engage à protéger les données personnelles de ses utilisateurs. Les données de votre compte sont stockées dans une base hébergée à Paris. Certains prestataires techniques (envoi d'e-mails, diffusion du site) peuvent les traiter hors de l'Union, dans le cadre de clauses contractuelles types : la liste est dans la politique de confidentialité. L'utilisateur dispose d'un droit d'accès, de rectification, de portabilité et de suppression de ses données, exerçable depuis les paramètres du compte ou par email à contact@mallettico.fr.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">7. Responsabilité</h3>
            <p>
              Mallettico fournit le service "en l'état" et ne garantit pas l'absence d'erreurs ou d'interruptions. L'utilisateur est seul responsable de la vérification des montants, calculs et informations générées par le service. Mallettico ne se substitue pas à un expert-comptable.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">8. Disponibilité</h3>
            <p>
              Mallettico s'efforce de maintenir le service accessible 24h/24, 7j/7, mais ne peut garantir une disponibilité permanente. Des interruptions pour maintenance pourront avoir lieu.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">9. Résiliation</h3>
            <p>
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres. Mallettico se réserve le droit de suspendre un compte en cas de violation des CGU, après notification préalable.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-encre mb-2">10. Droit applicable</h3>
            <p>
              Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable.
            </p>
          </section>

          <p className="text-xs text-encre-3 pt-2">Version {CGU_VERSION} — Dernière mise à jour : février 2025</p>
      </ModalBody>

      {!hasScrolledToEnd && (
        <div className="flex items-center justify-center gap-1 py-2 text-xs text-encre-3 border-t border-bord">
          <ChevronDown size={14} className="animate-bounce" aria-hidden="true" />
          Faites défiler pour lire la suite
        </div>
      )}

      <ModalFooter className="flex-col !items-stretch gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolledToEnd ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            disabled={!hasScrolledToEnd}
            className="mt-0.5 w-5 h-5 rounded border-bord-fort accent-accent flex-shrink-0"
          />
          <span className="text-sm text-encre">
            J'ai lu et j'accepte les <strong>Conditions Générales d'Utilisation</strong> de Mallettico (version de {CGU_VERSION_DATE})
          </span>
        </label>
        {erreur && <p role="alert" className="text-sm font-medium text-danger-texte">{erreur}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Bouton variante="discret" onClick={onAnnuler} disabled={isAccepting}>Annuler</Bouton>
          <Bouton variante="principal" icone={Check} onClick={handleAccept} disabled={!checked} chargement={isAccepting}>
            {isAccepting ? 'Enregistrement…' : 'Accepter et continuer'}
          </Bouton>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export { CGU_VERSION, CGU_VERSION_DATE };
