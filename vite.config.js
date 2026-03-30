import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env': {} 
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    watch: {
      ignored: ['**/server/db/**', '**/server/storage/**'],
    },
    hmr: {
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
      protocol: 'ws',
    },
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          editor: ['suneditor', 'suneditor-react'],
          utils: ['axios', 'xlsx', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})
