import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
    host: true,
    strictPort: true,
    proxy: {
      '/uploads': {
        target: 'http://localhost:8199',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8199',
        changeOrigin: true
      }
    }
  }
});
