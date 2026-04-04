import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'localhost',
      '.ngrok-free.app',
      'sorrily-nontragic-vonnie.ngrok-free.dev'
    ]
  },
})