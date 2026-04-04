/**
 * Report PDF Builder — Generates professional PDF reports using jsPDF
 *
 * Follows the same pattern as rapportChantierPdf.js:
 * - jsPDF direct primitives (text, rect, setFont, setFillColor)
 * - checkNewPage for pagination
 * - sectionHeader for section titles
 * - Brand color theming
 *
 * Generates 3 types: Activity, Financial, Chantier
 */

import jsPDF from 'jspdf';
import { subscription } from '../stores/subscriptionStore';

// ============ CONSTANTS ============

const PAGE = { width: 210, height: 297, margin: 15 };
const CONTENT_W = PAGE.width - PAGE.margin * 2;
const FONTS = { title: 22, h2: 14, h3: 11, body: 9, small: 8, footer: 7 };
const COLORS = {
  text: [30, 41, 59],
  muted: [100, 116, 139],
  light: [148, 163, 184],
  success: [34, 197, 94],
  danger: [239, 68, 68],
  warning: [245, 158, 11],
  tableBg: [241, 245, 249],
  tableAlt: [248, 250, 252],
  border: [226, 232, 240],
  white: [255, 255, 255],
};

const STATUS_LABELS = {
  brouillon: 'Brouillon', envoye: 'Envoyé', vu: 'Vu', accepte: 'Accepté',
  signe: 'Signé', refuse: 'Refusé', expire: 'Expiré', payee: 'Payée',
  facture: 'Facturé', en_cours: 'En cours', termine: 'Terminé',
  en_attente: 'En attente', prospect: 'Prospect', archive: 'Archivé',
};

// ============ HELPERS ============

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [249, 115, 22];
}

function fmtMoney(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
}

function fmtMoney2(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);
}

function fmtPct(v) {
  return `${(v || 0).toFixed(1)}%`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateLong(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function lightenColor(rgb, factor = 0.3) {
  return rgb.map(c => Math.round(c + (255 - c) * factor));
}

// Distribute colors for pie chart segments
function getSegmentColors(brandRgb, count) {
  const palette = [
    brandRgb,
    [59, 130, 246],   // blue
    [34, 197, 94],    // green
    [168, 85, 247],   // purple
    [245, 158, 11],   // amber
    [239, 68, 68],    // red
    [14, 165, 233],   // sky
    [249, 115, 22],   // orange
    [99, 102, 241],   // indigo
  ];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

// ============ PDF DRAWING PRIMITIVES ============

function createDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

function drawCoverPage(doc, title, subtitle, entreprise, brandRgb, periodLabel) {
  const m = PAGE.margin;

  // Top color band
  doc.setFillColor(...brandRgb);
  doc.rect(0, 0, PAGE.width, 80, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(title, m, 35);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, m, 50);

  doc.setFontSize(12);
  doc.text(periodLabel, m, 63);

  // Enterprise info
  doc.setTextColor(...COLORS.text);
  let y = 100;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.nom || 'Mon Entreprise', m, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  if (entreprise?.adresse) { doc.text(entreprise.adresse.replace(/\n/g, ', '), m, y); y += 6; }
  if (entreprise?.siret) { doc.text(`SIRET : ${entreprise.siret}`, m, y); y += 6; }
  if (entreprise?.tel || entreprise?.telephone) { doc.text(`Tél : ${entreprise.tel || entreprise.telephone}`, m, y); y += 6; }
  if (entreprise?.email) { doc.text(entreprise.email, m, y); y += 6; }

  // Generation date
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.light);
  doc.text(`Généré le ${fmtDateLong(new Date())}`, m, y);

  // Bottom band
  doc.setFillColor(...brandRgb);
  doc.rect(0, PAGE.height - 15, PAGE.width, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('BatiGesti — Rapport automatique', PAGE.width / 2, PAGE.height - 6, { align: 'center' });
}

function addPageHeader(doc, title, brandRgb) {
  doc.setFillColor(...brandRgb);
  doc.rect(0, 0, PAGE.width, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PAGE.margin, 8);
  doc.setFont('helvetica', 'normal');
}

function addPageFooter(doc, pageNum, totalPages, entrepriseName) {
  doc.setFontSize(FONTS.footer);
  doc.setTextColor(...COLORS.light);
  doc.text(`${entrepriseName || 'BatiGesti'} — Page ${pageNum}/${totalPages}`, PAGE.width / 2, PAGE.height - 5, { align: 'center' });
}

function sectionHeader(doc, y, title, brandRgb) {
  doc.setFillColor(...brandRgb);
  doc.rect(PAGE.margin, y, CONTENT_W, 8, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), PAGE.margin + 3, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  return y + 12;
}

function drawKPICard(doc, x, y, w, h, label, value, trend, brandRgb) {
  // Card background
  doc.setFillColor(...lightenColor(brandRgb, 0.9));
  doc.roundedRect(x, y, w, h, 2, 2, 'F');

  // Left border accent
  doc.setFillColor(...brandRgb);
  doc.rect(x, y, 2, h, 'F');

  // Label
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 6, y + 6);

  // Value
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value), x + 6, y + 15);

  // Trend
  if (trend !== null && trend !== undefined) {
    const isPositive = trend >= 0;
    doc.setFontSize(7);
    doc.setTextColor(...(isPositive ? COLORS.success : COLORS.danger));
    doc.setFont('helvetica', 'normal');
    doc.text(`${isPositive ? '+' : ''}${trend.toFixed(1)}%`, x + 6, y + 21);
  }

  doc.setFont('helvetica', 'normal');
}

