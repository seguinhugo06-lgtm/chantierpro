import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',                // Force les bons chemins
  build: {
    outDir: 'dist'          // Dossier de sortie standard pour Vite
  }
})