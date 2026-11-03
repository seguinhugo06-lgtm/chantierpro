import { useState } from 'react';
import { Check, FileText, Mail, MessageSquare, Clock, Wallet, HelpCircle, AlertTriangle } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import Pastille from '../ui/Pastille';
import { formatMoney } from '../../lib/formatters';
import { dateLue } from '../../lib/dates';

/**
 * Cartes de résultat de l'assistant : une par type de proposition. Chaque carte montre ce qui sera fait, pose les
 * questions encore ouvertes, et n'a qu'UN bouton plein : le geste de validation. Rien ne s'enregistre ni ne part
 * avant ce geste.
 */

const jourCourt = (j) => (j ? dateLue(j).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
/** Un montant à l'écran : « — » sans le droit de voir les prix, « ••• » en mode « Masquer les montants ». */
const montant = (v, voirPrix, discret = false) => (!voirPrix ? '—' : discret ? '•••' : formatMoney(v));

/** Une question : des choix en boutons (44 px), ou une réponse courte au clavier. */
function Question({ q, onRepondre }) {
  const [valeur, setValeur] = useState('');
  return (
    <fieldset className="rounded-2xl border border-bord bg-surface-2 p-3" data-ui="question-assistant">
      <legend className="sr-only">{q.texte}</legend>
      <p className="text-sm font-semibold text-encre mb-2 flex items-start gap-2">
        <HelpCircle size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5 text-accent-texte" />
        <span>{q.texte}</span>
      </p>
      {q.choix?.length ? (
        <div className="flex flex-wrap gap-2">
          {q.choix.map((c) => (
            <Bouton key={c.valeur} variante="secondaire" className="!whitespace-normal text-left !h-auto min-h-[44px] py-2 max-w-full" onClick={() => onRepondre(q.id, c.valeur)}>
              {c.libelle}
            </Bouton>
          ))}
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valeur.trim()) onRepondre(q.id, valeur.trim()); }}>
          <label className="sr-only" htmlFor={`q-${q.id}`}>{q.texte}</label>
          <input
            id={`q-${q.id}`}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            inputMode={q.id === 'montant' || q.id === 'heures' ? 'decimal' : 'text'}
            className="flex-1 min-w-0 h-11 rounded-xl border border-bord-fort bg-surface text-base text-encre px-3 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent"
          />
          <Bouton type="submit" variante="secondaire">OK</Bouton>
        </form>
      )}
    </fieldset>
  );
}

function Questions({ questions, onRepondre }) {
  if (!questions.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-encre-2">Il me manque {questions.length === 1 ? 'une information' : `${questions.length} informations`} :</p>
      {questions.map((q) => <Question key={q.id} q={q} onRepondre={onRepondre} />)}
    </div>
  );
}

function Fait({ children, action }) {
  return (
    <div role="status" className="rounded-2xl bg-succes-fond text-succes-texte p-3 text-sm font-medium flex flex-col gap-2">
      <p className="flex items-start gap-2"><Check size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" /><span>{children}</span></p>
      {action}
    </div>
  );
}

function Ligne({ libelle, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-bord last:border-0">
      <dt className="text-sm text-encre-3">{libelle}</dt>
      <dd className="text-sm font-medium text-encre text-right">{children}</dd>
    </div>
  );
}

