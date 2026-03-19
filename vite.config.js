import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@lexical/extension': path.resolve(__dirname, './src/components/LexicalEditor/lexical-extension/index.ts'),
    },
  },
  define: {
    'process.env.LEXICAL_VERSION': JSON.stringify('0.41.0'),
    'process.env': {} 
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    watch: {
      ignored: ['**/server/db/**'],
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
