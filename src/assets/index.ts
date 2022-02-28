import { reactive, ref } from 'vue'

import pokedexData from '../../pokedex.csv'
import translation from '../../translation.json'

export interface IPokedexEntry {
  gen: number
  type1: string
  type2: string
  height: number
  weight: number
  mosaic: string
  hints: string[]
  info: string
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

export function t(s: string, def?: string) {
  return (translation as any)[lang.value]?.[s] || def || s
}

pokedexData.map((p) => {
  const ent = {
    name: {
      en: p.name,
      ja: p.name_ja,
      ko: p.name_ko
    },
    gen: Number(p.generation),
    type1: p.type_1,
    type2: p.type_2,
    height: Number(p.height_m),
    weight: Number(p.weight_kg),
    hints: [],
    info: '',
    mosaic: ''
  }
  ent.info = [
    `${t('Gen')}: ${ent.gen}`,
    `${t('Type')} 1: ${ent.type1}`,
    `${t('Type')} 2: ${ent.type2}`,
    `${t('Height')}: ${ent.height} m`,
    `${t('Weight')}: ${ent.weight} kg`
  ].join('\n')

  pokedex[p.name] = ent
})
