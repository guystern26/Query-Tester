import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],

  resolve: {
    alias: {
      'core': path.resolve(__dirname, './core'),
      '@': path.resolve(__dirname, './packages/playground/src/main/webapp'),
      '@types': path.resolve(__dirname, './packages/playground/src/main/webapp/core/types'),
      '@constants': path.resolve(__dirname, './packages/playground/src/main/webapp/core/constants'),
      '@store': path.resolve(__dirname, './packages/playground/src/main/webapp/core/store'),
      '@api': path.resolve(__dirname, './packages/playground/src/main/webapp/api'),
      '@hooks': path.resolve(__dirname, './packages/playground/src/main/webapp/hooks'),
      '@utils': path.resolve(__dirname, './packages/playground/src/main/webapp/utils'),
      '@common': path.resolve(__dirname, './packages/playground/src/main/webapp/common'),
      '@components': path.resolve(__dirname, './packages/playground/src/main/webapp/components'),
      '@features': path.resolve(__dirname, './packages/playground/src/main/webapp/features'),
    }
  },

  // Fix for crypto.hash error on Node 18
  define: {
    'process.env': {},
    global: 'globalThis',
  },

  server: {
    port: 3000,
    proxy: {
      // Proxy Splunk API calls during development
      '/splunkd': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },

  build: {
    outDir: 'packages/playground/stage/appserver/static/pages',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        start: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'start.js',
        assetFileNames: '[name].[ext]'
      }
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom'
    ]
  }
});