import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/roadmap/',
  server: {
    port: 3003,
    proxy: {
      '/roadmap/api': {
        target: 'http://localhost:3005',
        rewrite: (path) => path.replace(/^\/roadmap/, ''),
      },
      '/roadmap/uploads': {
        target: 'http://localhost:3005',
        rewrite: (path) => path.replace(/^\/roadmap/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
