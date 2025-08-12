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
    },
    preserveSymlinks: true,
    dedupe: ['react', 'react-dom', 'clsx', 'tailwind-merge']
  },
  // Add experimental features for better module resolution
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { js: `/${filename}` }
      } else {
        return { relative: true }
      }
    }
  },
  // Prevent hoisting issues
  esbuild: {
    loader: 'jsx',
    include: /.*\.[tj]sx?$/,
    exclude: [],
    target: 'es2020',
    supported: {
      'top-level-await': true
    }
  },
  // Ensure compatibility with Vercel
  ssr: {
    noExternal: ['firebase']
  },
  build: {
    // Optimize for mobile performance and Vercel deployment
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Handle React and React DOM
          if (id.includes('react') && id.includes('node_modules')) {
            return 'vendor';
          }
          // Handle charts
          if (id.includes('recharts') && id.includes('node_modules')) {
            return 'charts';
          }
          // Handle icons
          if (id.includes('lucide-react') && id.includes('node_modules')) {
            return 'icons';
          }
          // Handle router
          if (id.includes('react-router-dom') && id.includes('node_modules')) {
            return 'router';
          }
          // Handle Firebase
          if (id.includes('firebase') && id.includes('node_modules')) {
            return 'firebase';
          }
          // Handle Headless UI
          if (id.includes('@headlessui/react') && id.includes('node_modules')) {
            return 'headlessui';
          }
          // Handle utility libraries
          if ((id.includes('tailwind-merge') || id.includes('clsx') || id.includes('axios')) && id.includes('node_modules')) {
            return 'utils';
          }
          // Default chunk for other dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
      'clsx',
      '@headlessui/react'
    ],
    exclude: [],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
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