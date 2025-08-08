import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure process is defined for Firebase compatibility
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    // Optimize for mobile performance and Vercel deployment
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth'],
          ui: ['@headlessui/react', 'tailwind-merge', 'clsx'],
          utils: ['axios']
        }
      }
    },
    // Compress assets
    minify: 'esbuild',
    sourcemap: false,
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    // Optimize chunk size for mobile and Vercel functions
    chunkSizeWarningLimit: 1000,
    // Ensure proper asset handling for Vercel
    assetsDir: 'assets',
    outDir: 'dist',
    emptyOutDir: true
  },
  esbuild: {
    loader: 'jsx',
    include: /.*\.[tj]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'firebase/app', 
      'firebase/auth',
      'lucide-react',
      'recharts',
      'react-router-dom',
      'axios',
      'tailwind-merge',
      'clsx'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    // Keep proxy for development as fallback, but services now use environment variables
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts',
      ],
    },
  },
}) 