import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import CSV from 'vite-plugin-csv'
// @ts-ignore
import YAML from 'vite-plugin-yaml'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), CSV(), YAML()]
})
