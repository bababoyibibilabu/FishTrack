<template>
  <div class="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-800">
    <div ref="mapContainer" class="w-full h-full bg-slate-900 z-10"></div>
    <div v-if="!readonly" class="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <button 
        type="button"
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
  const initialLat = (props.modelValue && typeof props.modelValue.lat === 'number') ? props.modelValue.lat : DEFAULT_LAT
  const initialLng = (props.modelValue && typeof props.modelValue.lng === 'number') ? props.modelValue.lng : DEFAULT_LNG

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
  if (map && marker && newVal && typeof newVal.lat === 'number' && typeof newVal.lng === 'number') {
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
