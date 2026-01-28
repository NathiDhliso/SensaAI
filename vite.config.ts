import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', 'framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    // Forced restart comment
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/bedrock-api': {
        target: 'https://bedrock-runtime.us-east-1.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bedrock-api/, ''),
        secure: true,
      },
    },
  },
})
