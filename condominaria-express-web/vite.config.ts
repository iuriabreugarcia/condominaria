import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/portal/',
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },


  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react-dom';
          }

          if (id.includes('/react/')) {
            return 'vendor-react';
          }

          if (id.includes('/react-router') || id.includes('/@remix-run/')) {
            return 'vendor-router';
          }

          if (id.includes('/lucide-react/')) {
            return 'vendor-icons';
          }

          if (
            id.includes('/date-fns/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'vendor-utils';
          }

          return 'vendor';
        },
      },
    },
  },
});
