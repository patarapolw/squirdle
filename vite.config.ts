import * as fs from 'fs'

import vue from '@vitejs/plugin-vue'
import * as yaml from 'js-yaml'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

// @ts-ignore
import { checkPokedex } from './src/types'

const LANG: string = process.env.SQ_LANG || 'ja'

const pokedexPlugin = () => {
  const moduleId = '@pokedex'
  const resolveModuleId = '\0' + moduleId

  return {
    name: 'pokedex-reader',
    resolveId(id: string) {
      if (id === moduleId) {
        return resolveModuleId
      }
    },
    load(id: string) {
      if (id === resolveModuleId) {
        return `export default ${JSON.stringify(
          checkPokedex(
            yaml.load(fs.readFileSync('pokedex.yaml', 'utf-8')) as any
          )
        )}`
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    pokedexPlugin(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          LANG,
          tr: require(`./translation/${LANG}.json`)
        }
      }
    })
  ],
  publicDir: 'static'
})
