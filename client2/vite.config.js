import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 300000,  // 5 minutes timeout for long-running visual tests
        proxyTimeout: 300000,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/report': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/visual-public': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/functional-report': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/functional-source': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
