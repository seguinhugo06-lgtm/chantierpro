/**
 * EntrepriseSwitcher.jsx — l'entreprise active, en haut du menu latéral et de l'en-tête.
 *
 * - Une seule entreprise, une seule organisation : le logo et le nom (le menu latéral mène aux
 *   Paramètres pour qui y a accès).
 * - Membre invité dans une équipe : « Équipe · Ouvrier » sous le nom (recette du 11 oct. 2026 : une
 *   ouvrière invitée n'avait aucune indication d'être dans l'équipe).
 * - Plusieurs organisations (son entreprise et une équipe rejointe) ou plusieurs entreprises : un
 *   menu pour basculer. Changer d'organisation recharge l'app sur la nouvelle (OrgContext).
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { ChevronDown, Check, Settings } from 'lucide-react';
import LogoMallettico from './LogoMallettico';
import { useEntreprise } from '../../context/EntrepriseContext';
import { useOrg } from '../../context/OrgContext';
import { isDemo } from '../../supabaseClient';
import { canAccessPage, getRoleLabel } from '../../lib/permissions';
import useKeepInViewport from '../../hooks/useKeepInViewport';
import { captureException } from '../../lib/sentry';

/**
 * Initiales d'un nom d'entreprise : « Martin Rénovation » → « MR », « Dupont » → « DU ».
 */
function getInitiales(ent) {
  if (ent.initiales) return ent.initiales;
  const nom = ent.nom || '';
  const words = nom.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return nom.slice(0, 2).toUpperCase() || '??';
}

const EntrepriseSwitcher = memo(function EntrepriseSwitcher({
  compact = false,
  user = null,
  onNavigateSettings,
}) {
  const { entreprises, activeEntreprise, hasMultiple, switchEntreprise } = useEntreprise();
  const { role, orgId, organisations = [], changerOrganisation } = useOrg();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  useKeepInViewport(menuRef, isOpen);

  // Fermer au clic extérieur et à Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const nom = activeEntreprise?.nom || 'Mallettico';
  const membre = !isDemo && !!role && role !== 'owner';
  const plusieursOrgs = organisations.length > 1;
  const avecMenu = hasMultiple || plusieursOrgs;
  const peutReglages = canAccessPage(role, 'settings');
  const sousTitre = membre ? `Équipe · ${getRoleLabel(role)}` : (user?.email || '');

  const logo = (
    <span className="w-10 h-10 flex items-center justify-center flex-shrink-0">
      <LogoMallettico taille={38} />
    </span>
  );

  // ── Sans menu ──
  if (!avecMenu) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          {logo}
          <span className="font-semibold text-sm truncate hidden sm:block lg:text-base text-encre" title={nom}>
            {nom}
          </span>
        </div>
      );
    }
    const contenu = (
      <>
        {logo}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-sm truncate text-encre" title={nom}>{nom}</p>
          {sousTitre && <p className="text-xs truncate text-encre-3">{sousTitre}</p>}
        </div>
      </>
    );
    // Un ouvrier n'a pas accès aux Paramètres : pas de bouton qui ne mène nulle part
    if (!peutReglages) {
      return <div className="flex items-center gap-3 flex-1 min-w-0 -m-1 p-2">{contenu}</div>;
    }
    return (
      <button
        type="button"
        onClick={() => onNavigateSettings?.()}
        className="group flex items-center gap-3 flex-1 min-w-0 rounded-xl -m-1 p-2 transition-colors hover:bg-surface-2"
        title="Paramètres de l'entreprise"
      >
        {contenu}
      </button>
    );
  }

  // ── Avec menu : organisations et/ou entreprises ──
  const choisirEntreprise = async (id) => {
    setIsOpen(false);
    if (id === activeEntreprise?.id) return;
    try {
      await switchEntreprise(id);
    } catch (err) {
      // Refusée par la base : l'entreprise affichée reste la même (rien n'a changé)
      captureException(err, { context: "changement d'entreprise" });
    }
  };
  const choisirOrganisation = (id) => {
    setIsOpen(false);
    changerOrganisation?.(id);
  };

  const menu = isOpen && (
    <div
      ref={menuRef}
      className={`absolute top-full left-0 mt-2 ${compact ? 'w-72' : 'right-0'} rounded-2xl border border-bord bg-surface shadow-e3 z-50 overflow-hidden`}
    >
      <div className="py-2 max-h-[70vh] overflow-y-auto">
        {plusieursOrgs && (
          <>
            <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-encre-3">Mes organisations</p>
            {organisations.map((org) => {
              const active = org.id === orgId;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => choisirOrganisation(org.id)}
                  aria-current={active || undefined}
                  className={`w-full min-h-11 flex items-center gap-3 px-4 py-2 text-left transition-colors ${active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-encre">{org.nom}</p>
                    <p className="text-xs truncate text-encre-3">{org.role === 'owner' ? 'Votre entreprise' : `Équipe · ${getRoleLabel(org.role)}`}</p>
                  </div>
                  {active && <Check size={16} className="flex-shrink-0 text-accent-texte" aria-hidden="true" />}
                </button>
              );
            })}
          </>
        )}

        {hasMultiple && (
          <>
            {plusieursOrgs && <div className="my-1 border-t border-bord" />}
            <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-encre-3">Mes entreprises</p>
            {entreprises.map((ent) => {
              const active = ent.id === activeEntreprise?.id;
              return (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => choisirEntreprise(ent.id)}
                  aria-current={active || undefined}
                  className={`w-full min-h-11 flex items-center gap-3 px-4 py-2 text-left transition-colors ${active ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: ent.couleur || '#64748b' }}
                  >
                    {getInitiales(ent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-encre">{ent.nom}</p>
                    <p className="text-xs truncate text-encre-3">
                      {[ent.formeJuridique, ent.ville].filter(Boolean).join(' · ') || 'Entreprise'}
                    </p>
                  </div>
                  {active && <Check size={16} className="flex-shrink-0 text-accent-texte" aria-hidden="true" />}
                </button>
              );
            })}
            {peutReglages && (
              <>
                <div className="my-1 border-t border-bord" />
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); onNavigateSettings?.(); }}
                  className="w-full min-h-11 flex items-center gap-3 px-4 py-2 text-left text-sm text-encre-2 hover:bg-surface-2 hover:text-encre transition-colors"
                >
                  <Settings size={16} aria-hidden="true" />
                  <span>Gérer les entreprises</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  const libelle = plusieursOrgs ? 'Changer d’organisation' : 'Changer d’entreprise';

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={libelle}
          className="flex items-center gap-2 min-w-0 rounded-xl px-1 py-1 transition-colors hover:bg-surface-2"
        >
          {logo}
          <span className="font-semibold text-sm truncate hidden sm:block lg:text-base text-encre" title={nom}>{nom}</span>
          <ChevronDown size={14} aria-hidden="true" className={`hidden sm:block flex-shrink-0 text-encre-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${libelle} (${nom}${sousTitre ? `, ${sousTitre}` : ''})`}
        className="group flex items-center gap-3 w-full min-w-0 rounded-xl -m-1 p-2 transition-colors hover:bg-surface-2"
      >
        {logo}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-sm truncate text-encre" title={nom}>{nom}</p>
          {sousTitre && <p className="text-xs truncate text-encre-3">{sousTitre}</p>}
        </div>
        <ChevronDown size={14} aria-hidden="true" className={`flex-shrink-0 text-encre-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  );
});

export default EntrepriseSwitcher;
