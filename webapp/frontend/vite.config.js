import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages - change 'slides_songs_shironet' to your repo name
  base: process.env.GITHUB_PAGES ? '/slides_songs_shironet/' : '/',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
