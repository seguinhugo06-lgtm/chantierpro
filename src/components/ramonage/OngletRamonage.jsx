import { useMemo, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import Pastille from '../ui/Pastille';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import { useData } from '../../context/DataContext';
import { useConfirm } from '../../context/AppContext';
import { formatMoney } from '../../lib/formatters';
import { dateLue, jourLocal } from '../../lib/dates';
import {
  appareilsDuClient, rappelsDus, descriptionAppareil, jourDuRappel, jourDe, DELAI_RAPPEL_DEFAUT,
} from '../../lib/ramonage';
import SaisieRamonage from './SaisieRamonage';
import FicheAttestation from './FicheAttestation';
import RappelRamonage from './RappelRamonage';

const jourFr = (jour, court = false) => (jour
  ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', court ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' })
  : '');

const METHODE_COURTE = { mecanique_manuelle: 'manuel', mecanique_rotative: 'rotatif' };
const CANAUX = { email_auto: 'e-mail automatique', email: 'e-mail', sms: 'SMS', appel: 'appel', autre: 'autre' };

/**
 * Onglet « Ramonage » de la fiche client (module activé dans Paramètres → Ramonage) : les appareils du client et leur
 * historique (date, méthode, prix, n° de facture, prochain ramonage), le rappel du prochain ramonage, et le parcours
 * « Nouveau ramonage » → attestation → PDF, envoi, facture.
 */
