import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA } from './lib/demo-data'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <DataProvider initialData={DEMO_DATA}>
        <App />
      </DataProvider>
    </AppProvider>
  </React.StrictMode>,
)