function CarteDevis({ p, questions, onRepondre, onValider, etat, voirPrix, discret, peutCreer }) {
  const pret = !!p.brouillon && !questions.length;
  // En franchise (art. 293 B, règle unique estFranchiseTva, calculée par preparer.js) : ni « HT » ni « TTC »
  const base = !p.franchise && p.base ? ` ${p.base === 'TTC' ? 'TTC' : 'HT'}` : '';
  return (
    <div className="space-y-3" data-ui="resultat-devis">
      <p className="text-base font-semibold text-encre flex items-center gap-2"><FileText size={18} aria-hidden="true" /> Brouillon de devis</p>
      <dl className="rounded-2xl border border-bord p-3">
        <Ligne libelle="Client">{p.clientNom || 'à préciser'}</Ligne>
        <Ligne libelle="Travaux">{p.ligne.description}</Ligne>
        <Ligne libelle="Montant dicté">{p.montantDit ? `${montant(p.montantDit, voirPrix, discret)}${base}` : 'à préciser'}</Ligne>
        {p.franchise ? <Ligne libelle="TVA">non applicable (franchise)</Ligne> : p.taux != null ? <Ligne libelle="TVA">{String(p.taux).replace('.', ',')} %</Ligne> : null}
        {pret && voirPrix ? (
          p.franchise ? (
            <Ligne libelle="Total">{montant(p.brouillon.total_ht, voirPrix, discret)}</Ligne>
          ) : (
            <>
              <Ligne libelle="Total HT">{montant(p.brouillon.total_ht, voirPrix, discret)}</Ligne>
              <Ligne libelle="Total TTC">{montant(p.brouillon.total_ttc, voirPrix, discret)}</Ligne>
            </>
          )
        ) : null}
      </dl>
      <Questions questions={questions} onRepondre={onRepondre} />
      {etat.fait ? (
        <Fait action={<Bouton variante="secondaire" onClick={etat.ouvrir}>Ouvrir le devis pour l’envoyer</Bouton>}>
          Brouillon {etat.fait.numero} enregistré. Il n’est pas envoyé : relisez-le, complétez-le, puis envoyez-le quand vous voulez.
        </Fait>
      ) : (
        <>
          {!peutCreer ? <p className="text-sm text-encre-2">Votre rôle ne permet pas de créer un devis.</p> : null}
          <Bouton variante="principal" pleineLargeur icone={Check} disabled={!pret || !peutCreer} chargement={etat.enCours} onClick={onValider}>
            Enregistrer le brouillon
          </Bouton>
        </>
      )}
    </div>
  );
}

