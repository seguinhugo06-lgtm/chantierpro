import React, { useState } from 'react';

export default function Settings({ user, settings, setSettings, clients, devis, chantiers, equipe }) {
  const [tab, setTab] = useState('compte');
  const [users, setUsers] = useState([{ id: '1', email: user?.email, role: 'admin', nom: user?.user_metadata?.nom || 'Admin' }]);
  const [newUser, setNewUser] = useState({ email: '', role: 'employe', nom: '' });

  const exportData = (type) => {
    let data = type === 'all' ? { clients, devis, chantiers, equipe } : type === 'clients' ? clients : type === 'devis' ? devis : chantiers;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${type}.json`;
    a.click();
  };

  const addUser = () => {
    if (!newUser.email) return;
    setUsers([...users, { id: Date.now().toString(), ...newUser }]);
    setNewUser({ email: '', role: 'employe', nom: '' });
  };

  const tabs = [
    ['compte', '👤 Compte'], ['users', '👥 Utilisateurs'], ['prefs', '⚙️ Préférences'],
    ['integrations', '🔗 Intégrations'], ['security', '🔒 Sécurité'], ['export', '📤 Export']
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paramètres</h1>
      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {tabs.map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-t-xl font-medium ${tab === k ? 'bg-white border border-b-white -mb-[3px] text-orange-500' : 'text-slate-500'}`}>{v}</button>
        ))}
      </div>

      {tab === 'compte' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">Informations</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Email</span><span>{String(user?.email || '-')}</span></div>
            <div className="flex justify-between py-3 border-b"><span className="text-slate-500">Nom</span><span>{String(user?.user_metadata?.nom || '-')}</span></div>
            <div className="flex justify-between py-3"><span className="text-slate-500">Entreprise</span><span>{String(user?.user_metadata?.entreprise || '-')}</span></div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">👥 Gestion des utilisateurs</h3>
          <div className="space-y-3 mb-6">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold">{u.nom?.[0]}</div>
                <div className="flex-1"><p className="font-medium">{u.nom}</p><p className="text-sm text-slate-500">{u.email}</p></div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
              </div>
            ))}
          </div>
          <h4 className="font-medium mb-3">Ajouter</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Nom" className="px-4 py-2.5 border rounded-xl" value={newUser.nom} onChange={e => setNewUser(p => ({...p, nom: e.target.value}))} />
            <input placeholder="Email" className="px-4 py-2.5 border rounded-xl" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} />
            <select className="px-4 py-2.5 border rounded-xl" value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))}><option value="employe">Employé</option><option value="admin">Admin</option></select>
            <button onClick={addUser} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl">Inviter</button>
          </div>
        </div>
      )}

      {tab === 'prefs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">🎨 Apparence</h3>
            <div className="flex items-center justify-between py-3">
              <div><p className="font-medium">Thème</p><p className="text-sm text-slate-500">Mode clair/sombre</p></div>
              <div className="flex gap-2">
                <button onClick={() => setSettings(p => ({...p, theme: 'light'}))} className={`px-4 py-2 rounded-xl ${settings.theme === 'light' ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>☀️ Clair</button>
                <button onClick={() => setSettings(p => ({...p, theme: 'dark'}))} className={`px-4 py-2 rounded-xl ${settings.theme === 'dark' ? 'bg-orange-500 text-white' : 'bg-slate-100'}`}>🌙 Sombre</button>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-4">💰 TVA & Unités</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">TVA par défaut</label><select className="w-full px-4 py-2.5 border rounded-xl" value={settings.tvaDefault} onChange={e => setSettings(p => ({...p, tvaDefault: parseFloat(e.target.value)}))}>{settings.tvaRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Devise</label><select className="w-full px-4 py-2.5 border rounded-xl" value={settings.currency} onChange={e => setSettings(p => ({...p, currency: e.target.value}))}><option value="EUR">EUR (€)</option><option value="CHF">CHF</option></select></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">🔗 Intégrations</h3>
          <div className="space-y-4">
            {[{icon:'🏦',name:'Banque',desc:'Synchronisation bancaire'},{icon:'📧',name:'Email',desc:'Gmail, Outlook'},{icon:'📊',name:'Comptabilité',desc:'QuickBooks, Sage'},{icon:'📅',name:'Calendrier',desc:'Google Calendar'}].map((int, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
                <span className="text-2xl">{int.icon}</span>
                <div className="flex-1"><p className="font-medium">{int.name}</p><p className="text-sm text-slate-500">{int.desc}</p></div>
                <button className="px-4 py-2 bg-slate-100 rounded-xl text-sm">Connecter</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">🔒 Sécurité</h3>
          <div className="space-y-4">
            {[
              { key: 'twoFA', label: '2FA', desc: 'Authentification à deux facteurs' },
              { key: 'autoBackup', label: 'Sauvegardes auto', desc: 'Sauvegarde quotidienne' },
              { key: 'notifications', label: 'Notifications sécurité', desc: 'Alertes connexion' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div><p className="font-medium">{item.label}</p><p className="text-sm text-slate-500">{item.desc}</p></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings[item.key]} onChange={e => setSettings(p => ({...p, [item.key]: e.target.checked}))} />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-4">📤 Export des données</h3>
          <p className="text-slate-500 mb-6">Pour audits fiscaux ou sauvegardes</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => exportData('clients')} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-center"><p className="text-2xl mb-2">👥</p><p className="text-sm font-medium">Clients</p><p className="text-xs text-slate-500">{clients.length} entrées</p></button>
            <button onClick={() => exportData('devis')} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-center"><p className="text-2xl mb-2">📄</p><p className="text-sm font-medium">Devis/Factures</p><p className="text-xs text-slate-500">{devis.length} entrées</p></button>
            <button onClick={() => exportData('chantiers')} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-center"><p className="text-2xl mb-2">🏗️</p><p className="text-sm font-medium">Chantiers</p><p className="text-xs text-slate-500">{chantiers.length} entrées</p></button>
            <button onClick={() => exportData('all')} className="p-4 bg-orange-100 hover:bg-orange-200 rounded-xl text-center"><p className="text-2xl mb-2">📦</p><p className="text-sm font-medium text-orange-700">Export complet</p><p className="text-xs text-orange-600">Toutes données</p></button>
          </div>
        </div>
      )}
    </div>
  );
}
