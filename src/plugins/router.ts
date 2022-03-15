import {
  NavigationGuardWithThis,
  createRouter,
  createWebHistory
} from 'vue-router'

import { dailyJSON, lang, linkTemplate, translation } from '../assets'

const translationImport = import.meta.glob('../../translation/*.json')

const beforeGameEnter: NavigationGuardWithThis<undefined> = (to, _, next) => {
  const makeImport = () => `../../translation/${lang.value}.json`

  const doImport = translationImport[makeImport()]
  const linkTemplateImport =
    translationImport[`../../translation/${lang.value}-ref.json`] ||
    translationImport[`../../translation/en-ref.json`]
  // @ts-ignore
  if (doImport) {
    Promise.all([doImport(), linkTemplateImport()]).then(([t, ln]) => {
      translation.value = t.default
      linkTemplate.value = ln.default

      if (lang.value === 'ja') {
        import('wanakana').then((r) => (window.wanakana = r))
      }

      next()
    })
    return
  }

  next({
    path: '/404'
  })
}

const dailyImport = import.meta.glob('../../generated/*/daily.json')

const getDaily: NavigationGuardWithThis<undefined> = (to, _, next) => {
  const makeImport = () => `../../generated/${lang.value}/daily.json`

  const doImport = dailyImport[makeImport()]
  // @ts-ignore
  if (doImport) {
    doImport().then((t) => {
      dailyJSON.value = t.default
      next()
    })
    return
  }

  next({
    path: '/404',
    query: { daily: 'true' }
  })
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/daily',
      alias: ['/'],
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: true }),
      beforeEnter: [beforeGameEnter, getDaily]
    },
    {
      path: '/free',
      component: () => import('../pages/Game.vue'),
      props: (r) => ({ daily: false }),
      beforeEnter: beforeGameEnter
    },
    {
      path: '/404',
      component: () => import('../pages/404.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../pages/404.vue')
    }
  ]
})
