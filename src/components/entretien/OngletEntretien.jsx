import { useMemo, useState } from 'react';
import { Wrench, Plus, BellOff } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import Pastille from '../ui/Pastille';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import { useData } from '../../context/DataContext';
import { useConfirm } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';
import { formatMoney } from '../../lib/formatters';
import { dateLue, jourLocal } from '../../lib/dates';
import { appareilsDuClient, rappelsDus, descriptionAppareil, jourDuRappel, jourDe, DELAI_RAPPEL_DEFAUT, categorie } from '../../lib/entretien';
import SaisieEntretien from './SaisieEntretien';
import FicheEntretien from './FicheEntretien';
import RappelEntretien from './RappelEntretien';
import { messageNePlusRappeler, noteRefusRappels } from '../../lib/suiviRappel';

const jourFr = (jour, court = false) => (jour
  ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', court ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' })
  : '');
const CANAUX = { email_auto: 'e-mail automatique', email: 'e-mail', sms: 'SMS', appel: 'appel', autre: 'autre' };

/** Dernier ramonage connu de ce client (non annulé), proposé comme « date du dernier ramonage » de l'attestation. */
const dernierRamonageDe = (ramonages, clientId) => (ramonages || [])
  .filter((r) => r.client_id === clientId && !r.annulee_le)
  .map((r) => jourDe(r.realise_le)).sort().pop() || '';

/**
 * Onglet « Entretien » de la fiche client (Paramètres → Entretien) : les appareils entretenus, leur historique, le rappel
 * du prochain entretien, et le parcours « Nouvel entretien » → attestation → PDF, envoi, facture.
 */
