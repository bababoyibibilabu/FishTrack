import { createRouter, createWebHistory } from 'vue-router'
import { h } from 'vue'

const routes = [
  { path: '/', component: { render: () => h('div', 'Placeholder') } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
