# 钓点私人手帐与熟人分享 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个移动端优先的 PWA 应用，提供私密钓点记录、GPS照片导入、高德卫星图选址、手机导航唤起和点对点钓点克隆功能。

**Architecture:** 前端采用 Vue 3 单页面应用架构 (SPA)，地图由 Leaflet.js 渲染高德卫星 XYZ 瓦片。所有数据存储与身份认证直连 Supabase，通过数据库 RLS 保证个人隐私隔离及只读分享数据获取。

**Tech Stack:** Vue 3 (Composition API), Vite, Tailwind CSS, Vue Router, Leaflet, exif-js, coordtransform, `@supabase/supabase-js`, `vite-plugin-pwa`, `vitest`.

---

## 文件结构图

在执行计划期间，我们将创建或修改以下文件：

```text
FishTrack/
├── public/
│   ├── favicon.ico
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── _redirects             # CF Pages SPA 重定向
├── src/
│   ├── assets/
│   │   └── main.css           # 基础 CSS 与 Tailwind/Leaflet 引入
│   ├── services/
│   │   ├── supabase.js        # Supabase 初始化客户端
│   │   ├── coord.js           # 坐标转换工具函数
│   │   └── exif.js            # 图片 EXIF 解析工具函数
│   ├── router/
│   │   └── index.js           # 路由控制与守卫
│   ├── components/
│   │   └── MapPicker.vue      # Leaflet 卫星地图与标记交互组件
│   ├── views/
│   │   ├── Login.vue          # 免密登录页面
│   │   ├── MySpots.vue        # 我的手帐（列表页）
│   │   ├── SpotForm.vue       # 新建/编辑钓点表单
│   │   ├── SpotDetail.vue     # 钓点详情与导航页面
│   │   └── ShareDetail.vue    # 只读分享克隆页
│   ├── App.vue
│   └── main.js
├── tests/
│   ├── coord.test.js          # 坐标系转换测试
│   └── exif.test.js           # EXIF 解析测试
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 实施步骤

### Task 1: 初始化项目与 PWA 配置

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `public/_redirects`

- [ ] **Step 1: 创建 package.json 并安装依赖**

在项目根目录下创建 `package.json` 并写入基础配置，包括 Vite, Vue 3, Tailwind, Leaflet, exif-js, coordtransform, supabase 以及 PWA 插件。

```json
{
  "name": "fishtrack",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.8",
    "coordtransform": "^2.1.2",
    "exif-js": "^2.3.0",
    "leaflet": "^1.9.4",
    "vue": "^3.4.21",
    "vue-router": "^4.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.4",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.4",
    "vite-plugin-pwa": "^0.19.2",
    "vitest": "^1.3.1"
  }
}
```

- [ ] **Step 2: 创建配置文件**

在根目录下创建 `tailwind.config.js`：
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',
        accentBlue: '#38bdf8',
      }
    },
  },
  plugins: [],
}
```

在根目录下创建 `postcss.config.js`：
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

在根目录下创建 `vite.config.js`（配置 PWA 和 Vue）：
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: '钓点私人手帐与分享',
        short_name: '鱼迹',
        description: '专属于您的私密钓点记事本，支持点对点克隆分享',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

在根目录下创建 `index.html`：
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>钓点私人手帐</title>
  </head>
  <body class="bg-slate-900 text-slate-100 min-h-screen">
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

在 `public/` 目录下创建 `_redirects` 以支持 SPA 路由：
```text
/*    /index.html   200
```

- [ ] **Step 3: 运行 npm install 安装依赖**

执行命令安装包：
Run: `npm install`
Expected: 成功完成安装且无严重冲突。

- [ ] **Step 4: 提交代码**

```bash
git add package.json vite.config.js tailwind.config.js postcss.config.js index.html public/_redirects
git commit -m "feat: init vite vue3 config with tailwind and pwa"
```

---

### Task 2: 坐标转换与 EXIF 解析服务与单元测试

**Files:**
- Create: `src/services/coord.js`
- Create: `src/services/exif.js`
- Create: `tests/coord.test.js`

- [ ] **Step 1: 编写单元测试**

在 `tests/coord.test.js` 编写坐标系转换的测试用例：
```javascript
import { describe, it, expect } from 'vitest'
import { convertWgs84ToGcj02, convertGcj02ToBd09 } from '../src/services/coord'

describe('Coordinate Conversion Test', () => {
  it('should convert WGS-84 to GCJ-02 correctly', () => {
    // 采用天安门坐标 WGS84: 116.397428, 39.908757
    const result = convertWgs84ToGcj02(116.397428, 39.908757)
    expect(result.lng).toBeGreaterThan(116.4)
    expect(result.lat).toBeGreaterThan(39.9)
  })

  it('should convert GCJ-02 to BD-09 correctly', () => {
    // GCJ02: 116.403977, 39.910078
    const result = convertGcj02ToBd09(116.403977, 39.910078)
    expect(result.lng).toBeGreaterThan(116.46)
    expect(result.lat).toBeGreaterThan(39.91)
  })
})
```

- [ ] **Step 2: 运行测试并确认为 FAIL**

Run: `npx vitest run tests/coord.test.js`
Expected: FAIL 错误为 `Cannot find module '../src/services/coord'`。

