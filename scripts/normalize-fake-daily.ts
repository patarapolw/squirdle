import https from 'https'

import { doMakeDaily } from './make-daily'

https.get(
  'https://raw.githubusercontent.com/Fireblend/squirdle/main/fake-daily.csv',
  (res) => {
    const chunks = []

    res.on('data', (d) => {
      chunks.push(d.toString())
    })

    res.once('end', () => {
      const fakeDaily = chunks
        .join('')
        .trim()
        .split('\n')
        .slice(1)
        .map((r) => r.trim().split(','))

      doMakeDaily(
        'en',
        fakeDaily[0][0],
        fakeDaily.map((s) => s[1])
      )
    })
  }
)
