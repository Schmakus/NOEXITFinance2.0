import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    allowedHosts: ['noexit-finance-2-0.onrender.com'],
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
