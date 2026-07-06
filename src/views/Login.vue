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
          <!-- 账号密码登录模式 -->
          <div v-if="isPasswordMode" class="space-y-4">
            <div>
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
            <div>
              <label for="password" class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">密码</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                v-model="password"
                class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-sky-500 transition-colors text-base"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <!-- 免密验证码模式 -->
          <div v-else class="space-y-4">
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
        </div>

        <div>
          <!-- 核心逻辑控制 -->
          <button
            @click="handleSubmit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 focus:outline-none transition-all disabled:opacity-50"
          >
            <span v-if="loading">加载中...</span>
            <span v-else-if="isPasswordMode">确认登录</span>
            <span v-else-if="!otpSent">发送免密登录验证码</span>
            <span v-else>确认登录</span>
          </button>

          <button
            v-if="otpSent && !isPasswordMode"
            @click="otpSent = false"
            class="w-full text-center text-xs text-sky-400 mt-4 hover:underline"
          >
            返回修改邮箱
          </button>

          <!-- 模式切换按钮 -->
          <button
            @click="isPasswordMode = !isPasswordMode; otpSent = false; message = '';"
            class="w-full text-center text-xs text-slate-500 mt-4 hover:underline block"
          >
            {{ isPasswordMode ? '切换为免密验证码登录' : '切换为密码登录 (免 SMTP 配置)' }}
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
const password = ref('')
const token = ref('')
const otpSent = ref(false)
const isPasswordMode = ref(false)
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

  if (isPasswordMode.value) {
    // 密码登录模式
    if (!password.value) {
      showMsg('请输入密码', true)
      loading.value = false
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    loading.value = false
    if (error) {
      showMsg(error.message, true)
    } else {
      router.push('/')
    }
    return
  }

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
