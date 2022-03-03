import {
  NavigationGuardWithThis,
  RouteLocationNormalized,
  createRouter,
  createWebHistory
} from 'vue-router'

import { dailyJSON, lang as lang0, linkTemplate, translation } from '../assets'

const translationImport = import.meta.glob('../../translation/*.json')

const beforeGameEnter: NavigationGuardWithThis<undefined> = (to, _, next) => {
  let lang = rGetLang(to)!

  if (lang && lang.length !== 2) {
    next({
      path: '/404'
    })
    return
  }

  if (!lang) {
    lang = lang0.value
  }

  const makeImport = () => `../../translation/${lang}.json`
  if (!makeImport()) {
    lang = window.LANG
  }

  const doImport = translationImport[makeImport()]
  const linkTemplateImport =
    translationImport[`../../translation/${lang}-ref.json`] ||
    translationImport[`../../translation/en-ref.json`]
  // @ts-ignore
  if (doImport) {
    Promise.all([doImport(), linkTemplateImport()]).then(([t, ln]) => {
      lang0.value = lang
      translation.value = t.default
      linkTemplate.value = ln.default

      if (lang === 'ja') {
        import('wanakana').then((r) => (window.wanakana = r))
      }

      next()
    })
    return
  }

  next({
    path: '/404',
    query: { lang }
  })
}

const dailyImport = import.meta.glob('../../generated/*/daily.json')

const getDaily: NavigationGuardWithThis<undefined> = (to, _, next) => {
  let lang = rGetLang(to)!

  if (lang && lang.length !== 2) {
    next({
      path: '/404'
    })
    return
  }

  if (!lang) {
    lang = lang0.value
  }

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
    return
  }

  next({
    path: '/404',
    query: { lang, daily: 'true' }
  })
}

function rGetLang(r: RouteLocationNormalized) {
  return (r.params.lang || r.query.lang)?.toString?.()
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/daily',
      alias: ['/'],
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: true, lang: rGetLang(r) }),
      beforeEnter: [beforeGameEnter, getDaily]
    },
    {
      path: '/free',
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: false, lang: rGetLang(r) }),
      beforeEnter: beforeGameEnter
    },
    {
      path: '/404',
      component: () => import('../pages/404.vue')
    },
    {
      path: '/:lang/daily',
      alias: ['/:lang'],
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: true, lang: rGetLang(r) }),
      beforeEnter: [beforeGameEnter, getDaily]
    },
    {
      path: '/:lang/free',
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: false, lang: rGetLang(r) }),
      beforeEnter: beforeGameEnter
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../pages/404.vue')
    }
  ]
})
