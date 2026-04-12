import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // ── Dev proxy ────────────────────────────────────────────────────────────────
  // Forwards /api/* requests to the Express server in development.
  // This avoids cross-origin issues and keeps credentials (cookies) flowing.
  // The frontend .env still needs: VITE_API_URL=/api  (no host, no port)
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})