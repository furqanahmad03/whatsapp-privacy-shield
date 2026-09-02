import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' assert { type: 'json' }

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
      },
    },
  },
  server: {
    // crx requires a fixed port for the dev-server HMR client
    port: 5173,
    strictPort: true,
  },
})
