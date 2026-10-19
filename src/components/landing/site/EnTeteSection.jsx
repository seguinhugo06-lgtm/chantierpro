import Apparition from './Apparition';

/**
 * EnTeteSection — le titre (`h2`) d'une section du site et son texte d'introduction, qui apparaissent doucement au
 * défilement (bloc court : `Apparition`).
 * `sombre` : sur la bande bleu nuit (titre blanc, texte acier 8,4:1) ; sinon titre nuit, texte ardoise (8,9:1).
 * `data-intro` sur le texte : lu par le parcours du site (contraste).
 */
export function EnTeteSection({ titre, children, sombre = false, className = '' }) {
  return (
    <Apparition className={className}>
      <h2
        className={`text-balance text-[clamp(1.75rem,3.6vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] ${
          sombre ? 'text-white' : 'text-marque-nuit'
        }`}
      >
        {titre}
      </h2>
      {children ? (
        <p data-intro="" className={`mt-4 max-w-[40em] text-lg leading-relaxed ${sombre ? 'text-marque-acier' : 'text-marque-ardoise'}`}>
          {children}
        </p>
      ) : null}
    </Apparition>
  );
}

export default EnTeteSection;
