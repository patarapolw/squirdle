import { VNode, createElementVNode, ref } from 'vue'

import enRef from '../../translation/en-ref.json'
import enTrans from '../../translation/en.json'

export const defaultMinGen = ref(1)
export const defaultMaxGen = ref(8)
export const lang = ref(window.LANG as 'en' | 'ja' | 'ko')
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

export function makeNode<R = string>(
  s: string,
  def?: R
): ((repl: Record<string, string>) => VNode) & {
  value: R
} {
  let v: R | undefined
  let ln = lang.value

  v = translation.value[s]
  if (!v) {
    v = (enTrans as any)[s]
    if (v) {
      ln = 'en'
    } else {
      v = def || (s as any)
    }
  }

  const fn = (repl?: Record<string, string>) => {
    let v0 = v

    // if (repl) {
    //   Object.entries(repl).map(([k, v]) => {
    //     let i: number | null = null
    //     if (typeof v0 === 'string') {
    //       const idx = v0.indexOf(k)
    //       if (idx !== -1) {
    //         i = idx
    //       }
    //     }
    //     return { k, v, i: i! }
    //   }).filter(({ i }) => i !== null).sort(({ i: i1 }, { i: i2 }) => i1 - i2).map(({ k, v, i }) = {

    //   })
    // }

    return <span lang={ln}>${v0}</span>
  }

  return Object.assign(fn, { value: v as any })
}

export function t<R = string>(s: string, def?: R): R {
  return makeNode(s, def).value
}

export async function initPokedex() {
  const pokedexData = await import('@pokedex').then(
    (r) => r.default as IPokedexEntry[]
  )
  const pk: IPokedex = {}

  const makeInfo = (p: IPokedexEntry) => {
    return [
      `${t('Gen')}: ${p.gen}`,
      ...(p.type_2
        ? [`${t('Type')} 1: ${t(p.type_1)}`, `${t('Type')} 2: ${t(p.type_2)}`]
        : [`${t('Type')}: ${t(p.type_1)}`]),
      `${t('Height')}: ${p.height_m} m`,
      `${t('Weight')}: ${p.weight_kg} kg`
    ].join('\n')
  }

  const gens = pokedexData.map((p) => {
    const base = p.name[lang.value]

    if (p.gen) {
      pk[p.name.en] = {
        ...p,
        info() {
          return makeInfo(p)
        }
      }
    }

    const forms = (p as any).forms as IPokedexEntry[]

    if (forms) {
      forms.map((p) => {
        pk[p.name.en] = {
          ...p,
          base,
          info() {
            return makeInfo(p)
          }
        }
      })
    }

    pokedex.value = pk
    return p.gen
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

export function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o))
}
