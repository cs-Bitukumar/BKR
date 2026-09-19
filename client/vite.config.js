import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Socket.IO needs special handling — it uses /socket.io/ path
        // which Express/Socket.IO server handles directly
      },
    },
  },
})