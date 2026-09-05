import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// createBrowserClient uses COOKIES (not localStorage)
// so the session is visible to the server-side middleware
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
)
