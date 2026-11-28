import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Forward API calls to NestJS so the browser sees one origin
    // (needed for session cookies in development). `vite preview` uses the
    // same proxy; the Playwright run points it at its own API.
    proxy: {
      '/api': process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000',
    },
  },
});
