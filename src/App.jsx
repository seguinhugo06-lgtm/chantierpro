import React, { useState } from 'react';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsAuth(true);
    }
  };
  
  if (!isAuth) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 50%, #fef0f5 100%)',
        padding: '20px'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)', 
          maxWidth: '450px', 
          width: '100%' 
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', 
              borderRadius: '16px', 
              margin: '0 auto 20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '40px' 
            }}>
              🏗️
            </div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#111', 
              marginBottom: '10px' 
            }}>
              ChantierPro
            </h1>
            <p style={{ color: '#666', fontSize: '16px' }}>
              Accédez à votre espace ChantierPro
            </p>
          </div>
          
          <form onSubmit={handleLogin} style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f97316'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f97316'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
            
            <button 
              type="submit"
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '16px', 
                fontWeight: '600', 
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Se connecter
            </button>
          </form>
          
          <div style={{ textAlign: 'center' }}>
            <button 
              style={{ 
                color: '#f97316', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Pas de compte ? S'inscrire
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e5e7eb', 
        padding: '20px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          maxWidth: '1200px', 
          margin: '0 auto' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '20px' 
            }}>
              🏗️
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111' }}>ChantierPro</h1>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Mon Entreprise BTP</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAuth(false)} 
            style={{ 
              padding: '10px 20px', 
              background: '#f3f4f6', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '500',
              fontSize: '14px',
              color: '#374151',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
          >
            Déconnexion
          </button>
        </div>
      </header>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px', color: '#111' }}>
          Tableau de bord
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '40px' 
        }}>
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e5e7eb', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏱️</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', margin: 0 }}>Devis en cours</p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111', margin: '8px 0' }}>3</p>
            <p style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '500', marginTop: '8px', margin: 0 }}>
              12,450€ en attente
            </p>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e5e7eb', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', margin: 0 }}>CA du mois</p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111', margin: '8px 0' }}>28,450€</p>
            <p style={{ fontSize: '14px', color: '#10b981', fontWeight: '500', marginTop: '8px', margin: 0 }}>
              +12% vs mois dernier
            </p>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e5e7eb', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', margin: 0 }}>Clients</p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111', margin: '8px 0' }}>15</p>
            <p style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: '500', marginTop: '8px', margin: 0 }}>
              clients actifs
            </p>
          </div>
          
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '12px', 
            border: '1px solid #e5e7eb', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px', margin: 0 }}>Documents</p>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#111', margin: '8px 0' }}>47</p>
            <p style={{ fontSize: '14px', color: '#f97316', fontWeight: '500', marginTop: '8px', margin: 0 }}>
              devis & factures
            </p>
          </div>
        </div>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', 
          padding: '40px', 
          borderRadius: '16px', 
          color: 'white', 
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', margin: '0 0 16px 0' }}>
            🎉 Félicitations !
          </h3>
          <p style={{ fontSize: '18px', opacity: 0.95, marginBottom: '16px', margin: '0 0 16px 0' }}>
            Votre application ChantierPro est maintenant déployée avec succès !
          </p>
          <p style={{ fontSize: '16px', opacity: 0.85, margin: 0 }}>
            Prochaines étapes : Ajouter la gestion complète des clients, devis et factures.
          </p>
        </div>

        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#111' }}>
            📊 Fonctionnalités à venir
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              '✅ Gestion complète des clients',
              '✅ Création et édition de devis',
              '✅ Génération automatique de factures',
              '✅ Envoi par email',
              '✅ Suivi des paiements',
              '✅ Rapports et statistiques'
            ].map((item, i) => (
              <li key={i} style={{ 
                padding: '12px 0', 
                borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none',
                fontSize: '16px',
                color: '#374151'
              }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}