import { createSupabaseServer } from '@/lib/supabase/server'
import LandingPageClient from './LandingPageClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: {
    role: string
    organization_id?: string | null
    full_name?: string | null
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, organization_id, full_name')
      .eq('id', user.id)
      .single()

    profile = data as {
      role: string
      organization_id?: string | null
      full_name?: string | null
    } | null
  }

  return (
    <LandingPageClient
      user={user ? { id: user.id, email: user.email } : null}
      profile={profile}
    />
  )
}
