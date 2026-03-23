import React, { useState, useMemo } from 'react';
import {
  FileText, Building2, Receipt, Camera, Star, Send,
  Phone, Mail, MapPin, MessageSquare, CheckCircle,
  Clock, AlertTriangle, Download, Check, X, CreditCard,
  ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import PortalLayout from './PortalLayout';
import DevisCard from './DevisCard';
import FactureCard from './FactureCard';
import ChantierTimeline from './ChantierTimeline';
import PhotoGallery from './PhotoGallery';

// ─── Demo data ──────────────────────────────────────────────────────
const DEMO_DATA = {
  entreprise: {
    nom: 'Martin Rénovation',
    couleur: '#f97316',
    tel: '06 12 34 56 78',
    email: 'contact@martin-reno.fr',
    adresse: '12 rue des Artisans, 75011 Paris',
    siret: '123 456 789 00012',
    logo: null,
    googleAvisUrl: 'https://g.page/r/martin-renovation/review',
  },
  client: { prenom: 'Jean', nom: 'Dupont' },
  devis: [
    {
      id: 'd1',
      numero: 'DEV-2026-00042',
      type: 'devis',
      description: 'Rénovation complète salle de bain — dépose, plomberie, carrelage, peinture',
      created_at: '2026-03-01',
      total_ht: 2875,
      tva_rate: 20,
      tva: 575,
      total_ttc: 3450,
      statut: 'accepte',
      valid_until: '2026-04-01',
      lignes: [
        { description: 'Dépose sanitaires existants', quantite: 1, unite: 'forfait', prixUnitaire: 450, montant: 450 },
        { description: 'Plomberie — alimentation et évacuation', quantite: 1, unite: 'forfait', prixUnitaire: 850, montant: 850 },
        { description: 'Carrelage sol et murs (fourni + posé)', quantite: 18, unite: 'm²', prixUnitaire: 65, montant: 1170 },
        { description: 'Peinture plafond', quantite: 6, unite: 'm²', prixUnitaire: 25, montant: 150 },
        { description: 'Pose meuble vasque + miroir', quantite: 1, unite: 'u', prixUnitaire: 255, montant: 255 },
      ],
    },
    {
      id: 'd2',
      numero: 'DEV-2026-00045',
      type: 'devis',
      description: 'Extension cuisine — ouverture mur porteur, électricité, finitions',
      created_at: '2026-03-10',
      total_ht: 10667,
      tva_rate: 20,
      tva: 2133,
      total_ttc: 12800,
      statut: 'envoye',
      valid_until: '2026-04-10',
      lignes: [
        { description: 'Ouverture mur porteur avec IPN', quantite: 1, unite: 'forfait', prixUnitaire: 3200, montant: 3200 },
        { description: 'Mise aux normes électriques', quantite: 1, unite: 'forfait', prixUnitaire: 2800, montant: 2800 },
        { description: 'Placo + bandes', quantite: 35, unite: 'm²', prixUnitaire: 42, montant: 1470 },
        { description: 'Peinture murs et plafond', quantite: 55, unite: 'm²', prixUnitaire: 28, montant: 1540 },
        { description: 'Pose carrelage sol', quantite: 22, unite: 'm²', prixUnitaire: 75, montant: 1650 },
      ],
    },
  ],
  factures: [
    {
      id: 'f1',
      numero: 'FAC-2026-00018',
      type: 'facture',
      description: 'Facture — Rénovation salle de bain (solde)',
      created_at: '2026-03-05',
      total_ht: 2875,
      tva_rate: 20,
      tva: 575,
      total_ttc: 3450,
      statut: 'payee',
      echeance: '2026-04-05',
      lignes: [],
    },
    {
      id: 'f2',
      numero: 'FAC-2026-00022',
      type: 'facture',
      description: 'Acompte 30 % — Extension cuisine',
      created_at: '2026-03-15',
      total_ht: 6833,
      tva_rate: 20,
      tva: 1367,
      total_ttc: 8200,
      statut: 'en_attente',
      echeance: '2026-04-15',
      lignes: [],
    },
  ],
  chantiers: [
    {
      id: 'c1',
      nom: 'Rénovation salle de bain',
      adresse: '45 rue Victor Hugo, 75016 Paris',
      statut: 'en_cours',
      progression: 65,
      date_debut: '2026-02-15',
      date_fin: '2026-04-01',
      description: 'Rénovation complète de la salle de bain principale — dépose, plomberie, carrelage, pose sanitaires.',
      photos: [],
    },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);

// ─── Section Header ─────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, couleur }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${couleur}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: couleur }} />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {count !== undefined && (
        <span className="text-sm text-slate-400">({count})</span>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, couleur }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${couleur}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: couleur }} />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

