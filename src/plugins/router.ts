import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/daily',
      alias: ['/'],
      component: () => import('../pages/Home.vue'),
      props: { daily: true }
    },
    {
      path: '/free',
      component: () => import('../pages/Home.vue'),
      props: { daily: false }
    }
  ]
})
