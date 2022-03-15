<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ClipboardJS from 'clipboard'

import { pokedex, defaultMinGen, defaultMaxGen, lang, t, dailyJSON, LinkBuilder, linkTemplate, shuffle } from '../assets'
import { guessLimit, marginOfError } from '../assets/defaults'

const props = defineProps<{
  daily: boolean
  lang?: string
}>()

const secretPokemon = ref<IPokedexEntry | null>(null)

const genMin = ref(defaultMinGen.value)
const genMax = ref(defaultMaxGen.value)
const guesses = ref<IPokedexEntry[]>([])

const timeZone = ref(t('TIMEZONE', 'GMT'))
const timeOffset = ref(t('TIMEOFFSET', 0))

if (timeZone.value === 'GMT') {
  timeOffset.value = 0
}

const currentDate = ref(new Date().toISOString().substring(0, 10))
const dayNumber = ref(0)

const isNotFound = ref(false)
const isWon = ref<boolean | null>(null)

const qGuess = ref('')
const actualGuess = ref<IPokedexEntry | null>(null)

const autocompleteEl = ref(null)
const autocompleteFocus = ref(-1)
const autocompleteList = ref<(IPokedexEntry & {
  highlight: {
    from: number
    to: number
  }
})[]>([])
const elligible = ref<IPokedexEntry[]>([])

const shareWithoutNames = ref('')
const shareWithNames = ref('')

interface StorageTyping {
  lastDate: string
  lastAnswer: string
  guesses: string[]
  genMax: number
  genMin: number
}

const storage: {
  [K in keyof StorageTyping]: {
    id(): string
    get(): StorageTyping[K] | null
    set(v: StorageTyping[K]): void
  }
} = {
  lastDate: {
    id() {
      return `[${lang.value}]lastDate`
    },
    get() {
      return localStorage.getItem(this.id())
    },
    set(v) {
      localStorage.setItem(this.id(), v)
    }
  },
  lastAnswer: {
    id() {
      return `[${lang.value}]${props.daily ? '[daily]' : ''}lastAnswer`
    },
    get() {
      return localStorage.getItem(this.id())
    },
    set(v) {
      localStorage.setItem(this.id(), v)
    }
  },
  guesses: {
    id() {
      return `[${lang.value}]${props.daily ? '[daily]' : ''}guesses`
    },
    get() {
      const r = localStorage.getItem(this.id())
      if (r) {
        return JSON.parse(r)
      }

      return null
    },
    set(v) {
      localStorage.setItem(this.id(), JSON.stringify(v))
    }
  },
  genMax: {
    id() {
      return `[${lang.value}]genMax`
    },
    get() {
      return Number(localStorage.getItem(this.id())) || null
    },
    set(v) {
      localStorage.setItem(this.id(), v.toString())
    }
  },
  genMin: {
    id() {
      return `[${lang.value}]genMin`
    },
    get() {
      return Number(localStorage.getItem(this.id())) || null
    },
    set(v) {
      localStorage.setItem(this.id(), v.toString())
    }
  },
}

Object.assign(window, {
  setSecret(i: number) {
    if (props.daily) return null

    const v = elligible.value[i]
    if (v) {
      secretPokemon.value = v
    }
    return v
  },
  getSecret() {
    return secretPokemon.value
  },
  getSecretList() {
    return elligible.value
  },
  findSecret(fn: (v: IPokedexEntry) => boolean) {
    const out: number[] = []
    elligible.value.map((v, i) => {
      if (fn(v)) out.push(i)
    })

    return out
  }
})

