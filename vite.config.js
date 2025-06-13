import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Build config for extension
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('./popup.html', import.meta.url)),
        content: fileURLToPath(new URL('./src/content/index.js', import.meta.url)),
        background: fileURLToPath(new URL('./src/background/index.js', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => {
          // Keep the original paths for content and background scripts
          if (chunk.name === 'content') return 'src/content/index.js'
          if (chunk.name === 'background') return 'src/background/index.js'
          return 'assets/[name].js'
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
}))
