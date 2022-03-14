import S from 'jsonschema-definer'

const jaPokeTypes = {
  Normal: 'ノーマル',
  Fire: 'ほのお',
  Water: 'みず',
  Grass: 'くさ',
  Electric: 'でんき',
  Ice: 'こおり',
  Fighting: 'かくとう',
  Poison: 'どく',
  Ground: 'じめん',
  Flying: 'ひこう',
  Psychic: 'エスパー',
  Bug: 'むし',
  Rock: 'いわ',
  Ghost: 'ゴースト',
  Dark: 'あく',
  Dragon: 'ドラゴン',
  Steel: 'はがね',
  Fairy: 'フェアリー'
}

export const pokeTypes = Object.keys(jaPokeTypes)

const sPositiveNumber = S.number().custom((n) => n > 0)

const sPokedexEntry = S.shape({
  name: S.shape({
    en: S.string(),
    ja: S.string(),
    ko: S.string()
  }),
  generation: S.integer().minimum(1).maximum(9),
  type: S.list(S.string().enum(...pokeTypes)),
  height: S.shape({
    m: sPositiveNumber
  }),
  weight: S.shape({
    kg: sPositiveNumber
  })
})

declare type IPokedexEntry = typeof sPokedexEntry.type

export function checkPokedex(items: IPokedexEntry[]) {
  const nameMap = new Map<string, Set<string>>()

  for (const it of items) {
    for (const [lang, v] of Object.entries(sPokedexEntry.ensure(it).name)) {
      const vs = nameMap.get(lang) || new Set()

      if (vs.has(v)) {
        throw new Error(`LANG: (${lang}) has duplicate: (${v})`)
      }
      vs.add(v)
      nameMap.set(lang, vs)
    }
  }

  return items
}
