import { reactive, ref } from 'vue'

import translation from '../../translation.json'

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
export const lang = ref('ja')

export const pokedex = reactive(
  {} as {
    [name: string]: IPokedexEntry
  }
)

export function t<R = string>(s: string, def?: R): R {
  return (translation as any)[lang.value]?.[s] || def || s
}

export async function initPokedex() {
  const pokedexData = await import('../../pokedex.csv').then((r) => r.default)
  const gens = pokedexData.map((p) => {
    const gen = Number(p.generation)

    pokedex[p.name] = {
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

    return gen
  })

  defaultMaxGen.value = Math.max(...gens)
}
