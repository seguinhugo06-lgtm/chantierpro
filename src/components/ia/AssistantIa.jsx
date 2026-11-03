import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, MicOff, ArrowUp, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useDictation } from '../../hooks/useDictation';
import { isDemo } from '../../supabaseClient';
import { captureException } from '../../lib/sentry';
import { comprendre } from '../../lib/ia/assistant';
import { preparer, questionsOuvertes } from '../../lib/ia/preparer';
import { EXEMPLES } from '../../lib/ia/simulateur';
import { TEXTE_MAX } from '../../lib/ia/contrat';
import ResultatAssistant from './ResultatAssistant';

/**
 * Assistant — PROTOTYPE (3 nov. 2026, docs/ia/ligne-directrice.md). Une seule entrée, à la voix ou au clavier :
 * l'artisan dit ce qu'il veut, l'assistant prépare le résultat (brouillon, relances, chiffre, heures), l'artisan
 * valide en un geste ou corrige. Monté par App.jsx si `FONCTIONS.ia` ou en démonstration.
 *
 * Garde-fous : rien n'est enregistré ni envoyé sans le bouton de validation ; les chiffres viennent des données
 * (lib/ia/preparer.js) ; ce que l'assistant ne sait pas (HT/TTC, TVA, client ambigu) est demandé.
 */
