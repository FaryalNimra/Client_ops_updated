import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Plus, Search, Users } from 'lucide-react'
import { syncClientWithStripe } from '@/lib/stripeSync'

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function formatCents(cents: number | null, currency = 'EUR') {
  if (!cents) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(cents / 100)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getInitials(name: string) {
  if (!name) return 'CO'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
  'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
  'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
  'linear-gradient(135deg, #059669 0%, #34D399 100%)',
  'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)',
  'linear-gradient(135deg, #DB2777 0%, #F472B6 100%)',
  'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export default async function ClientsPageView({
  orgSlug,
  searchParams = {},
}: {
  orgSlug?: string
  searchParams?: { status?: string; q?: string }
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const adminClient = createSupabaseAdmin()

  const { data: rawProfile } = await adminClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { role: string; org_id: string | null } | null

  let orgId = profile?.org_id

  if (orgSlug && (!orgId || profile?.role === 'super_admin')) {
    const { data: orgData } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle()
    if (orgData?.id) {
      orgId = orgData.id
    }
  }

  const basePrefix = orgSlug ? `/org/${orgSlug}` : '/admin'

  let query = adminClient
    .from('clients')
    .select('id, business_name, contact_name, email, status, plan_price_cents, currency, purchase_date, created_at, country, stripe_customer_id, stripe_subscription_id')
    .order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  }

  if (searchParams.status) query = query.eq('status', searchParams.status as never)
  if (searchParams.q)      query = query.ilike('business_name', `%${searchParams.q}%`)

  let { data: clients } = await query.limit(200)

  // Auto-sync any onboarding clients in background so directory is always up-to-date
  if (clients && clients.length > 0) {
    const onboardingClients = clients.filter(c => c.status === 'onboarding')
    if (onboardingClients.length > 0) {
      const syncedResults = await Promise.all(onboardingClients.map(c => syncClientWithStripe(c.id)))
      clients = clients.map(c => {
        const synced = syncedResults.find(s => s?.id === c.id)
        return synced || c
      })
    }
  }

  const STATUSES = ['lead', 'onboarding', 'active', 'past_due', 'paused', 'churned']

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients Directory</h1>
          <p className="page-subtitle">{clients?.length ?? 0} total client record{clients?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href={`${basePrefix}/onboard`} id="onboard-btn" className="btn btn-primary">
          <Plus size={16} />
          <span>Onboard client</span>
        </Link>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center justify-between">
          <div className="search-bar" style={{ minWidth: 280 }}>
            <Search className="search-bar-icon" size={16} />
            <form style={{ width: '100%' }}>
              <input
                id="client-search"
                name="q"
                type="search"
                className="form-input"
                placeholder="Search by company or client name…"
                defaultValue={searchParams.q ?? ''}
              />
            </form>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Link
              href={`${basePrefix}/clients`}
              id="filter-all"
              className={`btn btn-sm ${!searchParams.status ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </Link>
            {STATUSES.map(s => (
              <Link
                key={s}
                href={`${basePrefix}/clients?status=${s}`}
                id={`filter-${s}`}
                className={`btn btn-sm ${searchParams.status === s ? 'btn-primary' : 'btn-secondary'}`}
              >
                {s.replace(/_/g, ' ')}
              </Link>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            {clients && clients.length > 0 ? (
              <table className="table" id="clients-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Contact</th>
                    <th>Stage</th>
                    <th>Payment Status</th>
                    <th>Plan</th>
                    <th>Country</th>
                    <th>Since</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(clients as unknown as Record<string, unknown>[])?.map(client => {
                    const isPaid = client.status === 'active' || !!client.stripe_subscription_id
                    const businessName = String(client.business_name || 'Client')
                    return (
                      <tr key={String(client.id)} id={`client-row-${String(client.id)}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: getAvatarGradient(businessName),
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                              }}
                            >
                              {getInitials(businessName)}
                            </div>
                            <div>
                              <Link
                                href={`${basePrefix}/clients/${String(client.id)}`}
                                style={{ fontWeight: 600, color: 'var(--color-text)' }}
                              >
                                {businessName}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted">{client.contact_name ? String(client.contact_name) : '—'}</td>
                        <td><StatusBadge status={String(client.status)} /></td>
                        <td>
                          <Link href={`${basePrefix}/clients/${String(client.id)}`} style={{ textDecoration: 'none' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 99,
                              background: isPaid ? 'var(--color-success-dim)' : 'var(--color-warning-dim)',
                              color: isPaid ? 'var(--color-success)' : 'var(--color-warning)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}>
                              <span style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: isPaid ? 'var(--color-success)' : 'var(--color-warning)',
                              }} />
                              {isPaid ? 'Paid & Active' : 'Unpaid (Send Link ↗)'}
                            </span>
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {formatCents(client.plan_price_cents as number | null, String(client.currency ?? 'EUR'))}
                        </td>
                        <td className="text-muted">{client.country ? String(client.country) : '—'}</td>
                        <td className="text-muted">{formatDate(client.created_at as string | null)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            href={`${basePrefix}/clients/${String(client.id)}`}
                            id={`open-${String(client.id)}`}
                            className="btn btn-ghost btn-sm"
                            title="View & Manage Client"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <p className="text-muted">No clients found.{' '}
                  <Link href={`${basePrefix}/onboard`} className="text-primary font-semibold">Onboard your first →</Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
