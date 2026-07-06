<template>
  <div class="flex-1 flex flex-col bg-slate-950 pb-12">
    <!-- 头部栏 -->
    <header class="bg-slate-900 border-b border-slate-800 px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center sticky top-0 z-50">
      <h1 class="text-lg font-bold text-slate-100">
        {{ isEdit ? '✏️ 编辑钓点' : '➕ 新建钓点' }}
      </h1>
      <button 
        type="button"
        @click="router.push('/')" 
        class="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg bg-slate-950 transition-colors"
      >
        返回列表
      </button>
    </header>

    <!-- 表单主体 -->
    <form @submit.prevent="handleSubmit" class="flex-1 p-6 space-y-6 max-w-xl mx-auto w-full">
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
          <label class="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-center py-4 rounded-xl cursor-pointer text-sm text-slate-300 font-semibold transition-colors active:scale-[0.98] border-dashed">
            <span>📷 选择/拍摄照片</span>
            <input 
              type="file" 
              accept="image/*" 
              @change="handlePhotoSelect" 
              class="hidden" 
            />
          </label>
          <div v-if="photoPreview" class="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 relative bg-slate-900 flex-shrink-0">
            <img :src="photoPreview" class="w-full h-full object-cover" />
            <button type="button" @click="clearPhoto" class="absolute top-0 right-0 bg-red-600 text-white rounded-bl-lg p-0.5 active:scale-90" title="移除">
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
        <div class="flex items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
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
        type="submit"
        :disabled="submitting" 
        class="w-full py-4 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {{ submitting ? '正在保存数据...' : '保存至私人手帐' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('fishing_spots')
      .select('*')
      .eq('id', props.id)
      .single()

    if (error) {
      alert('钓点数据拉取失败：' + error.message)
      router.push('/')
    } else {
      // 检查编辑所有权，若当前用户非所有者，拦截并重定向到主页
      if (data.user_id !== user?.id) {
        alert('越权操作：您没有权限编辑此钓点数据！')
        router.push('/')
        return
      }
      form.value.name = data.name
      form.value.description = data.description
      form.value.coord = { lat: data.lat, lng: data.lng }
      form.value.is_shared = data.is_shared
      if (data.image_url) {
        photoPreview.value = data.image_url
        existingImageUrl = data.image_url
      }
    }
  } catch (err) {
    console.error('Error fetching spot detail:', err)
    alert('网络错误，无法加载数据')
    router.push('/')
  }
}

// 图片选择逻辑
const handlePhotoSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 释放之前的临时 URL 以免内存泄漏
  if (photoPreview.value && photoPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(photoPreview.value)
  }

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
  if (photoPreview.value && photoPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(photoPreview.value)
  }
  photoFile.value = null
  photoPreview.value = ''
  exifStatus.value = ''
}

// 上传至 Supabase Storage
const uploadPhoto = async (userId) => {
  if (!photoPreview.value) return '' // 照片被显式清空
  if (!photoFile.value) return existingImageUrl

  // 拼接：userId/时间戳_文件名 (增加 fallback 扩展名)
  const fileExt = photoFile.value.name.split('.').pop() || 'jpg'
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
onBeforeUnmount(() => {
  if (photoPreview.value && photoPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(photoPreview.value)
  }
})
</script>
