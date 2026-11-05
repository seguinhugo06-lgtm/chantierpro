import { useEffect, useState } from 'react';
import { Wrench, BellRing, AlertTriangle } from 'lucide-react';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import { Interrupteur } from './RamonageTab';
import { CATEGORIES, DELAI_RAPPEL_DEFAUT, AIDE_OBLIGATION_RAPPEL, AIDE_DEVIS_PREALABLE } from '../../lib/entretien';

/**
 * Paramètres → Entretien (D-33, migration 113). Activé, le module ajoute l'onglet « Entretien » aux fiches clients
 * (chaudière, pompe à chaleur, poêle : attestation, facture, rappel) ; rien ne change pour un artisan qui ne l'active pas.
 * Réglages rangés dans settings_json.reglages (entrepriseService, REGLAGES_SANS_COLONNE).
 */
const nombre = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export default function EntretienTab({ entreprise, setEntreprise }) {
  const actif = !!entreprise?.entretienActif;
  const envoiAuto = !!entreprise?.entretienEnvoiAuto;
  const [jours, setJours] = useState(String(entreprise?.entretienRappelJours ?? DELAI_RAPPEL_DEFAUT));
  const [mesure, setMesure] = useState(entreprise?.entretienAppareilsMesure || '');
  const [capacite, setCapacite] = useState(entreprise?.entretienAttestationCapacite || '');
  const [tarifs, setTarifs] = useState(() => Object.fromEntries(
    CATEGORIES.map((c) => [c.valeur, entreprise?.entretienTarifs?.[c.valeur] != null ? String(entreprise.entretienTarifs[c.valeur]).replace('.', ',') : '']),
  ));
  useEffect(() => { setJours(String(entreprise?.entretienRappelJours ?? DELAI_RAPPEL_DEFAUT)); }, [entreprise?.entretienRappelJours]);

  const enregistrer = (champs) => setEntreprise((p) => ({ ...p, ...champs }));
  const enregistrerJours = () => {
    const borne = Math.min(120, Math.max(1, Math.round(nombre(jours) ?? DELAI_RAPPEL_DEFAUT)));
    setJours(String(borne));
    if (borne !== entreprise?.entretienRappelJours) enregistrer({ entretienRappelJours: borne });
  };
  const enregistrerTexte = (cle, valeur) => { if (valeur.trim() !== (entreprise?.[cle] || '')) enregistrer({ [cle]: valeur.trim() }); };
  const enregistrerTarifs = () => {
    const propres = {};
    for (const [cat, v] of Object.entries(tarifs)) {
      const n = nombre(v);
      if (String(v).trim() && n !== null && n > 0) propres[cat] = Math.round(n * 100) / 100;
    }
    if (JSON.stringify(propres) !== JSON.stringify(entreprise?.entretienTarifs || {})) enregistrer({ entretienTarifs: propres });
  };

  return (
    <div className="space-y-4" data-testid="reglages-entretien">
      <Carte>
        <div className="flex items-center gap-2 mb-3 text-encre-2">
          <Wrench size={18} aria-hidden="true" />
          <h3 className="text-lg font-semibold text-encre">Entretien</h3>
        </div>
        <Interrupteur
          id="entretien-actif"
          actif={actif}
          onChange={(v) => enregistrer({ entretienActif: v })}
          libelle="J’entretiens des chaudières, pompes à chaleur ou poêles"
          description="Ajoute l’onglet « Entretien » aux fiches clients : l’attestation d’entretien numérotée en PDF (avec les éléments exigés pour chaque appareil), la facture, et le rappel du prochain entretien."
        />
      </Carte>

      {actif && (
        <>
          <Carte>
            <div className="flex items-center gap-2 mb-3 text-encre-2">
              <BellRing size={18} aria-hidden="true" />
              <h3 className="text-lg font-semibold text-encre">Rappel du prochain entretien</h3>
            </div>
            <div className="space-y-4">
              <Champ libelle="Rappeler le client, en jours avant la date conseillée" type="text" inputMode="numeric" value={jours}
                onChange={(e) => setJours(e.target.value)} onBlur={enregistrerJours}
                aide="À partir de ce jour, le client apparaît dans « À faire » sur l’accueil et sur sa fiche, avec un SMS prêt à envoyer." />
              <Interrupteur
                id="entretien-envoi-auto"
                actif={envoiAuto}
                onChange={(v) => enregistrer({ entretienEnvoiAuto: v })}
                libelle="Envoyer les rappels automatiquement par e-mail"
                description="Chaque matin, Mallettico envoie en votre nom un e-mail aux clients dont l’entretien approche, une seule fois par échéance, avec un lien pour ne plus en recevoir. Jamais à un client qui a refusé les rappels."
              />
              {envoiAuto && !String(entreprise?.email || '').includes('@') && (
                <p role="alert" className="flex gap-2 text-sm text-alerte-texte">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  Ajoutez votre e-mail dans Paramètres → Mon entreprise : vos clients doivent pouvoir vous répondre. Sans lui, aucun rappel automatique ne part.
                </p>
              )}
              {/* Texte de la relecture juriste-btp du 4 nov. 2026 (point 9), rétabli par D-38 : les trois appareils */}
              <p className="text-sm text-encre-3">{AIDE_OBLIGATION_RAPPEL}</p>
            </div>
          </Carte>

          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-3">Pour vos attestations</h3>
            <div className="space-y-4">
              <Champ libelle="Appareils de mesure (marque et référence)" facultatif value={mesure} onChange={(e) => setMesure(e.target.value)}
                onBlur={() => enregistrerTexte('entretienAppareilsMesure', mesure)} aide="Proposés sur chaque nouvelle attestation : leur marque et leur référence sont exigées pour la chaudière et la pompe à chaleur (facultatives pour un poêle ou un insert)." />
              <Champ libelle="Attestation de capacité (fluides frigorigènes) : numéro et organisme" facultatif value={capacite} onChange={(e) => setCapacite(e.target.value)}
                onBlur={() => enregistrerTexte('entretienAttestationCapacite', capacite)} aide="Exigée pour un contrôle d’étanchéité ou une intervention sur le circuit d’une pompe à chaleur ou d’une climatisation au R32, au R410A ou à un autre fluide HFC (hors HFO), HCFC, CFC ou PFC (articles R. 543-75, R. 543-76 et R. 543-99 du code de l’environnement). Pas pour le R290, le R744 ou un HFO." />
            </div>
          </Carte>

          <Carte>
            <h3 className="text-lg font-semibold text-encre mb-1">Vos tarifs</h3>
            <p className="text-sm text-encre-2 mb-3">Prix hors taxes proposé pour un nouvel appareil (facultatif). Pour un appareil déjà connu, le prix de son dernier entretien est repris.</p>
            <p className="text-sm text-encre-2 mb-3">{AIDE_DEVIS_PREALABLE}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((c) => (
                <Champ key={c.valeur} libelle={`${c.libelle} (€ HT)`} facultatif type="text" inputMode="decimal" value={tarifs[c.valeur]}
                  onChange={(e) => setTarifs((p) => ({ ...p, [c.valeur]: e.target.value }))} onBlur={enregistrerTarifs} />
              ))}
            </div>
          </Carte>
        </>
      )}
    </div>
  );
}
