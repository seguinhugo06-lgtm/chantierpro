import { useEffect, useState } from 'react';
import { Flame, BellRing } from 'lucide-react';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import { TYPES_APPAREIL, AIDE_FREQUENCE, DELAI_RAPPEL_DEFAUT } from '../../lib/ramonage';

/**
 * Paramètres → Ramonage (tâche ramonage, D-30). Activé, le module ajoute l'onglet « Ramonage » aux fiches clients
 * (appareils, attestations, facture, rappel) ; rien ne change pour un artisan qui ne l'active pas.
 * Réglages rangés dans settings_json.reglages de la fiche entreprise (entrepriseService, REGLAGES_SANS_COLONNE).
 */
export function Interrupteur({ actif, onChange, libelle, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-base font-semibold text-encre cursor-pointer">{libelle}</label>
        {description ? <p className="mt-1 text-sm text-encre-2">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!!actif}
        onClick={() => onChange(!actif)}
        className="flex-shrink-0 h-11 w-14 flex items-center justify-center rounded-full"
      >
        <span aria-hidden="true" className={`relative inline-block h-7 w-12 rounded-full transition-colors ${actif ? 'bg-accent' : 'bg-bord-fort'}`}>
          <span className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-surface shadow-e1 transition-transform ${actif ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </span>
      </button>
    </div>
  );
}

const nombre = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export default function RamonageTab({ entreprise, setEntreprise }) {
  const actif = !!entreprise?.ramonageActif;
  const envoiAuto = !!entreprise?.ramonageEnvoiAuto;
  const [jours, setJours] = useState(String(entreprise?.ramonageRappelJours ?? DELAI_RAPPEL_DEFAUT));
  const [tarifs, setTarifs] = useState(() => Object.fromEntries(
    TYPES_APPAREIL.map((t) => [t.valeur, entreprise?.ramonageTarifs?.[t.valeur] != null ? String(entreprise.ramonageTarifs[t.valeur]).replace('.', ',') : '']),
  ));
  useEffect(() => { setJours(String(entreprise?.ramonageRappelJours ?? DELAI_RAPPEL_DEFAUT)); }, [entreprise?.ramonageRappelJours]);

  const enregistrer = (champs) => setEntreprise((p) => ({ ...p, ...champs }));
  const enregistrerJours = () => {
    const n = Math.round(nombre(jours) ?? DELAI_RAPPEL_DEFAUT);
    const borne = Math.min(120, Math.max(1, n));
    setJours(String(borne));
    if (borne !== entreprise?.ramonageRappelJours) enregistrer({ ramonageRappelJours: borne });
  };
  const enregistrerTarifs = () => {
    const propres = {};
    for (const [type, v] of Object.entries(tarifs)) {
      const n = nombre(v);
      if (String(v).trim() && n !== null && n > 0) propres[type] = Math.round(n * 100) / 100;
    }
    if (JSON.stringify(propres) !== JSON.stringify(entreprise?.ramonageTarifs || {})) enregistrer({ ramonageTarifs: propres });
  };

  return (
    <div className="space-y-4" data-testid="reglages-ramonage">
      <Carte>
        <div className="flex items-center gap-2 mb-3 text-encre-2">
          <Flame size={18} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-encre">Ramonage</h3>
        </div>
        <Interrupteur
          id="ramonage-actif"
          actif={actif}
          onChange={(v) => enregistrer({ ramonageActif: v })}
          libelle="J’effectue des ramonages"
          description="Ajoute l’onglet « Ramonage » aux fiches clients : les appareils du client, l’attestation de ramonage numérotée en PDF, la facture, et le rappel du prochain ramonage."
        />
      </Carte>

      {actif && (
        <>
          <Carte>
            <div className="flex items-center gap-2 mb-3 text-encre-2">
              <BellRing size={18} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-encre">Rappel du prochain ramonage</h3>
            </div>
            <div className="space-y-4">
              <Champ
                libelle="Rappeler le client, en jours avant la date du prochain ramonage"
                type="text"
                inputMode="numeric"
                value={jours}
                onChange={(e) => setJours(e.target.value)}
                onBlur={enregistrerJours}
                aide="À partir de ce jour, le client apparaît dans « À faire » sur l’accueil et sur sa fiche, avec un SMS prêt à envoyer."
              />
              <Interrupteur
                id="ramonage-envoi-auto"
                actif={envoiAuto}
                onChange={(v) => enregistrer({ ramonageEnvoiAuto: v })}
                libelle="Envoyer les rappels automatiquement par e-mail"
                description="Chaque matin, Mallettico envoie en votre nom un e-mail aux clients dont le ramonage approche, une seule fois par échéance, avec un lien pour ne plus en recevoir. Jamais à un client qui a refusé les rappels. Les clients sans e-mail restent dans « À faire »."
              />
              <p className="text-sm text-encre-3">{AIDE_FREQUENCE} La date du prochain ramonage est la vôtre : douze mois après le passage par défaut, modifiable à chaque attestation.</p>
            </div>
          </Carte>

          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-1">Vos tarifs</h3>
            <p className="text-sm text-encre-2 mb-3">Prix hors taxes proposé pour un nouvel appareil, selon son type (facultatif). Pour un appareil déjà connu, le prix de son dernier passage est repris.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES_APPAREIL.map((t) => (
                <Champ
                  key={t.valeur}
                  libelle={`${t.libelle} (€ HT)`}
                  facultatif
                  type="text"
                  inputMode="decimal"
                  value={tarifs[t.valeur]}
                  onChange={(e) => setTarifs((p) => ({ ...p, [t.valeur]: e.target.value }))}
                  onBlur={enregistrerTarifs}
                />
              ))}
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}
