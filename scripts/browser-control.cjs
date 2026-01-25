#!/usr/bin/env node
/**
 * Browser Control Script for AI Navigation
 * Allows Claude to navigate and interact with the ChantierPro app
 *
 * Usage:
 *   node browser-control.js <command> [args]
 *
 * Commands:
 *   open <url>              - Open URL and take screenshot
 *   click <selector>        - Click element and screenshot
 *   navigate <page>         - Navigate to app page (dashboard, devis, chantiers, clients, equipe, planning, settings)
 *   screenshot [name]       - Take screenshot with optional name
 *   scroll <direction>      - Scroll up/down
 *   close-modal             - Close any open modal
 *   get-text <selector>     - Get text content of element
 *   list-elements           - List interactive elements on page
 *   help                    - Show this help
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Helper function for delays (replaces deprecated waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const APP_URL = 'https://seguinhugo06-lgtm-chantierpro.vercel.app';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Page routes mapping
const PAGES = {
  dashboard: '/',
  accueil: '/',
  devis: '/#devis',
  factures: '/#devis',
  chantiers: '/#chantiers',
  clients: '/#clients',
  equipe: '/#equipe',
  planning: '/#planning',
  settings: '/#settings',
  parametres: '/#settings',
  catalogue: '/#catalogue'
};

async function run() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
Browser Control for ChantierPro AI Review
==========================================

Commands:
  open [url]              Open URL (default: ChantierPro app)
  navigate <page>         Go to: dashboard, devis, chantiers, clients, equipe, planning, settings
  click <selector>        Click an element (CSS selector or text content)
  screenshot [name]       Take screenshot
  scroll <up|down>        Scroll the page
  close-modal             Close any open modal/popup
  get-text <selector>     Get text from element
  list-elements           List all clickable elements
  describe                Describe current page content

Examples:
  node browser-control.js open
  node browser-control.js navigate devis
  node browser-control.js click "Créer un devis"
  node browser-control.js screenshot devis-page
  node browser-control.js describe
`);
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // State file to persist browser state between calls
  const stateFile = path.join(SCREENSHOTS_DIR, '.browser-state.json');
  let currentUrl = APP_URL;

  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      currentUrl = state.url || APP_URL;
    } catch (e) {}
  }

  try {
    switch (command) {
      case 'open': {
        const url = args[1] || APP_URL;
        console.log(`Opening ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        // Try to close onboarding modal if present
        try {
          await page.click('[class*="modal"] button:has-text("Passer")', { timeout: 2000 });
        } catch (e) {}
        try {
          await page.click('button:has-text("Passer")', { timeout: 1000 });
        } catch (e) {}

        await delay(1000);
        const screenshotPath = path.join(SCREENSHOTS_DIR, 'current.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });

        fs.writeFileSync(stateFile, JSON.stringify({ url }));
        console.log(`Page loaded. Screenshot saved to: ${screenshotPath}`);
        break;
      }

      case 'navigate': {
        const pageName = args[1]?.toLowerCase();
        if (!pageName || !PAGES[pageName]) {
          console.log(`Unknown page: ${pageName}`);
          console.log(`Available pages: ${Object.keys(PAGES).join(', ')}`);
          break;
        }

        // First load the app
        await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        // Close modal if present
        try {
          const modalClose = await page.$('button:has-text("Passer")');
          if (modalClose) await modalClose.click();
          await delay(500);
        } catch (e) {}

        // Click on sidebar navigation
        const navTexts = {
          dashboard: 'Accueil',
          accueil: 'Accueil',
          devis: 'Devis',
          factures: 'Devis',
          chantiers: 'Chantiers',
          clients: 'Clients',
          equipe: 'Équipe',
          planning: 'Planning',
          settings: 'Paramètres',
          parametres: 'Paramètres',
          catalogue: 'Catalogue'
        };

        const navText = navTexts[pageName];
        console.log(`Navigating to ${pageName} (clicking "${navText}")...`);

        try {
          // Try clicking sidebar button
          await page.evaluate((text) => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            const btn = buttons.find(b => b.textContent.includes(text));
            if (btn) btn.click();
          }, navText);

          await delay(1500);
        } catch (e) {
          console.log(`Could not find navigation for ${navText}`);
        }

        const screenshotPath = path.join(SCREENSHOTS_DIR, `page-${pageName}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        fs.writeFileSync(stateFile, JSON.stringify({ url: page.url() }));
        console.log(`Navigated to ${pageName}. Screenshot: ${screenshotPath}`);
        break;
      }

      case 'click': {
        const selector = args[1];
        if (!selector) {
          console.log('Please provide a selector or text to click');
          break;
        }

        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(1500);

        console.log(`Clicking "${selector}"...`);

        try {
          // Try as CSS selector first
          await page.click(selector, { timeout: 2000 });
        } catch (e) {
          // Try as text content
          await page.evaluate((text) => {
            const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
            const el = elements.find(e => e.textContent.toLowerCase().includes(text.toLowerCase()));
            if (el) el.click();
            else throw new Error('Element not found');
          }, selector);
        }

        await delay(1000);
        const screenshotPath = path.join(SCREENSHOTS_DIR, 'after-click.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });

        fs.writeFileSync(stateFile, JSON.stringify({ url: page.url() }));
        console.log(`Clicked. Screenshot: ${screenshotPath}`);
        break;
      }

      case 'screenshot': {
        const name = args[1] || 'screenshot';
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(1500);

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: args[2] === 'full' });
        console.log(`Screenshot saved: ${screenshotPath}`);
        break;
      }

      case 'close-modal': {
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(1500);

        console.log('Attempting to close modal...');

        try {
          await page.evaluate(() => {
            // Try various modal close methods
            const closeButtons = document.querySelectorAll('[class*="close"], [aria-label="Close"], button:has-text("Passer"), button:has-text("Fermer"), button:has-text("×")');
            closeButtons.forEach(btn => btn.click());

            // Click backdrop
            const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="overlay"]');
            backdrops.forEach(b => b.click());
          });
        } catch (e) {}

        await delay(500);
        const screenshotPath = path.join(SCREENSHOTS_DIR, 'after-close-modal.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Modal close attempted. Screenshot: ${screenshotPath}`);
        break;
      }

      case 'scroll': {
        const direction = args[1] || 'down';
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(1000);

        const amount = direction === 'up' ? -500 : 500;
        await page.evaluate((y) => window.scrollBy(0, y), amount);
        await delay(500);

        const screenshotPath = path.join(SCREENSHOTS_DIR, 'after-scroll.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Scrolled ${direction}. Screenshot: ${screenshotPath}`);
        break;
      }

      case 'describe':
      case 'list-elements': {
        await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);

        const pageInfo = await page.evaluate(() => {
          const info = {
            title: document.title,
            url: window.location.href,
            headings: [],
            buttons: [],
            links: [],
            inputs: [],
            stats: []
          };

          // Get headings
          document.querySelectorAll('h1, h2, h3').forEach(h => {
            if (h.textContent.trim()) info.headings.push(h.textContent.trim().substring(0, 50));
          });

          // Get buttons
          document.querySelectorAll('button').forEach(b => {
            const text = b.textContent.trim();
            if (text && text.length < 30) info.buttons.push(text);
          });

          // Get links/navigation
          document.querySelectorAll('a, [role="link"]').forEach(a => {
            const text = a.textContent.trim();
            if (text && text.length < 30) info.links.push(text);
          });

          // Get form inputs
          document.querySelectorAll('input, select, textarea').forEach(i => {
            info.inputs.push(i.placeholder || i.name || i.type);
          });

          // Get visible numbers/stats (likely KPIs)
          document.querySelectorAll('[class*="stat"], [class*="kpi"], [class*="metric"]').forEach(s => {
            info.stats.push(s.textContent.trim().substring(0, 50));
          });

          // Get large numbers that might be KPIs
          const textNodes = document.evaluate('//text()[string-length(normalize-space()) > 0]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          for (let i = 0; i < Math.min(textNodes.snapshotLength, 500); i++) {
            const text = textNodes.snapshotItem(i).textContent.trim();
            if (/^\d{1,3}(\s?\d{3})*(\s?€|\s?%)?$/.test(text)) {
              info.stats.push(text);
            }
          }

          return info;
        });

        console.log('\n=== PAGE DESCRIPTION ===');
        console.log(`URL: ${pageInfo.url}`);
        console.log(`Title: ${pageInfo.title}`);
        console.log('\nHeadings:', pageInfo.headings.slice(0, 10).join(', '));
        console.log('\nButtons:', [...new Set(pageInfo.buttons)].slice(0, 15).join(', '));
        console.log('\nNavigation:', [...new Set(pageInfo.links)].slice(0, 10).join(', '));
        console.log('\nStats/KPIs:', [...new Set(pageInfo.stats)].slice(0, 10).join(', '));
        console.log('\nInputs:', pageInfo.inputs.slice(0, 5).join(', '));

        const screenshotPath = path.join(SCREENSHOTS_DIR, 'described.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`\nScreenshot: ${screenshotPath}`);
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('Run with "help" for usage information');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