// ─── Contact Section ────────────────────────────────────────────────

function ContactSection({ entreprise, couleur }) {
  const [formData, setFormData] = useState({ nom: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Demo: just show success
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setFormData({ nom: '', message: '' });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Company info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Coordonnées</h3>
        <div className="space-y-3">
          {entreprise.tel && (
            <a href={`tel:${entreprise.tel.replace(/\s/g, '')}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              <Phone className="w-4 h-4" style={{ color: couleur }} />
              {entreprise.tel}
            </a>
          )}
          {entreprise.email && (
            <a href={`mailto:${entreprise.email}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-900 transition-colors">
              <Mail className="w-4 h-4" style={{ color: couleur }} />
              {entreprise.email}
            </a>
          )}
          {entreprise.adresse && (
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: couleur }} />
              {entreprise.adresse}
            </div>
          )}
        </div>
      </div>

      {/* Contact form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Envoyer un message</h3>
        {sent ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">Message envoyé avec succès !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Votre nom"
              value={formData.nom}
              onChange={(e) => setFormData(f => ({ ...f, nom: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': couleur }}
              required
            />
            <textarea
              placeholder="Votre message..."
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData(f => ({ ...f, message: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{ '--tw-ring-color': couleur }}
              required
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ background: couleur }}
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Avis Section ───────────────────────────────────────────────────

function AvisSection({ entreprise, couleur }) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);

  const handleStarClick = (star) => {
    setSelectedStar(star);
    // Open Google review link after selecting stars
    if (entreprise.googleAvisUrl) {
      setTimeout(() => {
        window.open(entreprise.googleAvisUrl, '_blank', 'noopener');
      }, 500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: `${couleur}15` }}
      >
        <Star className="w-7 h-7" style={{ color: couleur }} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Votre avis compte !
      </h3>
      <p className="text-sm text-slate-600 mb-5 max-w-md mx-auto">
        Vous êtes satisfait de nos prestations ? Laissez-nous un avis sur Google, cela nous aide énormément !
      </p>

      {/* Stars */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="w-9 h-9"
              fill={(hoveredStar || selectedStar) >= star ? '#facc15' : 'none'}
              stroke={(hoveredStar || selectedStar) >= star ? '#facc15' : '#cbd5e1'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {entreprise.googleAvisUrl && (
        <a
          href={entreprise.googleAvisUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ background: couleur }}
        >
          <ExternalLink className="w-4 h-4" />
          Laisser un avis Google
        </a>
      )}
    </div>
  );
}

// ─── Main ClientPortal ──────────────────────────────────────────────

/**
 * ClientPortal - Public page accessible via token.
 * Displays devis, factures, chantier progress, contact form, and review prompt.
 *
 * @param {Object} props
 * @param {string} props.token - Portal access token
 * @param {boolean} [props.isDark=false] - Unused; portal is always light mode
 */
export default function ClientPortal({ token, isDark = false }) {
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [activeSection, setActiveSection] = useState('all');

  // Demo mode — use placeholder data until backend API exists
  const data = useMemo(() => DEMO_DATA, []);
  const { entreprise, client, devis, factures, chantiers } = data;
  const couleur = entreprise.couleur || '#f97316';

  // Stats
  const activeChantiers = chantiers.filter(c => c.statut === 'en_cours').length;
  const unpaidFactures = factures.filter(f => f.statut !== 'payee').length;
  const totalPhotos = chantiers.reduce((sum, c) => sum + (c.photos?.length || 0), 0);

  // ── Handlers (demo stubs) ─────────────────────────────────────────

  const handleAcceptDevis = async (devisId) => {
    // TODO: call supabase.rpc('portal_accept_devis', { p_token, p_devis_id })
    console.log('[Portal] Accept devis', devisId);
  };

  const handleRefuseDevis = async (devisId) => {
    // TODO: call supabase.rpc('portal_refuse_devis', { p_token, p_devis_id })
    console.log('[Portal] Refuse devis', devisId);
  };

  const handleDownloadPDF = (id) => {
    // Find document
    const allDocs = [...devis, ...factures];
    const doc = allDocs.find(d => d.id === id);
    if (!doc) return;

    const isFacture = doc.type === 'facture';

    const lignesHTML = (doc.lignes || []).map(l => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite || 'u'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} \u20ac</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${(l.montant || 0).toFixed(2)} \u20ac</td>
      </tr>
    `).join('');

    const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${isFacture ? 'Facture' : 'Devis'} ${doc.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 25px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${couleur}; }
    .logo { font-size: 16pt; font-weight: bold; color: ${couleur}; margin-bottom: 8px; }
    .entreprise-info { font-size: 8pt; color: #64748b; line-height: 1.5; }
    .doc-type { text-align: right; }
    .doc-type h1 { font-size: 22pt; color: ${couleur}; margin-bottom: 8px; }
    .doc-info { font-size: 9pt; color: #64748b; }
    .client-section { background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid ${couleur}; margin-bottom: 20px; }
    .client-section h3 { font-size: 8pt; color: #64748b; margin-bottom: 6px; text-transform: uppercase; }
    .client-section .name { font-weight: 600; font-size: 11pt; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    thead { background: ${couleur}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }
    th:not(:first-child) { text-align: center; }
    th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 260px; margin-top: 15px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 10pt; }
    .totals .row.sub { background: #f8fafc; border-radius: 4px; margin-bottom: 2px; }
    .totals .total { background: ${couleur}; color: white; padding: 12px; border-radius: 6px; font-size: 13pt; font-weight: bold; margin-top: 8px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 7pt; color: #64748b; text-align: center; }
    @media print { body { padding: 15px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">${entreprise.nom || 'Entreprise'}</div>
      <div class="entreprise-info">
        ${entreprise.adresse || ''}<br>
        ${entreprise.tel ? `Tel: ${entreprise.tel}` : ''} ${entreprise.email ? `&middot; ${entreprise.email}` : ''}
        ${entreprise.siret ? `<br>SIRET: ${entreprise.siret}` : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N&deg; ${doc.numero}</strong><br>
        Date: ${new Date(doc.created_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  </div>

  <div class="client-section">
    <h3>Client</h3>
    <div class="name">${client.prenom} ${client.nom}</div>
  </div>

  ${doc.description ? `<p style="margin-bottom:15px;color:#475569">${doc.description}</p>` : ''}

  ${doc.lignes && doc.lignes.length > 0 ? `
  <table aria-label="Detail des prestations">
    <thead>
      <tr>
        <th scope="col">Description</th>
        <th scope="col">Qte</th>
        <th scope="col">Unite</th>
        <th scope="col">P.U. HT</th>
        <th scope="col">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>` : ''}

  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${(doc.total_ht || 0).toFixed(2)} \u20ac</span></div>
    <div class="row sub"><span>TVA (${doc.tva_rate || 20}%)</span><span>${(doc.tva || 0).toFixed(2)} \u20ac</span></div>
    <div class="row total"><span>Total TTC</span><span>${(doc.total_ttc || 0).toFixed(2)} \u20ac</span></div>
  </div>

  <div class="footer">
    <strong>${entreprise.nom || ''}</strong>
    ${entreprise.siret ? ` &middot; SIRET: ${entreprise.siret}` : ''}
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const handlePayFacture = (facture) => {
    // TODO: call Edge Function to create Stripe checkout session
    console.log('[Portal] Pay facture', facture.id);
  };

  const handleViewPhotos = (chantier) => {
    setSelectedChantier(chantier);
    setShowPhotoGallery(true);
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <PortalLayout
      clientName={`${client.prenom} ${client.nom}`}
      entreprise={entreprise}
      couleur={couleur}
    >
      {/* Stat cards */}
      <section className="mb-6 sm:mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={FileText} value={devis.length} label="Devis" couleur={couleur} />
          <StatCard icon={Building2} value={activeChantiers} label={activeChantiers <= 1 ? 'Chantier actif' : 'Chantiers actifs'} couleur={couleur} />
          <StatCard icon={Camera} value={totalPhotos} label="Photos" couleur={couleur} />
          <StatCard icon={Receipt} value={unpaidFactures} label={unpaidFactures <= 1 ? 'Facture en attente' : 'Factures en attente'} couleur={couleur} />
        </div>
      </section>

      {/* ── Section navigation (mobile) ───────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 sm:hidden">
        {[
          { id: 'all', label: 'Tout' },
          { id: 'devis', label: 'Devis' },
          { id: 'factures', label: 'Factures' },
          { id: 'chantier', label: 'Chantier' },
          { id: 'contact', label: 'Contact' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
              activeSection === tab.id
                ? 'text-white border-transparent'
                : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
            }`}
            style={activeSection === tab.id ? { background: couleur, borderColor: couleur } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Devis Section ─────────────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'devis') && devis.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <SectionHeader icon={FileText} title="Mes devis" count={devis.length} couleur={couleur} />
          <div className="space-y-4">
            {devis.map((d) => (
              <DevisCard
                key={d.id}
                devis={d}
                onAccept={handleAcceptDevis}
                onRefuse={handleRefuseDevis}
                onDownload={handleDownloadPDF}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Factures Section ──────────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'factures') && factures.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <SectionHeader icon={Receipt} title="Mes factures" count={factures.length} couleur={couleur} />
          <div className="space-y-4">
            {factures.map((f) => (
              <FactureCard
                key={f.id}
                facture={f}
                onDownload={handleDownloadPDF}
                onPay={handlePayFacture}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Chantier Section ──────────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'chantier') && chantiers.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <SectionHeader icon={Building2} title="Mon chantier" count={chantiers.length} couleur={couleur} />
          <div className="space-y-4">
            {chantiers.map((c) => (
              <ChantierTimeline
                key={c.id}
                chantier={c}
                onViewPhotos={handleViewPhotos}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Contact Section ───────────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'contact') && (
        <section className="mb-6 sm:mb-8">
          <SectionHeader icon={MessageSquare} title="Contact" couleur={couleur} />
          <ContactSection entreprise={entreprise} couleur={couleur} />
        </section>
      )}

      {/* ── Avis Section ──────────────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'contact') && (
        <section className="mb-6 sm:mb-8">
          <SectionHeader icon={Star} title="Votre avis" couleur={couleur} />
          <AvisSection entreprise={entreprise} couleur={couleur} />
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {devis.length === 0 && factures.length === 0 && chantiers.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-12 px-6">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Aucun document pour le moment
          </h3>
          <p className="text-slate-600">
            Vos devis, factures et chantiers apparaitront ici.
          </p>
        </div>
      )}

      {/* Photo Gallery Modal */}
      <PhotoGallery
        isOpen={showPhotoGallery}
        onClose={() => { setShowPhotoGallery(false); setSelectedChantier(null); }}
        photos={selectedChantier?.photos || []}
        chantierName={selectedChantier?.nom || ''}
      />
    </PortalLayout>
  );
}
