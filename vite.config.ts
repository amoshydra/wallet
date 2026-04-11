import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BUILD_PUBLIC_PATH || '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: true,
    allowedHosts: true,
  },
});
