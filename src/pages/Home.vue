<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ClipboardJS from 'clipboard'
import { toKana, toKatakana } from 'wanakana'

import dailyJSON from '../assets/daily.json'
import { IPokedexEntry, pokedex, defaultMinGen, defaultMaxGen, lang, t } from '../assets'

const props = defineProps<{
  daily?: boolean
}>()

const secretPokemon = ref<IPokedexEntry>(null)

const genMin = ref(defaultMinGen.value)
const genMax = ref(defaultMaxGen.value)
const guesses = ref<IPokedexEntry[]>([])
const guessLimit = ref(6)
const timeZone = ref(lang.value === 'ja' ? 'JST' : 'GMT')

const currentDate = ref(new Date().toISOString().substring(0, 10))
const dayNumber = ref(0)

const isNotFound = ref(false)
const isWon = ref<boolean | null>(null)

const qGuess = ref('')
const actualGuess = ref<IPokedexEntry | null>(null)

const autocompleteEl = ref(null)
const autocompleteFocus = ref(-1)
const autocompleteList = ref<IPokedexEntry[]>([])
const elligible = ref<IPokedexEntry[]>([])

const shareWithoutNames = ref('')
const shareWithNames = ref('')

interface StorageTyping {
  lastDate: string
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

function updateGuess(opts: {
  entry?: IPokedexEntry
  isInit?: boolean
  isNew?: boolean
}) {
  if (opts.isInit) {
    if (props.daily) {
      let extraOffset = 0
      switch (timeZone.value) {
        case 'JST':
          extraOffset = 9
      }

      const now = new Date()
      const normMin = (() => {
        const milli = +now - +new Date(dailyJSON.startingDate)
        const sec = milli / 1000
        const min = sec / 60
        return min - now.getTimezoneOffset() + extraOffset * 60
      })()

      currentDate.value = new Date(normMin * 60 * 1000).toISOString().substring(0, 10)
      dayNumber.value = Math.floor(normMin / 60 / 24)

      elligible.value = Object.values(pokedex)
      secretPokemon.value = pokedex[dailyJSON.names[dayNumber.value % dailyJSON.names.length]]

      let isNew = true
      if (currentDate.value === storage.lastDate.get()) {
        isNew = false
      }

      if (!isNew) {
        const arr = storage.guesses.get()
        if (arr) {
          guesses.value = arr.map((v: string) => {
            return pokedex[v]
          })
        }
      }
    } else {
      secretPokemon.value = elligible.value[Math.floor(Math.random() * elligible.value.length)]

      if (opts.isNew) {
        guesses.value = []
      } else {
        genMin.value = storage.genMin.get() || genMin.value
        genMax.value = storage.genMax.get() || genMax.value
        elligible.value = Object.values(pokedex).filter((p) => p.gen >= genMin.value && p.gen <= genMax.value)

        const arr = storage.guesses.get()
        if (arr) {
          guesses.value = arr.map((v: string) => {
            return pokedex[v]
          })
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

    storage.lastDate.set(currentDate.value)
    storage.guesses.set(guesses.value.map((g) => g.name.en))
  }

  if (isNotFound.value) {
    actualGuess.value = null
    qGuess.value = ''
  }

  if (guesses.value.length >= guessLimit.value) {
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
        [t('Squirdle'), ...(props.daily ? [`${t('Daily')} ${dayNumber.value + 1} -`] : []), `${guesses.value.length}/${guessLimit.value}`].join(' '),
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

            return '🟥'
          }

          return `${e('gen')}${e('type1')}${e('type2')}${e('height')}${e('weight')}${withName ? ' ' + g.name[lang.value] : ''}`
        })
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
}

function ime(ev: Event) {
  const s = (ev.target as HTMLInputElement).value

  if (lang.value === 'ja') {
    qGuess.value = toKana(s, { IMEMode: true })
  } else {
    qGuess.value = s
  }
}

function normalizeInput(s: string): string {
  if (lang.value === 'ja') {
    return toKatakana(s).replace(/[a-zA-Z]+$/, '')
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

    autocompleteList.value = elligible.value.filter((p) => normalizeInput(p.name[lang.value]).startsWith(normalizeInput(qGuess.value)))

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

  if (!c0) {
    return {
      src: '/correct.png',
      alt: 'correct'
    }
  }

  if (c) {
    if (typeof c === 'number' && typeof c0 === 'number') {
      if (c < c0) {
        return {
          src: '/up.png',
          alt: 'too low'
        }
      }

      if (c > c0) {
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
  }

  return {
    src: '/wrong.png',
    alt: (d.type1 === secretPokemon.value.type2 || d.type2 === secretPokemon.value.type1) ? 'almost' : 'wrong'
  }
}

let clipboardJS: ClipboardJS

onMounted(() => {
  updateGuess({ isInit: true })

  nextTick(() => {
    clipboardJS = new ClipboardJS('.copy-button')
    clipboardJS.on('success', () => {
      alert('Copied to clipboard!')
    }).on('error', (ex) => {
      console.warn("Copy to clipboard failed. Let me (https://github.com/patarapolw) know!", ex);
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
</script>

<template>
  <h2>
    {{ t('Squirdle') }}
    <span v-if="daily">{{ t('Daily') }} {{ dayNumber + 1 }}</span>
  </h2>

  <h3>
    A Pokémon Wordle-like, originally by
    <a
      href="https://squirdle.fireblend.com/"
      target="_blank"
      rel="noopener noreferrer"
    >Fireblend</a>
  </h3>
  <section>
    <div>
      <span v-if="isWon === null">
        <span>I'm thinking of a Pokémon. Guess which! You have</span>
        <span class="attempts">{{ guessLimit - guesses.length }}</span>
        <span v-if="daily">guesses left today.</span>
        <span v-else>guesses.</span>
      </span>
      <span v-else>
        The game has finished.
        <span v-if="daily">Try again tomorrow.</span>
        <span v-else>Click {{ t('New Game') }} to restart.</span>
      </span>

      <!-- <span class="tooltip">
        Emoji Key
        <span class="tooltiptext">
          <p>🟩: Correct guess</p>
          <p>🟥: Incorrect Guess</p>
          <p>🟨: Type in wrong position</p>
          <p>🔼: Guessed too low</p>
          <p>🔽: Guessed too high</p>
        </span>
      </span>-->
    </div>
    <div v-if="daily">(Updates @ 00:00 {{ timeZone }})</div>
  </section>
  <section class="guesses" v-if="guesses.length">
    <div class="row row-header">
      <div class="column">
        <p class="hint">{{ t('Gen') }}</p>
      </div>
      <div class="column">
        <p class="hint">{{ t('Type') }}1</p>
      </div>
      <div class="column">
        <p class="hint">{{ t('Type') }}2</p>
      </div>
      <div class="column">
        <p class="hint">{{ t('Height') }}</p>
      </div>
      <div class="column">
        <p class="hint">{{ t('Weight') }}</p>
      </div>
    </div>
    <div class="row" v-for="g in guesses" :key="g.name[lang]">
      <div v-for="h in g.hints" :key="h">
        <img class="emoji" :src="h" />
      </div>
      <div class="column">
        <img :src="getImage(g, 'gen').src" :alt="getImage(g, 'gen').alt" class="emoji" />
      </div>
      <div class="column">
        <img :src="getImage(g, 'type1').src" :alt="getImage(g, 'type1').alt" class="emoji" />
      </div>
      <div class="column">
        <img :src="getImage(g, 'type2').src" :alt="getImage(g, 'type2').alt" class="emoji" />
      </div>
      <div class="column">
        <img :src="getImage(g, 'height').src" :alt="getImage(g, 'height').alt" class="emoji" />
      </div>
      <div class="column">
        <img :src="getImage(g, 'weight').src" :alt="getImage(g, 'weight').alt" class="emoji" />
      </div>
      <div class="column">
        <div class="tooltip">
          <p class="guess">{{ g.name[lang] }}</p>
          <pre class="tooltiptext">{{ g.info() }}</pre>
        </div>
      </div>
    </div>
  </section>

  <section class="error" v-if="isNotFound">Pokémon not found!</section>

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
          :placeholder="t('Pokemon Name')"
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
            <strong>{{ r.name[lang].substring(0, qGuess.length) }}</strong>
            <span>{{ r.name[lang].substring(qGuess.length) }}</span>
          </div>
        </div>
      </div>
      <button class="guess_input" type="submit">{{ t('Submit') }}</button>
    </form>
  </section>

  <section class="results" v-if="!!secretPokemon && isWon !== null">
    <div>
      <span class="won" v-if="isWon">You won!</span>
      <span class="lost" v-else>You lost!</span>
      <span>
        The secret Pokémon was
        <a
          class="secretpoke"
          :href="`https://pokemon.fandom.com/wiki/${encodeURIComponent(secretPokemon.name.en)}`"
          target="_blank"
          rel="noopener noreferrer"
        >{{ secretPokemon.name[lang] }}</a>!
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
      >👀 {{ t('Full Share', 'Share w/ names') }}</button>
    </div>
    <div v-if="daily">
      <div>Generation hint arrows are obscured in daily</div>
      <div>mosaics to avoid spoiling other players!</div>
      <div>Come back tomorrow for another daily!</div>
    </div>
  </section>

  <section v-if="!daily && guesses.length">
    <a class="togglec" @click="updateGuess({ isInit: true, isNew: true })">▶️ {{ t('New Game') }}</a>
  </section>

  <section v-if="!daily">
    <label for="quantity">Guess Pokémon from gen</label>
    <input
      class="mg_input"
      type="number"
      name="mingen"
      :min="defaultMinGen"
      :max="defaultMaxGen"
      :value="genMin"
      @input="(ev) => updateGen(Number((ev.target as any).value), { isMax: false })"
    />
    <label for="quantity">to</label>
    <input
      class="mg_input"
      type="number"
      name="maxgen"
      :min="defaultMinGen"
      :max="defaultMaxGen"
      :value="genMax"
      @input="(ev) => updateGen(Number((ev.target as any).value), { isMax: true })"
    />
  </section>

  <section class="alternate-games">
    <router-link v-if="!daily" to="/daily">{{ t('Daily Play', 'Try Squirdle Daily!') }}</router-link>
    <router-link v-else to="/free">{{ t('Free Play') }}</router-link>
  </section>
</template>

<style scoped>
section + section {
  margin-top: 1em;
}

[type="submit"] {
  cursor: pointer;
}

.tooltip {
  display: inline-block;
  margin-left: 0.5em;
}

.attempts {
  display: inline-block;
  margin-left: 0.5em;
  margin-right: 0.5em;
}

.guess {
  width: 100px;
}

.mg_input {
  margin-left: 0.5em;
  margin-right: 0.5em;
}
</style>