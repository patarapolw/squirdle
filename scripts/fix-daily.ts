import fs from 'fs'
import path from 'path'

export function doFixDaily(lang: string) {
  const dstFolder = path.resolve('generated', lang)

  const json = JSON.parse(
    fs.readFileSync(path.join(dstFolder, 'daily.json'), 'utf-8')
  )

  const d = new Date(json.startingDate)
  d.setDate(d.getDate() + json.names.length)

  fs.writeFileSync(
    path.join(dstFolder, 'daily.json'),
    JSON.stringify(
      {
        ...d,
        startingDate: json.startingDate,
        endDate: d.toISOString().substring(0, 10),
        names: json.names
      },
      null,
      2
    )
  )
}

if (require.main === module) {
  for (const lang of ['en', 'ja', 'ko']) {
    doFixDaily(lang)
  }
}
