// Dessine une signature manuscrite fictive (PNG transparent) pour les devis signés du compte démo.
import fs from 'node:fs';
import puppeteer from 'puppeteer';

const navigateur = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await navigateur.newPage();
const png = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 360; c.height = 120;
  const x = c.getContext('2d');
  x.strokeStyle = '#1e2a4a'; x.lineWidth = 2.6; x.lineCap = 'round'; x.lineJoin = 'round';
  const trait = (pts) => {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i += 2) x.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    x.stroke();
  };
  // Initiale ample, puis une écriture liée qui s'affine, puis le paraphe
  trait([[30, 82], [38, 20], [58, 30], [70, 40], [52, 70], [44, 86], [76, 64], [96, 46], [104, 62], [110, 80], [124, 58]]);
  trait([[124, 58], [136, 40], [146, 66], [152, 82], [166, 56], [176, 42], [186, 62], [194, 78], [210, 54], [224, 40], [232, 60], [238, 74], [256, 56], [270, 44], [282, 62]]);
  trait([[40, 96], [140, 88], [220, 92], [280, 96], [330, 86]]);
  return c.toDataURL('image/png');
});
await navigateur.close();
fs.writeFileSync('audit-ui/signature-demo.txt', png); // à recopier dans scripts/demo/signatureDemo.js
console.log(png.length, 'caractères');
