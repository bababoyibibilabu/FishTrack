import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// 导入 PWA 注册器
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

const app = createApp(App)
app.use(router)
app.mount('#app')
