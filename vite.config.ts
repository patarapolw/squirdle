import { readFileSync } from 'fs'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import CSV from 'vite-plugin-csv'
import { createHtmlPlugin } from 'vite-plugin-html'

const LANG: string = process.env.SQ_LANG || 'ja'

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
          tr: LANG === 'en' ? {} : require(`./translation/${LANG}.json`),
          daily: JSON.parse(
            readFileSync(`generated/${LANG}/daily.json`, 'utf-8')
          )
        }
      }
    })
  ],
  publicDir: 'static'
})
