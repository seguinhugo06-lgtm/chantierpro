import { describe, it, expect } from 'vitest';
import { jetonsPour, correspondance } from '../../../scripts/migration/correspondances.mjs';
import { transformer } from '../../../scripts/migration/transformer.mjs';

/**
 * Fin de l'ancien code de thème et de couleurs (plan du 19 oct. 2026), tâche 2 : la transformation du code
 * source et sa table de correspondances (spec docs/superpowers/specs/2026-10-19-ancien-code-design.md).
 *   jetonsPour(classes claires)  la branche claire d'un ternaire isDark traduite en jetons, ou null
 *   transformer(source)          (1) ternaires isDark → jetons ; (2) classes orange des className → jetons ;
 *                                (3) couleur de l'entreprise en style → bg-accent / text-accent-texte
 * Jamais dans une chaîne ou un gabarit qui contient « < » (HTML d'un document imprimé ou d'un e-mail).
 */

/** La transformation d'un extrait, et la garantie qu'elle ne change plus rien si on la rejoue. */
function transforme(source) {
  const r = transformer(source);
  const encore = transformer(r.source);
  expect(encore.source, 'rejouée, la transformation ne change plus rien').toBe(r.source);
  expect(encore.changements).toBe(0);
  return r;
}

describe('jetonsPour', () => {
  it('traduit les classes claires en jetons (cas de la consigne)', () => {
    expect(jetonsPour('bg-white border-slate-200')).toBe('bg-surface border-bord');
    expect(jetonsPour('text-slate-500')).toBe('text-encre-3');
    expect(jetonsPour('bg-white text-emerald-600')).toBe(null);
  });

  it('applique chaque ligne de la table de la spec', () => {
    const table = [
      ['bg-white', 'bg-surface'],
      ['bg-slate-50', 'bg-fond'], ['bg-gray-50', 'bg-fond'],
      ['bg-slate-100', 'bg-surface-2'], ['bg-gray-100', 'bg-surface-2'],
      ['border-slate-100', 'border-bord'], ['border-slate-200', 'border-bord'], ['border-gray-200', 'border-bord'],
      ['border-slate-300', 'border-bord-fort'], ['border-gray-300', 'border-bord-fort'],
      ['text-slate-900', 'text-encre'], ['text-slate-800', 'text-encre'], ['text-gray-900', 'text-encre'], ['text-[#1a1a1a]', 'text-encre'],
      ['text-slate-700', 'text-encre-2'], ['text-slate-600', 'text-encre-2'], ['text-gray-700', 'text-encre-2'], ['text-gray-600', 'text-encre-2'],
      ['text-slate-500', 'text-encre-3'], ['text-slate-400', 'text-encre-3'], ['text-gray-500', 'text-encre-3'], ['text-gray-400', 'text-encre-3'],
      ['hover:bg-slate-50', 'hover:bg-surface-2'], ['hover:bg-slate-100', 'hover:bg-surface-2'],
      ['hover:bg-gray-50', 'hover:bg-surface-2'], ['hover:bg-gray-100', 'hover:bg-surface-2'],
      ['placeholder-slate-400', 'placeholder:text-encre-3'],
      ['bg-orange-500', 'bg-accent'], ['bg-orange-600', 'bg-accent'], ['bg-[#f97316]', 'bg-accent'],
      ['text-orange-500', 'text-accent-texte'], ['text-orange-600', 'text-accent-texte'], ['text-orange-700', 'text-accent-texte'],
      ['bg-orange-50', 'bg-accent/10'], ['bg-orange-100', 'bg-accent/10'],
      ['border-orange-200', 'border-accent/30'], ['border-orange-300', 'border-accent/30'],
      ['ring-orange-500', 'ring-accent'], ['focus:ring-orange-500', 'focus:ring-accent'],
    ];
    for (const [ancien, jeton] of table) expect(jetonsPour(ancien), ancien).toBe(jeton);
  });

  it('garde l\'ordre et les classes non colorées', () => {
    expect(jetonsPour('rounded-xl bg-white p-4 shadow text-slate-900 font-bold'))
      .toBe('rounded-xl bg-surface p-4 shadow text-encre font-bold');
    expect(jetonsPour('')).toBe('');
  });

  it('garde les préfixes de variante, l\'important et le suffixe d\'opacité', () => {
    expect(jetonsPour('sm:hover:bg-slate-100')).toBe('sm:hover:bg-surface-2');
    expect(jetonsPour('group-hover:text-slate-900')).toBe('group-hover:text-encre');
    expect(jetonsPour('md:bg-slate-50')).toBe('md:bg-fond');
    expect(jetonsPour('peer-checked:bg-white')).toBe('peer-checked:bg-surface');
    expect(jetonsPour('bg-white/80 border-slate-200/70')).toBe('bg-surface/80 border-bord/70');
    expect(jetonsPour('focus:placeholder-slate-400')).toBe('focus:placeholder:text-encre-3');
    expect(jetonsPour('placeholder:text-slate-400')).toBe('placeholder:text-encre-3');
    expect(jetonsPour('!bg-white hover:!bg-slate-50')).toBe('!bg-surface hover:!bg-surface-2');
    expect(jetonsPour('ring-orange-500/20')).toBe('ring-accent/20');
    expect(jetonsPour('text-[#1A1A1A]')).toBe('text-encre');
    expect(jetonsPour('bg-[#F97316] text-white')).toBe('bg-accent text-sur-accent');
  });

  it('rend null dès qu\'une seule classe colorée n\'a pas de correspondance', () => {
    for (const classes of [
      'text-white', 'bg-black/50', 'bg-slate-200', 'text-orange-400', 'hover:bg-[#f5f5f5]',
      'border-t-slate-200', 'divide-slate-200', 'shadow-slate-200/50', 'ring-offset-white',
      'bg-primary-500', 'text-success-600', 'from-slate-50 to-white', 'peer-checked:bg-slate-200',
      'bg-white bg-orange-50/50', // une opacité sur un jeton qui en a déjà une
    ]) {
      expect(jetonsPour(classes), classes).toBe(null);
    }
  });

  it('garde tels quels les jetons et les couleurs qui ne dépendent pas du thème', () => {
    expect(jetonsPour('bg-surface text-encre-2 bg-accent/10 border-transparent text-current'))
      .toBe('bg-surface text-encre-2 bg-accent/10 border-transparent text-current');
  });

  it('un texte blanc ne devient text-sur-accent que sur un aplat d\'accent ; un texte foncé sur l\'aplat → null', () => {
    expect(jetonsPour('bg-orange-500 text-white')).toBe('bg-accent text-sur-accent');
    expect(jetonsPour('hover:bg-orange-600 hover:text-white')).toBe('hover:bg-accent hover:text-sur-accent');
    expect(jetonsPour('bg-white text-white')).toBe(null);
    expect(jetonsPour('bg-orange-500 text-slate-900')).toBe(null);
  });

  it('correspondance traduit une classe seule, ou rend null', () => {
    expect(correspondance('hover:bg-slate-50')).toBe('hover:bg-surface-2');
    expect(correspondance('bg-slate-50')).toBe('bg-fond');
    expect(correspondance('text-emerald-600')).toBe(null);
  });
});

