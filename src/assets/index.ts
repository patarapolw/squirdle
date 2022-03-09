import { ref } from 'vue'

import enRef from '../../translation/en-ref.json'
import enTrans from '../../translation/en.json'

export interface IPokedexEntry {
  gen: number
  type1: string
  type2: string
  height: number
  weight: number
  hints: string[]
  info(): string
  name: {
    [lang: string]: string
  }
}

export const defaultMinGen = ref(1)
export const defaultMaxGen = ref(8)
export const lang = ref(window.LANG)
export const translation = ref<Record<string, any>>({})
export const dailyJSON = ref<{
  startingDate: string
  names: string[]
}>({
  startingDate: new Date().toISOString().substring(0, 10),
  names: []
})

export interface IPokedex {
  [name: string]: IPokedexEntry
}
export const pokedex = ref<IPokedex>({})

export function t<R = string>(s: string, def?: R): R {
  return translation.value[s] || (enTrans as any)[s] || def || s
}

export async function initPokedex() {
  const pokedexData = await import('../../pokedex.csv').then((r) => r.default)
  const pk: IPokedex = {}

  const gens = pokedexData.map((p) => {
    const gen = Number(p.generation)

    pk[p.name] = {
      name: {
        en: p.name,
        ja: p.name_ja,
        ko: p.name_ko
      },
      gen,
      type1: p.type_1,
      type2: p.type_2,
      height: Number(p.height_m),
      weight: Number(p.weight_kg),
      hints: [],
      info() {
        return [
          `${t('Gen')}: ${this.gen}`,
          ...(this.type2
            ? [
                `${t('Type')} 1: ${t(this.type1)}`,
                `${t('Type')} 2: ${t(this.type2)}`
              ]
            : [`${t('Type')}: ${t(this.type1)}`]),
          `${t('Height')}: ${this.height} m`,
          `${t('Weight')}: ${this.weight} kg`
        ].join('\n')
      }
    }

    pokedex.value = pk

    return gen
  })

  defaultMaxGen.value = Math.max(...gens)
}

export const linkTemplate = ref<{
  template: string
  alt: Record<string, string>
}>(enRef)

export class LinkBuilder {
  s0: string
  lang: 'en' | 'ja' | 'ko'
  s2: string

  constructor(public template: string) {
    const ss = template.split(/{{_POKEMON_NAME\[([a-z-]+)\]}}/)

    this.s0 = ss[0]
    this.lang = (ss[1] as any) || 'en'
    this.s2 = ss[2] || ''
  }

  make(g: IPokedexEntry | string) {
    return `${this.s0}${encodeURIComponent(
      typeof g === 'string' ? g : g.name[this.lang]
    )}${this.s2}`
  }

  parse(url: string) {
    if (url.startsWith(this.s0) && url.endsWith(this.s2)) {
      const c = url.substring(this.s0.length, url.length - this.s2.length)
      if (!c) return null

      return {
        [this.lang]: decodeURIComponent(c)
      }
    }

    return null
  }
}

/**
 * Shuffles array in place.
 * @param a items An array containing the items.
 */
export function shuffle<T>(a: T[]) {
  var j: number, x: T, i: number
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}
