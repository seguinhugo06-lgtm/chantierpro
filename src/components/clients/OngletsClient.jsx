import { useEffect, useState } from 'react';
import {
  Plus, Phone, Mail, MapPin, MessageCircle, MessageSquare, FileText, Home, Camera, Clock, CheckCircle2, ClipboardList,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import Pastille, { PastilleStatut } from '../ui/Pastille';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import Modal, { ModalHeader, ModalTitle, ModalBody } from '../ui/Modal';
import AuditTimeline from '../audit/AuditTimeline';
import { getEntityHistory, getEntitiesHistory } from '../../lib/auditService';
import supabase, { isDemo } from '../../supabaseClient';
import { statutFacture, dateLocale } from '../../lib/paiementsFacture';
import { telInternational } from '../../lib/messageRelance';
import { dateLue, jourLocal } from '../../lib/dates';
import { usePermissions } from '../../hooks/usePermissions';
import { villeDe, lienTel } from './outils';

/**
 * Les contenus des onglets de la fiche client. Refonte du 26 oct. 2026 (Task 7 « ancien code ») : jetons du thème, une
 * seule forme de liste (LigneListe), fenêtre de l'échange sur ui/Modal, et aucun montant sans le droit de voir les
 * prix (chef de chantier : canViewPrices de usePermissions, une seule règle).
 */

/** Les canaux d'échange : l'icône et le mot disent le canal, pas la couleur. */
const CANAUX = {
  email: { libelle: 'Email', icone: Mail },
  sms: { libelle: 'SMS', icone: MessageCircle },
  whatsapp: { libelle: 'WhatsApp', icone: MessageCircle },
  appel: { libelle: 'Appel', icone: Phone },
  visite: { libelle: 'Visite', icone: MapPin },
};

const LIEN_BOUTON = 'inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-3.5 rounded-full border border-bord-fort bg-surface text-sm font-semibold text-encre whitespace-nowrap transition-colors hover:bg-surface-2';

/** Documents du client : devis, factures, avoirs, du plus récent au plus ancien. */
export function OngletDocuments({ clientDevis, paiements, voitPrix, formatMoney, onOuvrir }) {
  if (clientDevis.length === 0) {
    return (
      <Carte marge="aucun">
        <EtatVide icone={FileText} titre="Aucun document" texte="Les devis et factures de ce client apparaîtront ici." />
      </Carte>
    );
  }
  return (
    <GroupeListe>
      {[...clientDevis].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map((d) => {
        const estAvoir = d.type === 'facture' && d.facture_type === 'avoir';
        const estFacture = d.type === 'facture' && !estAvoir;
        const nature = estAvoir ? 'Avoir' : estFacture ? 'Facture' : 'Devis';
        const date = d.date ? dateLocale(d.date) : null;
        return (
          <LigneListe
            key={d.id}
            onClick={() => onOuvrir(d)}
            titre={`${nature} ${d.numero || ''}`.trim()}
            meta={[date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null, d.objet || d.titre].filter(Boolean).join(' · ') || '—'}
            montant={voitPrix ? (estAvoir ? `-${formatMoney(Math.abs(d.total_ttc || 0))}` : formatMoney(d.total_ttc)) : undefined}
            pastille={<PastilleStatut genre={d.type === 'facture' ? 'facture' : 'devis'} statut={estFacture ? statutFacture(d, paiements) : d.statut} />}
          />
        );
      })}
    </GroupeListe>
  );
}

/** Chantiers du client. */
export function OngletChantiers({ clientChantiers, peutCreer, onNouveau, onOuvrir }) {
  if (clientChantiers.length === 0) {
    return (
      <Carte marge="aucun">
        <EtatVide
          icone={Home} titre="Aucun chantier" texte="Les chantiers de ce client apparaîtront ici."
          action={peutCreer ? <Bouton icone={Plus} onClick={onNouveau}>Nouveau chantier</Bouton> : null}
        />
      </Carte>
    );
  }
  return (
    <div className="space-y-2">
      {peutCreer && (
        <div className="flex justify-end">
          <Bouton variante="discret" icone={Plus} onClick={onNouveau}>Nouveau chantier</Bouton>
        </div>
      )}
      <GroupeListe>
        {clientChantiers.map((ch) => (
          <LigneListe
            key={ch.id}
            onClick={() => onOuvrir(ch)}
            titre={ch.nom || 'Chantier sans nom'}
            meta={villeDe(ch.adresse) || ch.adresse || '—'}
            pastille={<PastilleStatut genre="chantier" statut={ch.statut} />}
          />
        ))}
      </GroupeListe>
    </div>
  );
}

/** Pastille de sens d'un échange : reçu ou envoyé. */
function SensEchange({ e }) {
  const entrant = e.direction === 'in' || e.direction === 'entrant';
  const sortant = e.direction === 'out' || e.direction === 'sortant';
  if (!entrant && !sortant) return null;
  return sortant
    ? <Pastille ton="neutre" icone={ArrowUpRight}>Envoyé</Pastille>
    : <Pastille ton="info" icone={ArrowDownLeft}>Reçu</Pastille>;
}

const contenuDe = (e) => {
  const brut = e.contenu || e.body || e.message;
  // Relu en base, l'objet d'un envoi est son contenu : ne pas l'afficher deux fois
  return brut && brut !== e.objet ? brut : null;
};

/** Échanges avec le client (e-mails, SMS, appels, visites) ; un toucher ouvre le détail dans une fenêtre. */
export function OngletEchanges({ client, echanges, devis, voitPrix, modeDiscret, formatMoney }) {
  const [ouvert, setOuvert] = useState(null);
  const liste = (echanges || []).filter((e) => e.client_id === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const docLie = (e) => e.document || (e.devis_id ? (devis || []).find((d) => d.id === e.devis_id)?.numero : null);
  const montantVisible = (e) => voitPrix && !modeDiscret && e.montant;

  const contacts = (
    <div className="flex gap-2 flex-wrap">
      {client.telephone && (
        <>
          <a href={lienTel(client.telephone)} className={LIEN_BOUTON}><Phone size={15} aria-hidden="true" /> Appeler</a>
          <a href={`sms:${client.telephone.replace(/\s/g, '')}`} className={LIEN_BOUTON}><MessageCircle size={15} aria-hidden="true" /> SMS</a>
          <a href={`https://wa.me/${telInternational(client.telephone)}`} target="_blank" rel="noopener noreferrer" className={LIEN_BOUTON}><MessageCircle size={15} aria-hidden="true" /> WhatsApp</a>
        </>
      )}
      {client.email && <a href={`mailto:${client.email}`} className={LIEN_BOUTON}><Mail size={15} aria-hidden="true" /> Email</a>}
    </div>
  );

  if (liste.length === 0) {
    return (
      <Carte marge="aucun">
        <EtatVide
          icone={MessageSquare} titre="Aucun échange"
          texte={!client.email && !client.telephone ? 'Ajoutez un e-mail ou un téléphone pour contacter ce client.' : 'Commencez une conversation avec ce client.'}
          action={client.email || client.telephone ? <div className="flex justify-center">{contacts}</div> : null}
        />
      </Carte>
    );
  }

  const fenetre = ouvert ? (() => {
    const canal = CANAUX[ouvert.type] || CANAUX.email;
    const doc = docLie(ouvert);
    const contenu = contenuDe(ouvert);
    const Icone = canal.icone;
    return (
      <Modal isOpen onClose={() => setOuvert(null)} size="md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2"><Icone size={18} aria-hidden="true" className="text-encre-3" /> {canal.libelle}</ModalTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <SensEchange e={ouvert} />
            <span className="text-sm text-encre-2">
              {dateLue(ouvert.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <p className="text-sm font-medium text-encre-3 mb-1">Objet</p>
            <p className={`text-base ${ouvert.objet ? 'text-encre' : 'text-encre-3 italic'}`}>{ouvert.objet || '(Sans objet)'}</p>
          </div>
          {doc && (
            <div>
              <p className="text-sm font-medium text-encre-3 mb-1">Document lié</p>
              <p className="text-base text-encre">{doc}</p>
            </div>
          )}
          {ouvert.duree && (
            <div>
              <p className="text-sm font-medium text-encre-3 mb-1">Durée</p>
              <p className="text-base text-encre flex items-center gap-1.5"><Clock size={15} aria-hidden="true" /> {ouvert.duree} minutes</p>
            </div>
          )}
          {montantVisible(ouvert) && (
            <div>
              <p className="text-sm font-medium text-encre-3 mb-1">Montant</p>
              <p className="text-base font-semibold text-encre tabular-nums">{formatMoney(ouvert.montant)}</p>
            </div>
          )}
          {contenu ? (
            <div>
              <p className="text-sm font-medium text-encre-3 mb-1">Contenu</p>
              <div className="text-base text-encre-2 whitespace-pre-line p-3 rounded-xl bg-surface-2">{contenu}</div>
            </div>
          ) : (
            <p className="text-sm text-encre-3 italic text-center py-4 rounded-xl bg-surface-2">Aucun contenu enregistré pour cet échange</p>
          )}
        </ModalBody>
      </Modal>
    );
  })() : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-encre-2">{liste.length} échange{liste.length > 1 ? 's' : ''}</p>
        {contacts}
      </div>
      <GroupeListe>
        {liste.map((e) => {
          const canal = CANAUX[e.type] || CANAUX.email;
          const Icone = canal.icone;
          const doc = docLie(e);
          return (
            <LigneListe
              key={e.id}
              onClick={() => setOuvert(e)}
              debut={<span className="w-11 h-11 rounded-full bg-surface-2 text-encre-2 flex items-center justify-center"><Icone size={18} aria-hidden="true" /></span>}
              titre={e.objet || '(Sans objet)'}
              meta={[canal.libelle, dateLue(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), doc, e.duree ? `${e.duree} min` : null].filter(Boolean).join(' · ')}
              montant={montantVisible(e) ? formatMoney(e.montant) : undefined}
              pastille={<SensEchange e={e} />}
            />
          );
        })}
      </GroupeListe>
      {fenetre}
    </div>
  );
}

const ETIQUETTES = ['À rappeler', 'VIP', 'Problème paiement', 'Recommandé'];

/** Notes internes du client et ses tâches. */
export function OngletTaches({ client, memos, addMemo, toggleMemo, updateClient, onModifier }) {
  const { canPerform } = usePermissions();
  const peutNoter = canPerform('client', 'edit');
  const peutAjouter = canPerform('memo', 'create');
  const peutCocher = canPerform('memo', 'edit');
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const liste = (memos || []).filter((m) => m.client_id === client.id);
  const aFaire = liste.filter((m) => !m.is_done);
  const faites = liste.filter((m) => m.is_done);

  const ajouter = async () => {
    const t = texte.trim();
    if (!t || envoi || !addMemo) return;
    setEnvoi(true);
    // Le texte reste dans le champ si l'enregistrement est refusé (DataContext a dit pourquoi)
    const ok = await addMemo({ text: t, client_id: client.id });
    setEnvoi(false);
    if (ok) setTexte('');
  };

  return (
    <div className="space-y-4">
      <Carte>
        <h3 className="text-base font-semibold text-encre mb-2">Notes internes</h3>
        {client.notes ? (
          <p className="text-base p-3 rounded-xl bg-surface-2 text-encre whitespace-pre-line">{client.notes}</p>
        ) : peutNoter ? (
          <button type="button" onClick={onModifier} className="h-11 text-sm font-semibold text-accent-texte hover:underline">+ Ajouter des notes</button>
        ) : (
          <p className="text-sm text-encre-3">Aucune note.</p>
        )}
        {peutNoter && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {ETIQUETTES.map((tag) => {
              const posee = client.notes?.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={!!posee}
                  onClick={() => {
                    if (posee) return;
                    updateClient?.(client.id, { notes: client.notes ? `${client.notes}\n[${tag}]` : `[${tag}]` });
                  }}
                  className={`h-11 px-4 rounded-full text-sm font-medium transition-colors ${posee ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:bg-bord'}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </Carte>

      <Carte>
        <div className="space-y-3">
          {peutAjouter && (
            <div className="flex gap-2">
              <input
                type="text" aria-label="Nouvelle tâche pour ce client" placeholder="Nouvelle tâche…" value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } }}
                className="flex-1 min-w-0 h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base text-encre placeholder:text-encre-3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
              />
              <Bouton variante="secondaire" icone={Plus} onClick={ajouter} disabled={!texte.trim() || envoi} aria-label="Ajouter la tâche" className="h-12">Ajouter</Bouton>
            </div>
          )}

          {aFaire.length > 0 && (
            <ul className="space-y-1">
              {aFaire.map((m) => (
                <li key={m.id} className="flex items-start gap-2 px-1 py-1 rounded-lg">
                  <button
                    type="button" onClick={() => toggleMemo?.(m.id)} disabled={!peutCocher} aria-label="Marquer comme fait"
                    className="w-11 h-11 -m-1 flex-shrink-0 flex items-center justify-center disabled:opacity-60"
                  >
                    <span className="w-5 h-5 rounded-full border-2 border-bord-fort" />
                  </button>
                  <div className="flex-1 min-w-0 pt-2">
                    <p className="text-base text-encre">{m.text}</p>
                    {m.due_date && (
                      <span className={`text-sm ${m.due_date < jourLocal() ? 'font-semibold text-danger-texte' : 'text-encre-3'}`}>
                        {dateLue(`${m.due_date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {faites.length > 0 && (
            <details className="text-sm text-encre-3">
              <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">Terminées ({faites.length})</summary>
              <ul className="space-y-1 mt-1">
                {faites.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 px-3 py-1.5 opacity-70">
                    <CheckCircle2 size={16} aria-hidden="true" className="text-succes-texte flex-shrink-0" />
                    <span className="line-through">{m.text}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {liste.length === 0 && (
            <div className="text-center py-6">
              <ClipboardList size={28} aria-hidden="true" className="mx-auto mb-2 text-encre-3" />
              <p className="text-sm text-encre-2">Aucune tâche pour ce client</p>
            </div>
          )}
        </div>
      </Carte>
    </div>
  );
}

/** Photos des chantiers du client. */
export function OngletPhotos({ clientChantiers, onOuvrirChantier }) {
  const photos = clientChantiers.flatMap((ch) => (ch.photos || []).map((p) => ({ ...p, chantierNom: ch.nom, chantierId: ch.id })));
  const premier = clientChantiers[0];
  if (photos.length === 0) {
    return (
      <Carte marge="aucun">
        <EtatVide
          icone={Camera} titre="Aucune photo"
          texte={premier ? 'Documentez vos chantiers avec des photos.' : 'Créez d’abord un chantier pour ajouter des photos.'}
          action={premier ? <Bouton icone={Plus} onClick={() => onOuvrirChantier(premier.id)}>Ajouter une photo</Bouton> : null}
        />
      </Carte>
    );
  }
  return (
    <Carte>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Bouton variante="discret" icone={Camera} onClick={() => onOuvrirChantier(premier.id)}>Ajouter une photo</Bouton>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          {photos.map((p) => (
            <button key={p.id} type="button" className="text-left" onClick={() => p.chantierId && onOuvrirChantier(p.chantierId)}>
              <img src={p.src} className="w-full h-24 object-cover rounded-xl" alt={`Photo du chantier ${p.chantierNom}`} onError={(e) => { e.target.style.display = 'none'; }} />
              <span className="block text-sm text-encre-3 mt-1 truncate">{p.chantierNom}</span>
            </button>
          ))}
        </div>
      </div>
    </Carte>
  );
}

/** Journal d'activité du client, de ses documents et de ses chantiers (les montants suivent le droit de voir les prix). */
export function OngletActivite({ clientId, clientDevis, clientChantiers, isDark, couleur, modeDiscret }) {
  const [entrees, setEntrees] = useState([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    if (!clientId) return undefined;
    let annule = false;
    setCharge(true);
    const sb = isDemo ? null : supabase;
    const lire = async () => {
      const resultats = [];
      resultats.push(...(await getEntityHistory(sb, 'client', clientId, { limit: 50 })));
      const idsDevis = (clientDevis || []).map((d) => d.id);
      if (idsDevis.length > 0) resultats.push(...(await getEntitiesHistory(sb, 'devis', idsDevis, { limit: 50 })));
      const idsChantiers = (clientChantiers || []).map((c) => c.id);
      if (idsChantiers.length > 0) resultats.push(...(await getEntitiesHistory(sb, 'chantier', idsChantiers, { limit: 50 })));
      resultats.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (!annule) { setEntrees(resultats.slice(0, 100)); setCharge(false); }
    };
    lire().catch(() => { if (!annule) setCharge(false); });
    return () => { annule = true; };
  }, [clientId, clientDevis, clientChantiers]);

  return (
    <Carte>
      <AuditTimeline
        entries={entrees} isDark={isDark} couleur={couleur} modeDiscret={modeDiscret} isLoading={charge}
        emptyMessage="Aucune activité enregistrée pour ce client" showEntityBadge
      />
    </Carte>
  );
}

