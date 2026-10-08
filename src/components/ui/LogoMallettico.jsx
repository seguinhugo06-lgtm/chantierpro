import { useId } from 'react';

/**
 * Logo Mallettico (la mallette au « M ») — source : Documents/Mallettico/Logo vectoriel/mallettico-logo.svg.
 * Seul endroit où le logo est dessiné dans l'app : toute évolution du logo se fait ici (et dans public/icon*.svg).
 *
 * - `taille` : côté en pixels (le logo est carré).
 * - `fond` : 'blanc' (pastille blanche arrondie, pour les fonds sombres ou colorés) ou 'aucun' (la mallette seule, recadrée).
 * Les identifiants des dégradés sont propres à chaque instance (useId) : deux logos sur une page,
 * dont un masqué, ne se volent pas leurs dégradés.
 */
export default function LogoMallettico({ taille = 32, fond = 'aucun', className = '', titre = 'Mallettico' }) {
  const id = useId().replace(/:/g, '');
  const u = (nom) => `${nom}-${id}`;
  const avecFond = fond === 'blanc';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={avecFond ? '0 0 948.62 948.62' : '115 180 718.62 568'}
      width={taille}
      height={avecFond ? taille : Math.round(taille * 568 / 718.62)}
      role={titre ? 'img' : undefined}
      aria-label={titre || undefined}
      aria-hidden={titre ? undefined : true}
      className={className}
      style={{ flex: 'none', display: 'block' }}
    >
      <defs>
        <linearGradient id={u('fond')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#BFF2FF" /><stop offset=".45" stopColor="#93B9D6" /><stop offset="1" stopColor="#12336F" />
        </linearGradient>
        <radialGradient id={u('orange')} cx=".30" cy=".40" r=".55">
          <stop offset="0" stopColor="#EE7B20" /><stop offset=".45" stopColor="#EE7B20" stopOpacity=".72" /><stop offset="1" stopColor="#EE7B20" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u('nuithd')} cx="1.02" cy="-.02" r=".58">
          <stop offset="0" stopColor="#0D2E6C" /><stop offset="1" stopColor="#0D2E6C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u('nuitbg')} cx="-.02" cy="1.02" r=".42">
          <stop offset="0" stopColor="#0D2E6C" /><stop offset="1" stopColor="#0D2E6C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u('cyan')} cx="-.05" cy="-.05" r=".45">
          <stop offset="0" stopColor="#B3F7FF" /><stop offset="1" stopColor="#B3F7FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={u('lueur')} cx=".66" cy=".92" r=".42">
          <stop offset="0" stopColor="#F0FAFF" /><stop offset=".5" stopColor="#DCEFFB" stopOpacity=".65" /><stop offset="1" stopColor="#DCEFFB" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={u('anse')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#BCD3E2" /><stop offset="1" stopColor="#EE7B20" />
        </linearGradient>
        <clipPath id={u('corps')}><rect x="130.73" y="264.02" width="687.15" height="468" rx="35.75" /></clipPath>
      </defs>
      {avecFond && <rect width="948.62" height="948.62" rx="80.78" fill="#fff" />}
      <path d="M606.57,238h-25v-16.59c0-1.92-1.55-3.47-3.47-3.47h-207.59c-1.92,0-3.47,1.55-3.47,3.47v16.59h-25v-33.47c0-6.4,5.19-11.59,11.59-11.59h241.35c6.4,0,11.59,5.19,11.59,11.59v33.47Z" fill={`url(#${u('anse')})`} />
      <g clipPath={`url(#${u('corps')})`}>
        {['fond', 'cyan', 'orange', 'nuithd', 'nuitbg', 'lueur'].map((calque) => (
          <rect key={calque} x="130.73" y="264.02" width="687.15" height="468" fill={`url(#${u(calque)})`} />
        ))}
      </g>
      <path d="M771.91,687.14h-89.03c-10.33,0-18.7-7.86-18.7-17.57v-230.29c0-6.14-8.28-8.79-12.27-3.93l-133.89,163.57-26.47,32.34c-8.74,10.67-25.86,10.67-34.6,0l-26.47-32.34-133.89-163.57c-3.99-4.87-12.27-2.22-12.27,3.93v230.29c0,9.7-8.37,17.57-18.7,17.57h-89.03c-.11,0-.13-.14-.02-.16,22.09-5.64,38.34-24.61,38.34-47.14v-262.91c0-19.78-12.51-36.81-30.51-44.5-.03,0-.06-.03-.09-.04-.28-.11-.56-.23-.84-.34-.01,0-.02,0-.03,0-3.61-1.65-6.06-5.19-5.87-9.25.24-5.29,5.13-9.36,10.77-9.36h84.53c7.23,0,14.04,3.16,18.44,8.53l171.84,209.93c5.61,6.85,16.6,6.85,22.21,0l171.84-209.93c4.4-5.37,11.21-8.53,18.44-8.53h84.53c5.64,0,10.53,4.07,10.77,9.36.19,4.06-2.26,7.61-5.87,9.25-.01,0-.02,0-.03,0-.28.1-.56.23-.84.34-.03,0-.06.03-.09.04-18,7.68-30.51,24.71-30.51,44.5v262.91c0,22.53,16.25,41.51,38.34,47.14.11.02.09.16-.02.16Z" fill="#fff" />
      <path d="M573.78,313.43c3.92,0,6.13,4.22,3.74,7.14l-92.18,112.6c-5.6,6.86-16.6,6.86-22.2,0l-92.18-112.6c-2.39-2.92-.17-7.14,3.74-7.14h199.07Z" fill="#fff" />
    </svg>
  );
}

/** Le logo suivi du nom « Mallettico ». `couleurTexte` : couleur du nom (par défaut, celle du texte autour). */
export function MarqueMallettico({ taille = 32, fond = 'aucun', couleurTexte, className = '', classeTexte = 'font-bold text-lg' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMallettico taille={taille} fond={fond} titre="" />
      <span className={classeTexte} style={couleurTexte ? { color: couleurTexte } : undefined}>Mallettico</span>
    </span>
  );
}
