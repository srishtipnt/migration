import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      external: [],
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