export default function AssistantIa({ isOpen, onClose, page = '', entreprise = {}, ouvrirDevis }) {
  const { clients = [], chantiers = [], equipe = [], devis = [], paiements = [], addDevis, addPointage, deletePointage } = useData();
  const { canPerform, canViewPrices } = usePermissions();
  const dictee = useDictation();
  const [texte, setTexte] = useState('');
  const [phase, setPhase] = useState('saisie'); // saisie | prepare | resultat | erreur
  const [comprise, setComprise] = useState(null);
  const [reponses, setReponses] = useState({});
  const [erreur, setErreur] = useState('');
  const [etat, setEtat] = useState({ enCours: false, fait: null });
  const champ = useRef(null);
  const zoneResultat = useRef(null);

  // Ce que dit la dictée remplit le champ : l'artisan voit et corrige le texte avant de l'envoyer
  useEffect(() => {
    if (dictee.listening || dictee.transcript) setTexte(dictee.texte);
  }, [dictee.texte, dictee.listening, dictee.transcript]);

  const reinitialiser = useCallback(() => {
    setPhase('saisie'); setComprise(null); setReponses({}); setErreur(''); setEtat({ enCours: false, fait: null });
  }, []);

  useEffect(() => {
    if (!isOpen) { dictee.stop?.(); reinitialiser(); setTexte(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule l'ouverture compte
  }, [isOpen]);

  const donnees = useMemo(() => ({ clients, chantiers, equipe, devis, paiements, entreprise }), [clients, chantiers, equipe, devis, paiements, entreprise]);
  const proposition = useMemo(() => (comprise ? preparer(comprise, reponses, donnees) : null), [comprise, reponses, donnees]);
  const questions = useMemo(() => (comprise ? questionsOuvertes(comprise, proposition, reponses) : []), [comprise, proposition, reponses]);

  const envoyer = async (demande = texte) => {
    const t = String(demande || '').trim();
    if (!t) { champ.current?.focus(); return; }
    if (dictee.listening) dictee.stop();
    setTexte(t);
    setPhase('prepare'); setErreur(''); setReponses({}); setEtat({ enCours: false, fait: null });
    const r = await comprendre({ texte: t, source: dictee.transcript ? 'voix' : 'clavier', page, clients, chantiers, equipe });
    if (!r.ok) { setErreur(r.message); setPhase('erreur'); return; }
    setComprise(r);
    setPhase('resultat');
    requestAnimationFrame(() => zoneResultat.current?.focus());
  };

  const repondre = (id, valeur) => setReponses((r) => ({ ...r, [id]: valeur }));

  const validerDevis = async () => {
    if (!proposition?.brouillon) return;
    setEtat({ enCours: true, fait: null });
    try {
      const cree = await addDevis(proposition.brouillon);
      // addDevis renvoie null quand il refuse (limite du plan, CGU, client manquant) et l'a déjà dit à l'artisan
      if (!cree) { setEtat({ enCours: false, fait: null }); return; }
      setEtat({ enCours: false, fait: cree, ouvrir: () => { onClose(); ouvrirDevis?.(cree); } });
    } catch (e) {
      captureException(e, { tags: { module: 'assistant', action: 'devis' } });
      setErreur('Le brouillon n’a pas pu être enregistré. Réessayez.');
      setEtat({ enCours: false, fait: null });
    }
  };

  const validerHeures = async () => {
    if (!proposition?.pointage) return;
    setEtat({ enCours: true, fait: null });
    try {
      const cree = await addPointage(proposition.pointage);
      if (!cree) { setEtat({ enCours: false, fait: null }); setErreur('Les heures n’ont pas pu être enregistrées. Réessayez.'); return; }
      setEtat({ enCours: false, fait: cree });
    } catch (e) {
      captureException(e, { tags: { module: 'assistant', action: 'heures' } });
      setErreur('Les heures n’ont pas pu être enregistrées. Réessayez.');
      setEtat({ enCours: false, fait: null });
    }
  };

  const annulerHeures = async () => {
    const id = etat.fait?.id;
    if (!id) return;
    setEtat((e) => ({ ...e, enCours: true }));
    const ok = await deletePointage(id);
    if (!ok) { setEtat((e) => ({ ...e, enCours: false })); setErreur('L’ajout n’a pas pu être annulé. Retirez les heures depuis le chantier.'); return; }
    setEtat({ enCours: false, fait: null });
  };

  // Prototype : la validation des relances ne branche pas encore l'envoi (lot 2 de la feuille de route). En démo,
  // on montre le résultat ; hors démo, rien n'est simulé : l'artisan est renvoyé vers l'envoi existant.
  const validerRelances = (ids) => setEtat({ enCours: false, fait: ids.length });

  const enCours = phase === 'prepare';
  const micro = dictee.supported;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Que voulez-vous faire ?">
      <div className="space-y-4" data-ui="assistant">
        <p className="text-sm text-encre-2">
          Dites-le ou tapez-le en quelques mots. Je prépare, vous vérifiez et vous validez : rien n’est enregistré ni envoyé sans vous.
        </p>
        {isDemo ? <p className="rounded-xl bg-info-fond text-info-texte text-sm font-medium px-3 py-2">Démonstration : réponses simulées, données d’exemple</p> : null}

        <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor="assistant-demande" className="sr-only">Votre demande</label>
            <textarea
              id="assistant-demande"
              ref={champ}
              rows={2}
              maxLength={TEXTE_MAX}
              value={texte}
              onChange={(e) => { setTexte(e.target.value); if (phase !== 'saisie' && phase !== 'prepare') reinitialiser(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              placeholder={dictee.listening ? 'Je vous écoute…' : 'Ex. : devis pour Mme Martin, remplacement du tableau, 1 200 €'}
              className="w-full rounded-2xl border border-bord-fort bg-surface text-base text-encre placeholder:text-encre-3 px-3.5 py-3 min-h-[56px] resize-none focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          {micro ? (
            <BoutonIcone
              icone={dictee.listening ? MicOff : Mic}
              libelle={dictee.listening ? 'Arrêter la dictée' : 'Dicter'}
              variante="secondaire"
              aria-pressed={dictee.listening}
              onClick={() => dictee.toggle()}
              className="h-14 w-14 flex-shrink-0 rounded-full border border-bord-fort"
            />
          ) : null}
          <BoutonIcone
            type="submit"
            icone={ArrowUp}
            libelle="Préparer"
            variante="secondaire"
            disabled={enCours || !texte.trim()}
            className="h-14 w-14 flex-shrink-0 rounded-full border border-bord-fort"
          />
        </form>
        {dictee.error ? <p className="text-sm text-danger-texte" role="alert">{dictee.error}</p> : null}

        {phase === 'saisie' ? (
          <div>
            <p className="text-xs font-medium text-encre-3 mb-2">Par exemple</p>
            <div className="flex flex-col gap-2">
              {EXEMPLES.map((ex) => (
                <Bouton key={ex} variante="secondaire" className="justify-start text-left whitespace-normal h-auto min-h-[44px] py-2.5" onClick={() => envoyer(ex)}>
                  {ex}
                </Bouton>
              ))}
            </div>
          </div>
        ) : null}

        <div ref={zoneResultat} tabIndex={-1} aria-live="polite" className="focus:outline-none">
          {enCours ? <p className="text-sm text-encre-2" role="status">Je prépare…</p> : null}
          {phase === 'erreur' ? (
            <div role="alert" className="rounded-2xl bg-alerte-fond text-alerte-texte p-3 text-sm space-y-2">
              <p>{erreur}</p>
              <Bouton variante="secondaire" icone={RotateCcw} onClick={() => envoyer()}>Réessayer</Bouton>
            </div>
          ) : null}
          {phase === 'resultat' ? (
            <div className="space-y-3">
              {erreur ? <p role="alert" className="rounded-2xl bg-danger-fond text-danger-texte p-3 text-sm">{erreur}</p> : null}
              <ResultatAssistant
                proposition={proposition}
                questions={questions}
                onRepondre={repondre}
                etat={etat}
                voirPrix={canViewPrices}
                demo={isDemo}
                peutCreer={canPerform('devis', 'create')}
                peutRelancer={canPerform('devis', 'edit')}
                peutPointer={canPerform('pointage', 'create')}
                onValider={proposition?.type === 'devis' ? validerDevis : proposition?.type === 'heures' ? validerHeures : validerRelances}
                onAnnuler={annulerHeures}
              />
              {!etat.fait ? (
                <Bouton variante="discret" icone={RotateCcw} onClick={() => { reinitialiser(); champ.current?.focus(); }}>
                  Corriger ma demande
                </Bouton>
              ) : (
                <Bouton variante="discret" onClick={() => { reinitialiser(); setTexte(''); champ.current?.focus(); }}>
                  Autre demande
                </Bouton>
              )}
            </div>
          ) : null}
        </div>

        <p className="text-xs text-encre-3">
          Assistant automatique : il peut se tromper. Relisez avant de valider.
        </p>
      </div>
    </Modal>
  );
}