describe('transformer — ternaires isDark', () => {
  it('remplace le ternaire par la branche claire traduite (cas de la consigne)', () => {
    const r = transforme("const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';");
    expect(r.source).toBe("const cardBg = 'bg-surface border-bord';");
    expect(r.changements).toBe(1);
    expect(r.ignores).toBe(0);
  });

  it('laisse intact un ternaire dont une classe claire n\'a pas de correspondance (cas de la consigne)', () => {
    const source = "const c = isDark ? 'bg-slate-800' : 'bg-white text-emerald-600';";
    const r = transforme(source);
    expect(r.source).toBe(source);
    expect(r.changements).toBe(0);
    expect(r.ignores).toBe(1);
  });

  it('garde les guillemets, les commentaires et la mise en forme autour', () => {
    const source = [
      '// thème',
      'const t = isDark ? "text-white" : "text-slate-900"; /* garde */',
      'const u = isDark',
      "  ? 'text-slate-400'",
      "  : 'text-slate-500';",
      'export { t, u };',
    ].join('\n');
    expect(transforme(source).source).toBe([
      '// thème',
      'const t = "text-encre"; /* garde */',
      "const u = 'text-encre-3';",
      'export { t, u };',
    ].join('\n'));
  });

  it('dans un attribut JSX, écrit une chaîne simple ; dans un gabarit, insère les classes dans le texte', () => {
    expect(transforme("const p = <p className={isDark ? 'text-white' : 'text-slate-500'}>x</p>;").source)
      .toBe('const p = <p className="text-encre-3">x</p>;');
    expect(transforme("const p = <p className={`p-4 ${isDark ? 'bg-slate-800' : 'bg-white'} rounded`}>x</p>;").source)
      .toBe('const p = <p className={`p-4 bg-surface rounded`}>x</p>;');
    expect(transforme("const p = <Carte fond={isDark ? 'bg-slate-900' : 'bg-slate-50'} />;").source)
      .toBe('const p = <Carte fond="bg-fond" />;');
  });

  it('une branche claire sans texte ni fond laisse le texte hérité et le fond transparent : traduite', () => {
    expect(transforme("const t = isDark ? 'text-slate-200' : '';").source).toBe("const t = '';");
    expect(transforme("const p = <p className={`p-2 ${isDark ? 'bg-slate-800 text-white' : ''} m-1`}>x</p>;").source)
      .toBe('const p = <p className={`p-2 m-1`}>x</p>;');
    expect(transforme("const h = isDark ? 'placeholder-slate-500' : 'placeholder:text-slate-400';").source)
      .toBe("const h = 'placeholder:text-encre-3';");
  });

  it('cite sans erreur une valeur arbitraire qui contient le guillemet de la chaîne', () => {
    expect(transforme("const c = isDark ? 'text-white before:content-[\\'x\\']' : 'text-slate-900 before:content-[\\'x\\']';").source)
      .toBe('const c = "text-encre before:content-[\'x\']";');
  });

  it('retire les parenthèses devenues inutiles', () => {
    expect(transforme("const b = (isDark ? 'bg-slate-900' : 'bg-slate-50');").source).toBe("const b = 'bg-fond';");
    expect(transforme("const x = 'flex ' + (isDark ? 'text-white' : 'text-slate-900');").source)
      .toBe("const x = 'flex ' + 'text-encre';");
  });

  it('laisse les ternaires qui ne sont pas un simple changement de couleur (valeurs, mots, autres classes)', () => {
    for (const source of [
      "const fill = isDark ? '#1e293b' : '#ffffff';",
      "const grille = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';",
      "const theme = isDark ? 'dark' : 'light';",
      "const ombre = isDark ? 'shadow-none' : 'shadow-sm';",
      "const o = isDark ? 'bg-slate-800 opacity-80' : 'bg-white';",
      "const e = <p>{isDark ? 'text-white' : 'text-slate-900'}</p>;",
      // sans couleur claire, l'anneau, son décalage ou le trait reprendraient leur valeur par défaut (claire) en sombre
      "const f = isDark ? 'focus-visible:ring-offset-slate-900' : '';",
      "const g = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white';",
    ]) {
      const r = transforme(source);
      expect(r.source, source).toBe(source);
      expect(r.ignores, source).toBe(1);
    }
  });

  it('ne touche ni un autre test que isDark ni une branche qui n\'est pas une chaîne simple', () => {
    for (const source of [
      "const t = estSombre ? 'text-white' : 'text-slate-900';",
      "const t = isDark ? 'text-white' : autre;",
      'const t = isDark ? `text-white` : `text-slate-900`;',
    ]) {
      const r = transforme(source);
      expect(r.source, source).toBe(source);
      expect(r.changements + r.ignores, source).toBe(0);
    }
  });

  it('ne touche jamais un gabarit ou une chaîne qui contient « < » (HTML de document)', () => {
    for (const source of [
      "const html = `<td class=\"${isDark ? 'text-white' : 'text-slate-900'}\">${x}</td>`;",
      "const h = `<ul>${items.map((i) => `<li class=\"${isDark ? 'a' : 'b'}\">${i}</li>`).join('')}</ul>`;",
      'const html = `<th style="background:${couleur}15;color:${couleur}">${isDark ? \'a\' : \'b\'}</th>`;',
    ]) {
      const r = transforme(source);
      expect(r.source, source).toBe(source);
      expect(r.changements + r.ignores, source).toBe(0);
    }
  });
});

