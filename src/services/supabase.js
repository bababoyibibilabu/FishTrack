import { createClient } from '@supabase/supabase-js'

// 使用 Vite 环境变量，若缺失则降级为占位符以便开发调试
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (import.meta.env.DEV && (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder'))) {
  console.warn('Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
