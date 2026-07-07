<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12" v-if="spot">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100 truncate max-w-[60%]">
        👥 钓友分享：{{ spot.name }}
      </h1>
      <button 
        type="button"
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
      <div class="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div v-if="spot.image_url" class="h-56 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-zoom-in relative group">
          <img 
            :src="spot.image_url" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            alt="钓点实况图" 
            @click="isImageExpanded = true"
          />
          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span class="bg-slate-900/80 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sky-400">
              🔍 点击放大查看
            </span>
          </div>
        </div>
        <div>
          <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">钓点详情描述</h3>
          <p class="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {{ spot.description || '暂无备注说明' }}
          </p>
        </div>
      </div>

      <!-- 3. 克隆机制按钮 -->
      <div class="pt-4" v-if="currentUser">
        <!-- 已经登录，展示克隆按钮 -->
        <button 
          type="button"
          v-if="!isOwner"
          @click="cloneSpot" 
          :disabled="cloning"
          class="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>📥 存入我的手帐 (克隆钓点)</span>
        </button>
        <div v-else class="text-center text-xs text-slate-500 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          这是您自己拥有的钓点，无需进行克隆。
        </div>
      </div>
    </main>
    <!-- 全屏图片查看模态框 -->
    <transition name="modal-fade">
      <div 
        v-if="isImageExpanded && spot.image_url" 
        class="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        @click="isImageExpanded = false"
      >
        <div class="relative max-w-full max-h-full flex items-center justify-center">
          <img 
            :src="spot.image_url" 
            class="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            alt="钓点实况大图"
            @click.stop
          />
          <button 
            @click="isImageExpanded = false"
            class="absolute -top-12 right-0 bg-slate-900/80 text-slate-300 rounded-full p-2 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </transition>
  </div>
  <div v-else-if="errorMsg" class="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-4 bg-slate-950 min-h-screen">
    <div class="text-4xl">⚠️</div>
    <div class="text-slate-400 text-sm font-semibold">{{ errorMsg }}</div>
    <button 
      v-if="!currentUser"
      type="button" 
      @click="$router.push('/login')" 
      class="inline-block py-2.5 px-6 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
    >
      请先登录系统
    </button>
    <button type="button" @click="goHome" class="text-xs text-sky-400 hover:underline" v-else>返回我的主页</button>
  </div>
  <div v-else class="flex-1 flex justify-center items-center text-slate-500 text-sm bg-slate-950 min-h-screen">
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
const isImageExpanded = ref(false)
const cloning = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  const spotId = route.query.id
  if (!spotId) {
    errorMsg.value = '分享链接不合法，未携带钓点标识 ID。'
    return
  }

  try {
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
      .eq('is_shared', true)
      .single()

    if (error || !data) {
      errorMsg.value = '该钓点不存在，或钓友已关闭其分享权限。'
    } else {
      spot.value = data
      location.value = { lat: data.lat, lng: data.lng }
    }
  } catch (err) {
    console.error('Error fetching share spot:', err)
    errorMsg.value = '网络异常，获取分享数据失败'
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
    let clonedImageUrl = spot.value.image_url

    // 解决图片依赖冲突：克隆时复制 Storage 内的对应照片文件到当前克隆用户文件夹下，确保数据独立
    if (spot.value.image_url) {
      try {
        const parts = spot.value.image_url.split('/fishing-photos/')
        if (parts.length > 1) {
          const fromPath = decodeURIComponent(parts[1])
          const filename = fromPath.split('/').pop()
          const toPath = `${currentUser.value.id}/cloned_${Date.now()}_${filename}`

          const { error: copyError } = await supabase.storage
            .from('fishing-photos')
            .copy(fromPath, toPath)

          if (!copyError) {
            const { data: urlData } = supabase.storage
              .from('fishing-photos')
              .getPublicUrl(toPath)
            clonedImageUrl = urlData.publicUrl
          } else {
            console.warn('Storage image copy failed, using original url reference as fallback:', copyError)
          }
        }
      } catch (imageErr) {
        console.error('Error copying shared photo in storage:', imageErr)
      }
    }

    const payload = {
      name: `${spot.value.name} (来自钓友)`,
      description: spot.value.description,
      lat: spot.value.lat,
      lng: spot.value.lng,
      image_url: clonedImageUrl,
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

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active img {
  animation: zoom-in 0.3s ease;
}
.modal-fade-leave-active img {
  animation: zoom-in 0.3s ease reverse;
}
@keyframes zoom-in {
  from {
    transform: scale(0.9);
  }
  to {
    transform: scale(1);
  }
}
</style>
