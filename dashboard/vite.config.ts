import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 12002,
    cors: true,
    open: false,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 12002,
    cors: true,
  }
})