import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconFileName = 'mycrowbemblem.png';
const iconOutputPath = path.resolve(__dirname, 'public', iconFileName);
const iconBase64Path = path.resolve(__dirname, '..', 'mycrowb-backend', 'src', 'assets', 'mycrowb-emblem.base64');

function ensurePwaIcon() {
  const encoded = fs.readFileSync(iconBase64Path, 'utf8').trim();
  const data = Buffer.from(encoded, 'base64');
  fs.writeFileSync(iconOutputPath, data);
}

ensurePwaIcon();

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', iconFileName],
      manifest: {
        name: 'MYCROWB Platform',
        short_name: 'MYCROWB',
        description: 'MYCROWB mobile-first platform experience',
        theme_color: '#2E7D32',
        background_color: '#F1F8E9',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/mycrowbemblem.png',
            sizes: '393x393',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/mycrowbemblem.png',
            sizes: '393x393',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