- [ ] **Step 3: 编写坐标转换逻辑**

在 `src/services/coord.js` 写入：
```javascript
import coordtransform from 'coordtransform'

/**
 * 将 WGS-84 (地球标准 GPS) 经纬度转换为 GCJ-02 (高德火星坐标系)
 * @param {number} lng 
 * @param {number} lat 
 * @returns {{lng: number, lat: number}}
 */
export function convertWgs84ToGcj02(lng, lat) {
  const result = coordtransform.wgs84togcj02(lng, lat)
  return { lng: result[0], lat: result[1] }
}

/**
 * 将 GCJ-02 (高德火星坐标系) 经纬度转换为 BD-09 (百度坐标系)
 * @param {number} lng 
 * @param {number} lat 
 * @returns {{lng: number, lat: number}}
 */
export function convertGcj02ToBd09(lng, lat) {
  const result = coordtransform.gcj02tobd09(lng, lat)
  return { lng: result[0], lat: result[1] }
}
```

- [ ] **Step 4: 运行测试确认 PASS**

Run: `npx vitest run tests/coord.test.js`
Expected: PASS

- [ ] **Step 5: 编写 EXIF 解析函数**

在 `src/services/exif.js` 中写入利用 `exif-js` 提取图片经纬度的逻辑：
```javascript
import EXIF from 'exif-js'

/**
 * 前端解析照片的 GPS WGS-84 原始经纬度
 * @param {File} file 
 * @returns {Promise<{lng: number, lat: number} | null>}
 */
export function getLatLngFromImage(file) {
  return new Promise((resolve) => {
    try {
      EXIF.getData(file, function () {
        const latData = EXIF.getTag(this, 'GPSLatitude')
        const lonData = EXIF.getTag(this, 'GPSLongitude')
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N'
        const lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E'

        if (latData && lonData && latData.length === 3 && lonData.length === 3) {
          // 转换度分秒到十进制度
          let lat = latData[0] + latData[1] / 60 + latData[2] / 3600
          let lon = lonData[0] + lonData[1] / 60 + lonData[2] / 3600

          if (latRef === 'S') lat = -lat
          if (lonRef === 'W') lon = -lon

          resolve({ lng: lon, lat: lat })
        } else {
          resolve(null)
        }
      })
    } catch (error) {
      console.error('EXIF parsing failed', error)
      resolve(null)
    }
  })
}
```

- [ ] **Step 6: 提交代码**

```bash
git add src/services/coord.js src/services/exif.js tests/coord.test.js
git commit -m "feat: add coordinate transformation and image EXIF parser services"
```

---

### Task 3: Supabase 客户端配置与基础 CSS

**Files:**
- Create: `src/services/supabase.js`
- Create: `src/assets/main.css`
- Create: `src/main.js`
- Create: `src/App.vue`

- [ ] **Step 1: 配置 Supabase 客户端**

创建 `src/services/supabase.js`：
```javascript
import { createClient } from '@supabase/supabase-js'

// 使用 Vite 环境变量，若缺失则降级为占位符以便开发调试
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: 创建主 css 文件，引入 Tailwind 和 Leaflet 核心样式**

创建 `src/assets/main.css`。注意由于 Leaflet 在移动端容易出现样式缺失，我们在这里手动打入部分 Leaflet 图标和核心定位重设：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import 'leaflet/dist/leaflet.css';

/* 解决 leaflet 容器在 iOS 滑动惯性下的闪屏问题 */
.leaflet-container {
  font-family: inherit;
  z-index: 1;
}

/* 适配移动端圆角和全面屏手势 */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  user-select: none;
}

/* 输入框聚焦效果 */
input, textarea {
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 3: 创建 `src/App.vue` 壳组件**

创建 `src/App.vue`，利用 `<router-view>` 加载页面，并注入移动端常用的全局过渡动画：
```vue
<template>
  <div class="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col antialiased selection:bg-sky-500 selection:text-white">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 4: 创建 `src/main.js` 启动文件**

创建 `src/main.js`，初始化应用和 PWA 自动更新：
```javascript
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
```

- [ ] **Step 5: 提交代码**

```bash
git add src/services/supabase.js src/assets/main.css src/App.vue src/main.js
git commit -m "feat: setup supabase client connection and base app structure"
```

---

### Task 4: 路由搭建与免密登录页

**Files:**
- Create: `src/router/index.js`
- Create: `src/views/Login.vue`

- [ ] **Step 1: 编写路由与登录守卫**

创建 `src/router/index.js`，设计前台路由控制逻辑。对于未登录的用户，除了分享页（`/share`）不需要身份拦截外，其余全部重定向到 `/login`：
```javascript
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
```

- [ ] **Step 2: 编写免密登录页面组件**

