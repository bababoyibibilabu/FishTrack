import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// 全局捕获异常并在移动端弹出 alert，用于直接暴露底层报错
window.addEventListener('error', (event) => {
  alert(`🔴 JS 运行报错: ${event.message}\n文件: ${event.filename}\n行号: ${event.lineno}`);
});
window.addEventListener('unhandledrejection', (event) => {
  alert(`🔴 Promise 异常未捕获: ${event.reason}`);
});

// 导入 PWA 注册器
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

const app = createApp(App)
app.config.errorHandler = (err, instance, info) => {
  alert(`🔴 Vue 错误: ${err.message}\n信息: ${info}\n堆栈: ${err.stack}`);
}
app.use(router)
app.mount('#app')
