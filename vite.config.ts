import { defineConfig, type Plugin } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { VitePWA } from 'vite-plugin-pwa';

const CSP_DIRECTIVE = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self'; connect-src 'self'`;
const CSP_PLACEHOLDER = '<!-- CSP -->';

function cspPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        CSP_PLACEHOLDER,
        `<meta http-equiv="Content-Security-Policy" content="${CSP_DIRECTIVE}" />`,
      );
    },
  };
}

const pwaOptions = {
  registerType: 'autoUpdate' as const,
  includeAssets: ['favicon.svg'],
  manifest: {
    name: 'Wallet',
    short_name: 'Wallet',
    description: 'Digital loyalty card wallet',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone' as const,
    start_url: process.env.BUILD_PUBLIC_PATH || '/',
    icons: [
      {
        src: 'favicon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'CacheFirst' as const,
        options: {
          cacheName: 'static-js-css',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
        handler: 'StaleWhileRevalidate' as const,
        options: {
          cacheName: 'static-images',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /\.(?:woff2?|ttf|otf|eot)(\?.*)?$/i,
        handler: 'StaleWhileRevalidate' as const,
        options: {
          cacheName: 'static-fonts',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst' as const,
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
        },
      },
      {
        urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/'),
        handler: 'NetworkFirst' as const,
        options: {
          cacheName: 'pages',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
};

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BUILD_PUBLIC_PATH || '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), VitePWA(pwaOptions), cspPlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
});
