import { Phone, MessageCircle, Home, FileText, ChevronRight } from 'lucide-react';
import { Avatar } from '../ui/LigneListe';
import Pastille from '../ui/Pastille';
import { formatClientName } from '../../lib/formatters';
import { dateLue } from '../../lib/dates';
import { REGLE_CLIENT } from '../../lib/statuts';

/** Surligne la recherche dans un texte (sur un fond d'alerte clair, lisible en clair comme en sombre). */
export function Surligne({ texte, requete, className = '' }) {
  if (!texte || !requete || requete.length < 2) return <span className={className}>{texte}</span>;
  const echappe = requete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const morceaux = String(texte).split(new RegExp(`(${echappe})`, 'gi'));
  return (
    <span className={className}>
      {morceaux.map((m, i) => (m.toLowerCase() === requete.toLowerCase()
        ? <mark key={i} className="bg-alerte-fond text-encre rounded px-0.5">{m}</mark>
        : m))}
    </span>
  );
}

/** « il y a 3 j », « il y a 2 m » : la dernière activité d'un client, dite en mots. */
const ilYa = (dernier) => {
  const jours = Math.max(0, Math.floor((Date.now() - dernier) / 86400000));
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours < 30) return `il y a ${jours} j`;
  if (jours < 365) return `il y a ${Math.floor(jours / 30)} m`;
  return `il y a ${Math.floor(jours / 365)} a`;
};

const COLONNES_AVEC_CA = 'sm:grid-cols-[40px_1fr_100px_100px_140px_80px_80px_96px]';
const COLONNES_SANS_CA = 'sm:grid-cols-[40px_1fr_100px_100px_140px_80px_96px]';

/**
 * La vue « Tableau » de la liste des clients : une ligne par client avec ses colonnes (type ou activité, téléphone, e-mail,
 * encaissé, compteurs). Même règle que la liste : pas de pastille « Actif » (le cas normal), seulement Prospect, Doublon ;
 * et pas de colonne d'encaissé sans le droit de voir les prix.
 */
export default function TableauClients({
  clients, statsDe, statutDe, doublonsDe, derniereActivite, afficherType, voitPrix, formatMoney, requete,
  onOuvrir, onAppeler, onWhatsApp, montrerTests, estTest,
}) {
  const colonnes = voitPrix ? COLONNES_AVEC_CA : COLONNES_SANS_CA;
  return (
    <div className="bg-surface border border-bord rounded-2xl shadow-e1 overflow-hidden">
      <div className={`hidden sm:grid ${colonnes} gap-3 px-4 py-2 text-sm font-medium bg-surface-2 text-encre-3`}>
        <span />
        <span>Client</span>
        <span>{afficherType ? 'Type' : 'Activité'}</span>
        <span>Téléphone</span>
        <span>Email</span>
        {voitPrix && <span className="text-right">Encaissé</span>}
        <span className="text-center">Dossiers</span>
        <span />
      </div>
      {clients.map((c, idx) => {
        const s = statsDe(c.id);
        const statut = statutDe(c.id);
        const doublon = doublonsDe(c.id);
        const nom = formatClientName(c) || c.nom;
        const derniere = derniereActivite(c.id);
        return (
          <div key={c.id} className={`group transition-colors hover:bg-surface-2 ${idx > 0 ? 'border-t border-bord' : ''}`}>
            <div className={`hidden sm:grid ${colonnes} gap-3 px-4 py-2.5 items-center`}>
              <Avatar nom={nom} taille={32} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button type="button" onClick={() => onOuvrir(c.id)} className="min-w-0 text-left text-sm font-semibold text-encre truncate hover:underline">
                    <Surligne texte={formatClientName(c)} requete={requete} />
                  </button>
                  {doublon ? <Pastille ton="alerte">Doublon</Pastille> : statut === 'prospect' ? <span title={REGLE_CLIENT.prospect}><Pastille ton="neutre">Prospect</Pastille></span> : null}
                  {montrerTests && estTest(c) && <Pastille ton="alerte">Test</Pastille>}
                </div>
                {c.entreprise && <p className="text-sm text-encre-3 truncate">{c.entreprise}</p>}
              </div>
              <span className="text-sm text-encre-2 truncate">
                {afficherType
                  ? (c.categorie || '—')
                  : (derniere ? <span title={dateLue(derniere).toLocaleDateString('fr-FR')}>{ilYa(derniere)}</span> : '—')}
              </span>
              <span className="text-sm text-encre-2 truncate">{c.telephone ? <Surligne texte={c.telephone} requete={requete} /> : '—'}</span>
              <span className="text-sm text-encre-3 truncate">{c.email ? <Surligne texte={c.email} requete={requete} /> : '—'}</span>
              {voitPrix && <span className={`text-sm font-semibold text-right tabular-nums ${s.ca > 0 ? 'text-encre' : 'text-encre-3'}`}>{formatMoney(s.ca)}</span>}
              <div className="flex items-center justify-center gap-3 text-sm text-encre-2 tabular-nums">
                <span className="flex items-center gap-1" title="Chantiers"><Home size={14} aria-hidden="true" /> {s.chantiers}</span>
                <span className="flex items-center gap-1" title="Devis"><FileText size={14} aria-hidden="true" /> {s.devis}</span>
              </div>
              <div className="flex items-center gap-1 justify-end">
                {c.telephone && (
                  <>
                    <button type="button" onClick={() => onAppeler(c.telephone)} aria-label={`Appeler ${nom}`} title="Appeler" className="w-11 h-11 rounded-lg flex items-center justify-center text-encre-2 hover:bg-bord">
                      <Phone size={15} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => onWhatsApp(c.telephone, c.prenom)} aria-label={`Écrire à ${nom} sur WhatsApp`} title="WhatsApp" className="w-11 h-11 rounded-lg flex items-center justify-center text-encre-2 hover:bg-bord">
                      <MessageCircle size={15} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="sm:hidden flex items-center">
              <button type="button" onClick={() => onOuvrir(c.id)} className="flex-1 min-w-0 min-h-[64px] px-4 py-3 flex items-center gap-3 text-left">
                <Avatar nom={nom} taille={40} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold text-encre truncate"><Surligne texte={formatClientName(c)} requete={requete} /></span>
                    {voitPrix && s.ca > 0 && <span className="text-base font-bold text-encre tabular-nums whitespace-nowrap">{formatMoney(s.ca)}</span>}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 min-w-0">
                    <span className="text-sm text-encre-2 truncate">{c.entreprise || c.telephone || c.email || ''}</span>
                    {doublon ? <Pastille ton="alerte">Doublon</Pastille> : statut === 'prospect' ? <Pastille ton="neutre">Prospect</Pastille> : null}
                  </span>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
              </button>
              {c.telephone && (
                <button type="button" onClick={() => onAppeler(c.telephone)} aria-label={`Appeler ${nom}`} className="w-11 h-11 mr-2 rounded-lg flex items-center justify-center text-encre-2 hover:bg-bord">
                  <Phone size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