function drawTable(doc, y, headers, rows, colWidths, brandRgb, checkNewPage) {
  const m = PAGE.margin;

  // Header row
  doc.setFillColor(...brandRgb);
  doc.rect(m, y - 1, CONTENT_W, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  let x = m + 2;
  headers.forEach((h, i) => {
    doc.text(h, x, y + 4);
    x += colWidths[i];
  });
  y += 9;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rows.forEach((row, rowIdx) => {
    const newY = checkNewPage(y, 7);
    if (newY !== y) y = newY;

    // Alternating background
    if (rowIdx % 2 === 0) {
      doc.setFillColor(...COLORS.tableAlt);
      doc.rect(m, y - 4, CONTENT_W, 6, 'F');
    }

    doc.setTextColor(...COLORS.text);
    x = m + 2;
    row.forEach((cell, i) => {
      const text = String(cell ?? '—');
      // Right-align numbers (money columns)
      if (i >= 2 && /[\d€,%]/.test(text)) {
        doc.text(text, x + colWidths[i] - 4, y, { align: 'right' });
      } else {
        doc.text(text.substring(0, 30), x, y);
      }
      x += colWidths[i];
    });
    y += 6;
  });

  return y + 4;
}

function drawBarChart(doc, x, y, w, h, data, labelKey, valueKey, brandRgb) {
  if (!data || data.length === 0) return y + h;

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const barW = (w - 10) / data.length - 2;
  const chartBottom = y + h;
  const chartTop = y + 10;
  const chartH = chartBottom - chartTop - 10;

  // Y-axis
  doc.setDrawColor(...COLORS.border);
  doc.line(x, chartTop, x, chartBottom - 8);

  // Scale labels
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.light);
  doc.text(fmtMoney(maxVal), x + 2, chartTop + 2);
  doc.text('0', x + 2, chartBottom - 9);

  // Bars
  data.forEach((d, i) => {
    const val = d[valueKey] || 0;
    const barH = chartH * (val / maxVal);
    const barX = x + 10 + i * (barW + 2);
    const barY = chartBottom - 8 - barH;

    // Bar
    const alpha = 0.6 + (i % 2) * 0.2;
    doc.setFillColor(...brandRgb.map(c => Math.round(c * alpha + 255 * (1 - alpha))));
    doc.setFillColor(...brandRgb);
    doc.rect(barX, barY, barW, barH, 'F');

    // Value on top
    if (val > 0) {
      doc.setFontSize(5);
      doc.setTextColor(...COLORS.text);
      doc.text(fmtMoney(val), barX + barW / 2, barY - 1, { align: 'center' });
    }

    // Label below
    doc.setFontSize(5);
    doc.setTextColor(...COLORS.muted);
    doc.text(String(d[labelKey] || ''), barX + barW / 2, chartBottom - 2, { align: 'center' });
  });

  return chartBottom + 4;
}

