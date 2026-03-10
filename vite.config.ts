import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' })],

  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },

  resolve: {
    alias: {
      'core': path.resolve(__dirname, './packages/query-tester-app/src/core'),
      '@splunk/query-tester-app': path.resolve(__dirname, './packages/query-tester-app/src'),
    }
  },

  define: {
    'process.env': {},
    global: 'globalThis',
  },

  // DEV ONLY — proxy rewrites /splunkd to local Splunk instance.
  // Override via VITE_SPLUNK_DEV_HOST in .env.local (e.g. http://my-splunk:8000)
  server: {
    port: 3000,
    proxy: {
      '/splunkd': {
        target: process.env.VITE_SPLUNK_DEV_HOST || 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  },

  build: {
    outDir: 'dist',
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
      'react-dom',
      'ace-builds/src-min-noconflict/ace',
      'ace-builds/src-min-noconflict/ext-language_tools',
      '@splunk/react-search/components/Ace',
      '@splunk/react-search/components/Input',
    ]
  }
});
