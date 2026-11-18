import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base keeps the build working on GitHub Pages project sites,
// custom domains and local file previews.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: 'es2020', outDir: 'dist' },
})