describe('transformer — classes orange des className', () => {
  it('traduit l\'aplat orange et son texte blanc (cas de la consigne)', () => {
    const r = transforme('const b = <button className="bg-orange-500 text-white">Ok</button>;');
    expect(r.source).toContain('className="bg-accent text-sur-accent"');
    expect(r.source).toBe('const b = <button className="bg-accent text-sur-accent">Ok</button>;');
  });

  it('ne traduit que les lignes orange de la table ; les autres couleurs restent', () => {
    const r = transforme('const p = <p className="text-orange-600 border border-orange-200 text-slate-500">x</p>;');
    expect(r.source).toBe('const p = <p className="text-accent-texte border border-accent/30 text-slate-500">x</p>;');
    expect(r.changements).toBe(2);
    expect(transforme('const a = <a className="hover:text-orange-600 focus:ring-orange-500">x</a>;').source)
      .toBe('const a = <a className="hover:text-accent-texte focus:ring-accent">x</a>;');
    const sansLigne = 'const i = <i className="text-orange-400 border-orange-500 bg-orange-50/50" />;';
    expect(transforme(sansLigne).source).toBe(sansLigne);
  });

  it('traduit les chaînes et le texte des gabarits de l\'expression du className, espaces gardés', () => {
    expect(transforme("const b = <b className={actif ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'}>x</b>;").source)
      .toBe("const b = <b className={actif ? 'bg-accent text-sur-accent' : 'bg-white text-slate-600'}>x</b>;");
    expect(transforme('const b = <b className={`px-2 bg-orange-50 ${x}`}>x</b>;').source)
      .toBe('const b = <b className={`px-2 bg-accent/10 ${x}`}>x</b>;');
    expect(transforme('const b = <b className="flex  bg-orange-50\n  p-2">x</b>;').source)
      .toBe('const b = <b className="flex  bg-accent/10\n  p-2">x</b>;');
    // une classe collée à une expression n'est pas complète : on n'y touche pas
    const colle = 'const b = <b className={`text-orange-500${x}`}>x</b>;';
    expect(transforme(colle).source).toBe(colle);
  });

  it('laisse l\'aplat orange qui porte un texte foncé, et le signale', () => {
    const source = 'const b = <button className="bg-orange-500 text-slate-900">Ok</button>;';
    const r = transforme(source);
    expect(r.source).toBe(source);
    expect(r.ignores).toBe(1);
    expect(r.signalements).toHaveLength(1);
    expect(r.signalements[0].ligne).toBe(1);
  });

  it('sur un fond de couleur fixe, garde texte, trait et anneau orange (les jetons y seraient illisibles) ; l\'aplat passe', () => {
    // écran de connexion : fond sombre fixe ; text-accent-texte (bleu nuit en clair) y serait invisible
    const connexion = [
      'const l = (',
      '  <div className="min-h-screen bg-slate-900">',
      '    <button className="text-orange-500 hover:text-orange-400">S\'inscrire</button>',
      '    <input className="bg-slate-800 text-white focus:ring-2 focus:ring-orange-500/20" />',
      '    <button className="bg-orange-500 text-white">Se connecter</button>',
      '  </div>',
      ');',
    ].join('\n');
    const r = transforme(connexion);
    expect(r.source).toBe(connexion.replace('"bg-orange-500 text-white"', '"bg-accent text-sur-accent"'));
    expect(r.ignores).toBe(2);
    expect(r.signalements.map((s) => s.ligne)).toEqual([3, 4]);
    // îlot clair codé en dur : en sombre, text-accent-texte (éclairci) y manquerait de contraste
    const ilot = 'const i = <div className="bg-white"><p className="text-orange-600">x</p></div>;';
    expect(transforme(ilot).source).toBe(ilot);
  });

  it('sur un fond qui suit le thème (jeton, variable de fond, teinte translucide au-dessus), traduit', () => {
    expect(transforme('const i = <div className={cardBg}><p className="text-orange-600">x</p></div>;').source)
      .toBe('const i = <div className={cardBg}><p className="text-accent-texte">x</p></div>;');
    expect(transforme('const i = <div className="bg-surface"><div className="bg-orange-50"><p className="text-orange-700">x</p></div></div>;').source)
      .toBe('const i = <div className="bg-surface"><div className="bg-accent/10"><p className="text-accent-texte">x</p></div></div>;');
    expect(transforme("const i = <div className={isDark ? 'bg-slate-800' : 'bg-red-50'}><p className=\"text-orange-600\">x</p></div>;").source)
      .toBe("const i = <div className={isDark ? 'bg-slate-800' : 'bg-red-50'}><p className=\"text-accent-texte\">x</p></div>;");
  });

  it('ne touche pas l\'orange hors d\'un className, ni dans un ternaire isDark laissé intact', () => {
    for (const source of [
      "const c = 'bg-orange-500 text-white';",
      'const f = <Foo couleurClasse="bg-orange-500" />;',
      "const b = <b className={isDark ? 'bg-orange-900/30' : 'bg-orange-50 text-emerald-700'}>x</b>;",
    ]) {
      expect(transforme(source).source, source).toBe(source);
    }
  });
});

