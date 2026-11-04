/**
 * Build de TEST seulement (parcours « dictée ») : la config de l'app, avec l'interrupteur FONCTIONS.ia allumé au
 * moment du build. Le code livré garde `ia: false` (décision D-07, c'est Hugo qui rallumera) ; ce build va dans
 * audit-ui/ (ignoré par git) et n'est jamais déployé.
 */
import base from '../../vite.config.js';

export default {
  ...base,
  plugins: [
    ...(base.plugins || []),
    {
      name: 'parcours-ia-allumee',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replace(/\\/g, '/').endsWith('/src/lib/fonctions.js')) return null;
        // Depuis l'allumage (commit B, D-32), le code livré porte déjà `ia: true` : rien à changer.
        if (/\bia: true,/.test(code)) return null;
        const allume = code.replace(/\bia: false,/, 'ia: true,');
        if (allume === code) throw new Error('parcours-ia-allumee : « ia: false, » introuvable dans fonctions.js');
        return allume;
      },
    },
  ],
};
