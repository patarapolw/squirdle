import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../pages/Home.vue') },
    {
      path: '/daily',
      component: () => import('../pages/Home.vue'),
      props: { daily: true }
    }
  ]
})
