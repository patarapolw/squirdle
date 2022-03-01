import {
  NavigationGuardWithThis,
  createRouter,
  createWebHistory
} from 'vue-router'

import { dailyJSON, lang as lang0, translation } from '../assets'

const translationImport = import.meta.glob('../../translation/*.json')

const beforeAppEnter: NavigationGuardWithThis<undefined> = (to, _, next) => {
  let lang = to.query.lang?.toString?.() || lang0.value
  const makeImport = () => `../../translation/${lang}.json`
  if (!makeImport()) {
    lang = window.LANG
  }

  const doImport = translationImport[makeImport()]
  // @ts-ignore
  if (doImport) {
    doImport().then((t) => {
      lang0.value = lang
      translation.value = t.default
      next()
    })
  } else {
    alert(`Invalid LANG: ${lang}`)
    next()
  }
}

const dailyImport = import.meta.glob('../../generated/*/daily.json')

const getDaily: NavigationGuardWithThis<undefined> = (to, _, next) => {
  let lang = to.query.lang?.toString?.() || lang0.value
  const makeImport = () => `../../generated/${lang}/daily.json`
  if (!makeImport()) {
    lang = window.LANG
  }

  const doImport = dailyImport[makeImport()]
  // @ts-ignore
  if (doImport) {
    doImport().then((t) => {
      lang0.value = lang
      dailyJSON.value = t.default
      next()
    })
  } else {
    alert(`Invalid for Daily: ${lang}`)
    next()
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/daily',
      alias: ['/'],
      component: () => import('../pages/Home.vue'),
      props: (r) => ({ daily: true, lang: r.query.lang?.toString?.() }),
      beforeEnter: [beforeAppEnter, getDaily]
    },
    {
      path: '/free',
      component: () => import('../pages/Home.vue'),
      props: (r) => ({ daily: false, lang: r.query.lang?.toString?.() }),
      beforeEnter: beforeAppEnter
    }
  ]
})
