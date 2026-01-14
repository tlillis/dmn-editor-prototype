import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    proxy: {
      // Proxy Extended Services requests to bypass CORS
      '/kie-proxy': {
        target: 'http://127.0.0.1:21345',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kie-proxy/, ''),
      },
    },
  },
})