创建 `src/views/Login.vue`。支持通过 Supabase OTP (One-Time Password) 发送邮件验证码登录：
```vue
<template>
  <div class="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-slate-950">
    <div class="w-full max-w-sm space-y-8 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <div class="text-center">
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
          鱼迹私人手帐
        </h2>
        <p class="mt-2 text-sm text-slate-400">
          户外钓友专属的私密钓点存储及分享手帐
        </p>
      </div>

      <div class="mt-8 space-y-6">
        <div class="space-y-4">
          <!-- 步骤一：输入邮箱获取验证码 -->
          <div v-if="!otpSent">
            <label for="email-address" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">邮箱地址</label>
            <input
              id="email-address"
              name="email"
              type="email"
              required
              v-model="email"
              class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-sky-500 transition-colors text-base"
              placeholder="请输入您的邮箱"
            />
          </div>

          <!-- 步骤二：输入收到的验证码 -->
          <div v-else>
            <label for="otp-code" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">邮箱验证码</label>
            <input
              id="otp-code"
              name="otp"
              type="text"
              required
              v-model="token"
              class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-sky-500 transition-colors text-base tracking-widest text-center"
              placeholder="请输入6位验证码"
            />
          </div>
        </div>

        <div>
          <!-- 核心逻辑控制 -->
          <button
            @click="handleSubmit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none transition-all disabled:opacity-50"
          >
            <span v-if="loading">加载中...</span>
            <span v-else-if="!otpSent">发送免密登录验证码</span>
            <span v-else>确认登录</span>
          </button>

          <button
            v-if="otpSent"
            @click="otpSent = false"
            class="w-full text-center text-xs text-sky-400 mt-4 hover:underline"
          >
            返回修改邮箱
          </button>
        </div>

        <p v-if="message" :class="`text-center text-sm ${isError ? 'text-red-400' : 'text-emerald-400'}`">
          {{ message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'

const email = ref('')
const token = ref('')
const otpSent = ref(false)
const loading = ref(false)
const message = ref('')
const isError = ref(false)
const router = useRouter()

const handleSubmit = async () => {
  if (!email.value) {
    showMsg('请输入邮箱', true)
    return
  }
  loading.value = true
  message.value = ''

  if (!otpSent.value) {
    // 发送 OTP 验证码
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        shouldCreateUser: true
      }
    })
    loading.value = false
    if (error) {
      showMsg(error.message, true)
    } else {
      otpSent.value = true
      showMsg('验证码已发送至您的邮箱，请查收！')
    }
  } else {
    // 验证 OTP 验证码登录
    if (!token.value) {
      showMsg('请输入验证码', true)
      loading.value = false
      return
    }
    const { error } = await supabase.auth.verifyOtp({
      email: email.value,
      token: token.value,
      type: 'email'
    })
    loading.value = false
    if (error) {
      showMsg(error.message, true)
    } else {
      router.push('/')
    }
  }
}

const showMsg = (txt, err = false) => {
  message.value = txt
  isError.value = err
}
</script>
```

- [ ] **Step 3: 提交代码**

```bash
git add src/router/index.js src/views/Login.vue
git commit -m "feat: add router and magic link OTP login view"
```

---

### Task 5: 户外高德卫星地图选择组件 (MapPicker)

**Files:**
- Create: `src/components/MapPicker.vue`

- [ ] **Step 1: 编写 MapPicker 组件**

我们需要在组件中以 GCJ-02 坐标初始化 Leaflet，添加高德卫星底图与路网标识。
* 接收 `modelValue` 作为 `{lat, lng}` 双向绑定。
* 接收 `readonly` 参数控制是否只读。
* 地图挂载后，渲染 Marker。Marker 拖动结束后回调修改父组件经纬度。

创建 `src/components/MapPicker.vue`：
```vue
<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-800">
    <div ref="mapContainer" class="w-full h-full bg-slate-900 z-10"></div>
    <div v-if="!readonly" class="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <button 
        @click="getCurrentLocation" 
        class="bg-slate-900/90 text-sky-400 p-3 rounded-full border border-slate-700 shadow-lg active:scale-95 transition-transform"
        title="获取当前定位"
      >
        <!-- 定位图标 -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import { convertWgs84ToGcj02 } from '../services/coord'

const props = defineProps({
  modelValue: {
    type: Object, // { lat, lng }
    required: true
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const mapContainer = ref(null)
let map = null
let marker = null

// 地图初始化，默认位置北京 (火星坐标)
const DEFAULT_LAT = 39.9088
const DEFAULT_LNG = 116.3975

onMounted(() => {
  const initialLat = props.modelValue?.lat || DEFAULT_LAT
  const initialLng = props.modelValue?.lng || DEFAULT_LNG

  // 1. 初始化地图容器
  map = L.map(mapContainer.value, {
    center: [initialLat, initialLng],
    zoom: 15,
    zoomControl: false,
    attributionControl: false
  })

  // 2. 加载高德卫星瓦片 (GCJ-02) 影像图层
  const satLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18,
    minZoom: 3
  }).addTo(map)

  // 3. 加载高德路网叠加图层 (带文字标注，方便钓友寻找河流和道路)
  const roadLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18,
    minZoom: 3
  }).addTo(map)

  // 4. 定义自定义 Marker 图标 (避免 leaflet 打包后丢失默认图标的图片资源)
  const customIcon = L.divIcon({
    html: `<div class="w-8 h-8 rounded-full bg-sky-500 border-4 border-white shadow-xl animate-pulse flex items-center justify-center">
             <div class="w-2.5 h-2.5 rounded-full bg-slate-900"></div>
           </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })

  // 5. 初始化 Marker
  marker = L.marker([initialLat, initialLng], {
    draggable: !props.readonly,
    icon: customIcon
  }).addTo(map)

  // 6. 监听拖拽事件，更新父组件绑定的经纬度
  if (!props.readonly) {
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      emit('update:modelValue', { lat: position.lat, lng: position.lng })
    })
  }
})

