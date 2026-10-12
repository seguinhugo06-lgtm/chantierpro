import { useState } from 'react';
import { Undo2, Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';
import { dateLue } from '../../lib/dates';
import { dateHeureParis } from '../../lib/retractation';

const estEmail = (v) => /^[A-Za-z0-9._+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(v || '').trim());
const jourLong = (jour) => (jour ? dateLue(jour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, '1er ') : '');
const jourCourt = (valeur) => (valeur ? dateLue(String(valeur).slice(0, 10)).toLocaleDateString('fr-FR') : '');

/**
 * Fonctionnalité de rétractation en ligne d'un devis signé par le lien (C. conso. L221-21, dernier alinéa ; D221-5,
 * depuis le 19 juin 2026) : bouton « Renoncer au contrat ici », visible pendant tout le délai ; déclaration (nom et
 * prénom, contrat, adresse de l'accusé) ; « Confirmer la rétractation » ; accusé de réception envoyé par e-mail.
 * Textes : relecture juriste-btp du 12 oct. 2026. La base décide de tout (retracter_devis, migration 086).
 */
export default function RetractationEnLigne({ token, devis, client, entreprise, retractation, couleur = '#f97316', onChange }) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(devis?.signataire_nom || [client?.prenom, client?.nom].filter(Boolean).join(' '));
  const [email, setEmail] = useState(client?.email || '');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [accuse, setAccuse] = useState(retractation?.accuse_le ? 'envoye' : null); // null | 'envoye' | 'echec'

  const nomEntreprise = entreprise?.nom || 'l\'entreprise';
  const contrat = [
    `Devis n° ${devis?.numero || ''}`,
    devis?.date ? `du ${jourCourt(devis.date)}` : '',
    devis?.signature_date ? `signé le ${jourCourt(devis.signature_date)}` : '',
    entreprise?.nom ? `— ${entreprise.nom}` : '',
  ].filter(Boolean).join(' ');

  // Accusé de réception (D221-5) : envoyé par le serveur, une seule fois ; « envoyé » n'est dit que s'il est parti
  const envoyerAccuse = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('notify-signature', { body: { token, evenement: 'retractation' } });
      if (error || !data?.success) throw error || new Error(data?.error || 'accusé non envoyé');
      setAccuse('envoye');
    } catch (err) {
      captureException(err, { context: 'Accusé de réception de rétractation' });
      setAccuse('echec');
    }
  };

  const confirmer = async () => {
    if (envoi) return;
    setErreur('');
    if (!nom.trim()) { setErreur('Indiquez votre nom et votre prénom.'); return; }
    if (!estEmail(email)) { setErreur('Indiquez une adresse e-mail valide pour recevoir l\'accusé de réception.'); return; }
    setEnvoi(true);
    try {
      const { data, error } = await supabase.rpc('retracter_devis', {
        p_token: token, p_nom: nom.trim(), p_email: email.trim(), p_user_agent: navigator.userAgent,
      });
      if (error) throw error;
      if (!data?.success) { setErreur(data?.error || 'La rétractation n\'a pas pu être enregistrée. Réessayez.'); setEnvoi(false); return; }
      await envoyerAccuse();
      onChange?.();
    } catch (err) {
      captureException(err, { context: 'Rétractation en ligne' });
      setErreur('La rétractation n\'a pas pu être enregistrée. Réessayez, ou écrivez à l\'entreprise.');
    }
    setEnvoi(false);
  };

  // ─── Déjà transmise ───
  if (retractation?.le) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left" data-ui="RetractationRecue">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700 space-y-2">
            <p className="font-medium text-slate-900">Rétractation transmise</p>
            <p>Votre rétractation a été transmise à {nomEntreprise} le {dateHeureParis(retractation.le)} (heure de Paris).</p>
            {accuse === 'echec' ? (
              <>
                <p role="alert" className="text-red-700">L'accusé de réception n'a pas pu être envoyé à {retractation.email}.</p>
                <button type="button" onClick={envoyerAccuse} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium min-h-[44px]">
                  <Mail className="w-4 h-4" /> Renvoyer l'accusé de réception
                </button>
              </>
            ) : accuse === 'envoye' ? (
              <p>Un accusé de réception a été envoyé à {retractation.email}.</p>
            ) : (
              <>
                <p>L'accusé de réception sera envoyé à {retractation.email}.</p>
                <button type="button" onClick={envoyerAccuse} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium min-h-[44px]">
                  <Mail className="w-4 h-4" /> Recevoir l'accusé de réception
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!retractation?.ouverte) return null;

  // ─── Encadré et bouton (visible pendant tout le délai) ───
  if (!ouvert) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left" data-ui="RetractationEnLigne">
        <p className="text-sm text-slate-700">
          Vous pouvez vous rétracter de ce contrat sans donner de motif jusqu'au <strong>{jourLong(retractation.fin)}</strong> inclus
          {devis?.travaux_urgents ? ', sauf pour les pièces et travaux strictement nécessaires au dépannage urgent (art. L221-28, 8° du Code de la consommation)' : ''}.
        </p>
        <button type="button" onClick={() => setOuvert(true)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 font-semibold min-h-[44px] hover:border-slate-400">
          <Undo2 className="w-4 h-4" /> Renoncer au contrat ici
        </button>
      </div>
    );
  }

  // ─── Déclaration de rétractation ───
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4 text-left" data-ui="DeclarationRetractation">
      <h2 className="font-bold text-slate-900 mb-3">Renoncer au contrat</h2>
      <label className="block text-sm font-medium text-slate-900 mb-1" htmlFor="retractation-nom">Votre nom et prénom</label>
      <input id="retractation-nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name"
        className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 mb-3" />
      <p className="block text-sm font-medium text-slate-900 mb-1">Contrat concerné</p>
      <p className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 mb-3 text-sm">{contrat}</p>
      <label className="block text-sm font-medium text-slate-900 mb-1" htmlFor="retractation-email">Adresse e-mail où recevoir l'accusé de réception</label>
      <input id="retractation-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
        className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 mb-3" />
      <p className="text-sm text-slate-700 mb-4">
        Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessus.
      </p>
      {erreur && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700 mb-3"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{erreur}</p>
      )}
      <button type="button" onClick={confirmer} disabled={envoi}
        className="w-full py-3.5 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px]"
        style={{ background: couleur }}>
        {envoi ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        Confirmer la rétractation
      </button>
      <button type="button" onClick={() => setOuvert(false)} className="w-full mt-2 py-2.5 text-sm text-slate-600 underline min-h-[44px]">
        Revenir au devis
      </button>
    </div>
  );
}
