import { ref } from 'vue'

export interface IPokedexEntry {
  name: string
  gen: number
  type1: string
  type2: string
  height: number
  weight: number
  mosaic: string
  hints: string[]
  info: string
}

export const defaultMinGen = ref(1)
export const defaultMaxGen = ref(8)

export const pokedex = new Map<string, IPokedexEntry>()
