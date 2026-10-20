import PlanArchitecte from './PlanArchitecte';

/**
 * EnTetePage — le haut d'une sous-page du site (/fonctionnalites, /fonctionnalites/:slug, /ressources) : fond glacier
 * vers blanc avec le plan d'architecte et une lueur orange très douce (décor), un surtitre en pastille avec le point
 * orange, le titre `h1` (un seul par page) et son texte. `children` : ce qui suit le texte (boutons, lien de retour) ;
 * `aside` : la colonne de droite au bureau (une capture).
 * Rien n'y est animé à l'entrée : le contenu est lisible dès le premier affichage (comme le premier écran de l'accueil).
 * `data-intro` sur le texte : lu par le parcours du site (contraste).
 */
export function EnTetePage({ surtitre, titre, intro, children, aside = null, avant = null }) {
  return (
    // Couleur de fond = le haut du dégradé (le plus foncé) : c'est contre elle que se mesure le contraste du titre
    <section className="relative overflow-hidden bg-marque-glacier-1 bg-gradient-to-b from-marque-glacier-1 to-white to-90%">
      <PlanArchitecte />
      <div
        aria-hidden="true"
        data-decor=""
        className="pointer-events-none absolute -right-32 -top-32 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(238,123,32,0.14),transparent_60%)]"
      />
      <div
        // Sans capture, la section suivante prolonge l'en-tête (filtres, galerie) : peu d'espace dessous
        className={`relative mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14 ${
          aside ? 'grid items-center gap-10 pb-14 sm:pb-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14 [&>*]:min-w-0' : 'pb-6 sm:pb-8'
        }`}
      >
        <div>
          {avant}
          {surtitre ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-marque-acier/70 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-marque-nuit-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-marque-orange shadow-[0_0_0_3px_rgba(238,123,32,0.2),0_0_10px_rgba(238,123,32,0.8)]"
              />
              {surtitre}
            </p>
          ) : null}
          <h1 className="mt-5 text-balance text-[clamp(2rem,4.4vw,3.25rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-marque-nuit">
            {titre}
          </h1>
          {intro ? (
            <p data-intro="" className="mt-5 max-w-[38em] text-lg leading-relaxed text-marque-ardoise">
              {intro}
            </p>
          ) : null}
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}

export default EnTetePage;
