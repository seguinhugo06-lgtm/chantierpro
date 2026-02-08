import React, { useState, useEffect } from 'react';
import { FileText, Building2, Receipt, Camera, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import PortalLayout from './PortalLayout';
import DevisCard from './DevisCard';
import ChantierTimeline from './ChantierTimeline';
import PhotoGallery from './PhotoGallery';
import FactureCard from './FactureCard';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { toast } from '../../stores/toastStore';
import ToastContainer from '../ui/ToastContainer';

/**
 * Stat Card component for the summary section
 */
function StatCard({ icon: Icon, value, label, color }) {
  const colorClasses = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

/**
 * Section Header component
 */
function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {count !== undefined && (
        <span className="text-sm text-slate-400">({count})</span>
      )}
    </div>
  );
}

/**
 * ClientPortal - Main portal page for clients
 * @param {Object} props
 * @param {string} props.accessToken - Portal access token from URL
 */
export default function ClientPortal({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // Fetch client data
  const fetchClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_client_by_portal_token', {
        p_token: accessToken
      });

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Acces non autorise');

      setClientData(data);

      // Log access
      await supabase.from('portal_access_logs').insert([{
        client_id: data.id,
        action: 'view',
        user_agent: navigator.userAgent,
      }]);

    } catch (err) {
      console.error('Portal fetch error:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchClientData();
    }
  }, [accessToken]);

  // Handle devis acceptance
  const handleAcceptDevis = async (devisId) => {
    try {
      const { data, error } = await supabase.rpc('portal_accept_devis', {
        p_token: accessToken,
        p_devis_id: devisId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Refresh data
      await fetchClientData();
    } catch (err) {
      console.error('Accept devis error:', err);
      toast.error('Erreur', 'Impossible d\'accepter le devis');
    }
  };

  // Handle devis refusal
  const handleRefuseDevis = async (devisId) => {
    try {
      const { data, error } = await supabase.rpc('portal_refuse_devis', {
        p_token: accessToken,
        p_devis_id: devisId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      await fetchClientData();
    } catch (err) {
      console.error('Refuse devis error:', err);
      toast.error('Erreur', 'Impossible de refuser le devis');
    }
  };

  // Handle PDF download - Generate and open PDF in new window
  const handleDownloadPDF = async (id) => {
    // Find the document (devis or facture)
    const allDocs = clientData?.devis || [];
    const doc = allDocs.find(d => d.id === id);

    if (!doc) {
      toast.warning('Document introuvable');
      return;
    }

    const isFacture = doc.type === 'facture';
    const entreprise = clientData?.entreprise || {};
    const couleur = entreprise.couleur || '#f97316';

    // Generate lines HTML
    const lignesHTML = (doc.lignes || []).map(l => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top">${l.description || ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.quantite || 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${l.unite || 'u'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${(l.prixUnitaire || 0).toFixed(2)} €</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${(l.montant || 0).toFixed(2)} €</td>
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
        ${entreprise.tel ? `Tél: ${entreprise.tel}` : ''} ${entreprise.email ? `· ${entreprise.email}` : ''}
        ${entreprise.siret ? `<br>SIRET: ${entreprise.siret}` : ''}
      </div>
    </div>
    <div class="doc-type">
      <h1>${isFacture ? 'FACTURE' : 'DEVIS'}</h1>
      <div class="doc-info">
        <strong>N° ${doc.numero}</strong><br>
        Date: ${new Date(doc.date || doc.created_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  </div>

  <div class="client-section">
    <h3>Client</h3>
    <div class="name">${clientData?.nom || ''} ${clientData?.prenom || ''}</div>
    <div>${clientData?.adresse || ''}</div>
    <div>${clientData?.email || ''} ${clientData?.telephone ? `· ${clientData.telephone}` : ''}</div>
  </div>

  ${doc.description ? `<p style="margin-bottom:15px;color:#475569">${doc.description}</p>` : ''}

  <table aria-label="Détail des prestations">
    <thead>
      <tr>
        <th scope="col">Description</th>
        <th scope="col">Qté</th>
        <th scope="col">Unité</th>
        <th scope="col">P.U. HT</th>
        <th scope="col">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="row sub"><span>Total HT</span><span>${(doc.total_ht || 0).toFixed(2)} €</span></div>
    <div class="row sub"><span>TVA (${doc.tva_rate || 10}%)</span><span>${(doc.tva || 0).toFixed(2)} €</span></div>
    <div class="row total"><span>Total TTC</span><span>${(doc.total_ttc || 0).toFixed(2)} €</span></div>
  </div>

  <div class="footer">
    <strong>${entreprise.nom || ''}</strong>
    ${entreprise.siret ? ` · SIRET: ${entreprise.siret}` : ''}
    ${entreprise.tvaIntra ? ` · TVA: ${entreprise.tvaIntra}` : ''}
  </div>
</body>
</html>`;

    // Open in new window for print/save
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      // Trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      toast.warning('Autorisez les pop-ups pour télécharger le PDF');
    }
  };

  // Handle payment via Stripe
  const handlePayFacture = async (facture) => {
    try {
      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          facture_id: facture.id,
          amount: facture.total_ttc,
          client_email: clientData.email,
          success_url: `${window.location.origin}/portal/${accessToken}?payment=success`,
          cancel_url: `${window.location.origin}/portal/${accessToken}?payment=cancelled`,
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error('Erreur', 'Impossible d\'initialiser le paiement');
    }
  };

  // View photos for a chantier
  const handleViewPhotos = (chantier) => {
    setSelectedChantier(chantier);
    setShowPhotoGallery(true);
  };

  // Loading state
  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
          <p className="text-slate-600">Chargement de votre espace...</p>
        </div>
      </PortalLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Acces refuse</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </PortalLayout>
    );
  }

  // Parse data
  const devisList = (clientData?.devis || []).filter(d => d.type === 'devis');
  const facturesList = (clientData?.devis || []).filter(d => d.type === 'facture');
  const chantiersList = clientData?.chantiers || [];

  // Calculate stats
  const activeChantiers = chantiersList.filter(c => c.statut === 'en_cours').length;
  const totalPhotos = chantiersList.reduce((sum, c) => sum + (c.photos?.length || 0), 0);
  const unpaidFactures = facturesList.filter(f => f.statut !== 'payee').length;

  return (
    <>
    <PortalLayout clientName={clientData?.nom}>
      {/* Stats Summary */}
      <section className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            value={devisList.length}
            label="Devis"
            color="orange"
          />
          <StatCard
            icon={Building2}
            value={activeChantiers}
            label={activeChantiers === 1 ? 'Chantier actif' : 'Chantiers actifs'}
            color="blue"
          />
          <StatCard
            icon={Camera}
            value={totalPhotos}
            label="Photos"
            color="purple"
          />
          <StatCard
            icon={Receipt}
            value={unpaidFactures}
            label={unpaidFactures === 1 ? 'Facture a payer' : 'Factures a payer'}
            color="green"
          />
        </div>
      </section>

      {/* Devis Section */}
      {devisList.length > 0 && (
        <section className="mb-8">
          <SectionHeader icon={FileText} title="Vos devis" count={devisList.length} />
          <div className="space-y-4">
            {devisList.map(devis => (
              <DevisCard
                key={devis.id}
                devis={devis}
                onAccept={handleAcceptDevis}
                onRefuse={handleRefuseDevis}
                onDownload={handleDownloadPDF}
              />
            ))}
          </div>
        </section>
      )}

      {/* Chantiers Section */}
      {chantiersList.length > 0 && (
        <section className="mb-8">
          <SectionHeader icon={Building2} title="Vos chantiers" count={chantiersList.length} />
          <div className="space-y-4">
            {chantiersList.map(chantier => (
              <ChantierTimeline
                key={chantier.id}
                chantier={chantier}
                onViewPhotos={handleViewPhotos}
              />
            ))}
          </div>
        </section>
      )}

      {/* Factures Section */}
      {facturesList.length > 0 && (
        <section className="mb-8">
          <SectionHeader icon={Receipt} title="Vos factures" count={facturesList.length} />
          <div className="space-y-4">
            {facturesList.map(facture => (
              <FactureCard
                key={facture.id}
                facture={facture}
                onDownload={handleDownloadPDF}
                onPay={handlePayFacture}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {devisList.length === 0 && chantiersList.length === 0 && facturesList.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Aucun document pour le moment
            </h3>
            <p className="text-slate-600">
              Vos devis, chantiers et factures apparaitront ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery Modal */}
      <PhotoGallery
        isOpen={showPhotoGallery}
        onClose={() => {
          setShowPhotoGallery(false);
          setSelectedChantier(null);
        }}
        photos={selectedChantier?.photos || []}
        chantierName={selectedChantier?.nom || ''}
      />
    </PortalLayout>
    <ToastContainer position="bottom-right" />
    </>
  );
}
