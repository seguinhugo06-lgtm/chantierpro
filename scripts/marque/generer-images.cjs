#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console -- la console est la sortie de ce script */
/**
 * Images de la marque, toutes dérivées du logo vectoriel officiel « 05f » (choisi par Hugo le 20 oct. 2026) :
 * `public/icon.svg` est la copie de Documents/Mallettico/Logo vectoriel/officiel-05f/icone-mallettico-icone.svg.
 *   public/icon-192.png, icon-512.png           icônes de l'app installée (manifeste PWA, « any ») — tuile à coins arrondis
 *   public/icon-maskable-512.png                Android (découpe en cercle ou autre forme) — depuis icon-maskable.svg :
 *                                               carré plein glacier, mallette réduite dans la zone sûre (cercle de 40 % du côté)
 *   public/apple-touch-icon.png (180)           iPhone : iOS n'accepte pas d'icône SVG, arrondit lui-même les coins et
 *                                               affiche du noir sur toute zone transparente → carré plein glacier, sans coins
 *                                               arrondis (l'icône `any` dont on retire le rayon de la tuile)
 *   public/logo-email.png (128)                 logo des e-mails (les messageries n'affichent pas le SVG)
 *
 * Ce script n'écrit PLUS `public/og-image.png` (aperçu de partage d'un lien vers mallettico.fr) : cette image est
 * désormais composée avec le design du nouveau site par `scripts/site-captures.cjs` (`node scripts/site-captures.cjs og-image`).
 *
 *   node scripts/marque/generer-images.cjs
 * Après un changement de logo : remplacer public/icon.svg (et refaire public/icon-maskable.svg), relancer ce script,
 * puis `node scripts/site-captures.cjs og-image`, et vérifier les images.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RACINE = path.resolve(__dirname, '../..');
const PUB = (f) => path.join(RACINE, 'public', f);
const svg = fs.readFileSync(PUB('icon.svg'), 'utf8');
const svgMasquable = fs.readFileSync(PUB('icon-maskable.svg'), 'utf8');
const enDataUri = (contenu, type) => `data:${type};base64,${Buffer.from(contenu).toString('base64')}`;

// Tuile de l'icône : coins arrondis de 200 (sur 948,62). Retirée pour l'icône iPhone : carré plein, iOS arrondit.
const TUILE_ARRONDIE = / rx="200"/;
const svgCarrePlein = svg.replace(TUILE_ARRONDIE, '');
if (svgCarrePlein === svg) throw new Error('icon.svg : la tuile à coins arrondis (rx="200") est introuvable');
if (TUILE_ARRONDIE.test(svgMasquable)) throw new Error('icon-maskable.svg : la tuile doit être un carré plein (sans rx)');

async function main() {
  const navigateur = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await navigateur.newPage();
  const rendreSvg = async (contenu, taille, fichier, opaque = false) => {
    await page.setViewport({ width: taille, height: taille, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:${opaque ? '#fff' : 'transparent'}">
      <img src="${enDataUri(contenu, 'image/svg+xml')}" style="width:${taille}px;height:${taille}px;display:block"></body></html>`);
    await page.screenshot({ path: PUB(fichier), omitBackground: !opaque });
    console.log(`✓ public/${fichier} (${taille} px)`);
  };
  await rendreSvg(svg, 192, 'icon-192.png');
  await rendreSvg(svg, 512, 'icon-512.png');
  await rendreSvg(svgMasquable, 512, 'icon-maskable-512.png', true);
  await rendreSvg(svgCarrePlein, 180, 'apple-touch-icon.png', true);
  await rendreSvg(svg, 128, 'logo-email.png');
  await navigateur.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
