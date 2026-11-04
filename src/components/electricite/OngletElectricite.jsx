import { useState } from 'react';
import { Zap, Plus, BellRing, Check, Paperclip } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import EtatVide from '../ui/EtatVide';
import Pastille from '../ui/Pastille';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import { TitreSection } from '../ui/EnTete';
import { useData } from '../../context/DataContext';
import { dateLue, jourLocal } from '../../lib/dates';
import { jourDe } from '../../lib/ramonage';
import {
  AIDE_CONSUEL, NATURES, libelleDe, tacheConsuel, tacheConsuelDuChantier, etatConsuel, limiteEnvoiConsuel,
} from '../../lib/electricite';
import SaisieCompteRendu from './SaisieCompteRendu';
import FicheCompteRendu from './FicheCompteRendu';

const jourFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const CLASSES_TON = { neutre: 'text-encre-2', info: 'text-info-texte', succes: 'text-succes-texte', alerte: 'text-alerte-texte', danger: 'text-danger-texte' };
const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Onglet « Électricité » de la fiche chantier (Paramètres › Électricité) : le rappel de la demande d'attestation
 * Consuel (une tâche datée de la mise en service − 20 jours, qui entre dans « À faire ») et l'attestation visée jointe
 * aux fichiers du chantier ; puis les comptes rendus d'intervention et d'autocontrôle, leur PDF et la facture.
 * L'app ne fabrique ni n'imite l'attestation Consuel.
 */
export default function OngletElectricite({
  chantier, client, entreprise, peutModifier, peutMemo, peutFacturer, onAjouterFichier, onOuvrirFacture, showToast, addDevis: addDevisPage,
}) {
  const { comptesRendus = [], memos = [], devis = [], addMemo, toggleMemo, addCompteRendu, suivreCompteRendu, addDevis: addDevisContexte } = useData();
  // La page passe son addDevis (limites du plan, messages) ; à défaut, celui du contexte
  const addDevis = addDevisPage || addDevisContexte;
  const [miseEnService, setMiseEnService] = useState('');
  const [erreurDate, setErreurDate] = useState('');
  const [saisie, setSaisie] = useState(null); // { remplace? }
  const [ficheId, setFicheId] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const tache = tacheConsuelDuChantier(memos, chantier.id);
  const etat = etatConsuel({ tache, documents: chantier.documents || [] });
  const mesComptesRendus = comptesRendus.filter((r) => r.chantier_id === chantier.id);
  const fiche = ficheId ? comptesRendus.find((r) => r.id === ficheId) : null;

  const programmer = async () => {
    if (!miseEnService) { setErreurDate('Indiquez la date de mise en service prévue.'); return; }
    if (limiteEnvoiConsuel(miseEnService) < jourLocal()) {
      setErreurDate('Cette mise en service est dans moins de 20 jours : la demande au Consuel devait déjà partir. Le rappel est créé en retard.');
    } else setErreurDate('');
    setEnCours(true);
    try {
      const creee = await addMemo?.(tacheConsuel({ chantier, miseEnService }));
      if (creee !== null && creee !== false) showToast?.(`Rappel créé : demande à envoyer au plus tard le ${jourFr(limiteEnvoiConsuel(miseEnService))}.`, 'success');
    } finally {
      setEnCours(false);
    }
  };

  const joindre = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX) { showToast?.('Fichier trop volumineux (5 Mo au plus).', 'error'); return; }
    await onAjouterFichier({ nom: 'Attestation Consuel visée', categorie: 'Attestation', fichier });
  };

  const enregistrer = async (donnees) => {
    const enregistre = await addCompteRendu(donnees);
    if (!enregistre) return;
    setSaisie(null);
    setFicheId(enregistre.id);
  };

  return (
    <div className="space-y-8" data-testid="onglet-electricite">
      <section aria-label="Attestation Consuel">
        <TitreSection titre="Attestation Consuel" />
        <Carte className="space-y-3">
          <p className={`text-base font-semibold ${CLASSES_TON[etat.ton] || 'text-encre'}`} role="status">{etat.texte}</p>
          <p className="text-sm text-encre-2">{AIDE_CONSUEL}</p>
          {!tache && peutMemo && (
            <div className="space-y-3">
              <Champ libelle="Mise en service prévue" type="date" value={miseEnService} erreur={erreurDate}
                onChange={(e) => { setMiseEnService(e.target.value); setErreurDate(''); }} />
              <Bouton variante="secondaire" icone={BellRing} chargement={enCours} onClick={programmer}>Me rappeler l’envoi au Consuel</Bouton>
              <p className="text-sm text-encre-3">Une tâche datée du dernier jour d’envoi (20 jours avant) apparaîtra dans « À faire ». Aucun message n’est envoyé au client.</p>
            </div>
          )}
          {tache && !tache.is_done && (
            <Bouton variante="secondaire" icone={Check} onClick={() => toggleMemo?.(tache.id)}>J’ai envoyé la demande</Bouton>
          )}
          {peutModifier && (
            <label className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-bord-fort bg-surface text-sm font-semibold text-encre cursor-pointer hover:bg-surface-2">
              <Paperclip size={16} aria-hidden="true" />
              Joindre l’attestation visée
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={joindre} />
            </label>
          )}
        </Carte>
      </section>

      <section aria-label="Comptes rendus d’intervention">
        <TitreSection titre="Comptes rendus d’intervention" compte={mesComptesRendus.length || undefined} />
        {mesComptesRendus.length === 0 ? (
          <Carte marge="aucun">
            <EtatVide icone={Zap} titre="Aucun compte rendu" texte="Les travaux réalisés et les mesures de votre autocontrôle, en un PDF numéroté remis au client, d’où vous tirez la facture."
              action={peutModifier ? <Bouton variante="secondaire" icone={Plus} onClick={() => setSaisie({})}>Nouveau compte rendu</Bouton> : null} className="py-8" />
          </Carte>
        ) : (
          <>
            <GroupeListe>
              {mesComptesRendus.map((r) => {
                const facture = r.facture_id ? devis.find((d) => d.id === r.facture_id) : null;
                return (
                  <LigneListe key={r.id} titreEntier onClick={() => setFicheId(r.id)}
                    titre={`${jourFr(jourDe(r.realise_le))} · ${libelleDe(NATURES, r.nature)}`}
                    meta={[r.numero || 'numéro en attente', facture ? (facture.numero || 'facture') : 'pas de facture'].join(' · ')}
                    pastille={r.annulee_le ? <Pastille ton="danger">Annulé</Pastille> : undefined} />
                );
              })}
            </GroupeListe>
            {peutModifier && (
              <div className="flex justify-end mt-3">
                <Bouton variante="secondaire" icone={Plus} onClick={() => setSaisie({})}>Nouveau compte rendu</Bouton>
              </div>
            )}
          </>
        )}
      </section>

      {saisie && (
        <SaisieCompteRendu chantier={chantier} client={client} entreprise={entreprise} remplace={saisie.remplace}
          onEnregistrer={enregistrer} onFermer={() => setSaisie(null)} />
      )}
      {fiche && !saisie && (
        <FicheCompteRendu compteRendu={fiche} entreprise={entreprise} comptesRendus={comptesRendus} devis={devis}
          suivreCompteRendu={suivreCompteRendu} addDevis={addDevis} peutFacturer={peutFacturer} showToast={showToast}
          onRefaire={(r) => { setFicheId(null); setSaisie({ remplace: r }); }}
          onOuvrirFacture={(f) => { setFicheId(null); onOuvrirFacture(f); }}
          onFermer={() => setFicheId(null)} />
      )}
    </div>
  );
}
