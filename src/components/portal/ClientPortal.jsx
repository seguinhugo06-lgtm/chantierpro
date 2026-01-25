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
      alert('Erreur lors de l\'acceptation du devis');
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
      alert('Erreur lors du refus du devis');
    }
  };

  // Handle PDF download (placeholder)
  const handleDownloadPDF = async (id) => {
    // TODO: Implement PDF download
    console.log('Download PDF:', id);
    alert('Telechargement PDF en cours...');
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
      alert('Erreur lors de l\'initialisation du paiement');
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
            Reessayer
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
  );
}
