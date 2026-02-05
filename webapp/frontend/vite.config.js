import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages
  base: process.env.GITHUB_PAGES ? '/slides-songs-shironet/' : '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
