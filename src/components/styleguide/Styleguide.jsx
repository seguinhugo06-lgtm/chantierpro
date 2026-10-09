import { useEffect, useRef, useState } from 'react';
import { Plus, Send, Trash2, MoreHorizontal, FileText, Search, Phone, ArrowUpDown, Receipt } from 'lucide-react';
import { appliquerTheme } from '../../lib/theme';
import { statutsDe } from '../../lib/statuts';
import { formatMoney } from '../../lib/formatters';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import Pastille, { PastilleStatut } from '../ui/Pastille';
import TuileChiffre from '../ui/TuileChiffre';
import { EnTetePage, TitreSection } from '../ui/EnTete';
import LigneListe, { Avatar, GroupeListe } from '../ui/LigneListe';
import { Onglets, Segmente } from '../ui/Onglets';
import Champ from '../ui/Champ';
import EtatVide from '../ui/EtatVide';
import { ChampRecherche, BoutonVolet, SegmentDefilant, PucesActives } from '../ui/Filtres';

// ════════════════════════════════════════════════════════
// Styleguide — bibliothèque d'interface vivante (/styleguide, cachée, non indexée).
// Tout ce qui s'affiche ici est rendu par les vrais composants de src/components/ui/ et les vrais
// jetons de src/styles/theme.css : la page ne peut pas diverger de l'app. Les valeurs des couleurs
// sont lues à l'exécution dans les variables CSS. Jetons exportés pour Figma : design/tokens/.
// ════════════════════════════════════════════════════════

const ACCENTS = [
  { nom: 'Orange Mallettico', hex: '#f97316' },
  { nom: 'Bleu', hex: '#2563eb' },
  { nom: 'Vert', hex: '#16a34a' },
  { nom: 'Ardoise', hex: '#334155' },
];

const NEUTRES = [
  ['fond', 'Page'], ['surface', 'Carte, volet'], ['surface-2', 'Creux, survol'], ['bord', 'Traits'],
  ['bord-fort', 'Champs'], ['encre', 'Titres, montants'], ['encre-2', 'Texte secondaire'], ['encre-3', 'Méta, libellés'],
];
const ACCENT = [['accent', 'Action, sélection'], ['sur-accent', 'Texte sur l\'accent'], ['accent-texte', 'Accent en texte']];
const TONS = ['neutre', 'info', 'succes', 'alerte', 'danger'];
const NOMS_TONS = { neutre: 'Neutre', info: 'Info', succes: 'Succès', alerte: 'Alerte', danger: 'Danger' };

const TYPO = [
  ['text-4xl', '36 px', 'Montant héros', '20 350 €'],
  ['text-2xl', '24 px', 'Titre de page, chiffres', 'Devis & factures'],
  ['text-lg', '18 px', 'Titre de section', 'À faire aujourd\'hui'],
  ['text-base', '16 px', 'Corps, titres de carte, champs', 'Rénovation salle de bain'],
  ['text-sm', '14 px', 'Méta, libellés, boutons', 'DEV-2026-00042 · 12 sept.'],
  ['text-xs', '12 px', 'Pastilles, légendes (plancher)', 'Envoyé'],
];

