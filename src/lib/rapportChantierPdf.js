/**
 * Rapport Chantier PDF Generator
 * Generates site report PDFs using jsPDF
 * Following same pattern as reportGenerator.js
 */

import jsPDF from 'jspdf';
import { subscription } from '../stores/subscriptionStore';

const METEO_LABELS = {
  ensoleille: 'Ensoleillé',
  nuageux: 'Nuageux',
  pluie: 'Pluie',
  orage: 'Orage',
  neige: 'Neige',
  vent: 'Vent fort',
};

const TYPE_LABELS = {
  journalier: 'Journalier',
  hebdomadaire: 'Hebdomadaire',
  mensuel: 'Mensuel',
  incident: 'Incident',
  reception: 'Réception',
};

/**
 * Generate a rapport chantier PDF
 * @param {Object} rapport - The rapport data
 * @param {Object} chantier - The chantier data
 * @param {Object} [options] - Options
 * @param {string} [options.couleur] - Brand color (default: #f97316)
 * @returns {jsPDF} The PDF document
 */
export function generateRapportChantierPDF(rapport, chantier, options = {}) {
  const couleur = options.couleur || '#f97316';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper: hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [249, 115, 22];
  };
  const brandRgb = hexToRgb(couleur);

  // Helper: add page if needed
  const checkNewPage = (needed = 20) => {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: section header
  const sectionHeader = (title) => {
    checkNewPage(15);
    doc.setFillColor(...brandRgb);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 3, y + 5.5);
    y += 12;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
  };

  // Helper: key-value row
  const kvRow = (key, value, indent = 0) => {
    checkNewPage(7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(key, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(String(value || '-'), margin + indent + 40, y);
    y += 6;
  };

  // ============================================================
  // COVER / HEADER
  // ============================================================
  doc.setFillColor(...brandRgb);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT DE CHANTIER', margin, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(chantier?.nom || 'Chantier', margin, 28);

  doc.setFontSize(9);
  const typeLabel = TYPE_LABELS[rapport.type] || rapport.type || 'Journalier';
  const dateStr = rapport.date ? new Date(rapport.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  doc.text(`${typeLabel} · ${dateStr}`, margin, 35);

  // Right side: rapport numero
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° ${rapport.numero || '-'}`, pageWidth - margin, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(rapport.statut === 'valide' ? 'VALIDÉ' : 'BROUILLON', pageWidth - margin, 25, { align: 'right' });

  y = 50;

  // ============================================================
  // 1. INFORMATIONS GÉNÉRALES
  // ============================================================
  sectionHeader('Informations générales');
  kvRow('Chantier', chantier?.nom || '-');
  kvRow('Adresse', chantier?.adresse || '-');
  kvRow('Date', dateStr);
  kvRow('Type', typeLabel);
  kvRow('Météo', METEO_LABELS[rapport.meteo] || rapport.meteo || '-');
  if (rapport.temperature) {
    kvRow('Température', `${rapport.temperature}°C`);
  }
  y += 4;

  // ============================================================
  // 2. PERSONNEL PRÉSENT
  // ============================================================
  const personnel = rapport.personnelPresent || [];
  sectionHeader(`Personnel présent (${personnel.length})`);

  if (personnel.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun personnel renseigné', margin + 3, y);
    y += 8;
  } else {
    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 1, contentWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('NOM', margin + 3, y + 4);
    doc.text('RÔLE', margin + 70, y + 4);
    doc.text('HEURES', margin + 130, y + 4);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    let totalHeures = 0;

    personnel.forEach((p) => {
      checkNewPage(7);
      const nom = [p.prenom, p.nom].filter(Boolean).join(' ') || '-';
      doc.text(nom, margin + 3, y);
      doc.text(p.role || '-', margin + 70, y);
      doc.text(`${p.heures || 0}h`, margin + 130, y);
      totalHeures += parseFloat(p.heures) || 0;
      y += 6;
    });

    // Total row
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${personnel.length} personnes · ${totalHeures}h`, margin + 3, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
  }

  // External interveners
  const externes = rapport.intervenantsExternes || [];
  if (externes.length > 0) {
    checkNewPage(15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Intervenants externes:', margin + 3, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    externes.forEach((ext) => {
      checkNewPage(7);
      doc.text(`· ${ext}`, margin + 6, y);
      y += 5;
    });
    y += 4;
  }

  // ============================================================
  // 3. TRAVAUX RÉALISÉS
  // ============================================================
  const travaux = rapport.travaux || [];
  sectionHeader(`Travaux réalisés (${travaux.length})`);

  if (travaux.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun travaux renseigné', margin + 3, y);
    y += 8;
  } else {
    travaux.forEach((t, i) => {
      checkNewPage(25);

      // Work item box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y - 1, contentWidth, 20, 2, 2, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${i + 1}. ${t.description || 'Sans description'}`, margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const details = [
        t.zone ? `Zone: ${t.zone}` : null,
        t.corpsMetier ? `Corps: ${t.corpsMetier}` : null,
      ].filter(Boolean).join(' · ');
      if (details) {
        doc.text(details, margin + 3, y + 10);
      }

      // Progress bar
      const barX = margin + 3;
      const barY = y + 14;
      const barW = 60;
      const barH = 3;
      const progress = Math.min(100, Math.max(0, t.avancement || 0));

      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');

      if (progress > 0) {
        const pColor = progress >= 100 ? [34, 197, 94] : progress >= 50 ? [245, 158, 11] : brandRgb;
        doc.setFillColor(...pColor);
        doc.roundedRect(barX, barY, barW * (progress / 100), barH, 1, 1, 'F');
      }

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${progress}%`, barX + barW + 3, barY + 3);

      y += 24;
    });
    y += 4;
  }

  // ============================================================
  // 4. OBSERVATIONS
  // ============================================================
  if (rapport.observations) {
    sectionHeader('Observations');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(rapport.observations, contentWidth - 6);
    lines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, margin + 3, y);
      y += 5;
    });
    y += 4;
  }

  // ============================================================
  // 5. INCIDENTS
  // ============================================================
  const incidents = rapport.incidents || [];
  if (incidents.length > 0) {
    sectionHeader(`Incidents (${incidents.length})`);

    incidents.forEach((inc) => {
      checkNewPage(20);

      // Severity badge color
      const sevColor = inc.gravite === 'critique' ? [220, 38, 38]
        : inc.gravite === 'majeur' ? [245, 158, 11]
        : [34, 197, 94];

      doc.setFillColor(...sevColor);
      doc.roundedRect(margin, y - 1, 3, 12, 1, 1, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(inc.description || 'Sans description', margin + 6, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const gravLabel = (inc.gravite || 'mineur').charAt(0).toUpperCase() + (inc.gravite || 'mineur').slice(1);
      doc.text(`Gravité: ${gravLabel}`, margin + 6, y + 9);

      y += 14;

      if (inc.actionCorrective) {
        checkNewPage(10);
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Action corrective:', margin + 6, y);
        y += 5;
        doc.setTextColor(30, 41, 59);
        const acLines = doc.splitTextToSize(inc.actionCorrective, contentWidth - 12);
        acLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin + 8, y);
          y += 5;
        });
      }
      y += 4;
    });
  }

  // ============================================================
  // 6. MATÉRIAUX REÇUS
  // ============================================================
  const materiaux = rapport.materiaux || [];
  if (materiaux.length > 0) {
    sectionHeader(`Matériaux reçus (${materiaux.length})`);

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 1, contentWidth, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DESCRIPTION', margin + 3, y + 4);
    doc.text('QUANTITÉ', margin + 90, y + 4);
    doc.text('FOURNISSEUR', margin + 125, y + 4);
    y += 9;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    materiaux.forEach((m) => {
      checkNewPage(7);
      doc.text(m.description || '-', margin + 3, y);
      doc.text(String(m.quantite || '-'), margin + 90, y);
      doc.text(m.fournisseur || '-', margin + 125, y);
      y += 6;
    });
    y += 4;
  }

  // ============================================================
  // 7. SIGNATURE
  // ============================================================
  checkNewPage(35);
  sectionHeader('Signature');

  if (rapport.signePar) {
    kvRow('Signé par', rapport.signePar);
    if (rapport.dateSignature) {
      kvRow('Date', new Date(rapport.dateSignature).toLocaleDateString('fr-FR'));
    }
  }

  // Signature boxes
  y += 4;
  checkNewPage(30);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Left box
  doc.rect(margin, y, contentWidth / 2 - 5, 25);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Responsable chantier', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(rapport.signePar || '', margin + 3, y + 11);

  // Right box
  const rightX = margin + contentWidth / 2 + 5;
  doc.rect(rightX, y, contentWidth / 2 - 5, 25);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Client / Maître d\'ouvrage', rightX + 3, y + 5);

  y += 30;

  // ============================================================
  // FOOTER on each page
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  const entreprise = (() => {
    try {
      return JSON.parse(localStorage.getItem('cp_entreprise') || '{}');
    } catch {
      return {};
    }
  })();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');

    const footerY = 290;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    const footerLeft = `${entreprise.nom || 'ChantierPro'} · Rapport ${rapport.numero || ''}`;
    doc.text(footerLeft, margin, footerY);
    doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, footerY, { align: 'center' });

    // Free plan watermark
    if (subscription.isFree()) {
      doc.setFontSize(48);
      doc.setTextColor(249, 115, 22);
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.text('ChantierPro Gratuit', pageWidth / 2, 150, { align: 'center', angle: 35 });
      doc.setGState(new doc.GState({ opacity: 1 }));

      // Bottom banner
      doc.setFillColor(255, 247, 237);
      doc.rect(0, 280, pageWidth, 8, 'F');
      doc.setFontSize(7);
      doc.setTextColor(194, 65, 12);
      doc.text('Document généré avec ChantierPro — Plan Découverte (gratuit)', pageWidth / 2, 285, { align: 'center' });
    }
  }

  return doc;
}

/**
 * Download a rapport chantier as PDF
 * @param {Object} rapport - The rapport data
 * @param {Object} chantier - The chantier data
 * @param {Object} [options] - Options
 */
export function downloadRapportPDF(rapport, chantier, options = {}) {
  const doc = generateRapportChantierPDF(rapport, chantier, options);
  const chantierName = (chantier?.nom || 'chantier').replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ -]/g, '').replace(/\s+/g, '_');
  const dateStr = rapport.date || new Date().toISOString().split('T')[0];
  doc.save(`Rapport_${chantierName}_${dateStr}.pdf`);
}