function drawHorizontalBarChart(doc, x, y, w, data, brandRgb) {
  if (!data || data.length === 0) return y;

  const maxVal = Math.max(...data.map(d => d.montant || 0), 1);
  const barH = 6;
  const gap = 8;

  data.forEach((d, i) => {
    const val = d.montant || 0;
    const barW = (w - 60) * (val / maxVal);

    // Label
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.text((d.nom || '').substring(0, 20), x, y + 4);

    // Bar
    doc.setFillColor(...brandRgb);
    doc.rect(x + 55, y, Math.max(barW, 1), barH, 'F');

    // Value
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(fmtMoney(val), x + 55 + barW + 3, y + 4);

    y += gap;
  });

  return y + 4;
}

function drawPieChart(doc, cx, cy, radius, data, brandRgb) {
  if (!data || data.length === 0) return;

  const total = data.reduce((sum, d) => sum + (d.count || d.montant || 0), 0);
  if (total === 0) return;

  const colors = getSegmentColors(brandRgb, data.length);
  let angle = -Math.PI / 2;

  data.forEach((d, i) => {
    const val = d.count || d.montant || 0;
    const sliceAngle = (val / total) * 2 * Math.PI;
    const midAngle = angle + sliceAngle / 2;

    // Draw filled arc using triangles approximation
    doc.setFillColor(...colors[i]);
    const steps = Math.max(Math.ceil(sliceAngle * 20), 3);
    for (let s = 0; s < steps; s++) {
      const a1 = angle + (sliceAngle * s) / steps;
      const a2 = angle + (sliceAngle * (s + 1)) / steps;
      doc.triangle(
        cx, cy,
        cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2), cy + radius * Math.sin(a2),
        'F'
      );
    }

    angle += sliceAngle;
  });

  // Legend
  let ly = cy - radius;
  const lx = cx + radius + 10;
  data.forEach((d, i) => {
    const label = d.label || d.categorie || d.statut || `Segment ${i + 1}`;
    const val = d.count || d.montant || 0;
    const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;

    doc.setFillColor(...colors[i]);
    doc.rect(lx, ly - 2, 4, 4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.text);
    doc.text(`${label} (${pct}%)`, lx + 6, ly + 1);
    ly += 7;
  });
}

function drawProgressBar(doc, x, y, w, value, max, brandRgb) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  // Background
  doc.setFillColor(...COLORS.tableBg);
  doc.roundedRect(x, y, w, 5, 1, 1, 'F');

  // Fill
  if (pct > 0) {
    doc.setFillColor(...brandRgb);
    doc.roundedRect(x, y, w * pct, 5, 1, 1, 'F');
  }

  // Label
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.text);
  doc.text(`${(pct * 100).toFixed(0)}%`, x + w + 3, y + 4);
}

// ============ REPORT GENERATORS ============

/**
 * Generate Activity Report PDF
 */
