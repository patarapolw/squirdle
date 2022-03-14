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

export const sPokedexEntry = S.shape({
  name: S.shape({
    en: S.string(),
    ja: S.string(),
    ko: S.string()
  }),
  gen: S.integer().minimum(1).maximum(9),
  type_1: S.string().enum(...pokeTypes),
  type_2: S.anyOf(S.string().enum(...pokeTypes), S.null()),
  height_m: sPositiveNumber,
  weight_kg: sPositiveNumber
})

export function checkPokedex(items: IPokedexEntry[]) {
  items = S.list(sPokedexEntry).ensure(items) as any[]
  const langs = new Set(items.flatMap((it) => Object.keys(it.name)))

  const nameMap = new Map<string, Set<string>>()

  for (const it of items) {
    for (const lang of langs) {
      const v: string = (it.name as any)[lang]
      if (!v) {
        throw new Error(`LANG: (${lang}) is missing for: (${it.name.en})`)
      }

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
