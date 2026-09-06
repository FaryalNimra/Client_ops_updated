import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AdminTopbar from '@/components/AdminTopbar'

export const dynamic = 'force-dynamic'

export default async function OrgWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const adminClient = createSupabaseAdmin()

  // Find organization by slug safely using adminClient (bypasses RLS)
  const { data: rawOrg, error: orgError } = await adminClient
    .from('organizations')
    .select('id, name, slug, suspended')
    .eq('slug', slug)
    .single()

  const org = rawOrg as { id: string; name: string; slug: string; suspended: boolean } | null

  if (orgError || !org) {
    notFound()
  }

  // Fetch profile safely using adminClient
  const { data: rawProfile } = await adminClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { role: string; org_id: string | null } | null

  if (profile?.role === 'client') {
    redirect('/client/dashboard')
  }

  // Super admin has access to any org workspace; Org admin must match org_id
  if (!profile || (profile.role !== 'super_admin' && profile.org_id !== org.id)) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#888', marginTop: 8 }}>You do not have access to the &quot;{org.name}&quot; workspace.</p>
        <a href="/auth" style={{ color: '#E8440A', marginTop: 16, display: 'inline-block' }}>Back to Login</a>
      </div>
    )
  }

  // Failed payment count for sidebar warning
  const { count: failedCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'past_due')

  // Open requests count for badge
  const { count: openRequestsCount } = await supabase
    .from('change_requests')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .in('status', ['new', 'in_progress', 'needs_client_input'])

  return (
    <div className="app-layout">
      <Sidebar
        role={profile.role as 'admin' | 'super_admin'}
        orgName={org.name}
        orgSlug={org.slug}
        failedCount={failedCount ?? 0}
        openRequestsCount={openRequestsCount ?? 0}
      />
      <main className="main-content">
        <AdminTopbar
          role={profile.role as 'admin' | 'super_admin'}
          orgName={org.name}
          orgSlug={org.slug}
          userEmail={user.email}
        />
        {children}
      </main>
    </div>
  )
}
