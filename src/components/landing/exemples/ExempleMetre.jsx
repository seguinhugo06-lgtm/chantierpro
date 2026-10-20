/**
 * ExempleMetre — « Métré express » : longueur, largeur, nombre et chutes donnent la quantité en m² et le montant d'une
 * vraie ligne de la bibliothèque Carrelage (fourniture et pose de grès cérame, prix moyen indicatif), en direct.
 *
 * - Le calcul est celui de la fenêtre « Métré » de l'éditeur de devis : la même fonction (`calculerMetre`,
 *   src/lib/metre.js), mêmes règles et même arrondi.
 * - Déjà chiffré à l'arrivée (une pièce de 5,2 × 3,8 m, 10 % de chutes) : rien à saisir pour voir le résultat.
 * - Champs en texte avec clavier décimal : la virgule française est acceptée.
 * - Le plan (décor) dessine la pièce à l'échelle, carreaux de 60 cm et marge des chutes ; les chiffres sont écrits à côté.
 * - Au téléphone, le résultat (quantité et montant) suit les champs, avant le plan : il reste en vue clavier ouvert.
 *   Au bureau : champs et plan à gauche, résultat à droite.
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { useEffect, useId, useState } from 'react';
import { formatMoney } from '../../../lib/formatters';
import { calculerMetre } from '../../../lib/metre';
import { captureException } from '../../../lib/sentry';
import { chargerBibliotheque } from '../site/bibliotheque';
import { ligneDuMetre, montantDuMetre } from './exemples';
import { LegendeExemple } from './communs';

const CHAMPS = [
  { cle: 'longueur', libelle: 'Longueur (m)' },
  { cle: 'largeur', libelle: 'Largeur (m)' },
  { cle: 'nombre', libelle: 'Nombre' },
  { cle: 'chutes', libelle: 'Chutes (%)' },
];
const DEPART = { longueur: '5,2', largeur: '3,8', nombre: '1', chutes: '10' };

/** Valeur positive d'un champ pour le plan et la formule affichée (0 si vide ou illisible). */
function lire(valeur) {
  const n = parseFloat(String(valeur ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
const fr = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/** La pièce vue de dessus, à l'échelle : carreaux de 60 cm, chutes en pointillés autour (décor, `aria-hidden`). */
function Plan({ longueur, largeur, nombre, chutes }) {
  const id = `plan-${useId().replace(/:/g, '')}`;
  const ok = longueur > 0 && largeur > 0;
  const k = ok ? Math.min(200 / longueur, 112 / largeur) : 0;
  const l = ok ? longueur * k : 120;
  const h = ok ? largeur * k : 72;
  const x = 150 - l / 2;
  const y = 74 - h / 2;
  const pas = 0.6 * k;
  const verticales = ok && pas >= 4 ? Array.from({ length: Math.min(60, Math.floor(longueur / 0.6)) }, (_, i) => x + (i + 1) * pas) : [];
  const horizontales = ok && pas >= 4 ? Array.from({ length: Math.min(60, Math.floor(largeur / 0.6)) }, (_, i) => y + (i + 1) * pas) : [];
  const marge = ok && chutes > 0 ? Math.min(12, 3 + chutes * 0.5) : 0;
  return (
    <svg viewBox="0 0 300 172" aria-hidden="true" className="block h-auto w-full max-w-[22rem]">
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={l} height={h} />
        </clipPath>
      </defs>
      {marge ? (
        <rect x={x - marge} y={y - marge} width={l + 2 * marge} height={h + 2 * marge} rx="4" fill="none" className="stroke-marque-orange" strokeWidth="1.5" strokeDasharray="4 4" />
      ) : null}
      <rect x={x} y={y} width={l} height={h} className={ok ? 'fill-marque-glacier-1' : 'fill-white'} />
      <g clipPath={`url(#${id})`} className="stroke-marque-acier" strokeWidth="1">
        {verticales.map((v) => <line key={`v${v}`} x1={v} y1={y} x2={v} y2={y + h} />)}
        {horizontales.map((v) => <line key={`h${v}`} x1={x} y1={v} x2={x + l} y2={v} />)}
      </g>
      <rect x={x} y={y} width={l} height={h} fill="none" className="stroke-marque-nuit-2" strokeWidth="2" strokeDasharray={ok ? undefined : '5 5'} />
      {ok ? (
        <>
          <text x={150} y={y + h + marge + 18} textAnchor="middle" className="fill-slate-700 text-[13px] font-semibold">{`${fr(longueur)} m`}</text>
          <text x={x - marge - 10} y={74} textAnchor="middle" transform={`rotate(-90 ${x - marge - 10} 74)`} className="fill-slate-700 text-[13px] font-semibold">{`${fr(largeur)} m`}</text>
          {nombre > 1 ? (
            <text x={x + l + marge + 8} y={y + 4} className="fill-marque-nuit text-[15px] font-bold">{`× ${fr(nombre)}`}</text>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

export default function ExempleMetre() {
  const [valeurs, setValeurs] = useState(DEPART);
  const [ligne, setLigne] = useState(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let annule = false;
    chargerBibliotheque()
      .then((bibliotheque) => { if (!annule) setLigne(ligneDuMetre(bibliotheque)); })
      .catch((erreur) => {
        captureException(erreur, { composant: 'ExempleMetre' });
        if (!annule) setEchec(true);
      });
    return () => { annule = true; };
  }, []);

  const { quantite, unite } = calculerMetre(valeurs);
  const montant = ligne ? montantDuMetre(quantite, ligne.prixUnitaire) : null;
  const L = lire(valeurs.longueur);
  const l = lire(valeurs.largeur);
  const n = lire(valeurs.nombre) || 1;
  const c = lire(valeurs.chutes);
  const formule = `${fr(L)} × ${fr(l)} m${n > 1 ? `, × ${fr(n)}` : ''}${c > 0 ? `, + ${fr(c)} % de chutes` : ''}`;

  return (
    <>
      <div className="grid flex-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-5">
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="grid grid-cols-2 gap-3">
            {CHAMPS.map((champ) => (
              <div key={champ.cle}>
                <label htmlFor={`metre-${champ.cle}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {champ.libelle}
                </label>
                <input
                  id={`metre-${champ.cle}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={valeurs[champ.cle]}
                  onChange={(e) => setValeurs((v) => ({ ...v, [champ.cle]: e.target.value }))}
                  className="h-12 w-full rounded-xl border border-marque-acier bg-white px-3.5 text-lg font-semibold tabular-nums text-slate-900 transition-colors focus-visible:border-marque-nuit-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marque-nuit-2/40"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-marque-acier/60 bg-white p-4 shadow-[0_18px_40px_-30px_rgba(13,46,108,0.5)] sm:p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <p className="text-sm font-semibold text-slate-600">Quantité calculée</p>
          <p data-quantite="" className="mt-1 whitespace-nowrap text-4xl font-extrabold tabular-nums tracking-tight text-marque-nuit sm:text-5xl">
            {fr(quantite)} <span className="text-xl font-bold sm:text-2xl">{unite}</span>
          </p>
          <p className="mt-1.5 text-sm tabular-nums text-slate-600">{formule}</p>

          <div className="mt-5 flex flex-col border-t border-dashed border-marque-acier pt-5">
            {echec ? (
              <p data-metre-echec="" className="text-base text-marque-ardoise">La ligne de la bibliothèque n'a pas pu être chargée. Rechargez la page pour voir son montant.</p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bibliothèque Carrelage</p>
                <p data-designation="" className="mt-1.5 min-h-[2.75em] text-base font-semibold leading-snug text-slate-900">
                  {ligne ? ligne.designation : ''}
                </p>
                <p data-prix-unitaire={ligne ? ligne.prixUnitaire : undefined} className="mt-1 text-sm tabular-nums text-slate-600">
                  {ligne ? <>{fr(quantite)} {unite} × {formatMoney(ligne.prixUnitaire, 2)} HT · TVA {ligne.tva} %</> : '\u00a0'}
                </p>
                <div className="pt-4">
                  <div className="rounded-xl bg-marque-glacier-1 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-700">Montant de la ligne</p>
                    <p data-montant="" className="mt-0.5 whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                      {montant != null ? `${formatMoney(montant, 2)} HT` : '\u00a0'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="sr-only" role="status">
            {montant != null ? `Quantité ${fr(quantite)} ${unite}, montant de la ligne ${formatMoney(montant, 2)} hors taxes.` : `Quantité ${fr(quantite)} ${unite}.`}
          </p>
        </div>

        <div className="flex items-center justify-center rounded-2xl bg-marque-glacier-1/70 px-3 py-4 ring-1 ring-inset ring-marque-acier/40 lg:col-start-1 lg:row-start-2">
          <Plan longueur={L} largeur={l} nombre={n} chutes={c} />
        </div>
      </div>
      <LegendeExemple>
        Même calcul que la fenêtre « Métré » de l'éditeur de devis. Prix moyen indicatif de la bibliothèque, hors taxes.
      </LegendeExemple>
    </>
  );
}
