import { useEffect, useState } from 'react';
import { BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Bouton } from '../ui/Bouton';
import Carte from '../ui/Carte';
import LogoMallettico from '../ui/LogoMallettico';
import { captureException } from '../../lib/sentry';

/**
 * Page publique du lien « ne plus recevoir de rappel » de chaque e-mail de rappel de ramonage (/rappel-ramonage/:jeton).
 * Prospection d'un client existant (CPCE L. 34-5, RGPD art. 21) : le refus se fait sans compte, en un geste. Rien ne
 * se fait à l'ouverture de la page (les messageries ouvrent parfois les liens pour les analyser) : il faut toucher le
 * bouton. La fonction `refuser_rappels_ramonage` (migration 104) ne lit ni ne renvoie rien d'autre.
 */
export default function RefusRappelsPage({ jeton }) {
  const [etat, setEtat] = useState('question'); // question | envoi | fait | inconnu | erreur
  useEffect(() => { document.title = 'Rappels de ramonage — Mallettico'; }, []);
  const refuser = async () => {
    if (!supabase) { setEtat('erreur'); return; }
    setEtat('envoi');
    const { data, error } = await supabase.rpc('refuser_rappels_ramonage', { p_jeton: jeton });
    if (error) {
      captureException(new Error(error.message), { context: 'refus des rappels de ramonage', code: error.code });
      setEtat('erreur');
      return;
    }
    setEtat(data === true ? 'fait' : 'inconnu');
  };

  return (
    <main className="min-h-screen bg-fond flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2 mb-6 text-encre font-bold text-lg">
        <LogoMallettico taille={28} />
        <span>Mallettico</span>
      </div>
      <Carte marge="large" className="max-w-md w-full">
        {etat === 'fait' ? (
          <div role="status" className="text-center space-y-3">
            <CheckCircle size={40} className="mx-auto text-succes-texte" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-encre">C’est noté</h1>
            <p className="text-base text-encre-2">Vous ne recevrez plus de rappel de ramonage de ce professionnel. Vous pouvez toujours le contacter directement.</p>
          </div>
        ) : etat === 'inconnu' || etat === 'erreur' ? (
          <div role="alert" className="text-center space-y-3">
            <AlertCircle size={40} className="mx-auto text-alerte-texte" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-encre">{etat === 'inconnu' ? 'Lien non reconnu' : 'Service momentanément indisponible'}</h1>
            <p className="text-base text-encre-2">Pour ne plus recevoir de rappel, répondez « STOP » à l’e-mail de rappel, ou dites-le directement à votre ramoneur (ses coordonnées sont dans l’e-mail de rappel).</p>
            {etat === 'erreur' ? <Bouton variante="secondaire" onClick={refuser}>Réessayer</Bouton> : null}
          </div>
        ) : (
          <div className="space-y-4">
            <BellOff size={36} className="text-encre-2" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-encre">Ne plus recevoir de rappel de ramonage ?</h1>
            <p className="text-base text-encre-2">Votre ramoneur vous envoie un e-mail avant la date de votre prochain ramonage. Vous pouvez arrêter ces rappels, à tout moment et sans frais.</p>
            <Bouton variante="principal" pleineLargeur chargement={etat === 'envoi'} onClick={refuser}>Ne plus recevoir de rappel</Bouton>
          </div>
        )}
      </Carte>
      <p className="mt-6 text-sm text-encre-3 text-center max-w-md">Mallettico est le logiciel de devis et de factures utilisé par votre ramoneur pour vous envoyer ses rappels.</p>
      <p className="mt-2 text-sm text-center">
        <a href="/mentions-legales" className="text-accent-texte underline">Mentions légales</a>
        <span className="text-encre-3" aria-hidden="true"> · </span>
        <a href="/confidentialite" className="text-accent-texte underline">Confidentialité</a>
      </p>
    </main>
  );
}