// 监听外界数据变化主动修改地图中心和 marker 点
watch(() => props.modelValue, (newVal) => {
  if (map && marker && newVal && newVal.lat && newVal.lng) {
    const currentLatLng = marker.getLatLng()
    if (currentLatLng.lat !== newVal.lat || currentLatLng.lng !== newVal.lng) {
      marker.setLatLng([newVal.lat, newVal.lng])
      map.setView([newVal.lat, newVal.lng], map.getZoom())
    }
  }
}, { deep: true })

// 浏览器定位 API 降级提取位置，并将原始 WGS-84 转换为高德 GCJ-02
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('当前浏览器不支持 GPS 定位！')
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const wgsLng = position.coords.longitude
      const wgsLat = position.coords.latitude
      // 核心：标准GPS (WGS-84) 转为火星坐标 (GCJ-02) 存储和展示
      const gcjPos = convertWgs84ToGcj02(wgsLng, wgsLat)
      emit('update:modelValue', gcjPos)
    },
    (err) => {
      console.error(err)
      alert('定位获取失败，请允许定位权限！')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

onBeforeUnmount(() => {
  if (map) {
    map.remove()
  }
})
</script>
```

- [ ] **Step 2: 提交代码**

```bash
git add src/components/MapPicker.vue
git commit -m "feat: build custom Leaflet map component with Gaode Satellite tile layers"
```

---

### Task 6: 我的手帐列表页 (MySpots)

**Files:**
- Create: `src/views/MySpots.vue`

- [ ] **Step 1: 编写手帐列表页面组件**

创建 `src/views/MySpots.vue`。负责加载当前登录用户下的钓点数据，并支持关键字搜索及快捷登出功能：
```vue
<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-16">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div>
        <h1 class="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>🎣 我的手帐</span>
        </h1>
        <p class="text-xs text-slate-400">已登录：{{ userEmail }}</p>
      </div>
      <button 
        @click="handleLogout" 
        class="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/50 px-3 py-1.5 rounded-lg bg-slate-950 transition-colors"
      >
        退出登录
      </button>
    </header>

    <!-- 主体区域 -->
    <main class="flex-1 p-6 space-y-6">
      <!-- 搜索与新建栏 -->
      <div class="flex gap-3">
        <div class="relative flex-1">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="搜索钓点名称..." 
            class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:border-sky-500 transition-colors"
          />
        </div>
        <router-link 
          to="/spot/new" 
          class="bg-sky-500 hover:bg-sky-400 text-white font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
        >
          <span>➕ 新建</span>
        </router-link>
      </div>

      <!-- 列表状态 -->
      <div v-if="loading" class="text-center py-12 text-slate-500 text-sm">
        正在拉取钓点列表...
      </div>
      <div v-else-if="filteredSpots.length === 0" class="text-center py-20 text-slate-500 text-sm border-2 border-dashed border-slate-850 rounded-2xl">
        📪 还没有任何私密钓点，点击右上方“新建”开始吧！
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <!-- 钓点卡片 -->
        <div 
          v-for="spot in filteredSpots" 
          :key="spot.id" 
          class="bg-slate-900 rounded-2xl border border-slate-850 overflow-hidden shadow-lg flex flex-col"
        >
          <div class="h-40 bg-slate-800 relative">
            <img 
              v-if="spot.image_url" 
              :src="spot.image_url" 
              class="w-full h-full object-cover" 
              alt="钓点实况"
            />
            <div v-else class="w-full h-full flex flex-col justify-center items-center text-slate-600 bg-slate-850">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-xs">暂无实况图</span>
            </div>
            <span 
              v-if="spot.is_shared" 
              class="absolute top-3 right-3 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              已开启分享
            </span>
          </div>

          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-100 text-lg truncate">{{ spot.name }}</h3>
              <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ spot.description || '无详细备注信息' }}</p>
            </div>
            <div class="flex justify-between items-center mt-4 pt-3 border-t border-slate-850/60">
              <span class="text-[10px] text-slate-500">创建于: {{ new Date(spot.created_at).toLocaleDateString() }}</span>
              <div class="flex gap-2">
                <router-link 
                  :to="`/spot/edit/${spot.id}`" 
                  class="text-xs font-semibold text-slate-400 hover:text-sky-400 px-2 py-1 border border-slate-800 rounded-md bg-slate-950 transition-colors"
                >
                  编辑
                </router-link>
                <router-link 
                  :to="`/spot/${spot.id}`" 
                  class="text-xs font-semibold text-sky-400 hover:text-sky-300 px-2.5 py-1 border border-sky-950/40 rounded-md bg-sky-950/20 transition-colors"
                >
                  查看
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'

const router = useRouter()
const spots = ref([])
const loading = ref(true)
const searchQuery = ref('')
const userEmail = ref('')

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    userEmail.value = user.email
  }
  await fetchSpots()
})

const fetchSpots = async () => {
  loading.value = true
  // RLS 机制自动完成本账户下的数据过滤隔离，拉取当前账号数据
  const { data, error } = await supabase
    .from('fishing_spots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    alert('数据拉取失败：' + error.message)
  } else {
    spots.value = data
  }
  loading.value = false
}

