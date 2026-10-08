#!/usr/bin/env node
/**
 * Images de la marque, toutes dérivées du logo vectoriel `public/icon.svg`
 * (copie de Documents/Mallettico/Logo vectoriel/mallettico-logo.svg) :
 *   public/icon-192.png, icon-512.png           icônes de l'app installée (manifeste PWA, « any »)
 *   public/icon-maskable-512.png                Android (découpe en cercle) — depuis icon-maskable.svg
 *   public/apple-touch-icon.png (180)           iPhone : iOS n'accepte pas d'icône SVG
 *   public/logo-email.png (128)                 logo des e-mails (les messageries n'affichent pas le SVG)
 *   public/og-image.png (2400 × 1260)           aperçu quand on partage un lien vers mallettico.fr
 *
 *   node scripts/marque/generer-images.cjs
 * Après un changement de logo : remplacer public/icon.svg, relancer ce script, vérifier les images.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RACINE = path.resolve(__dirname, '../..');
const PUB = (f) => path.join(RACINE, 'public', f);
const svg = fs.readFileSync(PUB('icon.svg'), 'utf8');
const svgMasquable = fs.readFileSync(PUB('icon-maskable.svg'), 'utf8');
const enDataUri = (contenu, type) => `data:${type};base64,${Buffer.from(contenu).toString('base64')}`;

// Image d'aperçu : le tableau de bord réel (capture de démo), recadré sans la barre latérale.
const capture = fs.readFileSync(PUB('screenshots/dashboard.png'));

const pageOg = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;font-family:-apple-system,"SF Pro Display","Segoe UI",Roboto,sans-serif;
    background:radial-gradient(900px 500px at 95% -10%,rgba(238,123,32,.16),transparent 60%),
               radial-gradient(700px 420px at -5% 110%,rgba(13,46,108,.12),transparent 60%),#FBFAF8;color:#0E1621}
  .gauche{position:absolute;left:64px;top:66px;width:560px}
  .marque{display:flex;align-items:center;gap:16px}
  .marque img{width:72px;height:72px;border-radius:16px;box-shadow:0 8px 24px rgba(13,46,108,.18)}
  .marque span{font-size:44px;font-weight:800;letter-spacing:-.02em;color:#0D2E6C}
  h1{margin-top:44px;font-size:60px;line-height:1.02;font-weight:850;letter-spacing:-.03em}
  h1 em{font-style:normal;color:#EE7B20}
  p{margin-top:22px;font-size:25px;line-height:1.35;color:#3B4656}
  .bas{position:absolute;left:64px;bottom:58px;display:flex;align-items:center;gap:22px}
  .bas .cta{background:#EE7B20;color:#fff;font-weight:800;font-size:24px;padding:16px 26px;border-radius:14px}
  .bas .url{font-size:24px;font-weight:700;color:#0D2E6C}
  .capture{position:absolute;left:660px;top:92px;width:640px;height:460px;border-radius:18px;overflow:hidden;
    box-shadow:0 30px 70px rgba(13,46,108,.22),0 0 0 1px rgba(13,46,108,.08);background:#fff}
  .capture img{position:absolute;left:-200px;top:0;width:1200px}
</style></head><body>
  <div class="gauche">
    <div class="marque"><img src="${enDataUri(svg, 'image/svg+xml')}" alt=""><span>Mallettico</span></div>
    <h1>Devis, factures &amp;<br><em>relances automatiques</em></h1>
    <p>L’appli des artisans du BTP pour se faire payer plus vite.</p>
  </div>
  <div class="bas"><span class="cta">Gratuit pour commencer</span><span class="url">mallettico.fr</span></div>
  <div class="capture"><img src="${enDataUri(capture, 'image/png')}" alt=""></div>
</body></html>`;

async function main() {
  const navigateur = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await navigateur.newPage();
  const rendreSvg = async (contenu, taille, fichier, fondBlanc = false) => {
    await page.setViewport({ width: taille, height: taille, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:${fondBlanc ? '#fff' : 'transparent'}">
      <img src="${enDataUri(contenu, 'image/svg+xml')}" style="width:${taille}px;height:${taille}px;display:block"></body></html>`);
    await page.screenshot({ path: PUB(fichier), omitBackground: !fondBlanc });
    console.log(`✓ public/${fichier} (${taille} px)`);
  };
  await rendreSvg(svg, 192, 'icon-192.png');
  await rendreSvg(svg, 512, 'icon-512.png');
  await rendreSvg(svgMasquable, 512, 'icon-maskable-512.png', true);
  // iPhone : plein cadre blanc sans coins arrondis (iOS les arrondit lui-même), logo à sa taille normale
  await rendreSvg(svg.replace(/ rx="80\.78"/, ''), 180, 'apple-touch-icon.png', true);
  await rendreSvg(svg, 128, 'logo-email.png');
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.setContent(pageOg, { waitUntil: 'load' });
  await page.screenshot({ path: PUB('og-image.png') });
  console.log('✓ public/og-image.png (2400 × 1260)');
  await navigateur.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
