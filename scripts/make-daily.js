// @ts-check

const fs = require('fs')
const path = require('path')

/**
 *
 * @param {string} lang
 * @param {string} startingDate
 * @param {string[]} [names]
 */
function doMakeDaily(lang, startingDate, names) {
  if (!names) {
    const lines = fs
      .readFileSync('pokedex.csv', 'utf-8')
      .split('\n')
      .map((r) => r.trim().split(','))
    const header = lines.splice(0, 1)[0]

    names = shuffle(lines.map((r) => r[0]))
  }

  const dstFolder = path.resolve('generated', lang)

  if (!fs.existsSync(dstFolder)) {
    fs.mkdirSync(dstFolder, { recursive: true })
  }

  fs.writeFileSync(
    path.join(dstFolder, 'daily.json'),
    JSON.stringify(
      {
        startingDate,
        names
      },
      null,
      2
    )
  )
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  var j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

if (require.main === module) {
  const { SQ_LANG, SQ_STARTDATE } = process.env

  if (!SQ_LANG || !SQ_STARTDATE) {
    console.log(
      `Try setting env var: SQ_LANG=ja SQ_STARTDATE=${new Date()
        .toISOString()
        .substring(0, 10)}`
    )
    process.exit(1)
  }

  doMakeDaily(SQ_LANG, SQ_STARTDATE)
}

module.exports = doMakeDaily