function updateGuess(opts: {
  entry?: IPokedexEntry
  isInit?: boolean
  isNew?: boolean
}) {
  if (opts.isInit) {
    if (props.daily) {
      const nowMin = (() => {
        const now = new Date()
        const milli = +now
        const sec = milli / 1000
        const min = sec / 60
        return min + timeOffset.value * 60
      })()

      currentDate.value = new Date(nowMin * 1000 * 60).toISOString().split('T')[0]
      dayNumber.value = Math.floor((+new Date(currentDate.value) - +new Date(dailyJSON.value.startingDate)) / (1000 * 60 * 60 * 24))

      elligible.value = shuffle(Object.values(pokedex.value))
      secretPokemon.value = pokedex.value[dailyJSON.value.names[dayNumber.value % dailyJSON.value.names.length]]

      let isNew = true
      if (currentDate.value === storage.lastDate.get()) {
        isNew = false
      }

      if (!isNew) {
        const arr = storage.guesses.get()
        if (arr) {
          guesses.value = arr.map((v: string) => {
            return pokedex.value[v]
          })
        }
      }
    } else {
      if (opts.isNew) {
        secretPokemon.value = elligible.value[Math.floor(Math.random() * elligible.value.length)]
        guesses.value = []
      } else {
        genMin.value = storage.genMin.get() || genMin.value
        genMax.value = storage.genMax.get() || genMax.value
        elligible.value = shuffle(Object.values(pokedex.value).filter((p) => p.gen >= genMin.value && p.gen <= genMax.value))

        const lastAnswer = storage.lastAnswer.get()
        if (lastAnswer) {
          secretPokemon.value = pokedex.value[lastAnswer]

          const arr = storage.guesses.get()
          if (arr) {
            guesses.value = arr.map((v: string) => {
              return pokedex.value[v]
            })
          }
        } else {
          secretPokemon.value = null
        }
      }
    }

    isWon.value = null
  }

  if (!secretPokemon.value) return

  if (autocompleteFocus.value >= 0) {
    const v = autocompleteList.value[autocompleteFocus.value]
    if (v) {
      qGuess.value = v.name[lang.value]
      actualGuess.value = v
    }
  }

  if (!opts.isInit) {
    isNotFound.value = true
  } else {
    isNotFound.value = false
  }

  let entry = opts.entry
  if (!entry && actualGuess.value) {
    entry = actualGuess.value
  }

  if (entry) {
    isNotFound.value = false
    guesses.value = [...guesses.value, entry]

    storage.lastAnswer.set(secretPokemon.value.name.en)
    storage.lastDate.set(currentDate.value)
    storage.guesses.set(guesses.value.map((g) => g.name.en))
  }

  if (isNotFound.value) {
    actualGuess.value = null
    qGuess.value = ''
  }

  if (guesses.value.length >= guessLimit) {
    isWon.value = false
  }

  const lastGuess = guesses.value[guesses.value.length - 1]
  if (lastGuess) {
    if (secretPokemon.value.name[lang.value] === lastGuess.name[lang.value]) {
      isWon.value = true
    }
  }

  if (isWon.value !== null) {
    const makeCopy = (withName: boolean) => {
      return [
        [
          t('Squirdle'),
          ...(props.daily ? [`${t('Daily')} ${dayNumber.value + 1} -`] : []),
          `${isWon.value ? guesses.value.length : 'X'}/${guessLimit}`
        ].join(' '),
        location.href,
        '',
        ...guesses.value.map((g) => {
          function e(k: keyof IPokedexEntry) {
            const { alt } = getImage(g, k)
            switch (alt) {
              case 'too high':
                return '🔼'
              case 'too low':
                return '🔽'
              case 'almost':
                return '🟨'
              case 'correct':
                return '🟩'
            }

            return '⬛'
          }

          return `${e('gen')}${e('type_1')}${e('type_2')}${e('height_m')}${e('weight_kg')}${withName ? ' ' + g.name[lang.value] : ''}`
        }),
        ...((withName && !isWon.value) ? [secretPokemon.value?.name[lang.value]] : [])
      ].join('\n')
    }
    shareWithNames.value = makeCopy(true)
    shareWithoutNames.value = makeCopy(false)
  }

  qGuess.value = ''
  actualGuess.value = null
  autocompleteList.value = []
}

function updateGen(n: number, opts: {
  isMax: boolean
}) {
  const dst = opts.isMax ? genMax : genMin

  if (!n) {
    dst.value = opts.isMax ? defaultMaxGen.value : defaultMinGen.value
    return
  }

  if (opts.isMax) {
    if (n < genMin.value) {
      n = genMin.value
    } else if (n > defaultMaxGen.value) {
      n = defaultMaxGen.value
    }
  } else {
    if (n > genMax.value) {
      n = genMax.value
    } else if (n < defaultMinGen.value) {
      n = defaultMinGen.value
    }
  }

  dst.value = n
  guesses.value = []
}

function ime(ev: Event) {
  const s = (ev.target as HTMLInputElement).value

  if (lang.value === 'ja' && window.wanakana) {
    qGuess.value = window.wanakana.toKatakana(s, { IMEMode: true })
  } else {
    qGuess.value = s
  }
}

function normalizeInput(s: string): string {
  if (lang.value === 'ja' && window.wanakana) {
    return window.wanakana.toKatakana(s, { IMEMode: true }).replace(/[a-zA-Z]+$/, '')
  }

  return s.toLocaleLowerCase()
}

