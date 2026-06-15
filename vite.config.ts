import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
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
    const logos = files.filter(f => f.startsWith('church_app_logo_') && f.endsWith('.jpg'));
    if (logos.length > 0) {
      // Sort to get the newest file
      logos.sort();
      const latestLogo = logos[logos.length - 1];
      const srcPath = path.join(logoSrcDir, latestLogo);
      fs.copyFileSync(srcPath, path.join(publicDir, 'pwa-icon.jpg'));
      fs.copyFileSync(srcPath, path.join(publicDir, 'pwa-icon.png'));
    }
  }
} catch (e) {
  console.warn("PWA icon copier warning:", e);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
