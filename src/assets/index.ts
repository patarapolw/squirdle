import { reactive, ref } from 'vue'

import pokedexData from '../../pokedex.csv'

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
export const lang = ref('en')

export const pokedex = reactive(
  {} as {
    [name: string]: IPokedexEntry
  }
)

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
    `Gen: ${ent.gen}`,
    `Type 1: ${ent.type1}`,
    `Type 2: ${ent.type2}`,
    `Height: ${ent.height} m`,
    `Weight: ${ent.weight} kg`
  ].join('\n')

  pokedex[p.name] = ent
})