function autocompleteInput(ev: KeyboardEvent) {
  let isDefault = false
  const { key } = ev
  switch (key) {
    case 'ArrowUp':
      ev.preventDefault()
      autocompleteFocus.value--
      break
    case 'ArrowDown':
      ev.preventDefault()
      autocompleteFocus.value++
      break
    case 'Enter':
      ev.preventDefault()
      break
    default:
      autocompleteFocus.value = -1
      isDefault = true
  }

  setTimeout(() => {
    if (!qGuess.value) {
      autocompleteList.value = []
      return
    }

    const autocompleteGuess = normalizeInput(qGuess.value)
    autocompleteList.value = elligible.value.map((p) => {
      let isValid = false

      let from = normalizeInput(p.name[lang.value]).indexOf(autocompleteGuess)
      let to = from + autocompleteGuess.length

      if (from === 0) {
        isValid = true
      } else if (p.base && normalizeInput(p.base).startsWith(autocompleteGuess)) {
        isValid = true
        if (from < 0) {
          from = 0
          to = 0
        }
      }

      if (isValid) {
        return {
          ...p,
          highlight: {
            from,
            to
          }
        }
      }

      return null as unknown as typeof autocompleteList.value[0]
    }).filter((s) => s)

    if (!isDefault && autocompleteList.value.length) {
      if (autocompleteFocus.value < 0) {
        autocompleteFocus.value = 0
      }

      if (autocompleteFocus.value >= autocompleteList.value.length) {
        autocompleteFocus.value = autocompleteList.value.length - 1
      }
    }

    if (key === 'Enter') {
      nextTick(() => {
        updateGuess({ isInit: false })
      })
    }
  }, 10)
}

function getImage(d: IPokedexEntry, k: keyof IPokedexEntry): {
  src: string
  alt: string
} {
  if (!secretPokemon.value) {
    return {
      src: '/wrong.png',
      alt: 'wrong'
    }
  }

  const c = d[k]
  const c0 = secretPokemon.value[k]

  if (c) {
    if (typeof c === 'number' && typeof c0 === 'number') {
      if (c < c0 * (1 - marginOfError)) {
        return {
          src: '/up.png',
          alt: 'too low'
        }
      }

      if (c > c0 * (1 + marginOfError)) {
        return {
          src: '/down.png',
          alt: 'too high'
        }
      }

      return {
        src: '/correct.png',
        alt: 'correct'
      }
    }

    if (c === c0) {
      return {
        src: '/correct.png',
        alt: 'correct'
      }
    }
  } else if (k === 'type_2' && !secretPokemon.value.type_2) {
    return {
      src: '/correct.png',
      alt: 'correct'
    }
  }

  switch (k) {
    case 'type_1':
      if (d.type_1 === secretPokemon.value.type_2) {
        return {
          src: '/wrongpos.png',
          alt: 'almost'
        }
      }
      break
    case 'type_2':
      if (d.type_2 === secretPokemon.value.type_1) {
        return {
          src: '/wrongpos.png',
          alt: 'almost'
        }
      }
  }

  return {
    src: '/wrong.png',
    alt: 'wrong'
  }
}

let clipboardJS: ClipboardJS

onMounted(() => {
  console.info('The code is open-sourced at https://github.com/patarapolw/squirdle')
  console.info('Contribution is welcomed, especially for translating  UI- https://github.com/patarapolw/squirdle/pull/3#issuecomment-1056946896')

  document.head.querySelector('title')!.innerText = t('Squirdle')
  updateGuess({ isInit: true })

  nextTick(() => {
    clipboardJS = new ClipboardJS('.copy-button')
    clipboardJS.on('success', () => {
      alert(t('CopySuccess'))
    }).on('error', (ex) => {
      console.warn("Copy to clipboard failed. Let me (https://github.com/patarapolw/squirdle) know!", ex);
    })
  })
})

onUnmounted(() => {
  if (clipboardJS) {
    clipboardJS.destroy()
  }
})

onClickOutside(autocompleteEl, () => {
  autocompleteList.value = []
})

watch(props, () => {
  updateGuess({ isInit: true })
})

watch(genMax, () => {
  storage.genMax.set(genMax.value)
  updateGuess({ isInit: true })
})

watch(genMin, () => {
  storage.genMin.set(genMin.value)
  updateGuess({ isInit: true })
})

watch(lang, () => {
  document.head.querySelector('title')!.innerText = t('Squirdle')

  timeZone.value = t('TIMEZONE', 'GMT')
  timeOffset.value = t('TIMEOFFSET', 0)

  if (timeZone.value === 'GMT') {
    timeOffset.value = 0
  }
  updateGuess({ isInit: true })
})

