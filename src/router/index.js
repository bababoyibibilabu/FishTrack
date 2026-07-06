import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabase'

import Login from '../views/Login.vue'
import MySpots from '../views/MySpots.vue'
import SpotForm from '../views/SpotForm.vue'
import SpotDetail from '../views/SpotDetail.vue'
import ShareDetail from '../views/ShareDetail.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/', name: 'MySpots', component: MySpots, meta: { requiresAuth: true } },
  { path: '/spot/new', name: 'NewSpot', component: SpotForm, meta: { requiresAuth: true } },
  { path: '/spot/edit/:id', name: 'EditSpot', component: SpotForm, meta: { requiresAuth: true }, props: true },
  { path: '/spot/:id', name: 'SpotDetail', component: SpotDetail, meta: { requiresAuth: true }, props: true },
  { path: '/share', name: 'ShareDetail', component: ShareDetail }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由拦截器
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'MySpots' })
  } else {
    next()
  }
})

export default router
