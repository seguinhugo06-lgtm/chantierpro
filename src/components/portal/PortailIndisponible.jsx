/**
 * Page affichée à un client qui ouvre un lien de portail tant que le portail est éteint
 * (FONCTIONS.portailClient, src/lib/fonctions.js). Statique : aucune requête, le jeton n'est pas réaffiché, et
 * jamais de données de démonstration présentées comme celles de l'entreprise (recette du 9 oct. 2026).
 * Servie par les deux entrées : src/main.jsx (/portal/<jeton>) et src/App.jsx (?portal=<jeton>).
 */
export default function PortailIndisponible() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="max-w-sm text-center bg-white rounded-2xl shadow p-6">
        <h1 className="text-lg font-bold text-slate-900 mb-2">Espace client indisponible</h1>
        <p className="text-sm text-slate-600">
          Cet espace n’est pas disponible pour le moment. Pour vos devis et factures, contactez directement
          l’entreprise qui vous a envoyé ce lien.
        </p>
      </div>
    </div>
  );
}
