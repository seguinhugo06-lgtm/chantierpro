import { useState } from 'react';
import { Plus, CheckCircle2, ClipboardList, MessageSquare, X } from 'lucide-react';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import Champ from '../ui/Champ';
import Pastille from '../ui/Pastille';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { Segmente } from '../ui/Onglets';
import { TitreSection } from '../ui/EnTete';
import { dateLue, jourLocal } from '../../lib/dates';

const TYPES_ECHANGE = [
  { valeur: 'email', libelle: 'E-mail' },
  { valeur: 'sms', libelle: 'SMS' },
  { valeur: 'appel', libelle: 'Appel' },
  { valeur: 'note', libelle: 'Note' },
];
const TON_ECHANGE = { email: 'info', sms: 'succes', appel: 'neutre', note: 'neutre' };

/**
 * Onglet « Notes » de la fiche chantier : les notes libres (accès, contacts sur site), les mémos du chantier et le
 * journal des échanges avec le client. Trois onglets avant (Notes, Mémos, Messages) ; un mot de moins sur la barre.
 */
export default function OngletNotes({ chantier: ch, memos = [], peutModifier, peutMemo, onNotes, onAjouterMemo, onBasculerMemo, onAjouterEchange, onSupprimerEchange }) {
  const [memo, setMemo] = useState('');
  const [type, setType] = useState('email');
  const [contenu, setContenu] = useState('');
  const actifs = memos.filter((m) => !m.is_done);
  const faits = memos.filter((m) => m.is_done);
  const echanges = ch.messages || [];

  const ajouterMemo = () => {
    const texte = memo.trim();
    if (!texte) return;
    onAjouterMemo(texte);
    setMemo('');
  };
  const ajouterEchange = async () => {
    if (!contenu.trim()) return;
    if (await onAjouterEchange({ type, content: contenu.trim() })) setContenu('');
  };

  return (
    <div className="space-y-8">
      <section>
        <TitreSection titre="Notes" />
        <Champ
          as="textarea" libelle="Notes du chantier" rows={6} value={ch.notes || ''} disabled={!peutModifier}
          onChange={(e) => onNotes(e.target.value)} placeholder="Contraintes d'accès, contacts sur site, détails importants..."
        />
      </section>

      <section>
        <TitreSection titre="Mémos du chantier" compte={actifs.length || undefined} />
        <Carte>
          {peutMemo && (
            <div className="flex gap-2 mb-3">
              <input
                type="text" aria-label="Nouveau mémo pour ce chantier" placeholder="Nouveau mémo pour ce chantier..." value={memo}
                onChange={(e) => setMemo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ajouterMemo(); }}
                className="flex-1 min-w-0 h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base text-encre placeholder:text-encre-3 focus:outline-none focus:ring-4 focus:border-accent focus:ring-accent/20"
              />
              <BoutonIcone icone={Plus} libelle="Ajouter le mémo" variante="secondaire" onClick={ajouterMemo} disabled={!memo.trim()} />
            </div>
          )}
          {memos.length === 0 ? (
            <EtatVide icone={ClipboardList} titre="Aucun mémo pour ce chantier" className="py-6" />
          ) : (
            <>
              <ul className="space-y-0.5">
                {actifs.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 min-h-[44px] px-1 py-1 rounded-lg hover:bg-surface-2">
                    <button
                      type="button" onClick={() => onBasculerMemo(m.id)} aria-label={`Marquer comme fait : ${m.text}`}
                      className="mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center -ml-1"
                    >
                      <span className="w-6 h-6 rounded-full border-2 border-bord-fort" />
                    </button>
                    <div className="flex-1 min-w-0 py-1.5">
                      <p className="text-sm text-encre">{m.text}</p>
                      {m.due_date && (
                        <span className={`text-sm ${m.due_date < jourLocal() ? 'font-semibold text-danger-texte' : 'text-encre-3'}`}>
                          {dateLue(`${m.due_date}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {faits.length > 0 && (
                <details className="mt-2 text-sm text-encre-3">
                  <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">Terminés ({faits.length})</summary>
                  <ul className="space-y-1 mt-1">
                    {faits.map((m) => (
                      <li key={m.id} className="flex items-center gap-2.5 px-3 py-1.5 opacity-70">
                        <CheckCircle2 size={16} aria-hidden="true" className="text-succes-texte flex-shrink-0" />
                        <span className="line-through">{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </Carte>
      </section>

      <section>
        <TitreSection titre="Échanges avec le client" compte={echanges.length || undefined} />
        <p className="-mt-1 mb-3 text-sm text-encre-2">Gardez ici la trace de vos e-mails, SMS et appels.</p>
        {echanges.length === 0 ? (
          <Carte marge="aucun"><EtatVide icone={MessageSquare} titre="Aucun échange enregistré" className="py-6" /></Carte>
        ) : (
          <div className="space-y-2 mb-3">
            {echanges.map((msg) => (
              <Carte key={msg.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Pastille ton={TON_ECHANGE[msg.type] || 'neutre'}>{TYPES_ECHANGE.find((t) => t.valeur === msg.type)?.libelle || 'Note'}</Pastille>
                  <span className="text-sm text-encre-3">{dateLue(msg.date).toLocaleDateString('fr-FR')} · {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {peutModifier && <BoutonIcone icone={X} libelle="Supprimer l'échange" taille={16} className="ml-auto" onClick={() => onSupprimerEchange(msg.id)} />}
                </div>
                <p className="text-sm text-encre whitespace-pre-wrap break-words">{msg.content}</p>
              </Carte>
            ))}
          </div>
        )}

        {peutModifier && (
          <Carte>
            <Segmente ariaLabel="Type d'échange" options={TYPES_ECHANGE} valeur={type} onChange={setType} pleineLargeur className="mb-3" />
            <Champ as="textarea" libelle="Résumé de l'échange" rows={2} placeholder="Résumer l'échange avec le client..." value={contenu} onChange={(e) => setContenu(e.target.value)} />
            <Bouton variante="secondaire" icone={Plus} className="mt-3" onClick={ajouterEchange} disabled={!contenu.trim()}>Ajouter</Bouton>
          </Carte>
        )}
      </section>
    </div>
  );
}
