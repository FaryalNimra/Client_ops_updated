import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientNavbar from './ClientNavbar'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Verify client role
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, full_name, email, client_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { role: string; full_name: string | null; email: string; client_id: string | null } | null

  if (profile?.role === 'super_admin') {
    redirect('/super-admin')
  }
  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  }

  if (!profile) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Account Setup Required</h2>
        <p style={{ color: '#666', marginTop: 8 }}>Your profile is not setup as a client account yet.</p>
        <a href="/auth" style={{ color: '#0066cc', marginTop: 16, display: 'inline-block' }}>Back to Login</a>
      </div>
    )
  }

  // Get client company name if available
  let businessName = 'Client Portal'
  if (profile.client_id) {
    const { data: rawClient } = await supabase
      .from('clients')
      .select('business_name')
      .eq('id', profile.client_id)
      .single()
    const client = rawClient as { business_name: string } | null
    if (client?.business_name) {
      businessName = client.business_name
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>
      <ClientNavbar
        email={profile.email}
        name={profile.full_name || profile.email}
        businessName={businessName}
      />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  )
}
