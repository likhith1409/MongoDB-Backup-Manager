import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5551,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5552',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5552',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
