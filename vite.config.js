import { defineConfig } from 'vite'

export default defineConfig({
  envDir: '.',
  build: {
    rollupOptions: {
      input: ['index.html'],
    },
  },
})
