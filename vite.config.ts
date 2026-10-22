import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('TradingTerminalView')) {
              return 'view-trading-terminal';
            }
            if (id.includes('ForexDashboard')) {
              return 'view-forex-dashboard';
            }
            if (id.includes('node_modules')) {
              if (id.includes('firestore')) {
                return 'vendor-firestore';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              return 'vendor-core';
            }
          },
        },
      },
    },
    server: {
      hmr: false,
      watch: null,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'lucide-react',
        'motion/react',
      ],
    },
  };
});
