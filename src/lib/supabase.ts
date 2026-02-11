import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // 빌드 시 환경변수가 없을 수 있음 - 더미 클라이언트 반환
    return createBrowserClient<any>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(supabaseUrl, supabaseKey)
}
