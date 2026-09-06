import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import type { Database } from '@/types/database'
import SuperAdminClient from './SuperAdminClient'

type Org = Database['public']['Tables']['organizations']['Row']

export default async function SuperAdminPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as Database['public']['Tables']['profiles']['Row'] | null
  const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role

  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'client') redirect('/client/dashboard')
  if (role !== 'super_admin') {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Super Admin Access Required</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Your account does not have Super Admin privileges.</p>
        <a href="/auth" style={{ color: '#0066cc', marginTop: 16, display: 'inline-block' }}>Back to Login</a>
      </div>
    )
  }

  // Fetch all orgs
  const adminClient = createSupabaseAdmin()
  const { data: rawOrgs } = await adminClient
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  const orgs = (rawOrgs ?? []) as Org[]

  // Per-org stats and admin profiles
  const orgStats: Record<string, { clients: number; mrr_cents: number }> = {}
  const orgAdmins: Record<string, { id: string; email: string; full_name: string | null; role: string; created_at: string } | null> = {}

  for (const org of orgs) {
    const { count: clients } = await adminClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)

    const { data: mrrData } = await adminClient
      .from('org_mrr')
      .select('mrr_cents')
      .eq('org_id', org.id)
      .single()

    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('org_id', org.id)
      .eq('role', 'admin')
      .maybeSingle()

    orgStats[org.id] = {
      clients: clients ?? 0,
      mrr_cents: (mrrData as { mrr_cents?: number } | null)?.mrr_cents ?? 0,
    }

    orgAdmins[org.id] = adminProfile as { id: string; email: string; full_name: string | null; role: string; created_at: string } | null
  }

  return (
    <SuperAdminClient
      superAdmin={{ name: profile?.full_name || profile?.email || 'Super Admin' }}
      orgs={orgs}
      orgStats={orgStats}
      orgAdmins={orgAdmins}
    />
  )
}