const filteredSpots = computed(() => {
  if (!searchQuery.value) return spots.value
  return spots.value.filter(s => s.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const handleLogout = async () => {
  if (confirm('确认退出系统登录？')) {
    await supabase.auth.signOut()
    router.push('/login')
  }
}
</script>
```

- [ ] **Step 2: 提交代码**

```bash
git add src/views/MySpots.vue
git commit -m "feat: build MySpots handbook page view with query search"
```

---

### Task 7: 钓点新建与编辑表单 (SpotForm)

**Files:**
- Create: `src/views/SpotForm.vue`

- [ ] **Step 1: 编写新建与编辑表单页面组件**

创建 `src/views/SpotForm.vue`。这个组件包含以下三个核心步骤：
1. **自动定位**：进入页面时，利用 Geolocation API 主动捕获当前物理地址，转化为火星坐标系（GCJ-02）并更新地图。
2. **照片 GPS 解析**：提供照片上传按钮。当检测到图片被选择，利用 `exif-js` 服务解析 GPS 元数据。若发现含 GPS 信息，通过 coordtransform 转换为 GCJ-02，并更新地图定位与表单。
3. **坐标存储与图片上传**：用户最终将图片存入 Supabase Storage 的 `fishing-photos` 存储桶（以 `userId/filename` 格式命名防止命名冲突），然后将钓点数据存入 `fishing_spots`。

```vue
<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100">
        {{ isEdit ? '✏️ 编辑钓点' : '➕ 新建钓点' }}
      </h1>
      <button 
        @click="$router.push('/')" 
        class="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-950 transition-colors"
      >
        返回列表
      </button>
    </header>

    <!-- 表单主体 -->
    <main class="flex-1 p-6 space-y-6 max-w-xl mx-auto w-full">
      <!-- 1. 地图微调区域 (高度固定 300px 适配移动端) -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">地图选址 (支持拖拽标记精准微调)</label>
        <div class="h-72 w-full">
          <MapPicker v-model="form.coord" />
        </div>
        <p class="text-[10px] text-slate-500">当前火星坐标：{{ form.coord.lng.toFixed(6) }}, {{ form.coord.lat.toFixed(6) }}</p>
      </div>

      <!-- 2. 照片选择与 EXIF 识别 -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">上传照片 (包含位置的照片可自动提取GPS坐标)</label>
        <div class="flex items-center gap-4">
          <label class="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-center py-4 rounded-xl cursor-pointer text-sm text-slate-300 font-semibold transition-colors active:scale-[0.98] border-dashed">
            <span>📷 选择/拍摄照片</span>
            <input 
              type="file" 
              accept="image/*" 
              @change="handlePhotoSelect" 
              class="hidden" 
            />
          </label>
          <div v-if="photoPreview" class="w-16 h-16 rounded-xl overflow-hidden border border-slate-750 relative bg-slate-900 flex-shrink-0">
            <img :src="photoPreview" class="w-full h-full object-cover" />
            <button @click="clearPhoto" class="absolute top-0 right-0 bg-red-600 text-white rounded-bl-lg p-0.5 active:scale-90" title="移除">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="exifStatus" class="text-xs text-sky-400 font-medium">{{ exifStatus }}</p>
      </div>

      <!-- 3. 基本信息输入 -->
      <div class="space-y-4">
        <div>
          <label for="spot-name" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">钓点名称</label>
          <input
            id="spot-name"
            type="text"
            required
            v-model="form.name"
            class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-sky-500 transition-colors"
            placeholder="例如：万绿湖心湾水口钓位"
          />
        </div>

        <div>
          <label for="spot-desc" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">描述/备注信息</label>
          <textarea
            id="spot-desc"
            rows="3"
            v-model="form.description"
            class="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-sky-500 transition-colors resize-none"
            placeholder="记录下饵料配置、水深、避风位或鱼种分布吧..."
          ></textarea>
        </div>

        <!-- 4. 是否对外开放分享开关 -->
        <div class="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-850">
          <div>
            <h4 class="text-sm font-bold text-slate-200">允许点对点分享</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">开启后可生成分享链接，钓友可克隆该钓点到自己的手帐中</p>
          </div>
          <button 
            type="button"
            @click="form.is_shared = !form.is_shared"
            :class="`w-12 h-6.5 rounded-full p-1 transition-colors ${form.is_shared ? 'bg-sky-500' : 'bg-slate-700'}`"
          >
            <div :class="`w-4.5 h-4.5 bg-white rounded-full transition-transform ${form.is_shared ? 'translate-x-5.5' : 'translate-x-0'}`"></div>
          </button>
        </div>
      </div>

      <!-- 提交按钮 -->
      <button 
        @click="handleSubmit" 
        :disabled="submitting" 
        class="w-full py-4 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {{ submitting ? '正在保存数据...' : '保存至私人手帐' }}
      </button>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { getLatLngFromImage } from '../services/exif'
import { convertWgs84ToGcj02 } from '../services/coord'
import MapPicker from '../components/MapPicker.vue'

const props = defineProps({
  id: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const isEdit = ref(false)
const submitting = ref(false)

const form = ref({
  name: '',
  description: '',
  coord: { lat: 39.9088, lng: 116.3975 },
  is_shared: false
})

const photoFile = ref(null)
const photoPreview = ref('')
const exifStatus = ref('')
let existingImageUrl = ''

onMounted(async () => {
  if (props.id) {
    isEdit.value = true
    await fetchSpotDetail()
  } else {
    // 新建模式，获取设备当前经纬度作为初始定位
    triggerGeolocation()
  }
})

// 定位方法
const triggerGeolocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      // 地球坐标转高德坐标
      const gcj = convertWgs84ToGcj02(pos.coords.longitude, pos.coords.latitude)
      form.value.coord = gcj
    }, (err) => {
      console.warn('Geolocation error', err)
    }, { enableHighAccuracy: true, timeout: 5000 })
  }
}

// 获取详情进行编辑
const fetchSpotDetail = async () => {
  const { data, error } = await supabase
    .from('fishing_spots')
    .select('*')
    .eq('id', props.id)
    .single()

  if (error) {
    alert('钓点数据拉取失败：' + error.message)
    router.push('/')
  } else {
    form.value.name = data.name
    form.value.description = data.description
    form.value.coord = { lat: data.lat, lng: data.lng }
    form.value.is_shared = data.is_shared
    if (data.image_url) {
      photoPreview.value = data.image_url
      existingImageUrl = data.image_url
    }
  }
}

// 图片选择逻辑
const handlePhotoSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
  exifStatus.value = '正在解析照片 GPS 数据...'

  // 解析 GPS
  const rawGps = await getLatLngFromImage(file)
  if (rawGps) {
    // 解析出的 WGS84 转换为 GCJ-02 覆盖当前地图坐标
    const gcj = convertWgs84ToGcj02(rawGps.lng, rawGps.lat)
    form.value.coord = gcj
    exifStatus.value = '✨ 已成功从照片中读取 GPS 位置，地图已同步更新！'
  } else {
    exifStatus.value = '⚠️ 该照片中未包含 GPS 定位元数据'
  }
}