function CarteRelances({ p, onValider, etat, voirPrix, discret, voirEmail, peutRelancer, demo }) {
  const [choisies, setChoisies] = useState(() => new Set(p.relances.filter((r) => r.canal).map((r) => r.id)));
  const [ouverte, setOuverte] = useState(null);
  if (!p.relances.length) {
    return <Fait>Aucune facture en retard. Rien à relancer aujourd’hui.</Fait>;
  }
  const basculer = (id) => setChoisies((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const nb = choisies.size;
  return (
    <div className="space-y-3" data-ui="resultat-relances">
      <p className="text-base font-semibold text-encre">{p.relances.length} facture{p.relances.length > 1 ? 's' : ''} en retard</p>
      <ul className="space-y-2">
        {p.relances.map((r) => (
          <li key={r.id} className="rounded-2xl border border-bord p-3">
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-[rgb(var(--accent))] flex-shrink-0" checked={choisies.has(r.id)} disabled={!r.canal || !!etat.fait} onChange={() => basculer(r.id)} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-encre">{r.clientNom} · {r.facture.numero}</span>
                <span className="block text-sm text-encre-2 tabular-nums">{montant(r.solde.reste, voirPrix, discret)} dus · {r.solde.jours} jour{r.solde.jours > 1 ? 's' : ''} de retard</span>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-encre-3">
                  {r.canal === 'email' ? <Mail size={14} aria-hidden="true" /> : r.canal === 'sms' ? <MessageSquare size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
                  {r.canal === 'email' ? (voirEmail ? `par e-mail (${r.client.email})` : 'par e-mail') : r.canal === 'sms' ? 'par SMS' : 'ni e-mail ni téléphone sur la fiche'}
                </span>
              </span>
            </label>
            <Bouton variante="discret" taille="compacte" className="mt-1" aria-expanded={ouverte === r.id} onClick={() => setOuverte(ouverte === r.id ? null : r.id)}>
              {ouverte === r.id ? 'Masquer le message' : 'Voir le message'}
            </Bouton>
            {ouverte === r.id ? <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm text-encre-2 whitespace-pre-line">{!voirPrix ? 'Message masqué : votre rôle ne permet pas de voir les montants.' : discret ? 'Message masqué : les montants sont masqués (bouton « Masquer les montants »).' : r.message}</p> : null}
          </li>
        ))}
      </ul>
      {etat.fait ? (
        <Fait>
          {etat.fait} relance{etat.fait > 1 ? 's' : ''} validée{etat.fait > 1 ? 's' : ''}. Démonstration : aucun message n’est parti.
        </Fait>
      ) : !demo ? (
        // Hors démo, tant que le lot 2 n'est pas livré : aucun bouton qui ferait croire à un envoi (C. conso. L121-2)
        <p className={'text-sm text-encre-2'}>Pour l’instant, envoyez vos relances depuis chaque facture.</p>
      ) : (
        <>
          {!peutRelancer ? <p className="text-sm text-encre-2">Votre rôle ne permet pas d’envoyer des relances.</p> : null}
          <Bouton variante="principal" pleineLargeur icone={Mail} disabled={!nb || !peutRelancer} onClick={() => onValider([...choisies])}>
            {nb ? `${demo ? 'Simuler l’envoi de' : 'Envoyer'} ${nb} relance${nb > 1 ? 's' : ''}` : 'Choisissez au moins une facture'}
          </Bouton>
        </>
      )}
    </div>
  );
}

function CarteChiffre({ p, voirPrix, discret }) {
  return (
    <div className="space-y-3" data-ui="resultat-chiffre">
      <div className="rounded-2xl bg-degrade-vedette border border-vedette-bord p-4">
        <p className="text-sm font-medium text-vedette-libelle flex items-center gap-2"><Wallet size={16} aria-hidden="true" /> Encaissé {p.libelle}</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-vedette-valeur">{montant(Math.round(p.total), voirPrix, discret)}</p>
        <p className="mt-1 text-sm text-vedette-contexte">{p.lignes.length ? `${p.lignes.length} paiement${p.lignes.length > 1 ? 's' : ''} enregistré${p.lignes.length > 1 ? 's' : ''}` : 'Aucun paiement enregistré sur la période'}</p>
      </div>
      {voirPrix && !discret && p.lignes.length ? (
        <ul className="rounded-2xl border border-bord p-3">
          {p.lignes.slice(0, 5).map((l) => (
            <li key={l.id} className="flex justify-between gap-3 py-1.5 text-sm border-b border-bord last:border-0">
              <span className="text-encre-2">{jourCourt(l.date)}{l.numero ? ` · ${l.numero}` : ''}</span>
              <span className="font-medium text-encre tabular-nums">{formatMoney(l.montant)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-encre-3">
        Calculé sur les paiements que vous avez enregistrés{p.horsDetail > 0 ? ', et sur les factures marquées payées sans paiement détaillé' : ''}.
      </p>
    </div>
  );
}

function CarteHeures({ p, questions, onRepondre, onValider, onAnnuler, etat, peutPointer }) {
  const pret = !!p.pointage && !questions.length;
  const h = p.heures ? `${String(p.heures).replace('.', ',')} h` : 'à préciser';
  return (
    <div className="space-y-3" data-ui="resultat-heures">
      <p className="text-base font-semibold text-encre flex items-center gap-2"><Clock size={18} aria-hidden="true" /> Heures sur un chantier</p>
      <dl className="rounded-2xl border border-bord p-3">
        <Ligne libelle="Heures">{h}</Ligne>
        <Ligne libelle="Chantier">{p.chantier?.nom || 'à préciser'}</Ligne>
        <Ligne libelle="Pour">{p.employe ? [p.employe.prenom, p.employe.nom].filter(Boolean).join(' ') : 'à préciser'}</Ligne>
        <Ligne libelle="Jour">{jourCourt(p.date)}</Ligne>
      </dl>
      <Questions questions={questions} onRepondre={onRepondre} />
      {etat.fait ? (
        <Fait action={<Bouton variante="secondaire" onClick={onAnnuler} chargement={etat.enCours}>Annuler l’ajout</Bouton>}>
          {h} ajoutées sur {p.chantier?.nom}. Elles restent à approuver, comme un pointage saisi à la main.
        </Fait>
      ) : (
        <>
          {!peutPointer ? <p className="text-sm text-encre-2">Votre rôle ne permet pas d’ajouter des heures.</p> : null}
          <Bouton variante="principal" pleineLargeur icone={Check} disabled={!pret || !peutPointer} chargement={etat.enCours} onClick={onValider}>
            Ajouter {p.heures ? h : 'les heures'}
          </Bouton>
        </>
      )}
    </div>
  );
}

export default function ResultatAssistant(props) {
  const { proposition: p } = props;
  if (!p) return null;
  if (p.type === 'devis') return <CarteDevis {...props} p={p} />;
  if (p.type === 'relances') return <CarteRelances {...props} p={p} />;
  if (p.type === 'chiffre') return <CarteChiffre {...props} p={p} />;
  if (p.type === 'heures') return <CarteHeures {...props} p={p} />;
  return (
    <div className="rounded-2xl border border-bord p-3 text-sm text-encre-2" data-ui="resultat-inconnu">
      <Pastille ton="neutre">Pas encore</Pastille>
      <p className="mt-2">Je ne sais pas encore faire ça. Pour l’instant je prépare un devis, les relances des factures en retard, l’encaissé du mois et les heures d’un chantier.</p>
    </div>
  );
}
