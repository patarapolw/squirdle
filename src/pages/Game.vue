<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ClipboardJS from 'clipboard'

import { IPokedexEntry, pokedex, defaultMinGen, defaultMaxGen, lang, t, dailyJSON } from '../assets'

const props = defineProps<{
  daily: boolean
  lang?: string
}>()

const secretPokemon = ref<IPokedexEntry | null>(null)

const genMin = ref(defaultMinGen.value)
const genMax = ref(defaultMaxGen.value)
const guesses = ref<IPokedexEntry[]>([])

const guessLimit = ref(6)

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
const autocompleteList = ref<IPokedexEntry[]>([])
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

function updateGuess(opts: {
  entry?: IPokedexEntry
  isInit?: boolean
  isNew?: boolean
}) {
  if (opts.isNew) {
    guesses.value = []
    storage.guesses.set([])
  }

  if (opts.isInit) {
    if (props.daily) {
      const nowMin = (() => {
        const now = new Date()
        const milli = +now
        const sec = milli / 1000
        const min = sec / 60
        return min + now.getTimezoneOffset() + timeOffset.value * 60
      })()

      currentDate.value = new Date(nowMin * 1000 * 60).toISOString().substring(0, 10)
      dayNumber.value = Math.floor((+new Date(currentDate.value) - +new Date(dailyJSON.value.startingDate)) / (1000 * 60 * 60 * 24))

      elligible.value = Object.values(pokedex.value)
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
      secretPokemon.value = elligible.value[Math.floor(Math.random() * elligible.value.length)]

      if (opts.isNew) {
        guesses.value = []
      } else {
        genMin.value = storage.genMin.get() || genMin.value
        genMax.value = storage.genMax.get() || genMax.value
        elligible.value = Object.values(pokedex.value).filter((p) => p.gen >= genMin.value && p.gen <= genMax.value)

        const lastAnswer = storage.lastAnswer.get()
        if (lastAnswer) {
          secretPokemon.value = pokedex.value[lastAnswer]

          const arr = storage.guesses.get()
          if (arr) {
            guesses.value = arr.map((v: string) => {
              return pokedex.value[v]
            })
          }
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
        [
          t('Squirdle'),
          ...(props.daily ? [`${t('Daily')} ${dayNumber.value + 1} -`] : []),
          `${isWon.value ? guesses.value.length : 'X'}/${guessLimit.value}`
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

          return `${e('gen')}${e('type1')}${e('type2')}${e('height')}${e('weight')}${withName ? ' ' + g.name[lang.value] : ''}`
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
    if (d.type1 === secretPokemon.value.type1) {
      return {
        src: '/wrongpos.png',
        alt: 'almost'
      }
    } else {
      return {
        src: '/wrong.png',
        alt: 'wronng'
      }
    }
  }

  if (c) {
    if (typeof c === 'number' && typeof c0 === 'number') {
      if (c < c0 * 0.9) {
        return {
          src: '/up.png',
          alt: 'too low'
        }
      }

      if (c > c0 * 1.1) {
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

  if (d.type1 === secretPokemon.value.type2 || d.type2 === secretPokemon.value.type1) {
    return {
      src: '/wrongpos.png',
      alt: 'almost'
    }
  }

  return {
    src: '/wrong.png',
    alt: 'wrong'
  }
}

let clipboardJS: ClipboardJS

onMounted(() => {
  document.head.querySelector('title')!.innerText = t('Squirdle')
  updateGuess({ isInit: true })

  nextTick(() => {
    clipboardJS = new ClipboardJS('.copy-button')
    clipboardJS.on('success', () => {
      alert(t('CopySuccess'))
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
  updateGuess({ isInit: true, isNew: true })
})

watch(genMin, () => {
  storage.genMin.set(genMin.value)
  updateGuess({ isInit: true, isNew: true })
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
const vRefLink = t('PokemonRefLink').split(/{{_POKEMON_NAME\[([a-z]+)\]}}/)
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
    <a href="https://squirdle.fireblend.com/" target="_blank" rel="noopener noreferrer">Fireblend</a>
    <span>{{ vOriginalCredit[1] }}</span>
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
      <span>{{ timeZone }}</span>
      <span>{{ vUpdatesAt[1] }}</span>
    </div>
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
          <div class="tooltiptext">
            <a
              :href="`${vRefLink[0]}${encodeURIComponent(g.name[vRefLink[1]])}${vRefLink[2] || ''}`"
              target="_blank"
              rel="noopener noreferrer"
            >{{ g.name[lang] }}</a>
            <pre>{{ g.info() }}</pre>
          </div>
        </div>
      </div>
    </div>
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
              :href="`${vRefLink[0]}${encodeURIComponent(secretPokemon.name[vRefLink[1]])}${vRefLink[2] || ''}`"
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