export async function generateActivityPDF(data, entreprise, options = {}) {
  const couleur = options.couleur || entreprise?.couleur || '#f97316';
  const brandRgb = hexToRgb(couleur);
  const doc = createDoc();
  const m = PAGE.margin;
  let pageCount = 1;

  const checkNewPage = (currentY, needed = 20) => {
    if (currentY + needed > PAGE.height - 20) {
      doc.addPage();
      pageCount++;
      addPageHeader(doc, `Rapport d'activité — ${data.periode?.label || ''}`, brandRgb);
      return 20;
    }
    return currentY;
  };

  // === PAGE 1: COVER ===
  drawCoverPage(doc, "RAPPORT D'ACTIVITÉ", entreprise?.nom || '', entreprise, brandRgb, data.periode?.label || '');

  // === PAGE 2: KPIs ===
  doc.addPage();
  pageCount++;
  addPageHeader(doc, `Rapport d'activité — ${data.periode?.label || ''}`, brandRgb);

  let y = 22;
  y = sectionHeader(doc, y, "Vue d'ensemble", brandRgb);

  const kw = (CONTENT_W - 6) / 2;
  const kh = 24;
  const { kpis, comparisons } = data;

  drawKPICard(doc, m, y, kw, kh, 'Chiffre d\'affaires TTC', fmtMoney(kpis.ca), comparisons?.ca, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Taux de conversion', fmtPct(kpis.tauxConversion), comparisons?.tauxConversion, brandRgb);
  y += kh + 4;

  drawKPICard(doc, m, y, kw, kh, 'Pipeline', fmtMoney(kpis.pipelineValue), null, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Devis moyen', fmtMoney(kpis.avgDevisValue), null, brandRgb);
  y += kh + 4;

  drawKPICard(doc, m, y, kw, kh, 'Devis en attente', `${kpis.devisEnAttente} (${fmtMoney(kpis.montantEnAttente)})`, null, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Factures émises', String(kpis.nbFacturesEmises || 0), null, brandRgb);
  y += kh + 4;

  // Mini KPIs
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Clients actifs : ${kpis.nbClientsActifs || 0}  ·  Chantiers actifs : ${kpis.nbChantiersActifs || 0}  ·  Devis émis : ${kpis.nbDevisEmis || 0}  ·  Devis signés : ${kpis.nbDevisAcceptes || 0}`, m, y + 4);
  y += 12;

  // === CA MENSUEL CHART ===
  if (data.monthlyRevenue && data.monthlyRevenue.some(m => m.montant > 0)) {
    y = checkNewPage(y, 60);
    y = sectionHeader(doc, y, 'CA mensuel (année en cours)', brandRgb);
    y = drawBarChart(doc, m, y, CONTENT_W, 50, data.monthlyRevenue, 'mois', 'montant', brandRgb);
  }

  // === PAGE 3: DEVIS & FACTURES ===
  doc.addPage();
  pageCount++;
  addPageHeader(doc, `Rapport d'activité — ${data.periode?.label || ''}`, brandRgb);
  y = 22;

  if (data.devisList && data.devisList.length > 0) {
    y = sectionHeader(doc, y, `Devis émis (${data.devisList.length})`, brandRgb);
    const headers = ['Numéro', 'Client', 'Montant TTC', 'Statut', 'Date'];
    const widths = [35, 50, 30, 25, 30];
    const rows = data.devisList.slice(0, 15).map(d => [
      d.numero, d.client, fmtMoney2(d.montant), STATUS_LABELS[d.statut] || d.statut, fmtDate(d.date),
    ]);
    y = drawTable(doc, y, headers, rows, widths, brandRgb, checkNewPage);
  }

  if (data.facturesList && data.facturesList.length > 0) {
    y = checkNewPage(y, 30);
    y = sectionHeader(doc, y, `Factures émises (${data.facturesList.length})`, brandRgb);
    const headers = ['Numéro', 'Client', 'Montant TTC', 'Statut', 'Échéance'];
    const widths = [35, 50, 30, 25, 30];
    const rows = data.facturesList.slice(0, 15).map(d => [
      d.numero, d.client, fmtMoney2(d.montant), STATUS_LABELS[d.statut] || d.statut, fmtDate(d.echeance || d.date),
    ]);
    y = drawTable(doc, y, headers, rows, widths, brandRgb, checkNewPage);
  }

  // === PAGE 4: TOP CLIENTS & STATUS ===
  doc.addPage();
  pageCount++;
  addPageHeader(doc, `Rapport d'activité — ${data.periode?.label || ''}`, brandRgb);
  y = 22;

  if (data.topClients && data.topClients.length > 0) {
    y = sectionHeader(doc, y, 'Top clients par CA', brandRgb);
    y = drawHorizontalBarChart(doc, m, y, CONTENT_W, data.topClients, brandRgb);
  }

  // Devis par statut pie chart
  const devisStatutData = Object.entries(data.devisParStatut || {}).map(([statut, count]) => ({
    label: STATUS_LABELS[statut] || statut,
    statut,
    count,
  })).filter(d => d.count > 0);

  if (devisStatutData.length > 0) {
    y = checkNewPage(y, 60);
    y = sectionHeader(doc, y, 'Répartition des devis par statut', brandRgb);
    drawPieChart(doc, m + 35, y + 25, 20, devisStatutData, brandRgb);
    y += 60;
  }

  // Chantiers par statut
  const chantiersData = Object.entries(data.chantiersParStatut || {}).map(([statut, count]) => ({
    label: STATUS_LABELS[statut] || statut,
    count,
  })).filter(d => d.count > 0);

  if (chantiersData.length > 0) {
    y = checkNewPage(y, 60);
    y = sectionHeader(doc, y, 'Chantiers par statut', brandRgb);
    drawPieChart(doc, m + 35, y + 25, 20, chantiersData, brandRgb);
    y += 60;
  }

  // Add page numbers
  const total = doc.internal.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    addPageFooter(doc, i - 1, total - 1, entreprise?.nom);
  }

  // Free plan watermark
  const isFree = subscription?.isFree?.() ?? false;
  if (isFree) {
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(40);
      doc.text('APERÇU', PAGE.width / 2, PAGE.height / 2, { align: 'center', angle: 45 });
    }
  }

  const blob = doc.output('blob');
  const filename = `Rapport_Activite_${(data.periode?.label || 'rapport').replace(/[^a-zA-Z0-9àâéèêëïôùûüç]/gi, '_')}.pdf`;

  return { blob, filename, pageCount: total };
}

/**
 * Generate Financial Report PDF
 */
export async function generateFinancialPDF(data, entreprise, options = {}) {
  const couleur = options.couleur || entreprise?.couleur || '#f97316';
  const brandRgb = hexToRgb(couleur);
  const doc = createDoc();
  const m = PAGE.margin;
  let pageCount = 1;

  const checkNewPage = (currentY, needed = 20) => {
    if (currentY + needed > PAGE.height - 20) {
      doc.addPage();
      pageCount++;
      addPageHeader(doc, `Rapport financier — ${data.periode?.label || ''}`, brandRgb);
      return 20;
    }
    return currentY;
  };

  // === PAGE 1: COVER ===
  drawCoverPage(doc, 'RAPPORT FINANCIER', entreprise?.nom || '', entreprise, brandRgb, data.periode?.label || '');

  // === PAGE 2: P&L Summary ===
  doc.addPage();
  pageCount++;
  addPageHeader(doc, `Rapport financier — ${data.periode?.label || ''}`, brandRgb);

  let y = 22;
  y = sectionHeader(doc, y, 'Compte de résultat simplifié', brandRgb);

  const kw = (CONTENT_W - 12) / 3;
  const kh = 24;
  const { kpis } = data;

  drawKPICard(doc, m, y, kw, kh, 'Chiffre d\'affaires', fmtMoney(kpis.ca), data.comparisons?.ca, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Dépenses', fmtMoney(kpis.totalDepenses), null, [239, 68, 68]);
  drawKPICard(doc, m + (kw + 6) * 2, y, kw, kh, 'Marge brute', fmtMoney(kpis.margeBrute), null,
    kpis.margeBrute >= 0 ? [34, 197, 94] : [239, 68, 68]);
  y += kh + 4;

  drawKPICard(doc, m, y, kw, kh, 'Encaissements', fmtMoney(kpis.totalPaiements), null, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Solde net', fmtMoney(kpis.solde), null,
    kpis.solde >= 0 ? [34, 197, 94] : [239, 68, 68]);
  drawKPICard(doc, m + (kw + 6) * 2, y, kw, kh, 'Marge %', kpis.hasDepenses ? fmtPct(kpis.margePercent) : 'N/A', null, brandRgb);
  y += kh + 8;

  // === TVA ===
  y = checkNewPage(y, 40);
  y = sectionHeader(doc, y, 'TVA', brandRgb);
  const tvaHeaders = ['', 'Montant'];
  const tvaWidths = [100, 70];
  const tvaRows = [
    ['TVA collectée', fmtMoney2(data.tva?.collectee || 0)],
    ['TVA déductible', fmtMoney2(data.tva?.deductible || 0)],
    ['TVA nette (à reverser)', fmtMoney2(data.tva?.net || 0)],
  ];
  y = drawTable(doc, y, tvaHeaders, tvaRows, tvaWidths, brandRgb, checkNewPage);

  // === RENTABILITÉ CHANTIERS ===
  if (data.rentabiliteChantiers && data.rentabiliteChantiers.length > 0) {
    y = checkNewPage(y, 40);
    y = sectionHeader(doc, y, 'Rentabilité par chantier', brandRgb);
    const headers = ['Chantier', 'CA TTC', 'Dépenses', 'Marge', 'Marge %'];
    const widths = [50, 30, 30, 30, 30];
    const rows = data.rentabiliteChantiers.map(c => [
      (c.nom || '').substring(0, 25),
      fmtMoney(c.ca),
      fmtMoney(c.depenses),
      fmtMoney(c.marge),
      c.hasDepenses ? fmtPct(c.margePercent) : 'N/A',
    ]);
    y = drawTable(doc, y, headers, rows, widths, brandRgb, checkNewPage);
  }

  // === DÉPENSES PAR CATÉGORIE ===
  if (data.depensesParCategorie && data.depensesParCategorie.length > 0) {
    y = checkNewPage(y, 60);
    y = sectionHeader(doc, y, 'Dépenses par catégorie', brandRgb);

    const pieData = data.depensesParCategorie.slice(0, 8).map(d => ({
      label: d.categorie,
      montant: d.montant,
    }));
    drawPieChart(doc, m + 35, y + 25, 20, pieData, brandRgb);
    y += 60;
  }

  // === CASH FLOW CHART ===
  if (data.cashFlowMensuel && data.cashFlowMensuel.some(m => m.paiements > 0 || m.depenses > 0)) {
    y = checkNewPage(y, 60);
    y = sectionHeader(doc, y, 'Flux de trésorerie mensuel', brandRgb);
    y = drawBarChart(doc, m, y, CONTENT_W, 50, data.cashFlowMensuel, 'mois', 'paiements', brandRgb);
  }

  // Page numbers
  const total = doc.internal.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    addPageFooter(doc, i - 1, total - 1, entreprise?.nom);
  }

  const isFree = subscription?.isFree?.() ?? false;
  if (isFree) {
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(40);
      doc.text('APERÇU', PAGE.width / 2, PAGE.height / 2, { align: 'center', angle: 45 });
    }
  }

  const blob = doc.output('blob');
  const filename = `Rapport_Financier_${(data.periode?.label || 'rapport').replace(/[^a-zA-Z0-9àâéèêëïôùûüç]/gi, '_')}.pdf`;

  return { blob, filename, pageCount: total };
}

