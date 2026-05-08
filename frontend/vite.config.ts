import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Required for Docker
    // Allow any Host header — required when running behind nginx on a real
    // domain (otherwise Vite 5+ rejects requests with the production hostname).
    // We're locked down at the nginx layer, so this isn't a security regression.
    allowedHosts: true,
    watch: {
      usePolling: true, // Required on Windows + Docker (inotify doesn't cross the boundary)
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