describe('transformer — couleur de l\'entreprise posée en style', () => {
  it('aplat : bg-accent, et text-sur-accent à la place du texte blanc (cas de la consigne)', () => {
    const r = transforme('const b = <button className="px-4 text-white rounded-xl" style={{ background: couleur }}>Valider</button>;');
    expect(r.source).toContain('<button className="px-4 rounded-xl bg-accent text-sur-accent">');
    expect(r.changements).toBe(1);
  });

  it('texte : text-accent-texte, className créé s\'il manque (cas de la consigne)', () => {
    expect(transforme('const s = <span style={{ color: couleur }}>{prix}</span>;').source)
      .toContain('<span className="text-accent-texte">');
    expect(transforme('const s = <span style={{ color: accent }}>x</span>;').source)
      .toBe('const s = <span className="text-accent-texte">x</span>;');
  });

  it('ne touche pas la couleur écrite dans du HTML de document (cas de la consigne)', () => {
    const source = 'const html = `<td style="color:${couleur}">`';
    const r = transforme(source);
    expect(r.source).toBe(source);
    expect(r.changements + r.ignores).toBe(0);
  });

  it('garde les autres propriétés du style et sa mise en forme', () => {
    expect(transforme('const d = <div className="w-2 h-2 rounded-full" style={{ backgroundColor: couleur, opacity: 0.5 }} />;').source)
      .toBe('const d = <div className="w-2 h-2 rounded-full bg-accent" style={{ opacity: 0.5 }} />;');
    const multi = [
      'const d = (',
      '  <div',
      '    className="p-2"',
      '    style={{',
      '      width: 4,',
      '      background: couleur,',
      '    }}',
      '  />',
      ');',
    ].join('\n');
    expect(transforme(multi).source).toBe([
      'const d = (',
      '  <div',
      '    className="p-2 bg-accent"',
      '    style={{',
      '      width: 4,',
      '    }}',
      '  />',
      ');',
    ].join('\n'));
    expect(transforme('const t = <p style={{ background: `${couleur}15`, color: couleur }}>x</p>;').source)
      .toBe('const t = <p className="text-accent-texte" style={{ background: `${couleur}15` }}>x</p>;');
    expect(transforme('const t = <p className="p-1" style={{ background: couleur, color: \'white\' }}>x</p>;').source)
      .toBe('const t = <p className="p-1 bg-accent" style={{ color: \'white\' }}>x</p>;');
    const multiSeul = 'const b = (\n  <button\n    onClick={f}\n    style={{ background: couleur }}\n  >\n    Ok\n  </button>\n);';
    expect(transforme(multiSeul).source).toBe('const b = (\n  <button\n    onClick={f}\n    className="bg-accent"\n  >\n    Ok\n  </button>\n);');
  });

  it('retire les classes de couleur que le style recouvrait', () => {
    expect(transforme('const p = <p className="font-bold text-slate-900 text-lg" style={{ color: couleur }}>x</p>;').source)
      .toBe('const p = <p className="font-bold text-lg text-accent-texte">x</p>;');
    expect(transforme('const d = <div className="bg-white text-white p-2" style={{ background: couleur }}>x</div>;').source)
      .toBe('const d = <div className="p-2 bg-accent text-sur-accent">x</div>;');
  });

  it('étend un className écrit entre accolades ou en gabarit', () => {
    expect(transforme("const p = <p className={'p-2'} style={{ color: couleur }}>x</p>;").source)
      .toBe("const p = <p className={'p-2 text-accent-texte'}>x</p>;");
    const r = transforme('const d = <div className={`p-2 ${a}`} style={{ color: couleur }}>x</div>;');
    expect(r.source).toBe('const d = <div className={`p-2 ${a} text-accent-texte`}>x</div>;');
    expect(r.signalements).toHaveLength(1); // ${a} peut porter une autre couleur de texte
  });

  it('passe aussi les icônes lucide-react et les éléments motion', () => {
    const icone = "import { Bell, Settings as Reglages } from 'lucide-react';\nconst i = <Bell size={20} style={{color: couleur}} />;\nconst j = <Reglages style={{ color: couleur }} className=\"w-4\" />;";
    expect(transforme(icone).source).toBe("import { Bell, Settings as Reglages } from 'lucide-react';\nconst i = <Bell size={20} className=\"text-accent-texte\" />;\nconst j = <Reglages className=\"w-4 text-accent-texte\" />;");
    const motion = "import { motion } from 'framer-motion';\nconst m = <motion.div className=\"p-2\" style={{ background: couleur }} />;";
    expect(transforme(motion).source).toBe("import { motion } from 'framer-motion';\nconst m = <motion.div className=\"p-2 bg-accent\" />;");
  });

  it('laisse, en les comptant, les cas qu\'il ne sait pas étendre sans risque', () => {
    for (const source of [
      'const c = <Carte style={{ background: couleur }}>x</Carte>;', // composant : className peut-être ignoré
      "const d = <div className={cx('p-2', a)} style={{ background: couleur }} />;",
      'const d = <div {...props} style={{ background: couleur }} />;', // props.className écrasé
      'const d = <div className="p-2" style={{ ...base, background: couleur }} />;', // base.background reprendrait la main
      'const d = <div className="p-2" style={a ? { color: couleur } : undefined} />;',
      'const d = <div className="bg-gradient-to-r from-white to-slate-50" style={{ background: couleur }} />;',
      "const t = <p style={{ background: couleur, color: '#1e293b' }}>x</p>;",
    ]) {
      const r = transforme(source);
      expect(r.source, source).toBe(source);
      expect(r.ignores, source).toBe(1);
    }
  });

  it('garde la couleur du texte posée sur un fond de couleur fixe, et le signale ; l\'aplat passe', () => {
    const source = [
      "import { Bell } from 'lucide-react';",
      'const b = (',
      '  <div className="bg-slate-900">',
      '    <Bell style={{ color: couleur }} />',
      '    <span className="w-2 h-2" style={{ background: couleur }} />',
      '  </div>',
      ');',
    ].join('\n');
    const r = transforme(source);
    expect(r.source).toBe(source.replace('"w-2 h-2" style={{ background: couleur }}', '"w-2 h-2 bg-accent"'));
    expect(r.ignores).toBe(1);
    expect(r.signalements.map((s) => s.ligne)).toEqual([4]);
  });

  it('laisse l\'aplat qui porte un texte foncé, et le signale (texte non blanc : rien n\'est ajouté)', () => {
    const source = 'const b = <button className="text-slate-900" style={{ background: couleur }}>x</button>;';
    const r = transforme(source);
    expect(r.source).toBe(source);
    expect(r.ignores).toBe(1);
    expect(r.signalements).toHaveLength(1);
  });

  it('signale un aplat posé sur un élément qui a du texte sans couleur de texte', () => {
    const r = transforme('const b = <button className="px-4" style={{ background: couleur }}>Ok</button>;');
    expect(r.source).toBe('const b = <button className="px-4 bg-accent">Ok</button>;');
    expect(r.signalements).toHaveLength(1);
    expect(transforme('const p = <span className="w-2 h-2" style={{ background: couleur }} />;').signalements).toHaveLength(0);
  });

  it('ne touche ni une autre valeur ni une autre propriété', () => {
    for (const source of [
      'const s = <span style={{ color: couleurTexte }}>x</span>;',
      "const s = <span style={{ color: 'var(--accent)' }}>x</span>;",
      'const s = <span className="p-1" style={{ borderColor: couleur }}>x</span>;',
      'const o = { background: couleur };',
    ]) {
      const r = transforme(source);
      expect(r.source, source).toBe(source);
      expect(r.changements + r.ignores, source).toBe(0);
    }
  });
});

