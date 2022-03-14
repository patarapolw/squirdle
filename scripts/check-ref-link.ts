import fs from 'fs'
import { URL } from 'url'

import axios from 'axios'
import cheerio from 'cheerio'

import { readPokedex } from './convert-pokedex'

export interface IPokedexEntry {
  name: {
    en: string
    ja: string
    ko: string
  }
}

class LinkBuilder {
  s0: string
  s1: string
  s2: string

  constructor(public template: string) {
    const ss = template.split(/{{_POKEMON_NAME\[([a-z-]+)\]}}/)

    this.s0 = ss[0]
    this.s1 = ss[1] || 'en'
    this.s2 = ss[2] || ''
  }

  make(g: IPokedexEntry) {
    return `${this.s0}${encodeURIComponent((g.name as any)[this.s1])}${this.s2}`
  }

  parse(url: string) {
    if (url.startsWith(this.s0) && url.endsWith(this.s2)) {
      const c = url.substring(this.s0.length, url.length - this.s2.length)
      if (!c) return null

      return {
        [this.s1]: decodeURIComponent(c)
      }
    }

    return null
  }
}

async function checkRef(lang: 'en' | 'ja' | 'ko', cases?: string[]) {
  const filename = `translation/${lang}-ref.json`
  const cacheFilename = `generated/${lang}/check-ref.json`

  let checkedResult: Record<string, string> = {}

  if (fs.existsSync(cacheFilename)) {
    checkedResult = JSON.parse(fs.readFileSync(cacheFilename, 'utf-8'))
  }

  const ref: {
    template: string
    alt?: Record<string, string>
  } = JSON.parse(fs.readFileSync(filename, 'utf-8'))

  const ln = new LinkBuilder(ref.template)
  let pokedex: IPokedexEntry[]
  if (cases) {
    pokedex = cases.map((c) => ({
      name: {
        en: '',
        ja: '',
        ko: '',
        [lang]: c
      }
    }))
  } else {
    pokedex = readPokedex()
  }

  pokedex.map((p) => {
    checkedResult[p.name[lang]] = ''
  })

  const promises: Promise<any>[] = []
  const batchSize = 50
  let i = 0
  const { alt = {} } = ref

  for (const g of pokedex) {
    if (g.name[lang] && !alt[g.name[lang]] && !checkedResult[g.name[lang]]) {
      const u = new URL(ln.make(g))

      promises.push(
        (async () => {
          const $ = await axios.get(u.href).then((r) => cheerio.load(r.data))
          $('a').each((_, el) => {
            const href = $(el).attr('href')
            if (href) {
              const u1 = new URL(href, u.origin)
              const p = ln.parse(u1.href)
              if (p && checkedResult[p[lang]] !== undefined) {
                checkedResult[p[lang]] = 'in-link'
              }
            }
          })
          checkedResult[g.name[lang]] = 'direct'
        })().catch((e) => {
          let status: number
          if ((status = e.toJSON?.().status)) {
            checkedResult[g.name[lang]] = `invalid ${status}`
            return
          }
          console.error(e.toJSON?.()?.status || e, u.href)
          checkedResult[g.name[lang]] = 'invalid'
        })
      )

      if (promises.length > batchSize) {
        await Promise.all(promises.splice(0, batchSize))
        console.log(`Waiting for batch ${i++}`)
      }
    }
  }

  await Promise.all(promises)

  for (const k of Object.keys(checkedResult)) {
    if (['direct', 'in-link'].includes(checkedResult[k])) {
      delete alt[k]
    } else if (!alt[k]) {
      if (lang === 'en') {
        {
          const k1 = k.replace(/ [^ ]+ (forme?|mode|cloak|rider|style)$/i, '')
          if (['direct', 'in-link'].includes(checkedResult[k1])) {
            alt[k] = k1
          }
        }

        if (!alt[k]) {
          const k1 = k.replace(/^(Alolan|Galarian|Hisuian|Darmanitan) /i, '')
          if (['direct', 'in-link'].includes(checkedResult[k1])) {
            alt[k] = k1
          }
        }

        if (!alt[k]) {
          alt[k] = ''
        }
      } else {
        alt[k] = ''
      }
    }
  }

  ref.alt = alt

  fs.writeFileSync(filename, JSON.stringify(ref, null, 2))
  fs.writeFileSync(cacheFilename, JSON.stringify(checkedResult, null, 2))
}

if (require.main === module) {
  checkRef('en')
}