export default function OngletRamonage({ client, entreprise, updateClient, setPage, setSelectedDevis, showToast, modeDiscret }) {
  const { ramonages = [], clients = [], devis = [], addRamonage, suivreRamonage, addDevis } = useData();
  const { confirm } = useConfirm();
  const [saisie, setSaisie] = useState(null); // { precedent?, remplace? }
  const [ficheId, setFicheId] = useState(null);
  const [choixAppareil, setChoixAppareil] = useState(false);

  const appareils = useMemo(() => appareilsDuClient(ramonages, client.id), [ramonages, client.id]);
  const jours = Number(entreprise?.ramonageRappelJours) || DELAI_RAPPEL_DEFAUT;
  const rappels = useMemo(() => rappelsDus(ramonages, [client], { jours, aujourdhui: jourLocal() }), [ramonages, client, jours]);
  const fiche = ficheId ? ramonages.find((r) => r.id === ficheId) : null;
  const prix = (n) => (modeDiscret ? '·····' : formatMoney(n));

  const nouveau = () => {
    if (appareils.length === 0) setSaisie({ precedent: null });
    else setChoixAppareil((v) => !v);
  };

  const enregistrer = async (donnees) => {
    const enregistre = await addRamonage(donnees);
    if (!enregistre) return;
    setSaisie(null);
    setChoixAppareil(false);
    setFicheId(enregistre.id);
  };

  const refuserRappels = async (c) => {
    const ok = await confirm({
      title: 'Ne plus rappeler ce client ?',
      message: `${c.prenom || ''} ${c.nom || ''}`.trim() + ' ne recevra plus de rappel de ramonage (ni SMS proposé, ni e-mail automatique).',
      confirmText: 'Ne plus rappeler',
      variant: 'warning',
    });
    if (ok) updateClient(c.id, { rappels_refuses_le: new Date().toISOString() });
  };

  return (
    <div className="space-y-3" data-testid="onglet-ramonage">
      {rappels.map((r) => (
        <RappelRamonage key={r.ramonage.id} rappel={r} entreprise={entreprise} suivreRamonage={suivreRamonage} refuserRappels={refuserRappels}
          envoiAutoPrevu={!!entreprise?.ramonageEnvoiAuto} />
      ))}
      {client.rappels_refuses_le && (
        <p className="text-sm text-encre-2">Ce client a refusé les rappels de ramonage le {jourFr(jourDe(client.rappels_refuses_le))}.</p>
      )}

      {appareils.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide icone={Flame} titre="Aucun ramonage" texte="Les appareils de ce client, ses attestations et la date de son prochain ramonage apparaîtront ici."
            action={<Bouton variante="secondaire" icone={Plus} onClick={nouveau}>Nouveau ramonage</Bouton>} />
        </Carte>
      ) : (
        <>
          <div className="flex justify-end">
            <Bouton variante="secondaire" icone={Plus} onClick={nouveau} aria-expanded={choixAppareil}>Nouveau ramonage</Bouton>
          </div>
          {choixAppareil && (
            <Carte>
              <p className="text-sm font-medium text-encre-2 mb-2">Quel appareil ?</p>
              <GroupeListe>
                {appareils.map((a) => (
                  <LigneListe key={a.appareil_ref} titre={descriptionAppareil(a.dernier)} meta={`Dernier passage le ${jourFr(jourDe(a.dernier.realise_le), true)}`}
                    onClick={() => setSaisie({ precedent: a.dernier })} />
                ))}
                <LigneListe titre="Un autre appareil" meta="Nouvel appareil pour ce client" onClick={() => setSaisie({ precedent: null })} />
              </GroupeListe>
            </Carte>
          )}

          {appareils.map((a) => {
            const d = a.dernier;
            const rappel = d.rappel_fait_le
              ? `Rappel fait le ${jourFr(jourDe(d.rappel_fait_le), true)} (${CANAUX[d.rappel_canal] || 'noté'})`
              : `Rappel à partir du ${jourFr(jourDuRappel(d, jours), true)}`;
            return (
              <Carte key={a.appareil_ref} marge="aucun" className="overflow-hidden">
                <div className="p-4">
                  <h3 className="text-base font-semibold text-encre">{descriptionAppareil(d)}</h3>
                  {d.precisions && d.appareil_type !== 'autre' ? <p className="text-sm text-encre-2">{d.precisions}</p> : null}
                  {d.adresse_intervention && d.adresse_intervention !== client.adresse ? <p className="text-sm text-encre-2">{d.adresse_intervention}</p> : null}
                  <p className="mt-2 text-sm text-encre">Prochain ramonage avant le <strong>{jourFr(d.prochain_avant)}</strong></p>
                  <p className="text-sm text-encre-3">{client.rappels_refuses_le ? 'Rappels refusés par le client' : rappel}</p>
                </div>
                <GroupeListe className="border-t border-bord rounded-none">
                  {a.passages.map((p) => {
                    const facture = p.facture_id ? devis.find((x) => x.id === p.facture_id) : null;
                    return (
                      <LigneListe
                        key={p.id}
                        onClick={() => setFicheId(p.id)}
                        // Comme la fiche papier : date, méthode, prix et n° de facture ; le prochain ramonage est en tête
                        titre={`${jourFr(jourDe(p.realise_le), true)} · ${METHODE_COURTE[p.methode] || ''}`}
                        montant={p.prix_ht != null ? `${prix(p.prix_ht)} HT` : undefined}
                        meta={[p.numero || 'numéro en attente', facture ? (facture.numero || 'facture') : 'pas de facture'].join(' · ')}
                        pastille={p.annulee_le ? <Pastille ton="danger">Annulée</Pastille> : undefined}
                      />
                    );
                  })}
                </GroupeListe>
              </Carte>
            );
          })}
        </>
      )}

      {saisie && (
        <SaisieRamonage
          client={client}
          precedent={saisie.precedent}
          remplace={saisie.remplace}
          ramonages={ramonages}
          entreprise={entreprise}
          onEnregistrer={enregistrer}
          onFermer={() => setSaisie(null)}
        />
      )}
      {fiche && !saisie && (
        <FicheAttestation
          ramonage={fiche}
          client={client}
          entreprise={entreprise}
          ramonages={ramonages}
          clients={clients}
          devis={devis}
          suivreRamonage={suivreRamonage}
          addDevis={addDevis}
          showToast={showToast}
          onRefaire={(r) => { setFicheId(null); setSaisie({ remplace: r }); }}
          onOuvrirFacture={(f) => { setFicheId(null); setSelectedDevis?.(f); setPage?.('devis'); }}
          onFermer={() => setFicheId(null)}
        />
      )}
    </div>
  );
}