// 移除照片
const clearPhoto = () => {
  photoFile.value = null
  photoPreview.value = ''
  exifStatus.value = ''
}

// 上传至 Supabase Storage
const uploadPhoto = async (userId) => {
  if (!photoFile.value) return existingImageUrl

  // 拼接：userId/时间戳_文件名
  const fileExt = photoFile.value.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('fishing-photos')
    .upload(fileName, photoFile.value, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    throw new Error('照片上传失败：' + error.message)
  }

  // 组装公共 URL
  const { data: urlData } = supabase.storage
    .from('fishing-photos')
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

// 提交表单保存
const handleSubmit = async () => {
  if (!form.value.name) {
    alert('请输入钓点名称！')
    return
  }

  submitting.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('用户登录状态失效，请重新登录')

    // 上传图片
    const uploadedUrl = await uploadPhoto(user.id)

    const payload = {
      name: form.value.name,
      description: form.value.description,
      lat: form.value.coord.lat,
      lng: form.value.coord.lng,
      image_url: uploadedUrl,
      is_shared: form.value.is_shared,
      user_id: user.id
    }

    let error
    if (isEdit.value) {
      const { error: err } = await supabase
        .from('fishing_spots')
        .update(payload)
        .eq('id', props.id)
      error = err
    } else {
      const { error: err } = await supabase
        .from('fishing_spots')
        .insert([payload])
      error = err
    }

    if (error) throw error

    alert('保存成功！')
    router.push('/')
  } catch (err) {
    alert(err.message)
  } finally {
    submitting.value = false
  }
}
</script>
```

- [ ] **Step 2: 提交代码**

```bash
git add src/views/SpotForm.vue
git commit -m "feat: implement spot form logic with GPS EXIF parser and location update"
```

---

### Task 8: 钓点详情与外部地图导航 (SpotDetail)

**Files:**
- Create: `src/views/SpotDetail.vue`

- [ ] **Step 1: 编写详情页面组件**

创建 `src/views/SpotDetail.vue`。这个组件包含以下三个核心步骤：
1. **只读地图展示**：展示该钓点的只读高德卫星地图。
2. **手机地图导航**：提供“高德地图导航”和“百度地图导航”按钮：
   - 百度地图导航需要先使用 `coordtransform` 把坐标由 GCJ-02 转换到 BD-09。
3. **分享管理**：如果钓点开启了 `is_shared` 标志，可以显示“分享给钓友”按钮，并把点对点分享地址（`/share?id=xxx`）拷贝至用户系统粘贴板。如果未开启，可以通过开关即时激活状态。

```vue
<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12" v-if="spot">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100 truncate max-w-[60%]">
        🚩 {{ spot.name }}
      </h1>
      <div class="flex gap-2">
        <button 
          @click="$router.push('/')" 
          class="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-950 transition-colors"
        >
          列表
        </button>
      </div>
    </header>

    <!-- 详情内容 -->
    <main class="flex-1 p-6 space-y-6 max-w-xl mx-auto w-full">
      <!-- 1. 只读地图展示 -->
      <div class="h-64 w-full">
        <MapPicker v-model="location" readonly />
      </div>

      <!-- 2. 实况照片与描述 -->
      <div class="bg-slate-900 rounded-2xl border border-slate-850 p-5 space-y-4">
        <div v-if="spot.image_url" class="h-56 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <img :src="spot.image_url" class="w-full h-full object-cover" alt="钓点实况图" />
        </div>
        <div>
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">描述信息</h3>
          <p class="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {{ spot.description || '暂无备注说明' }}
          </p>
        </div>
      </div>

      <!-- 3. 本地导航唤起 -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">唤起手机本地导航</h3>
        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="navGaode" 
            class="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
          >
            🗺️ 高德地图导航
          </button>
          <button 
            @click="navBaidu" 
            class="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
          >
            🗺️ 百度地图导航
          </button>
        </div>
      </div>

      <!-- 4. 点对点分享管理 -->
      <div class="bg-slate-900/60 rounded-2xl border border-slate-850 p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-slate-200">是否开启分享</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">必须开启方可让钓友只读访问并克隆</p>
          </div>
          <button 
            @click="toggleShareStatus" 
            :class="`w-12 h-6.5 rounded-full p-1 transition-colors ${spot.is_shared ? 'bg-sky-500' : 'bg-slate-700'}`"
          >
            <div :class="`w-4.5 h-4.5 bg-white rounded-full transition-transform ${spot.is_shared ? 'translate-x-5.5' : 'translate-x-0'}`"></div>
          </button>
        </div>

        <div v-if="spot.is_shared" class="pt-3 border-t border-slate-800 flex gap-2">
          <input 
            type="text" 
            readonly 
            :value="shareUrl" 
            class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 select-all"
          />
          <button 
            @click="copyShareLink" 
            class="bg-sky-500 hover:bg-sky-400 text-white font-bold px-3 rounded-lg text-xs"
          >
            复制链接
          </button>
        </div>
      </div>

      <!-- 删除钓点按钮 -->
      <button 
        @click="deleteSpot" 
        class="w-full py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl text-xs font-semibold active:scale-95 transition-all"
      >
        🗑️ 彻底删除该钓点数据
      </button>
    </main>
  </div>
  <div v-else class="flex-1 flex justify-center items-center text-slate-500 text-sm">
    加载中...
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { convertGcj02ToBd09 } from '../services/coord'
import MapPicker from '../components/MapPicker.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const router = useRouter()
const spot = ref(null)
const location = ref({ lat: 39.9088, lng: 116.3975 })

