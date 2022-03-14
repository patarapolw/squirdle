interface Window {
  LANG: string
  wanakana?: typeof import('wanakana')
  clipboardData?: {
    setData?: (title: string, s: string) => void
  }
}

declare module '*.csv' {
  const out: Array<{ [key: string]: any }>
  export default out
}

declare type IPokedexEntry =
  typeof import('./types')['sPokedexEntry']['type'] & {
    info(): string
  }

declare module '@pokedex' {
  const pokedex: IPokedexEntry[]
  export default pokedex
}