const vOriginalCredit = t('OriginalCredit').split('{{_Fireblend}}')
const vIntroDaily = t('IntroDaily').split('{{_AttemptsLeft}}')
const vIntroFree = t('IntroFree').split('{{_AttemptsLeft}}')
const vIntroEndedDaily = t('IntroEndedDaily')
const vIntroEndedFree = t('IntroEndedFree').replace('{{NewGame}}', t('NewGame'))
const vUpdatesAt = t('UpdatesAt').split('{{TIMEZONE}}')

const ln = new LinkBuilder(linkTemplate.value?.template || t('PokemonRefLink'))
function refLink(g: IPokedexEntry) {
  let name = g.name[ln.lang]
  if (linkTemplate.value?.alt?.[name]) {
    name = linkTemplate.value.alt[name]
  }
  return ln.make(name)
}

const vAnswerIs = t('AnswerIs').split('{{_POKEMON_NAME_LOCAL}}')

const kGenMin = '{{_GEN_MIN}}'
const kGenMax = '{{_GEN_MAX}}'
const vGenRange = (() => {
  let [k1, k2] = [kGenMin, kGenMax]
  const v = t('GenRange')
  let [i1, i2] = [v.indexOf(k1), v.indexOf(k2)]

  if (i1 < 0 || i2 < 0) {
    return [v, k1, 'to', k2, '']
  }

  if (i1 > i2) {
    [k2, k1] = [k1, k2];[i2, i1] = [i1, i2]
  }

  return [v.substring(0, i1), k1, v.substring(i1 + k1.length, i2), k2, v.substring(i2 + k2.length)]
})()
</script>

