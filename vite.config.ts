import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Setup static public assets copy for PWA icons dynamically on system initialization
try {
  const publicDir = path.resolve(__dirname, './public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const logoSrcDir = path.resolve(__dirname, './src/assets/images');
  if (fs.existsSync(logoSrcDir)) {
    const files = fs.readdirSync(logoSrcDir);
    // Find the latest generated church app logo image
    const logos = files.filter(f => f.startsWith('church_master_icon_') && f.endsWith('.jpg'));
    if (logos.length > 0) {
      // Sort to get the newest file
      logos.sort();
      const latestLogo = logos[logos.length - 1];
      const srcPath = path.join(logoSrcDir, latestLogo);
      fs.copyFileSync(srcPath, path.join(publicDir, 'pwa-icon.jpg'));
    }
  }
} catch (e) {
  console.warn("PWA icon copier warning:", e);
}

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: process.env.DISABLE_HMR !== 'true'
        },
        manifest: {
          name: 'Church Master Pro',
          short_name: 'Church Master',
          description: 'Apostolic Faith Church Management System',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon.jpg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'pwa-icon.jpg',
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB limit
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
