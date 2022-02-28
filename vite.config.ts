import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import CSV from 'vite-plugin-csv'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), CSV()],
  publicDir: 'static'
})