onMounted(async () => {
  await fetchSpot()
})

const fetchSpot = async () => {
  const { data, error } = await supabase
    .from('fishing_spots')
    .select('*')
    .eq('id', props.id)
    .single()

  if (error) {
    alert('钓点数据拉取失败：' + error.message)
    router.push('/')
  } else {
    spot.value = data
    location.value = { lat: data.lat, lng: data.lng }
  }
}

// 分享 URL
const shareUrl = computed(() => {
  return `${window.location.origin}/share?id=${props.id}`
})

// 开启/关闭分享状态
const toggleShareStatus = async () => {
  const newStatus = !spot.value.is_shared
  const { error } = await supabase
    .from('fishing_spots')
    .update({ is_shared: newStatus })
    .eq('id', props.id)

  if (error) {
    alert('修改分享状态失败：' + error.message)
  } else {
    spot.value.is_shared = newStatus
  }
}

// 复制分享链接
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    alert('分享只读链接已复制，去微信发给钓友吧！')
  } catch (err) {
    alert('无法复制，请手动选中输入框链接进行复制')
  }
}

// 高德导航 (GCJ-02)
const navGaode = () => {
  const { lat, lng, name } = spot.value
  // dev=1 代表传入的是火星坐标 (GCJ-02)
  const scheme = `amapuri://navigation?sourceApplication=FishApp&poiname=${encodeURIComponent(name)}&lat=${lat}&lon=${lng}&dev=1&style=2`
  window.location.href = scheme
}

// 百度导航 (BD-09)
const navBaidu = () => {
  const { lat, lng, name } = spot.value
  // 先将火星坐标转为百度坐标
  const bd = convertGcj02ToBd09(lng, lat)
  const scheme = `baidumap://map/direction?destination=latlng:${bd.lat},${bd.lng}|name:${encodeURIComponent(name)}&mode=driving`
  window.location.href = scheme
}

