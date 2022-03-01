import { createApp } from 'vue'

import App from './App.vue'
import { initPokedex } from './assets'
import { router } from './plugins/router'

initPokedex().then(() => {
  createApp(App).use(router).mount('#app')
})
