const fs = require('fs')

const lines = fs
  .readFileSync('pokedex.csv', 'utf-8')
  .split('\n')
  .map((r) => r.trim().split(','))
const header = lines.splice(0, 1)[0]

fs.writeFileSync(
  'daily.json',
  JSON.stringify(
    {
      startingDate: '2022-03-01',
      names: shuffle(lines.map((r) => r[0]))
    },
    null,
    2
  )
)

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