function hexDe(element, variable) {
  if (!element) return '';
  const brut = getComputedStyle(element).getPropertyValue(variable).trim();
  const p = brut.split(/\s+/).map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) return brut;
  return `#${p.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function Section({ titre, children, note }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-encre-3">{titre}</h2>
        {note ? <p className="mt-1 text-sm text-encre-2">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Nuancier({ racine, version }) {
  const [valeurs, setValeurs] = useState({});
  useEffect(() => {
    const lire = (n) => hexDe(racine.current, `--${n}`);
    const v = {};
    [...NEUTRES, ...ACCENT].forEach(([n]) => { v[n] = lire(n); });
    TONS.forEach((t) => ['fond', 'texte', 'point'].forEach((r) => { v[`${t}-${r}`] = lire(`${t}-${r}`); }));
    setValeurs(v);
  }, [racine, version]);
  const Pave = ({ nom, role }) => (
    <div className="flex items-center gap-3 min-w-0">
      <span className={`w-10 h-10 rounded-xl border border-bord flex-shrink-0`} style={{ background: `rgb(var(--${nom}))` }} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-encre truncate">{nom}</span>
        <span className="block text-xs text-encre-3 truncate"><span className="font-mono">{valeurs[nom]}</span> · {role}</span>
      </span>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{NEUTRES.map(([n, r]) => <Pave key={n} nom={n} role={r} />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{ACCENT.map(([n, r]) => <Pave key={n} nom={n} role={r} />)}</div>
      <div className="space-y-2">
        {TONS.map((t) => (
          <div key={t} className="flex items-center gap-3">
            <span className="w-16 text-sm font-medium text-encre-2">{NOMS_TONS[t]}</span>
            <Pastille ton={t}>{NOMS_TONS[t]}</Pastille>
            <span className="text-xs text-encre-3 font-mono truncate">{valeurs[`${t}-fond`]} / {valeurs[`${t}-texte`]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Une planche complète dans un thème : tout le catalogue, rendu par les vrais composants. */
function Planche({ sombre, couleur }) {
  const racine = useRef(null);
  const [version, setVersion] = useState(0);
  const [onglet, setOnglet] = useState('apercu');
  const [periode, setPeriode] = useState('mois');
  const [filtre, setFiltre] = useState('');
  const [recherche, setRecherche] = useState('');
  useEffect(() => {
    appliquerTheme(racine.current, { sombre, couleur });
    setVersion((v) => v + 1);
  }, [sombre, couleur]);

  return (
    <div ref={racine} data-theme={sombre ? 'sombre' : 'clair'} className="bg-fond text-encre rounded-3xl border border-bord p-4 sm:p-6 space-y-10 min-w-0">
      <p className="text-sm font-semibold text-encre-2">{sombre ? 'Sombre' : 'Clair'}</p>

      <Section titre="Couleurs" note="Une palette neutre nommée par rôle, l'accent de l'entreprise, cinq tons de sens.">
        <Nuancier racine={racine} version={version} />
      </Section>

      <Section titre="Typographie" note="Inter, six tailles, rien sous 12 px ; chiffres tabulaires.">
        <div className="space-y-3">
          {TYPO.map(([classe, taille, usage, exemple]) => (
            <div key={classe} className="flex items-baseline gap-3 min-w-0">
              <span className="w-14 flex-shrink-0 text-xs text-encre-3 font-mono">{taille}</span>
              <span className={`${classe} font-semibold text-encre truncate tabular-nums`}>{exemple}</span>
              <span className="hidden xl:inline text-xs text-encre-3 truncate">{usage}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Formes et élévations" note="Deux arrondis (12 px contrôles, 16 px cartes) et la pilule ; trois élévations.">
        <div className="grid grid-cols-3 gap-3">
          {[['shadow-e1', 'Posé'], ['shadow-e2', 'Flottant'], ['shadow-e3', 'Modal']].map(([c, n]) => (
            <div key={c} className={`h-20 rounded-2xl bg-surface border border-bord ${c} flex items-end p-3`}>
              <span className="text-xs font-medium text-encre-2">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="1 · Bouton" note="Un seul bouton plein par écran. 44 px de haut, 48 px pour la grande taille.">
        <div className="flex flex-wrap gap-2">
          <Bouton variante="principal" icone={Send}>Envoyer le devis</Bouton>
          <Bouton variante="secondaire" icone={FileText}>Aperçu</Bouton>
          <Bouton variante="discret">Annuler</Bouton>
          <Bouton variante="danger" icone={Trash2}>Supprimer</Bouton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="principal" taille="grande">Facturer {formatMoney(20350)}</Bouton>
          <Bouton variante="secondaire" taille="compacte" icone={Plus}>Ajouter</Bouton>
          <Bouton variante="principal" chargement>Envoi…</Bouton>
          <BoutonIcone icone={MoreHorizontal} libelle="Plus d'actions" variante="secondaire" />
          <BoutonIcone icone={Phone} libelle="Appeler" />
        </div>
      </Section>

      <Section titre="2 · Carte" note="La surface unique : bord fin, arrondi 16 px, posée. Pas de liseré ni de dégradé.">
        <Carte>
          <p className="text-base font-semibold text-encre">Rénovation salle de bain</p>
          <p className="mt-1 text-sm text-encre-2">Marie Dupont · Bordeaux</p>
        </Carte>
        <Carte as="button" interactive>
          <p className="text-base font-semibold text-encre">Carte cliquable</p>
          <p className="mt-1 text-sm text-encre-2">Toute la carte ouvre la fiche.</p>
        </Carte>
      </Section>

      <Section titre="3 · Pastille de statut" note="Un statut = un mot et un ton, partout (src/lib/statuts.js).">
        {['devis', 'facture', 'chantier'].map((genre) => (
          <div key={genre} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium text-encre-2 capitalize">{genre}</span>
            {statutsDe(genre).filter((s, i, t) => t.findIndex((x) => x.libelle === s.libelle) === i).map((s) => (
              <PastilleStatut key={s.cle} genre={genre} statut={s.cle} />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-16 text-sm font-medium text-encre-2">Fiche</span>
          <PastilleStatut genre="devis" statut="signe" taille="grande" />
        </div>
      </Section>

      <Section titre="4 · Tuile de chiffre" note="Libellé avec sa période, gros chiffre, une seule touche de couleur : l'alerte ou la tuile héros.">
        <div className="grid grid-cols-2 gap-3">
          <TuileChiffre heros libelle="À encaisser" valeur={formatMoney(12480)} contexte="7 factures" className="col-span-2" />
          <TuileChiffre libelle="Encaissé · octobre" valeur={formatMoney(8240)} contexte="+12 % sur septembre" />
          <TuileChiffre libelle="En retard" valeur={formatMoney(3740)} alerte="2 factures" />
          <TuileChiffre libelle="Devis en attente" valeur="5" contexte={formatMoney(14400)} onClick={() => {}} actif />
          <TuileChiffre libelle="Signés · 12 mois" valeur="68 %" contexte="17 sur 25" onClick={() => {}} actif={false} />
        </div>
      </Section>

      <Section titre="5 · En-têtes" note="Titre de page 24 px, sans tuile d'icône ; titre de section 18 px avec compteur et lien.">
        <EnTetePage titre="Devis & factures" sousTitre="15 documents · 3 à relancer" actions={<Bouton variante="principal" icone={Plus}>Nouveau</Bouton>} className="!mb-0" />
        <TitreSection titre="À faire aujourd'hui" compte={3} action="Tout voir" onAction={() => {}} className="!mb-0" />
      </Section>

      <Section titre="6 · Ligne de liste" note="Titre et montant sur la première ligne, méta et statut dessous ; une action libellée si elle est due.">
        <GroupeListe>
          <LigneListe
            onClick={() => {}} debut={<Avatar nom="Marie Dupont" />}
            titre="Marie Dupont" montant={formatMoney(4136)}
            meta="Salle de bain · DEV-2026-00042 · 12 sept." pastille={<PastilleStatut genre="devis" statut="envoye" />}
            pied={(
              <>
                <span className="text-sm font-medium text-danger-texte">Sans réponse depuis 36 j</span>
                <Bouton taille="compacte" icone={Send}>Relancer</Bouton>
              </>
            )}
          />
          <LigneListe
            onClick={() => {}} debut={<Avatar nom="SCI Les Tilleuls" />}
            titre="SCI Les Tilleuls" montant={formatMoney(20350)}
            meta="Façade · FAC-2026-00017 · échéance 24 oct." pastille={<PastilleStatut genre="facture" statut="payee" />}
          />
        </GroupeListe>
      </Section>

      <Section titre="7 · Onglets et segments" note="Onglets : vues d'un même objet. Segments : période ou mode. Jamais remplis d'accent.">
        <Onglets
          ariaLabel="Sections du chantier" actif={onglet} onChange={setOnglet}
          onglets={[{ id: 'apercu', libelle: 'Aperçu' }, { id: 'documents', libelle: 'Documents', compte: 4 }, { id: 'depenses', libelle: 'Dépenses' }, { id: 'photos', libelle: 'Photos', compte: 12 }]}
        />
        <Segmente ariaLabel="Période" valeur={periode} onChange={setPeriode} options={[{ valeur: 'mois', libelle: 'Mois' }, { valeur: 'trimestre', libelle: 'Trimestre' }, { valeur: 'annee', libelle: 'Année' }]} />
      </Section>

      <Section titre="8 · Champ" note="Libellé relié, 48 px, texte 16 px (pas de zoom sur iPhone), aide et erreur annoncées.">
        <Champ libelle="Nom du client" placeholder="Marie Dupont" />
        <Champ libelle="Téléphone" facultatif aide="Pour appeler en un geste depuis la fiche." inputMode="tel" placeholder="06 12 34 56 78" />
        <Champ libelle="E-mail" erreur="Cette adresse n'est pas valide." defaultValue="marie.dupont@" />
        <Champ libelle="Taux de TVA" as="select" defaultValue="10">
          <option value="20">20 %</option><option value="10">10 % (rénovation)</option><option value="5.5">5,5 % (rénovation énergétique)</option>
        </Champ>
      </Section>

      <Section titre="9 · État vide" note="Une icône neutre, une phrase, une seule action.">
        <Carte marge="aucun">
          <EtatVide icone={Receipt} titre="Aucune facture" texte="Vos factures apparaîtront ici dès que vous facturerez un devis signé." action={<Bouton variante="principal" icone={Plus}>Créer une facture</Bouton>} />
        </Carte>
        <Carte marge="aucun">
          <EtatVide icone={Search} titre="Aucun résultat pour « zzz »" action={<Bouton>Effacer la recherche</Bouton>} />
        </Carte>
      </Section>

      <Section titre="10 · Recherche, filtres et tri" note="Volet en bas d'écran sur téléphone, ancré au bureau ; un filtre choisi s'affiche inversé.">
        <div className="flex items-center gap-2">
          <ChampRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher…" className="flex-1" />
          <BoutonVolet libelle="Filtres" compte={2} onClick={() => {}} libelleCacheTelephone />
          <BoutonVolet icone={ArrowUpDown} libelle="Trier" valeur="Plus récents" onClick={() => {}} libelleCacheTelephone />
        </div>
        <SegmentDefilant ariaLabel="Type" valeur={filtre} onChange={setFiltre} options={[{ valeur: '', libelle: 'Tous', compte: 15 }, { valeur: 'devis', libelle: 'Devis', compte: 9 }, { valeur: 'factures', libelle: 'Factures', compte: 6 }]} />
        <PucesActives puces={[{ cle: 'p', libelle: 'Ce mois', onRetirer: () => {} }, { cle: 'c', libelle: 'Marie Dupont', onRetirer: () => {} }]} onToutEffacer={() => {}} />
      </Section>
    </div>
  );
}

export default function Styleguide() {
  const [accent, setAccent] = useState(ACCENTS[0].hex);
  useEffect(() => {
    document.title = 'Bibliothèque d\'interface — Mallettico';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    appliquerTheme(document.documentElement, { sombre: false, couleur: ACCENTS[0].hex });
    return () => meta.remove();
  }, []);

  return (
    <div className="min-h-screen bg-fond text-encre">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-accent-texte">Mallettico</p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">Bibliothèque d'interface</h1>
          <p className="max-w-2xl text-base text-encre-2">
            Les jetons et les dix composants de base, en clair et en sombre. Tout est rendu par le vrai code de l'app
            (<code className="font-mono text-sm">src/components/ui/</code>, <code className="font-mono text-sm">src/styles/theme.css</code>) :
            cette page ne peut pas être en retard sur l'app.
          </p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Couleur d'accent de l'entreprise">
            <span className="text-sm text-encre-2 mr-1">Couleur de l'entreprise :</span>
            {ACCENTS.map((a) => (
              <button
                key={a.hex} type="button" aria-pressed={accent === a.hex} onClick={() => setAccent(a.hex)}
                className={`h-11 inline-flex items-center gap-2 pl-2 pr-3.5 rounded-full border text-sm font-medium ${accent === a.hex ? 'bg-encre text-surface border-encre' : 'bg-surface border-bord text-encre hover:bg-surface-2'}`}
              >
                <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: a.hex }} aria-hidden="true" />
                {a.nom}
              </button>
            ))}
          </div>
          <p className="text-sm text-encre-3">Le texte posé sur l'accent et l'accent écrit en texte s'ajustent seuls pour rester lisibles (4,5:1 au moins), quelle que soit la couleur choisie.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Planche sombre={false} couleur={accent} />
          <Planche sombre couleur={accent} />
        </div>
      </div>
    </div>
  );
}
