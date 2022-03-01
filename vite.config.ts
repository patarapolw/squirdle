import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import CSV from 'vite-plugin-csv'
import { createHtmlPlugin } from 'vite-plugin-html'

// @ts-ignore
import tr from './translation/ja.json'

const LANG = 'ja'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    CSV(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          LANG,
          tr
        }
      }
    })
  ],
  publicDir: 'static'
})
