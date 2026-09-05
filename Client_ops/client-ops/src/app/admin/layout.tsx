import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Fetch profile + org name
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { role: string; org_id: string | null } | null
  const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role

  if (profile?.role === 'client') {
    redirect('/client/dashboard')
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Admin access required.</p>
        <a href="/auth" style={{ color: '#0066cc', marginTop: 16, display: 'inline-block' }}>Back to Login</a>
      </div>
    )
  }

  // If user is an org admin, redirect to their custom slug workspace
  if (profile.role === 'admin' && profile.org_id) {
    const { data: rawOrg } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', profile.org_id)
      .single()
    
    const org = rawOrg as { name: string; slug: string } | null
    if (org?.slug) {
      redirect(`/org/${org.slug}/dashboard`)
    }
  }

  // Org name for sidebar label (fallback)
  let orgName: string | undefined
  let orgSlug: string | undefined
  if (profile.org_id) {
    const { data: rawOrg } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', profile.org_id)
      .single()
    orgName = (rawOrg as { name: string } | null)?.name
    orgSlug = (rawOrg as { slug: string } | null)?.slug
  }

  // Failed payment count for sidebar warning
  const { count: failedCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'past_due')

  // Open requests count for badge
  const { count: openRequestsCount } = await supabase
    .from('change_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['new', 'in_progress', 'needs_client_input'])

  return (
    <div className="app-layout">
      <Sidebar
        role={profile.role as 'admin' | 'super_admin'}
        orgName={orgName}
        failedCount={failedCount ?? 0}
        openRequestsCount={openRequestsCount ?? 0}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
