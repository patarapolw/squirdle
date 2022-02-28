<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ClipboardJS from 'clipboard'

import { IPokedexEntry, pokedex, defaultMinGen, defaultMaxGen } from '../assets'

const props = defineProps<{
  daily?: boolean
}>()

const secretPokemon = ref(pokedex.get('squirtle')!)

const genMin = ref(defaultMinGen.value)
const genMax = ref(defaultMaxGen.value)
const guesses = ref<IPokedexEntry[]>([])
const guessLimit = ref(6)

const dayNumber = ref(0)
const isNotFound = ref(false)
const isWon = ref<boolean | null>(null)
const qGuess = ref('')
const autocompleteEl = ref(null)
const autocompleteFocus = ref(-1)
const autocompleteList = ref<string[]>([])

const shareWithoutNames = ref('')
const shareWithNames = ref('')

function doGuess(opts: {
  isInit?: boolean
}) {
  if (autocompleteFocus.value > 0) {
    const v = autocompleteList.value[autocompleteFocus.value]
    if (v) {
      qGuess.value = v
    }
  }

  if (!opts.isInit) {
    isNotFound.value = true
  } else {
    isNotFound.value = false
  }

  if (qGuess.value) {
    const c = pokedex.get(qGuess.value)
    if (c) {
      isNotFound.value = false
      guesses.value = [...guesses.value, c]
    }
  }

  if (isNotFound.value) {
    qGuess.value = ''
  }

  const lastGuess = guesses.value[guesses.value.length - 1]
  if (lastGuess) {
    if (secretPokemon.value.name === lastGuess.name) {
      isWon.value = true
    }
  }
}

function newGame() {
  if (!props.daily) {
    const elligible = [...pokedex.values()].filter((p) => p.gen >= genMin.value && p.gen <= genMax.value)
    secretPokemon.value = elligible[Math.floor(Math.random() * elligible.length)]
    guesses.value = []
  }
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

function autocompleteInput(direction: number) {
  if (!qGuess.value) {
    return
  }

  switch (direction) {
    case -1:
      autocompleteFocus.value--
      if (autocompleteFocus.value < 0) {
        autocompleteFocus.value = 0
      }
      break
    case 1:
      autocompleteFocus.value++
      if (autocompleteFocus.value >= autocompleteList.value.length) {
        autocompleteFocus.value = autocompleteList.value.length - 1
      }
      break
    default:
      autocompleteFocus.value = -1
  }
}

function getImage(d: IPokedexEntry, k: keyof IPokedexEntry): {
  src: string
  alt: string
} {
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
    alt: 'wrong'
  }
}

onMounted(() => {
  doGuess({ isInit: true })

  nextTick(() => {
    new ClipboardJS('.copy-button').on('success', () => {
      alert('Copied mosaic to clipboard!')
    }).on('error', (ex) => {
      console.warn("Copy to clipboard failed. Let Fireblend know!", ex);
    })
  })
})

onClickOutside(autocompleteEl, () => {
  autocompleteList.value = []
})

watch([props], () => {
  doGuess({ isInit: true })
})
</script>

<template>
  <h2 v-if="!daily">Squirdle</h2>
  <h2 v-else>Squirdle Daily</h2>

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
  <section v-if="guesses.length" class="guesses">
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
  </section>
  <section class="guesses" v-for="g in guesses" :key="g.name">
    <div class="row">
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
          <p class="guess">{{ g.name }}</p>
          <span class="tooltiptext">{{ g.info }}</span>
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
      @submit.prevent="doGuess({ isInit: false })"
    >
      <div ref="autocompleteEl" class="autocomplete">
        <input
          v-model="qGuess"
          class="guess_input"
          type="text"
          name="guess"
          placeholder="Pokemon Name"
          @input="autocompleteInput(0)"
          @keypress.down="autocompleteInput(+1)"
          @keypress.up="autocompleteInput(-1)"
        />
        <div class="autocomplete-list">
          <div
            v-for="(r, i) in autocompleteList"
            :key="r"
            :class="{ 'autocomplete-active': i === autocompleteFocus, 'autocomplete-item': true }"
          >
            <strong>{{ r.substring(0, qGuess.length) }}</strong>
            {{ r.substring(qGuess.length) }}
            <input
              type="hidden"
              :value="r"
              @click="qGuess = r; autocompleteList = []"
            />
          </div>
        </div>
      </div>
      <input class="guess_input" type="submit" value="Submit" @click="handleGuess" />
    </form>
  </section>

  <section class="results" v-if="isWon !== null">
    <div>
      <span class="won" v-if="isWon">You won!</span>
      <span class="lost" v-else>You lost!</span>
      <span>
        The secret Pokémon was
        <b>
          <span class="secretpoke">{{ secretPokemon.name }}</span>
        </b>!
      </span>
    </div>
    <div>
      <button
        class="togglec copy-button"
        data-clipboard-target="#share-without-names"
        type="button"
      >📄 Share</button>
      <button
        class="togglec copy-button"
        data-clipboard-target="#share-with-names"
        type="button"
      >👀 Share w/names</button>
    </div>
    <div>Generation hint arrows are obscured in daily</div>
    <div>mosaics to avoid spoiling other players!</div>
    <div>Come back tomorrow for another daily!</div>
    <textarea id="share-without-names" style="display: none;">
      {{ shareWithoutNames }}
    </textarea>
    <textarea id="share-with-names" style="display: none;">
      {{ shareWithNames }}
    </textarea>
  </section>

  <section v-if="!daily && guesses.length">
    <a class="togglec" @click="newGame">▶️ New Game</a>
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
</style>