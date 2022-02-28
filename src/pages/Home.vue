<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ClipboardJS from 'clipboard'
import fakeDailyCSV from '../../fake-daily.csv'

import { IPokedexEntry, pokedex, defaultMinGen, defaultMaxGen, lang } from '../assets'

const props = defineProps<{
  daily?: boolean
}>()

const secretPokemon = ref<IPokedexEntry>(null)

const genMin = ref(defaultMinGen.value)
const genMax = ref(defaultMaxGen.value)
const guesses = ref<IPokedexEntry[]>([])
const guessLimit = ref(6)

const dayNumber = ref(Math.floor((() => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const milli = +date - +new Date(fakeDailyCSV[0].date)
  const sec = milli / 1000
  const min = sec / 60
  const normMin = min - offset
  const hour = normMin / 60
  const day = hour / 24

  return day
})()))
const isNotFound = ref(false)
const isWon = ref<boolean | null>(null)
const qGuess = ref('')
const actualGuess = ref('')
const autocompleteEl = ref(null)
const autocompleteFocus = ref(-1)
const autocompleteList = ref<string[]>([])

const shareWithoutNames = ref('abd')
const shareWithNames = ref('sec')

function updateGuess(opts: {
  isInit?: boolean
}) {
  if (opts.isInit) {
    if (!props.daily) {
      const elligible = Object.values(pokedex).filter((p) => p.gen >= genMin.value && p.gen <= genMax.value)
      secretPokemon.value = elligible[Math.floor(Math.random() * elligible.length)]
    } else {
      secretPokemon.value = pokedex[fakeDailyCSV[dayNumber.value].pokemon]
    }
    guesses.value = []
    isWon.value = null
  }

  if (!secretPokemon.value) return

  if (autocompleteFocus.value >= 0) {
    const v = autocompleteList.value[autocompleteFocus.value]
    if (v) {
      qGuess.value = v
      actualGuess.value = v
    }
  }

  if (!opts.isInit) {
    isNotFound.value = true
  } else {
    isNotFound.value = false
  }

  if (qGuess.value) {
    const c = pokedex[actualGuess.value]
    if (c) {
      isNotFound.value = false
      guesses.value = [...guesses.value, c]
    }
  }

  if (isNotFound.value) {
    actualGuess.value = ''
    qGuess.value = ''
  }

  const lastGuess = guesses.value[guesses.value.length - 1]
  if (lastGuess) {
    if (secretPokemon.value.name[lang.value] === lastGuess.name[lang.value]) {
      isWon.value = true
    }
  }

  if (guesses.value.length >= guessLimit.value) {
    isWon.value = false
  }

  if (isWon.value !== null) {
    const makeCopy = (withName: boolean) => {
      return [
        ['Squirdle', ...(props.daily ? [`Daily ${dayNumber.value} -`] : []), `${guesses.value.length}/${guessLimit.value}`].join(' '),
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
  actualGuess.value = ''
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

function normalizeInput(s: string): string {
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

    actualGuess.value = normalizeInput(qGuess.value)
    autocompleteList.value = Object.values(pokedex).filter((p) => normalizeInput(p.name[lang.value]).startsWith(actualGuess.value)).map((p) => p.name[lang.value])

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

  if (c && c0) {
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
      alert('Copied mosaic to clipboard!')
    }).on('error', (ex) => {
      console.warn("Copy to clipboard failed. Let Fireblend know!", ex);
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
</script>

<template>
  <h2 v-if="!daily">Squirdle</h2>
  <h2 v-else>Squirdle Daily {{ dayNumber }}</h2>

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
      I'm thinking of a Pokémon. Guess which! You have
      <span
        class="attempts"
      >{{ guessLimit - guesses.length }}</span> guesses
      <span v-if="daily">left today</span>.
      <div class="tooltip">
        Emoji Key
        <span class="tooltiptext">
          <p>🟩: Correct guess</p>
          <p>🟥: Incorrect Guess</p>
          <p>🟨: Type in wrong position</p>
          <p>🔼: Guessed too low</p>
          <p>🔽: Guessed too high</p>
        </span>
      </div>
    </div>
    <div v-if="daily">(Updates @ 00:00 GMT)</div>
  </section>
  <section class="guesses" v-if="guesses.length">
    <div class="row row-header">
      <div class="column">
        <p class="hint">Gen</p>
      </div>
      <div class="column">
        <p class="hint">Type 1</p>
      </div>
      <div class="column">
        <p class="hint">Type 2</p>
      </div>
      <div class="column">
        <p class="hint">Height</p>
      </div>
      <div class="column">
        <p class="hint">Weight</p>
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
          <pre class="tooltiptext">{{ g.info }}</pre>
        </div>
      </div>
    </div>
  </section>

  <section class="error" v-if="isNotFound">Pokemon not found!</section>

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
          placeholder="Pokemon Name"
          v-model="qGuess"
          @keydown="(ev) => autocompleteInput(ev)"
        />
        <div class="autocomplete autocomplete-items">
          <div
            v-for="(r, i) in autocompleteList"
            :key="r"
            :class="{ 'autocomplete-active': i === autocompleteFocus, 'autocomplete-item': true }"
            @click="qGuess = r; actualGuess = r; autocompleteList = []"
          >
            <strong>{{ r.substring(0, qGuess.length) }}</strong>
            <span>{{ r.substring(qGuess.length) }}</span>
          </div>
        </div>
      </div>
      <input class="guess_input" type="submit" value="Submit" @click="handleGuess" />
    </form>
  </section>

  <section class="results" v-if="!!secretPokemon && isWon !== null">
    <div>
      <span class="won" v-if="isWon">You won!</span>
      <span class="lost" v-else>You lost!</span>
      <span>
        The secret Pokémon was
        <b>
          <span class="secretpoke">{{ secretPokemon.name[lang] }}</span>
        </b>!
      </span>
    </div>
    <div>
      <button
        class="togglec copy-button"
        :data-clipboard-text="shareWithoutNames"
        type="button"
      >📄 Share</button>
      <button
        class="togglec copy-button"
        :data-clipboard-text="shareWithNames"
        type="button"
      >👀 Share w/names</button>
    </div>
    <div v-if="daily">
      <div>Generation hint arrows are obscured in daily</div>
      <div>mosaics to avoid spoiling other players!</div>
      <div>Come back tomorrow for another daily!</div>
    </div>
  </section>

  <section v-if="!daily && guesses.length">
    <a class="togglec" @click="updateGuess({ isInit: true })">▶️ New Game</a>
  </section>

  <section v-if="!daily">
    <label for="quantity">Guess Pkmn from gen</label>
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
    <router-link v-if="!daily" to="/daily">Try Squirdle Daily!</router-link>
    <router-link v-else to="/">Free Play</router-link>
  </section>
</template>

<style scoped>
section + section {
  margin-top: 1em;
}

input[type="submit"] {
  cursor: pointer;
}
</style>