/**
 * Generate Chantier Report PDF
 */
export async function generateChantierPDF(data, entreprise, options = {}) {
  const couleur = options.couleur || entreprise?.couleur || '#f97316';
  const brandRgb = hexToRgb(couleur);
  const doc = createDoc();
  const m = PAGE.margin;
  let pageCount = 1;

  const checkNewPage = (currentY, needed = 20) => {
    if (currentY + needed > PAGE.height - 20) {
      doc.addPage();
      pageCount++;
      addPageHeader(doc, `Rapport chantier — ${data.chantier?.nom || ''}`, brandRgb);
      return 20;
    }
    return currentY;
  };

  // === PAGE 1: COVER ===
  drawCoverPage(doc, 'RAPPORT CHANTIER', data.chantier?.nom || '', entreprise, brandRgb,
    `Client : ${data.client?.nom || '—'}`);

  // === PAGE 2: FICHE SYNTHÉTIQUE ===
  doc.addPage();
  pageCount++;
  addPageHeader(doc, `Rapport chantier — ${data.chantier?.nom || ''}`, brandRgb);

  let y = 22;
  y = sectionHeader(doc, y, 'Fiche synthétique', brandRgb);

  const kvRow = (key, value) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.muted);
    doc.text(key, m, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(String(value || '—'), m + 45, y);
    y += 6;
  };

  kvRow('Chantier', data.chantier?.nom);
  kvRow('Adresse', data.chantier?.adresse);
  kvRow('Statut', STATUS_LABELS[data.chantier?.statut] || data.chantier?.statut);
  kvRow('Client', data.client?.nom);
  kvRow('Email client', data.client?.email);
  kvRow('Téléphone', data.client?.telephone);
  kvRow('Date début', fmtDate(data.chantier?.dateDebut));
  kvRow('Date fin', fmtDate(data.chantier?.dateFin));
  y += 4;

  // === BUDGET ===
  y = checkNewPage(y, 50);
  y = sectionHeader(doc, y, 'Budget & Rentabilité', brandRgb);

  const kw = (CONTENT_W - 6) / 2;
  const kh = 24;
  drawKPICard(doc, m, y, kw, kh, 'Budget prévu', fmtMoney(data.budgetPrevu), null, brandRgb);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'CA réel', fmtMoney(data.totalCA), null, brandRgb);
  y += kh + 4;

  drawKPICard(doc, m, y, kw, kh, 'Dépenses', fmtMoney(data.totalDepenses), null, [239, 68, 68]);
  drawKPICard(doc, m + kw + 6, y, kw, kh, 'Marge', fmtMoney(data.marge), null,
    data.marge >= 0 ? [34, 197, 94] : [239, 68, 68]);
  y += kh + 8;

  // Progress bar: avancement
  if (data.chantier?.avancement > 0) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('Avancement :', m, y + 4);
    drawProgressBar(doc, m + 30, y, CONTENT_W - 45, data.chantier.avancement, 100, brandRgb);
    y += 12;
  }

  // Budget vs réel
  if (data.budgetPrevu > 0) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('Budget consommé :', m, y + 4);
    drawProgressBar(doc, m + 40, y, CONTENT_W - 55, data.totalDepenses, data.budgetPrevu, brandRgb);
    y += 12;
  }

  // Hours
  if (data.totalHeures > 0) {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Heures pointées : ${data.totalHeures}h`, m, y + 4);
    y += 10;
  }

  // === DÉPENSES DÉTAIL ===
  if (data.depensesDetail && data.depensesDetail.length > 0) {
    y = checkNewPage(y, 30);
    y = sectionHeader(doc, y, `Dépenses (${data.depensesDetail.length})`, brandRgb);
    const headers = ['Description', 'Catégorie', 'Montant', 'Date'];
    const widths = [60, 40, 35, 35];
    const rows = data.depensesDetail.slice(0, 20).map(d => [
      (d.description || '').substring(0, 30), d.categorie, fmtMoney2(d.montant), fmtDate(d.date),
    ]);
    y = drawTable(doc, y, headers, rows, widths, brandRgb, checkNewPage);
  }

  // === DEVIS LIÉS ===
  if (data.devisLies && data.devisLies.length > 0) {
    y = checkNewPage(y, 30);
    y = sectionHeader(doc, y, `Devis & Factures liés (${data.devisLies.length})`, brandRgb);
    const headers = ['Numéro', 'Type', 'Montant TTC', 'Statut', 'Date'];
    const widths = [40, 25, 35, 30, 30];
    const rows = data.devisLies.map(d => [
      d.numero, d.type === 'facture' ? 'Facture' : 'Devis', fmtMoney2(d.montant),
      STATUS_LABELS[d.statut] || d.statut, fmtDate(d.date),
    ]);
    y = drawTable(doc, y, headers, rows, widths, brandRgb, checkNewPage);
  }

  // Page numbers
  const total = doc.internal.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    addPageFooter(doc, i - 1, total - 1, entreprise?.nom);
  }

  const isFree = subscription?.isFree?.() ?? false;
  if (isFree) {
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(40);
      doc.text('APERÇU', PAGE.width / 2, PAGE.height / 2, { align: 'center', angle: 45 });
    }
  }

  const blob = doc.output('blob');
  const filename = `Rapport_Chantier_${(data.chantier?.nom || 'chantier').replace(/[^a-zA-Z0-9àâéèêëïôùûüç]/gi, '_')}.pdf`;

  return { blob, filename, pageCount: total };
}

// ============ UTILITIES ============

/**
 * Download a PDF blob as a file
 */
export function downloadReportPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create an object URL for PDF preview
 */
export function previewReportPDF(blob) {
  return URL.createObjectURL(blob);
}
