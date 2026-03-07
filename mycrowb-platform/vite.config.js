import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MYCROWB Platform',
        short_name: 'MYCROWB',
        theme_color: '#2E7D32',
        background_color: '#F1F8E9',
        display: 'standalone'
      }
    })
  ]
});
