import fs from 'fs'

import yaml from 'js-yaml'
import S from 'jsonschema-definer'

import { checkPokedex, pokeTypes } from '../src/types'

const sPokedexCsv = S.shape({
  name: S.string(),
  generation: S.string().pattern(/^\d$/),
  type_1: S.string().enum(...pokeTypes),
  type_2: S.string().enum('', ...pokeTypes),
  height_m: S.string().pattern(/^\d+\.\d$/),
  weight_kg: S.string().pattern(/^\d+\.\d$/),
  name_ja: S.string(),
  name_ko: S.string()
})

async function main() {
  const lines = fs
    .readFileSync('pokedex.csv', 'utf-8')
    .trimEnd()
    .split('\n')
    .map((r) => r.trim().split(','))
  const ks = lines.splice(0, 1)[0]

  const newPokedex: Parameters<typeof checkPokedex>[0] = []

  S.list(sPokedexCsv)
    .ensure(
      lines.map((rs) => {
        const map: Record<string, string> = {}
        rs.map((r, i) => {
          map[ks[i]] = r
        })
        return map
      }) as any
    )
    .map((r) => {
      newPokedex.push({
        name: {
          en: r.name,
          ja: r.name_ja,
          ko: r.name_ko
        },
        gen: Number(r.generation),
        type_1: r.type_1,
        type_2: r.type_2 || null,
        height_m: Number(r.height_m),
        weight_kg: Number(r.weight_kg)
      })
    })

  checkPokedex(newPokedex)
  fs.writeFileSync('pokedex.yaml', yaml.dump(newPokedex))
}

export function readPokedex() {
  return yaml.load(fs.readFileSync('pokedex.yaml', 'utf-8')) as Parameters<
    typeof checkPokedex
  >[0]
}

if (require.main === module) {
  main().catch(console.error)
}