describe('transformer — ensemble', () => {
  it('enchaîne les passes : ternaire traduit, puis couleur du style qui le recouvrait', () => {
    const r = transforme("const p = <p className={`p-2 ${isDark ? 'text-white' : 'text-slate-900'}`} style={{ color: couleur }}>x</p>;");
    expect(r.source).toBe('const p = <p className={`p-2 text-accent-texte`}>x</p>;');
    expect(r.changements).toBe(2);
  });

  it('donne le détail par sorte et repère les signalements dans le texte final', () => {
    const source = [
      'const a = isDark',
      "  ? 'bg-slate-800'",
      "  : 'bg-white';",
      'const b = <button className="bg-orange-500 text-slate-900">Ok</button>;', // laissé, signalé
      'const c = <b className="text-orange-600">x</b>;',
      'const d = <span style={{ color: couleur }}>y</span>;',
      'const e = <button className="px-4" style={{ background: couleur }}>Ok</button>;', // signalé
    ].join('\n');
    const r = transforme(source);
    expect(r.detail).toMatchObject({ ternaires: 1, classes: 1, styles: 2 });
    expect(r.changements).toBe(4);
    expect(r.ignores).toBe(1);
    // le ternaire tient sur une ligne une fois traduit : les lignes 4 et 7 deviennent 2 et 5
    expect(r.signalements.map((s) => s.ligne)).toEqual([2, 5]);
    expect(r.source.split('\n')[1]).toContain('bg-orange-500 text-slate-900');
    expect(r.source.split('\n')[4]).toContain('className="px-4 bg-accent"');
  });

  it('refuse un fichier qu\'il ne sait pas lire', () => {
    expect(() => transformer('const = ;')).toThrow();
  });
});
