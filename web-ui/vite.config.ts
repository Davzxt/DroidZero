import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configurado para gerar build estático que será embutido no app Android
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Asset inline p/ reduzir número de arquivos (melhor p/ WebView)
    assetsInlineLimit: 4096,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
