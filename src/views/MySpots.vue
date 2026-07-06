<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-16">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center sticky top-0 z-50">
      <div>
        <h1 class="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span>🎣 我的手帐</span>
        </h1>
        <p class="text-xs text-slate-400">已登录：{{ userEmail }}</p>
      </div>
      <button 
        type="button"
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
      <div v-else-if="filteredSpots.length === 0" class="text-center py-20 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-2xl">
        📪 还没有任何私密钓点，点击右上方“新建”开始吧！
      </div>
      <div v-else class="grid gap-4 sm:grid-cols-2">
        <!-- 钓点卡片 -->
        <div 
          v-for="spot in filteredSpots" 
          :key="spot.id" 
          class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col"
        >
          <div class="h-40 bg-slate-800 relative">
            <img 
              v-if="spot.image_url" 
              :src="spot.image_url" 
              class="w-full h-full object-cover" 
              alt="钓点实况"
            />
            <div v-else class="w-full h-full flex flex-col justify-center items-center text-slate-600 bg-slate-800">
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
            <div class="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/60">
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
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userEmail.value = user.email
    }
  } catch (err) {
    console.error('Error fetching user info:', err)
  }
  await fetchSpots()
})

const fetchSpots = async () => {
  loading.value = true
  try {
    // RLS 机制自动完成本账户下的数据过滤隔离，拉取当前账号数据
    const { data, error } = await supabase
      .from('fishing_spots')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert('数据拉取失败：' + error.message)
    } else {
      spots.value = data || []
    }
  } catch (err) {
    console.error('Error fetching spots:', err)
    alert('网络请求失败，请稍后重试！')
  } finally {
    loading.value = false
  }
}

const filteredSpots = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return spots.value
  return spots.value.filter(s => (s.name || '').toLowerCase().includes(query))
})

const handleLogout = async () => {
  if (confirm('确认退出系统登录？')) {
    await supabase.auth.signOut()
    router.push('/login')
  }
}
</script>
