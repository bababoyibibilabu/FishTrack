<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12" v-if="spot">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100 truncate max-w-[60%]">
        🚩 {{ spot.name }}
      </h1>
      <div class="flex gap-2">
        <button 
          type="button"
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
      <div class="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
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

      <!-- 3. 本地手机导航唤起 (核心需求 5) -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">唤起手机本地导航</h3>
        <div class="grid grid-cols-2 gap-3">
          <button 
            type="button"
            @click="navGaode" 
            class="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
          >
            🗺️ 高德地图导航
          </button>
          <button 
            type="button"
            @click="navBaidu" 
            class="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl text-sm transition-all"
          >
            🗺️ 百度地图导航
          </button>
        </div>
      </div>

      <!-- 4. 点对点分享管理 (核心需求 6) -->
      <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-slate-200">是否开启分享</h4>
            <p class="text-[10px] text-slate-500 mt-0.5">必须开启方可让钓友只读访问并克隆</p>
          </div>
          <button 
            type="button"
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
            type="button"
            @click="copyShareLink" 
            class="bg-sky-500 hover:bg-sky-400 text-white font-bold px-3 rounded-lg text-xs"
          >
            复制链接
          </button>
        </div>
      </div>

      <!-- 删除钓点按钮 -->
      <button 
        type="button"
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
  try {
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
  } catch (err) {
    console.error('Error fetching spot:', err)
    alert('网络错误，无法加载钓点数据')
    router.push('/')
  }
}

// 分享 URL
const shareUrl = computed(() => {
  return `${window.location.origin}/share?id=${props.id}`
})

// 开启/关闭分享状态
const toggleShareStatus = async () => {
  const newStatus = !spot.value.is_shared
  try {
    const { error } = await supabase
      .from('fishing_spots')
      .update({ is_shared: newStatus })
      .eq('id', props.id)

    if (error) {
      alert('修改分享状态失败：' + error.message)
    } else {
      spot.value.is_shared = newStatus
    }
  } catch (err) {
    console.error('Error toggling share status:', err)
    alert('网络错误，修改分享状态失败')
  }
}

// 复制分享链接
const copyShareLink = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl.value)
    } else {
      // 移动端/微信 Webview 兼容性剪贴板复制降级
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl.value
      textarea.style.position = 'fixed'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    alert('分享只读链接已复制，去微信发给钓友吧！')
  } catch (err) {
    alert('无法复制，请手动选中输入框链接进行复制')
  }
}

// 高德导航 (GCJ-02)
const navGaode = () => {
  const { lat, lng, name } = spot.value
  // dev=0 代表传入的是火星坐标 (GCJ-02)，高德地图将正确显示不发生坐标偏移。
  const scheme = `amapuri://navigation?sourceApplication=FishApp&poiname=${encodeURIComponent(name)}&lat=${lat}&lon=${lng}&dev=0&style=2`
  window.location.href = scheme
}

// 百度导航 (BD-09)
const navBaidu = () => {
  const { lat, lng, name } = spot.value
  // 先将火星坐标转为百度坐标
  const bd = convertGcj02ToBd09(lng, lat)
  const scheme = `baidumap://map/direction?destination=latlng:${bd.lat},${bd.lng}|name:${encodeURIComponent(name)}&mode=driving&coord_type=bd09ll&src=webapp.FishTrack.FishApp`
  window.location.href = scheme
}

// 删除钓点
const deleteSpot = async () => {
  if (confirm('重要操作：确定永久删除该钓点数据及照片吗？')) {
    try {
      // 1. 若有图片，先从 Storage 删除
      if (spot.value.image_url) {
        try {
          const parts = spot.value.image_url.split('/fishing-photos/')
          if (parts.length > 1) {
            const filePath = decodeURIComponent(parts[1])
            await supabase.storage.from('fishing-photos').remove([filePath])
          }
        } catch (err) {
          console.error('Failed to remove image file from storage', err)
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
    } catch (err) {
      console.error('Error deleting spot:', err)
      alert('网络错误，删除失败')
    }
  }
}
</script>
