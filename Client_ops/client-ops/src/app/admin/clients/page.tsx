import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { ExternalLink, Plus } from 'lucide-react'

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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as { role: string; org_id: string | null } | null

  let query = supabase
    .from('clients')
    .select('id, business_name, contact_name, email, status, plan_price_cents, currency, purchase_date, created_at, country, stripe_customer_id, stripe_subscription_id')
    .order('created_at', { ascending: false })

  if (profile?.org_id) {
    query = query.eq('org_id', profile.org_id)
  }

  if (searchParams.status) query = query.eq('status', searchParams.status as never)
  if (searchParams.q)      query = query.ilike('business_name', `%${searchParams.q}%`)

  const { data: clients } = await query.limit(200)

  const STATUSES = ['lead', 'onboarding', 'active', 'past_due', 'paused', 'churned']

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients?.length ?? 0} records</p>
        </div>
        <Link href="./onboard" id="onboard-btn" className="btn btn-primary">
          <Plus size={16} /> Onboard client
        </Link>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="search-bar">
            <svg className="search-bar-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <form>
              <input
                id="client-search"
                name="q"
                type="search"
                className="form-input"
                placeholder="Search business name…"
                defaultValue={searchParams.q ?? ''}
              />
            </form>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Link
              href="./clients"
              id="filter-all"
              className={`btn btn-sm ${!searchParams.status ? 'btn-primary' : 'btn-secondary'}`}
            >
              All
            </Link>
            {STATUSES.map(s => (
              <Link
                key={s}
                href={`./clients?status=${s}`}
                id={`filter-${s}`}
                className={`btn btn-sm ${searchParams.status === s ? 'btn-primary' : 'btn-secondary'}`}
              >
                {s.replace(/_/g, ' ')}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
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
                  return (
                    <tr key={String(client.id)} id={`client-row-${String(client.id)}`}>
                      <td>
                        <Link href={`./clients/${String(client.id)}`} style={{ fontWeight: 600 }}>
                          {String(client.business_name)}
                        </Link>
                      </td>
                      <td className="text-muted">{client.contact_name ? String(client.contact_name) : '—'}</td>
                      <td><StatusBadge status={String(client.status)} /></td>
                      <td>
                        <Link href={`./clients/${String(client.id)}`} style={{ textDecoration: 'none' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 99,
                            background: isPaid ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                            color: isPaid ? '#22C55E' : '#F59E0B',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isPaid ? '#22C55E' : '#F59E0B' }} />
                            {isPaid ? 'Paid & Active' : 'Unpaid (Send Link ↗)'}
                          </span>
                        </Link>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {formatCents(client.plan_price_cents as number | null, String(client.currency ?? 'EUR'))}
                      </td>
                      <td className="text-muted">{client.country ? String(client.country) : '—'}</td>
                      <td className="text-muted">{formatDate(client.created_at as string | null)}</td>
                      <td>
                        <Link href={`./clients/${String(client.id)}`} id={`open-${String(client.id)}`} className="btn btn-ghost btn-sm" title="View & Manage Client">
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
              <p className="text-muted">No clients found.{' '}
                <Link href="/admin/onboard" className="text-primary">Onboard your first →</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