export default function OngletEntretien({ client, entreprise, setPage, setSelectedDevis, ouvrirDevis, showToast, modeDiscret }) {
  const { entretiens = [], ramonages = [], clients = [], devis = [], addEntretien, suivreEntretien, addDevis, updateClient } = useData();
  const { confirm } = useConfirm();
  const { canViewPrices, canPerform } = usePermissions();
  const peutSaisir = canPerform('client', 'edit');
  const [saisie, setSaisie] = useState(null);
  const [ficheId, setFicheId] = useState(null);
  const [choixAppareil, setChoixAppareil] = useState(false);
  const [notes, setNotes] = useState({});

  const appareils = useMemo(() => appareilsDuClient(entretiens, client.id), [entretiens, client.id]);
  const jours = Number(entreprise?.entretienRappelJours) || DELAI_RAPPEL_DEFAUT;
  const dus = useMemo(() => rappelsDus(entretiens, [client], { jours, aujourdhui: jourLocal() }), [entretiens, client, jours]);
  const rappels = [...dus, ...Object.values(notes).filter((n) => !dus.some((d) => d.entretien.id === n.entretien.id))];
  const fiche = ficheId ? entretiens.find((r) => r.id === ficheId) : null;
  const prix = (n) => (modeDiscret ? '·····' : formatMoney(n));
  const dernierRamonage = dernierRamonageDe(ramonages, client.id);

  const nouveau = () => {
    if (appareils.length === 0) setSaisie({ precedent: null });
    else setChoixAppareil((v) => !v);
  };

  const enregistrer = async (donnees, { refusRappels = false } = {}) => {
    const enregistre = await addEntretien(donnees);
    if (!enregistre) return;
    if (refusRappels && (await updateClient(client.id, { rappels_refuses_le: new Date().toISOString() })) !== false) {
      showToast?.('Refus des rappels noté sur la fiche du client.', 'success');
    }
    setSaisie(null);
    setChoixAppareil(false);
    setFicheId(enregistre.id);
  };

  const refuserRappels = async (c) => {
    const ok = await confirm({
      title: 'Ne plus rappeler ce client ?',
      message: messageNePlusRappeler(`${c.prenom || ''} ${c.nom || ''}`.trim()),
      confirmText: 'Ne plus rappeler',
      variant: 'warning',
    });
    if (ok && (await updateClient(c.id, { rappels_refuses_le: new Date().toISOString() })) !== false) {
      showToast?.('Refus des rappels noté : plus aucun rappel pour ce client.', 'success');
    }
  };

  return (
    <div className="space-y-3" data-testid="onglet-entretien">
      {rappels.map((r) => (
        <RappelEntretien key={r.entretien.id} rappel={r} entreprise={entreprise} refuserRappels={refuserRappels}
          suivreEntretien={(id, suivi) => { setNotes((n) => ({ ...n, [id]: r })); return suivreEntretien(id, suivi); }}
          envoiAutoPrevu={!!entreprise?.entretienEnvoiAuto && String(entreprise?.email || '').includes('@')} />
      ))}
      {client.rappels_refuses_le ? (
        <p className="text-sm text-encre-2">{noteRefusRappels(jourFr(jourDe(client.rappels_refuses_le)))}</p>
      ) : appareils.length > 0 && peutSaisir ? (
        <div className="flex justify-start">
          <Bouton variante="discret" taille="compacte" icone={BellOff} onClick={() => refuserRappels(client)}>Le client refuse les rappels</Bouton>
        </div>
      ) : null}

      {appareils.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide icone={Wrench} titre="Aucun entretien" texte="Les chaudières, pompes à chaleur et poêles entretenus chez ce client, leurs attestations et la date du prochain entretien apparaîtront ici."
            action={peutSaisir ? <Bouton variante="secondaire" icone={Plus} onClick={nouveau}>Nouvel entretien</Bouton> : undefined} />
        </Carte>
      ) : (
        <>
          {peutSaisir && (
            <div className="flex justify-end">
              <Bouton variante="secondaire" icone={Plus} onClick={nouveau} aria-expanded={choixAppareil}>Nouvel entretien</Bouton>
            </div>
          )}
          {choixAppareil && (
            <Carte>
              <p className="text-sm font-medium text-encre-2 mb-2">Quel appareil ?</p>
              <GroupeListe>
                {appareils.map((a) => (
                  <LigneListe key={a.appareil_ref} titreEntier titre={descriptionAppareil(a.dernier)} meta={`Dernier entretien le ${jourFr(jourDe(a.dernier.realise_le), true)}`}
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
                  <p className="text-sm text-encre-3">{categorie(d.categorie)?.libelle}</p>
                  <h3 className="text-base font-semibold text-encre">{descriptionAppareil(d)}</h3>
                  {d.adresse_installation && d.adresse_installation !== client.adresse ? <p className="text-sm text-encre-2">{d.adresse_installation}</p> : null}
                  <p className="mt-2 text-sm text-encre">Prochain entretien conseillé avant le <strong>{jourFr(d.prochain_avant)}</strong></p>
                  <p className="text-sm text-encre-3">{client.rappels_refuses_le ? 'Rappels refusés par le client' : rappel}</p>
                </div>
                <GroupeListe className="border-t border-bord rounded-none">
                  {a.passages.map((p) => {
                    const facture = p.facture_id ? devis.find((x) => x.id === p.facture_id) : null;
                    return (
                      <LigneListe key={p.id} titreEntier onClick={() => setFicheId(p.id)}
                        titre={jourFr(jourDe(p.realise_le), true)}
                        montant={canViewPrices && p.prix_ht != null ? `${prix(p.prix_ht)} HT` : undefined}
                        meta={[p.numero || 'numéro en attente', facture ? (facture.numero || 'facture') : 'pas de facture'].join(' · ')}
                        pastille={p.annulee_le ? <Pastille ton="danger">Annulée</Pastille> : undefined} />
                    );
                  })}
                </GroupeListe>
              </Carte>
            );
          })}
        </>
      )}

      {saisie && (
        <SaisieEntretien client={client} precedent={saisie.precedent} remplace={saisie.remplace} entretiens={entretiens} dernierRamonage={dernierRamonage}
          entreprise={entreprise} onEnregistrer={enregistrer} onFermer={() => setSaisie(null)} />
      )}
      {fiche && !saisie && (
        <FicheEntretien entretien={fiche} client={client} entreprise={entreprise} entretiens={entretiens} clients={clients} devis={devis}
          suivreEntretien={suivreEntretien} addDevis={addDevis} showToast={showToast}
          onRefaire={(r) => { setFicheId(null); setSaisie({ remplace: r }); }}
          onOuvrirFacture={(f) => { setFicheId(null); setSelectedDevis?.(f); setPage?.('devis'); }}
          // Le devis de la visite s'ouvre dans l'éditeur (App.jsx, ouvrirDevis({ editer })) ; sans lui, sur sa fiche
          onOuvrirEditeur={(d) => { setFicheId(null); if (ouvrirDevis) ouvrirDevis({ editer: d.id }); else { setSelectedDevis?.(d); setPage?.('devis'); } }}
          onFermer={() => setFicheId(null)} />
      )}
    </div>
  );
}
