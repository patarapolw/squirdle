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
const sPokeTypes = S.string().enum(...pokeTypes)

const sPositiveNumber = S.number().custom((n) => n > 0)

const oPokedexBase = {
  name: S.shape({
    en: S.string(),
    ja: S.string(),
    ko: S.string()
  })
}

const oPokedexEntry = {
  ...oPokedexBase,
  gen: S.integer().minimum(1).maximum(9),
  type_1: sPokeTypes,
  type_2: sPokeTypes.optional(),
  height_m: sPositiveNumber,
  weight_kg: sPositiveNumber
}

export const sPokedexEntry = S.shape(oPokedexEntry)

export const sPokedex = S.list(
  S.anyOf(
    S.shape({
      ...oPokedexBase,
      forms: S.list(sPokedexEntry).optional()
    }),
    S.shape({
      ...oPokedexEntry,
      forms: S.list(sPokedexEntry).optional()
    })
  )
)

export function checkPokedex(items: IPokedexEntry[]) {
  items = sPokedex.ensure(items) as any[]
  const langs = new Set(items.flatMap((it) => Object.keys(it.name)))

  const langNameMap: {
    [lang: string]: Set<string>
  } = {}

  for (const it of items) {
    const forms: IPokedexEntry[] = []
    if (it.gen) {
      forms.push(it)
    }
    forms.push(...((it as any).forms || []))

    forms.map((it) => {
      for (const lang of langs) {
        const v: string = (it.name as any)[lang]
        if (!v) {
          console.warn(`LANG: (${lang}) is missing for: (${it.name.en})`)
        } else {
          const vs = langNameMap[lang] || new Set()

          if (vs.has(v)) {
            throw new Error(`LANG: (${lang}) has duplicate: (${v})`)
          }
          vs.add(v)
          langNameMap[lang] = vs
        }
      }
    })
  }

  return langNameMap
}