<template>
  <h2>
    {{ t('Squirdle') }}
    <span v-if="daily">{{ t('Daily') }} {{ dayNumber + 1 }}</span>
  </h2>

  <h3>
    <span>{{ vOriginalCredit[0] }}</span>
    <a
      v-if="vOriginalCredit[1] !== undefined"
      href="https://squirdle.fireblend.com/"
      target="_blank"
      rel="noopener noreferrer"
    >Fireblend</a>
    <span v-if="vOriginalCredit[1] !== undefined">{{ vOriginalCredit[1] }}</span>
  </h3>
  <section>
    <div>
      <span v-if="isWon === null">
        <span v-if="daily">
          <span>{{ vIntroDaily[0] }}</span>
          <span class="attempts">{{ guessLimit - guesses.length }}</span>
          <span>{{ vIntroDaily[1] }}</span>
        </span>
        <span v-else>
          <span>{{ vIntroFree[0] }}</span>
          <span class="attempts">{{ guessLimit - guesses.length }}</span>
          <span>{{ vIntroFree[1] }}</span>
        </span>
      </span>
      <span v-else>
        <span v-if="daily">
          <span>{{ vIntroEndedDaily }}</span>
        </span>
        <span v-else>
          <span>{{ vIntroEndedFree }}</span>
        </span>
      </span>
    </div>
    <div v-if="daily">
      <span>{{ vUpdatesAt[0] }}</span>
      <span v-if="vUpdatesAt[1] !== undefined">{{ timeZone }}</span>
      <span v-if="vUpdatesAt[1] !== undefined">{{ vUpdatesAt[1] }}</span>
    </div>
  </section>
  <section class="guesses" v-if="guesses.length">
    <table>
      <tr>
        <th>
          <p>{{ t('Gen') }}</p>
        </th>
        <th>
          <p>{{ t('Type') }}1</p>
        </th>
        <th>
          <p>{{ t('Type') }}2</p>
        </th>
        <th>
          <p>{{ t('Height') }}</p>
        </th>
        <th>
          <p>{{ t('Weight') }}</p>
        </th>
      </tr>

      <tr v-for="g in guesses" :key="g.name[lang]">
        <td>
          <img
            :src="getImage(g, 'gen').src"
            :alt="`Gen: ${g.gen} (${getImage(g, 'gen').alt})`"
            class="emoji"
          />
        </td>
        <td>
          <img
            :src="getImage(g, 'type_1').src"
            :alt="`Type 1: ${g.type_1} (${getImage(g, 'type_1').alt})`"
            class="emoji"
          />
        </td>
        <td>
          <img
            :src="getImage(g, 'type_2').src"
            :alt="`Type 2: ${g.type_2 || 'null'} (${getImage(g, 'type_2').alt})`"
            class="emoji"
          />
        </td>
        <td>
          <img
            :src="getImage(g, 'height_m').src"
            :alt="`Height: ${g.height_m.toFixed(1)} m (${getImage(g, 'height_m').alt})`"
            class="emoji"
          />
        </td>
        <td>
          <img
            :src="getImage(g, 'weight_kg').src"
            :alt="`Weight: ${g.weight_kg.toFixed(1)} kg (${getImage(g, 'weight_kg').alt})`"
            class="emoji"
          />
        </td>
        <td>
          <div class="tooltip">
            <p class="guess">{{ g.name[lang] }}</p>
            <div class="tooltiptext">
              <a :href="refLink(g)" target="_blank" rel="noopener noreferrer">{{ g.name[lang] }}</a>
              <pre>{{ g.info() }}</pre>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </section>

  <section class="error" v-if="isNotFound">{{ t('PokemonNotFound') }}</section>

  <section>
    <form
      v-if="isWon === null"
      class="guessform"
      autocomplete="off"
      @submit.prevent="updateGuess({ isInit: false })"
    >
      <div ref="autocompleteEl" class="autocomplete">
        <input
          class="guess_input"
          type="text"
          name="guess"
          :placeholder="t('PokemonInput')"
          :value="qGuess"
          @input="ime"
          @keydown="(ev) => autocompleteInput(ev)"
        />
        <div class="autocomplete autocomplete-items">
          <div
            v-for="(r, i) in autocompleteList"
            :key="i"
            :class="{ 'autocomplete-active': i === autocompleteFocus, 'autocomplete-item': true }"
            @click="updateGuess({ entry: r })"
          >
            <span>{{ r.name[lang].substring(0, r.highlight.from) }}</span>
            <strong>{{ r.name[lang].substring(r.highlight.from, r.highlight.to) }}</strong>
            <span>{{ r.name[lang].substring(r.highlight.to) }}</span>
          </div>
        </div>
      </div>
      <button class="guess_input" type="submit">{{ t('Submit') }}</button>
    </form>
  </section>

  <section class="results" v-if="!!secretPokemon && isWon !== null">
    <div>
      <div style="display: inline-block; margin-right: 0.5em">
        <span class="won" v-if="isWon">{{ t('IsWin') }}</span>
        <span class="lost" v-else>{{ t('IsLose') }}</span>
      </div>
      <span>
        {{ vAnswerIs[0] }}
        <span class="tooltip">
          <p class="guess-answer">{{ secretPokemon.name[lang] }}</p>
          <div class="tooltiptext">
            <a
              :href="refLink(secretPokemon)"
              target="_blank"
              rel="noopener noreferrer"
            >{{ secretPokemon.name[lang] }}</a>
            <pre>{{ secretPokemon.info() }}</pre>
          </div>
        </span>
        {{ vAnswerIs[1] }}
      </span>
    </div>
    <div>
      <button
        class="togglec copy-button"
        :data-clipboard-text="shareWithoutNames"
        type="button"
      >📄 {{ t('Share') }}</button>
      <button
        class="togglec copy-button"
        :data-clipboard-text="shareWithNames"
        type="button"
      >👀 {{ t('FullShare') }}</button>
    </div>
    <div v-if="daily">{{ t('ComeBackTomorrow') }}</div>
  </section>

  <section v-if="!daily && guesses.length">
    <a class="togglec" @click="updateGuess({ isInit: true, isNew: true })">▶️ {{ t('NewGame') }}</a>
  </section>

  <section v-if="!daily">
    <span v-for="(v, i) in vGenRange" :key="i">
      <input
        v-if="v === kGenMin"
        class="mg_input"
        type="number"
        name="mingen"
        :min="defaultMinGen"
        :max="defaultMaxGen"
        :value="genMin"
        @input="(ev) => updateGen(Number((ev.target as any).value), { isMax: false })"
      />
      <input
        v-else-if="v === kGenMax"
        class="mg_input"
        type="number"
        name="maxgen"
        :min="defaultMinGen"
        :max="defaultMaxGen"
        :value="genMax"
        @input="(ev) => updateGen(Number((ev.target as any).value), { isMax: true })"
      />
      <label v-else>{{ v }}</label>
    </span>
  </section>

  <section class="alternate-games">
    <router-link v-if="!daily" to="/daily">{{ t('DailyPlay') }}</router-link>
    <router-link v-else to="/free">{{ t('FreePlay') }}</router-link>
  </section>
</template>

<style scoped>
section + section {
  margin-top: 1em;
}

section + section {
  margin-top: 1em;
}

[type="submit"] {
  cursor: pointer;
}

.guess {
  width: 100px;
}

.mg_input {
  margin-left: 0.5em;
  margin-right: 0.5em;
}
</style>
