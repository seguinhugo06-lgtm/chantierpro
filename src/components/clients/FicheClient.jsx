import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Phone, MessageCircle, MapPin, Mail, Edit3, Trash2, FileText, ExternalLink, AlertTriangle, Info, Clock, Zap,
} from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import { Onglets } from '../ui/Onglets';
import { PastilleStatut } from '../ui/Pastille';
import MenuActions from '../ui/MenuActions';
import { REGLE_CLIENT } from '../../lib/statuts';
import { estSigne, premierDevisARelancer } from '../../lib/ventes';
import { formatClientName } from '../../lib/formatters';
import { ouvrirLienExterne } from '../../lib/natif';
import { telInternational } from '../../lib/messageRelance';
import { urlPublique } from '../../lib/urlPublique';
import { FONCTIONS } from '../../lib/fonctions';
import { useConfirm, useToast } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { generatePortalToken, sendPortalInvite } from '../../services/portalService';
import supabase, { isDemo } from '../../supabaseClient';
import OngletRamonage from '../ramonage/OngletRamonage';
import { OngletDocuments, OngletChantiers, OngletEchanges, OngletTaches, OngletPhotos, OngletActivite } from './OngletsClient';
import { villeDe, lienTel } from './outils';

const openGPS = (adresse) => { if (adresse) ouvrirLienExterne(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`); };
const appeler = (tel) => { if (tel) window.location.href = lienTel(tel); };
const ecrireWhatsApp = (tel, prenom) => { if (tel) ouvrirLienExterne(`https://wa.me/${telInternational(tel)}?text=${encodeURIComponent(`Bonjour ${prenom || ''},`)}`); };

const TONS_ALERTE = { alerte: 'bg-alerte-fond text-alerte-texte', succes: 'bg-succes-fond text-succes-texte', neutre: 'bg-surface-2 text-encre-2' };

/**
 * La fiche d'un client — le motif des fiches de documents et de chantiers : qui, où il en est, UNE action pleine
 * (« Nouveau devis »), le reste dans « ⋯ » (audit UX du 20 oct. 2026, § 2.4 et fiche client). Au bureau, deux colonnes :
 * le client et ses gestes à gauche, ses documents à droite.
 *
 * Droits : chaque action passe par canPerform ; sans le droit de voir les prix (chef de chantier, ouvrier :
 * canViewPrices, une seule règle), aucun montant — ni chiffres du client, ni montant des documents ou des échanges.
 */
export default function FicheClient({
  client, stats, statut, clientDevis, clientChantiers, doublons, resteDu, echanges, memos, devis, entreprise,
  modeDiscret, isDark, couleur, formatMoney,
  onRetour, onModifier, onSupprimer, onFusionner, onVoirClient, updateClient, addMemo, toggleMemo,
  nouveauDevisPour, nouveauChantierPour, ouvrirDevis, setPage, setSelectedChantier, setSelectedDevis,
}) {
  const { canPerform, canViewPrices, canAccess } = usePermissions();
  const { paiements = [], ramonages = [] } = useData();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const ramonageActif = !!entreprise?.ramonageActif;
  // Un ramoneur arrive sur l'onglet « Ramonage », même quand la fiche entreprise est lue après l'affichage (compte réel) ;
  // jamais contre un onglet choisi par l'artisan
  const [onglet, setOnglet] = useState(ramonageActif ? 'ramonage' : 'documents');
  const ongletChoisi = useRef(false);
  useEffect(() => { if (ramonageActif && !ongletChoisi.current) setOnglet('ramonage'); }, [ramonageActif]);

  const peutModifier = canPerform('client', 'edit');
  const peutSupprimer = canPerform('client', 'delete');
  const peutFusionner = peutModifier && peutSupprimer;
  const peutDevis = canPerform('devis', 'create');
  const peutChantier = canPerform('chantier', 'create');

  const ouvrirDocument = (doc) => { if (setSelectedDevis && setPage) { setSelectedDevis(doc); setPage('devis'); } };
  const ouvrirChantier = (id) => { setSelectedChantier?.(id); setPage?.('chantiers'); };

  // Lien du portail client : généré, copié, et proposé par e-mail (fonction éteinte tant que FONCTIONS.portailClient est faux)
  const ouvrirPortail = async () => {
    if (!setPage) return;
    if (isDemo || !supabase) {
      try { localStorage.setItem('cp_portal_client_id', client.id); } catch { /* démo : la page du portail relit le client choisi */ }
      setPage('client-portal');
      return;
    }
    const jeton = await generatePortalToken(supabase, { clientId: client.id, entrepriseId: entreprise?.id });
    if (!jeton) {
      // Repli : la navigation interne si la génération échoue
      try { localStorage.setItem('cp_portal_client_id', client.id); } catch { /* la page du portail relit le client choisi */ }
      setPage('client-portal');
      return;
    }
    const lien = urlPublique(`/?portal=${jeton.token}`);
    try {
      await navigator.clipboard?.writeText(lien);
      showToast(`Lien portail copié ! Envoyez-le à ${client.prenom || client.nom}`, 'success');
    } catch {
      showToast('Lien portail généré', 'success');
    }
    if (client.email && await confirm({ title: 'Envoyer le lien', message: `Envoyer le lien par email à ${client.email} ?`, confirmText: 'Envoyer' })) {
      const envoye = await sendPortalInvite(supabase, { clientEmail: client.email, clientName: client.prenom || client.nom, portalUrl: lien, entrepriseName: entreprise?.nom || 'Mallettico' });
      showToast(envoye ? 'Invitation envoyée par email' : 'Erreur lors de l\'envoi de l\'invitation', envoye ? 'success' : 'error');
    }
  };

  // Ce qui attend, en une phrase
  const aRelancer = premierDevisARelancer(clientDevis, new Date(), entreprise);
  const signesAFacturer = clientDevis.filter((d) => d.type === 'devis' && estSigne(d)
    && !clientDevis.some((f) => f.type === 'facture' && f.devis_source_id === d.id && f.facture_type !== 'acompte'));
  const termineSansFacture = clientChantiers.filter((ch) => ch.statut === 'termine' && !clientDevis.some((d) => d.type === 'facture' && d.chantier_id === ch.id));
  const datesActivite = [
    ...clientDevis.map((d) => new Date(d.created_at || 0).getTime()).filter((t) => t > 0),
    ...clientChantiers.map((ch) => new Date(ch.created_at || 0).getTime()).filter((t) => t > 0),
  ];
  const dernier = datesActivite.length > 0 ? Math.max(...datesActivite) : 0;
  const moisSansActivite = dernier > 0 ? Math.floor((Date.now() - dernier) / (86400000 * 30)) : -1;

  let alerte = null;
  if (aRelancer) {
    const { devis: devisARelancer, jours } = aRelancer;
    // « Relancer » envoie au client : seulement pour un rôle qui envoie, et il ouvre la feuille « Relancer »
    alerte = {
      icone: Clock, ton: 'alerte',
      message: `Devis ${devisARelancer.numero || ''} sans réponse depuis ${jours} jours`.replace('  ', ' '),
      ...(canPerform('devis', 'send')
        ? { action: 'Relancer', onAction: () => { if (ouvrirDevis) ouvrirDevis({ relancer: devisARelancer.id }); else { setSelectedDevis?.(devisARelancer); setPage?.('devis'); } } }
        : {}),
    };
  } else if (signesAFacturer.length > 0) {
    alerte = {
      icone: Zap, ton: 'succes',
      message: signesAFacturer.length > 1 ? `${signesAFacturer.length} devis signés à facturer` : 'Un devis signé à facturer',
      ...(peutDevis ? { action: 'Facturer', onAction: () => ouvrirDocument(signesAFacturer[0]) } : {}),
    };
  } else if (termineSansFacture.length > 0) {
    alerte = { icone: AlertTriangle, ton: 'alerte', message: 'Chantier terminé, pas encore facturé', action: 'Voir', onAction: () => ouvrirChantier(termineSansFacture[0].id) };
  } else if (moisSansActivite > 6 && stats.chantiers > 0) {
    alerte = { icone: Info, ton: 'neutre', message: `Aucune activité depuis ${moisSansActivite} mois` };
  }
  const IconeAlerte = alerte?.icone;

  const enAttente = clientDevis.filter((d) => d.type === 'devis' && ['envoye', 'vu'].includes(d.statut)).length;
  const photos = clientChantiers.reduce((somme, ch) => somme + (ch.photos?.length || 0), 0);
  const nbEchanges = (echanges || []).filter((e) => e.client_id === client.id).length;
  const nbMemos = (memos || []).filter((m) => m.client_id === client.id).length;
  const sousTitre = [client.categorie, client.entreprise, villeDe(client.adresse)].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5 max-w-6xl">
      {/* En-tête : retour, nom, où il en est ; modifier en icône, le reste dans « ⋯ » */}
      <div className="flex items-start gap-1">
        <BoutonIcone icone={ArrowLeft} libelle="Retour aux clients" onClick={onRetour} className="-ml-2" />
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-2xl font-bold text-encre leading-tight break-words">{formatClientName(client)}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span title={REGLE_CLIENT[statut]}><PastilleStatut genre="client" statut={statut} /></span>
            {sousTitre && <span className="text-sm text-encre-2">{sousTitre}</span>}
          </div>
          {REGLE_CLIENT[statut] && <p className="mt-1 text-sm text-encre-3">{REGLE_CLIENT[statut]}</p>}
        </div>
        {peutModifier && <BoutonIcone icone={Edit3} libelle="Modifier le client" onClick={() => onModifier(client)} />}
        <MenuActions
          titre="Actions sur le client"
          actions={[
            { libelle: 'Lien du portail client', icone: ExternalLink, onClick: ouvrirPortail, masque: !FONCTIONS.portailClient || !canAccess('client-portal') },
            { libelle: 'Supprimer le client', icone: Trash2, onClick: () => onSupprimer(client.id), danger: true, masque: !peutSupprimer },
          ]}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
        <div className="space-y-5">
          {/* Une action principale, puis les gestes de contact */}
          <div className="space-y-2">
            {peutDevis && (
              <Bouton variante="principal" taille="grande" pleineLargeur icone={FileText} onClick={() => nouveauDevisPour?.(client.id)}>
                Nouveau devis
              </Bouton>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[
                { cle: 'appel', icone: Phone, libelle: 'Appeler', ok: !!client.telephone, faire: () => appeler(client.telephone), manque: 'Aucun numéro' },
                { cle: 'whatsapp', icone: MessageCircle, libelle: 'WhatsApp', ok: !!client.telephone, faire: () => ecrireWhatsApp(client.telephone, client.prenom), manque: 'Aucun numéro' },
                { cle: 'gps', icone: MapPin, libelle: 'Itinéraire', ok: !!client.adresse, faire: () => openGPS(client.adresse), manque: 'Aucune adresse' },
              ].map(({ cle, icone: Icone, libelle, ok, faire, manque }) => (
                <button
                  key={cle} type="button" onClick={faire} disabled={!ok} title={ok ? libelle : manque}
                  className="h-16 flex flex-col items-center justify-center gap-1 rounded-xl border border-bord-fort bg-surface text-encre text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Icone size={20} aria-hidden="true" />
                  {libelle}
                </button>
              ))}
            </div>
          </div>

          {/* Coordonnées */}
          <Carte marge="aucun" className="divide-y divide-bord overflow-hidden">
            {[
              { cle: 'tel', icone: Phone, valeur: client.telephone, lien: lienTel(client.telephone), ajouter: 'Ajouter un téléphone' },
              { cle: 'mail', icone: Mail, valeur: client.email, lien: client.email ? `mailto:${client.email}` : null, ajouter: 'Ajouter un e-mail' },
              { cle: 'adresse', icone: MapPin, valeur: client.adresse, lien: null, ajouter: 'Ajouter une adresse' },
            ].map(({ cle, icone: Icone, valeur, lien, ajouter }) => (
              <div key={cle} className="min-h-[52px] flex items-center gap-3 px-4 py-2.5">
                <Icone size={18} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
                {valeur ? (
                  lien
                    ? <a href={lien} className="flex-1 min-w-0 text-base text-encre break-words hover:underline">{valeur}</a>
                    : <p className="flex-1 min-w-0 text-base text-encre break-words">{valeur}</p>
                ) : peutModifier ? (
                  <button type="button" onClick={() => onModifier(client)} className="h-11 -my-2 text-sm font-semibold text-accent-texte hover:underline">{ajouter}</button>
                ) : (
                  <p className="text-sm text-encre-3">Non renseigné</p>
                )}
              </div>
            ))}
          </Carte>

          {/* Ce qui attend, en une phrase */}
          {alerte && (
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${TONS_ALERTE[alerte.ton]}`}>
              <IconeAlerte size={20} aria-hidden="true" className="flex-shrink-0" />
              <p className="flex-1 min-w-0 text-sm font-semibold">{alerte.message}</p>
              {alerte.action && <Bouton taille="compacte" onClick={alerte.onAction}>{alerte.action}</Bouton>}
            </div>
          )}

          {/* Doublon probable */}
          {doublons.length > 0 && (
            <div className="rounded-2xl px-4 py-3 bg-alerte-fond text-alerte-texte">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle size={18} aria-hidden="true" className="flex-shrink-0" /> Client probablement en double
              </p>
              <div className="mt-2 space-y-2">
                {doublons.map((dup) => {
                  const memeTel = client.telephone && dup.telephone && client.telephone.replace(/[\s.\-()]/g, '') === dup.telephone.replace(/[\s.\-()]/g, '');
                  const memeMail = client.email && dup.email && client.email.toLowerCase().trim() === dup.email.toLowerCase().trim();
                  return (
                    <div key={dup.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2">
                      <div className="flex-1 min-w-[10rem]">
                        <p className="text-sm font-semibold text-encre">{formatClientName(dup)}</p>
                        <p className="text-sm text-encre-2">{[memeTel && 'même téléphone', memeMail && 'même e-mail'].filter(Boolean).join(' · ')}</p>
                      </div>
                      <Bouton taille="compacte" variante="discret" onClick={() => onVoirClient(dup.id)}>Voir</Bouton>
                      {peutFusionner && <Bouton taille="compacte" onClick={() => onFusionner(client.id, dup.id)}>Fusionner</Bouton>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Les chiffres du client : réservés à qui voit les prix */}
          {canViewPrices && (
            <Carte>
              <dl className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Encaissé</dt>
                  <dd className={`text-lg tabular-nums truncate ${stats.ca > 0 ? 'font-bold text-encre' : 'font-medium text-encre-3'}`}>{formatMoney(stats.ca)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">Reste dû</dt>
                  <dd className={`text-lg tabular-nums truncate ${resteDu > 0 ? 'font-bold text-encre' : 'font-medium text-encre-3'}`}>{formatMoney(resteDu)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-sm text-encre-2">À signer</dt>
                  <dd className={`text-lg tabular-nums truncate ${enAttente > 0 ? 'font-bold text-encre' : 'font-medium text-encre-3'}`}>{enAttente > 0 ? `${enAttente} devis` : 'Aucun'}</dd>
                </div>
              </dl>
            </Carte>
          )}
        </div>

        <div className="space-y-5 min-w-0">
          <Onglets
            ariaLabel="Sections de la fiche client"
            actif={onglet}
            onChange={(id) => { ongletChoisi.current = true; setOnglet(id); }}
            onglets={[
              ...(ramonageActif ? [{ id: 'ramonage', libelle: 'Ramonage', compte: ramonages.filter((r) => r.client_id === client.id && !r.annulee_le).length }] : []),
              { id: 'documents', libelle: 'Documents', compte: stats.devis + stats.factures },
              { id: 'chantiers', libelle: 'Chantiers', compte: stats.chantiers },
              { id: 'activite', libelle: 'Activité' },
              { id: 'photos', libelle: 'Photos', compte: photos },
              { id: 'memos', libelle: 'Tâches', compte: nbMemos },
              { id: 'echanges', libelle: 'Échanges', compte: nbEchanges },
            ]}
          />

          {onglet === 'ramonage' && ramonageActif && (
            <OngletRamonage client={client} entreprise={entreprise} setPage={setPage} setSelectedDevis={setSelectedDevis} showToast={showToast} modeDiscret={modeDiscret} />
          )}
          {onglet === 'documents' && (
            <OngletDocuments clientDevis={clientDevis} paiements={paiements} voitPrix={canViewPrices} formatMoney={formatMoney} onOuvrir={ouvrirDocument} />
          )}
          {onglet === 'chantiers' && (
            <OngletChantiers
              clientChantiers={clientChantiers} peutCreer={peutChantier}
              onNouveau={() => nouveauChantierPour?.(client.id)} onOuvrir={(ch) => ouvrirChantier(ch.id)}
            />
          )}
          {onglet === 'activite' && (
            <OngletActivite clientId={client.id} clientDevis={clientDevis} clientChantiers={clientChantiers} isDark={isDark} couleur={couleur} modeDiscret={modeDiscret} />
          )}
          {onglet === 'photos' && <OngletPhotos clientChantiers={clientChantiers} onOuvrirChantier={ouvrirChantier} />}
          {onglet === 'memos' && (
            <OngletTaches client={client} memos={memos} addMemo={addMemo} toggleMemo={toggleMemo} updateClient={updateClient} onModifier={() => onModifier(client)} />
          )}
          {onglet === 'echanges' && (
            <OngletEchanges client={client} echanges={echanges} devis={devis} voitPrix={canViewPrices} modeDiscret={modeDiscret} formatMoney={formatMoney} />
          )}
        </div>
      </div>
    </div>
  );
}