// 删除钓点
const deleteSpot = async () => {
  if (confirm('重要操作：确定永久删除该钓点数据及照片吗？')) {
    // 1. 若有图片，先从 Storage 删除
    if (spot.value.image_url) {
      try {
        const parts = spot.value.image_url.split('/fishing-photos/')
        if (parts.length > 1) {
          const filePath = decodeURIComponent(parts[1])
          await supabase.storage.from('fishing-photos').remove([filePath])
        }
      } catch (err) {
        console.error('Failed to remove image file', err)
      }
    }

    // 2. 从数据库删除
    const { error } = await supabase
      .from('fishing_spots')
      .delete()
      .eq('id', props.id)

    if (error) {
      alert('删除失败：' + error.message)
    } else {
      alert('删除成功！')
      router.push('/')
    }
  }
}
</script>
```

- [ ] **Step 2: 提交代码**

```bash
git add src/views/SpotDetail.vue
git commit -m "feat: implement spot detail page with native maps app scheme triggers"
```

---

### Task 9: 钓友点对点分享与克隆 (ShareDetail)

**Files:**
- Create: `src/views/ShareDetail.vue`

- [ ] **Step 1: 编写分享详情与克隆功能组件**

创建 `src/views/ShareDetail.vue`。逻辑为：
1. 从路由 query 中提取钓点 `id` (`/share?id=xxxx`)。
2. 查询该钓点且必须保证其 `is_shared = true`，否则拒绝显示。
3. 判断当前用户是否登录。若未登录，显示“请先登录系统”按钮导向登录页。
4. 若已登录，提供“存入我的手帐”克隆按钮。克隆按钮点击时，向 `fishing_spots` 表中 Insert 该数据，并设置 `user_id` 为当前用户，`is_shared` 重置为 `false`（防再次不经意散播）。

```vue
<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12" v-if="spot">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100 truncate max-w-[60%]">
        👥 钓友分享：{{ spot.name }}
      </h1>
      <button 
        @click="goHome" 
        class="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-950 transition-colors"
      >
        进入我的手帐
      </button>
    </header>

    <!-- 详情内容 -->
    <main class="flex-1 p-6 space-y-6 max-w-xl mx-auto w-full">
      <!-- 1. 地图展示 -->
      <div class="h-64 w-full">
        <MapPicker v-model="location" readonly />
      </div>

      <!-- 2. 实况照片与描述 -->
      <div class="bg-slate-900 rounded-2xl border border-slate-850 p-5 space-y-4">
        <div v-if="spot.image_url" class="h-56 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <img :src="spot.image_url" class="w-full h-full object-cover" alt="钓点实况图" />
        </div>
        <div>
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">钓点详情描述</h3>
          <p class="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {{ spot.description || '暂无备注说明' }}
          </p>
        </div>
      </div>

      <!-- 3. 克隆机制按钮 -->
      <div class="pt-4">
        <div v-if="currentUser">
          <!-- 已经登录，展示克隆按钮 -->
          <button 
            v-if="!isOwner"
            @click="cloneSpot" 
            :disabled="cloning"
            class="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>📥 存入我的手帐 (克隆钓点)</span>
          </button>
          <div v-else class="text-center text-xs text-slate-500 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
            这是您自己拥有的钓点，无需进行克隆。
          </div>
        </div>
        <div v-else class="text-center space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-850">
          <p class="text-sm text-slate-400">您需要先登录“鱼迹”手帐系统，才能将钓友分享的钓点转存到自己的私人手帐中。</p>
          <button 
            @click="$router.push('/login')" 
            class="inline-block py-2.5 px-6 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
          >
            立即登录手帐系统
          </button>
        </div>
      </div>
    </main>
  </div>
  <div v-else-if="errorMsg" class="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-4">
    <div class="text-4xl">⚠️</div>
    <div class="text-slate-400 text-sm font-semibold">{{ errorMsg }}</div>
    <button @click="goHome" class="text-xs text-sky-400 hover:underline">返回我的主页</button>
  </div>
  <div v-else class="flex-1 flex justify-center items-center text-slate-500 text-sm">
    正在加载钓友分享数据...
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import MapPicker from '../components/MapPicker.vue'

const route = useRoute()
const router = useRouter()

const spot = ref(null)
const location = ref({ lat: 39.9088, lng: 116.3975 })
const currentUser = ref(null)
const cloning = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  const spotId = route.query.id
  if (!spotId) {
    errorMsg.value = '分享链接不合法，未携带钓点标识 ID。'
    return
  }

  // 1. 获取当前登录状态
  const { data: { user } } = await supabase.auth.getUser()
  currentUser.value = user

  // 2. 根据 ID 查询钓点
  if (!user) {
    errorMsg.value = '请先登录系统，以访问钓友分享的数据。'
    return
  }

  const { data, error } = await supabase
    .from('fishing_spots')
    .select('*')
    .eq('id', spotId)
    .single()

  if (error || !data) {
    errorMsg.value = '该钓点不存在，或钓友已关闭其分享权限。'
  } else {
    spot.value = data
    location.value = { lat: data.lat, lng: data.lng }
  }
})

const isOwner = computed(() => {
  if (!currentUser.value || !spot.value) return false
  return currentUser.value.id === spot.value.user_id
})

// 克隆拷贝动作
const cloneSpot = async () => {
  if (!currentUser.value || !spot.value) return
  cloning.value = true
  
  try {
    const payload = {
      name: `${spot.value.name} (来自钓友)`,
      description: spot.value.description,
      lat: spot.value.lat,
      lng: spot.value.lng,
      image_url: spot.value.image_url,
      is_shared: false, // 存入我自己的手帐后默认私有
      user_id: currentUser.value.id
    }

    const { error } = await supabase
      .from('fishing_spots')
      .insert([payload])

    if (error) throw error

    alert('🎣 克隆转存成功！已成功添加至您的私人手帐中。')
    router.push('/')
  } catch (err) {
    alert('存入手帐失败：' + err.message)
  } finally {
    cloning.value = false
  }
}

const goHome = () => {
  router.push('/')
}
</script>
```

- [ ] **Step 2: 提交代码**

```bash
git add src/views/ShareDetail.vue
git commit -m "feat: build ShareDetail view and point-to-point spot cloning action"
```
