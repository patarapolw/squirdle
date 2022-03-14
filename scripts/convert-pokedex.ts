import fs from 'fs'

import yaml from 'js-yaml'
import S from 'jsonschema-definer'

import { IPokedexEntry, checkPokedex, pokeTypes } from '../vite.config'

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

  const newPokedex: IPokedexEntry[] = []

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
      const type = [r.type_1]
      if (r.type_2) {
        type.push(r.type_2)
      }

      newPokedex.push({
        name: {
          en: r.name,
          ja: r.name_ja,
          ko: r.name_ko
        },
        generation: Number(r.generation),
        type,
        height: {
          m: Number(r.height_m)
        },
        weight: {
          kg: Number(r.weight_kg)
        }
      })
    })

  fs.writeFileSync('pokedex.yaml', yaml.dump(checkPokedex(newPokedex)))
}

if (require.main === module) {
  main().catch(console.error)
}
