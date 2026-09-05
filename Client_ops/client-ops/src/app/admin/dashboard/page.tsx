import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { AlertCircle, ExternalLink } from 'lucide-react'
import ReminderActionButton from './ReminderActionButton'
import DunningTimeline from './DunningTimeline'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']
type ActivityLog = Database['public']['Tables']['activity_log']['Row']

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.replace(/_/g, '_')}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

function formatCents(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth')

  const orgId = (profile as { org_id: string | null } | null)?.org_id ?? ''

  // ── Data fetches (parallel filtered strictly by org_id) ──
  const [
    { data: pastDueClients },
    { data: clients },
    { data: mrrData },
    { data: failedThisMonth },
    { count: openRequests },
    { data: recentActivity },
    { data: dunningActivity },
  ] = await Promise.all([
    // Past-due clients for alert strip
    supabase
      .from('clients')
      .select('id, business_name, email, contact_name, plan_price_cents, currency, stripe_subscription_id')
      .eq('org_id', orgId)
      .eq('status', 'past_due')
      .order('created_at', { ascending: false })
      .limit(10),

    // All clients for table
    supabase
      .from('clients')
      .select('id, business_name, contact_name, email, status, plan_price_cents, currency, purchase_date, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),

    // MRR view
    supabase
      .from('org_mrr')
      .select('active_clients, mrr_cents')
      .eq('org_id', orgId),

    // Failed payments this month
    supabase
      .from('invoices')
      .select('stripe_invoice_id', { count: 'exact' })
      .eq('org_id', orgId)
      .eq('status', 'uncollectible')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    // Open change requests count
    supabase
      .from('change_requests')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['new', 'in_progress', 'needs_client_input']),

    // Recent activity
    supabase
      .from('activity_log')
      .select('id, action, payload, created_at, client_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),

    // Dunning: most recent payment_failed per client (past 35 days)
    supabase
      .from('activity_log')
      .select('client_id, created_at')
      .eq('org_id', orgId)
      .eq('action', 'payment_failed')
      .gte('created_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const stats = mrrData?.[0] as { active_clients?: number; mrr_cents?: number } | undefined
  const activeCount   = stats?.active_clients ?? 0
  const mrrCents      = stats?.mrr_cents ?? 0
  const failedCount   = failedThisMonth?.length ?? 0
  const openCount     = openRequests ?? 0

  // Build dunning clients map: latest payment_failed timestamp per client
  const pastDueArr = (pastDueClients as unknown as Client[]) ?? []
  const dunningMap: Record<string, string> = {}
  ;(dunningActivity ?? []).forEach((row: Record<string, unknown>) => {
    const cid = String(row.client_id)
    if (!dunningMap[cid]) dunningMap[cid] = String(row.created_at)
  })
  const dunningClients = pastDueArr
    .filter(c => dunningMap[c.id])
    .map(c => ({ ...c, status: c.status, failed_at: dunningMap[c.id] }))

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/admin/onboard" id="onboard-new-btn" className="btn btn-primary">
          + Onboard client
        </Link>
      </div>

      <div className="page-body">
        {/* ── Alert Strip ───────────────────────────────── */}
        {pastDueArr.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastDueArr.map((client) => (
              <div key={client.id} className="alert-strip" id={`alert-past-due-${client.id}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 600 }}>{client.business_name}</span>
                    <span className="text-muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                      — payment failed ·{' '}
                      {client.plan_price_cents
                        ? formatCents(client.plan_price_cents, client.currency ?? 'EUR')
                        : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/admin/clients/${client.id}`} id={`view-client-${client.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>
                  <ReminderActionButton
                    clientId={client.id}
                    clientName={client.business_name}
                    contactName={client.contact_name}
                    clientEmail={client.email}
                    amountCents={client.plan_price_cents}
                    currency={client.currency ?? 'EUR'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Dunning Timeline ───────────────────────────── */}
        {dunningClients.length > 0 && (
          <DunningTimeline clients={dunningClients} />
        )}

        {/* ── Stat counters ─────────────────────────────── */}
        <div className="grid-4">
          <div className="stat-card animate-in" style={{ animationDelay: '0ms' }}>
            <div className="stat-card-label">Active clients</div>
            <div className="stat-card-value">{activeCount}</div>
            <div className="stat-card-sub">Billing monthly</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '60ms' }}>
            <div className="stat-card-label">MRR</div>
            <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
              {formatCents(mrrCents, 'EUR')}
            </div>
            <div className="stat-card-sub">Monthly recurring revenue</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '120ms' }}>
            <div className="stat-card-label">Failed this month</div>
            <div
              className="stat-card-value"
              style={{ color: failedCount > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}
            >
              {failedCount}
            </div>
            <div className="stat-card-sub">Uncollected invoices</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '180ms' }}>
            <div className="stat-card-label">Open requests</div>
            <div
              className="stat-card-value"
              style={{ color: openCount > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}
            >
              {openCount}
            </div>
            <div className="stat-card-sub">Change requests in queue</div>
          </div>
        </div>

        {/* ── Client Table ──────────────────────────────── */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Clients</h2>
            <Link href="/admin/clients" id="view-all-clients" className="btn btn-ghost btn-sm">
              View all →
            </Link>
          </div>

          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            {clients && clients.length > 0 ? (
              <table className="table" id="clients-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Next billing</th>
                    <th>Since</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(clients as unknown as Client[])?.map((client) => (
                    <tr key={client.id} id={`client-row-${client.id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{client.business_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {client.contact_name}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={client.status} />
                      </td>
                      <td>
                        {client.plan_price_cents
                          ? formatCents(client.plan_price_cents, client.currency ?? 'EUR')
                          : '—'}
                      </td>
                      <td className="text-muted">
                        {client.purchase_date
                          ? `${new Date(client.purchase_date).getDate()} of each month`
                          : '—'}
                      </td>
                      <td className="text-muted">{formatDate(client.created_at)}</td>
                      <td>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          id={`client-detail-${client.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <Users className="empty-state-icon" />
                <p>No clients yet. <Link href="/admin/onboard" className="text-primary">Onboard your first client →</Link></p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Activity ───────────────────────────── */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent activity</h2>
          </div>
          <div style={{ padding: '8px 0' }}>
            {recentActivity && (recentActivity as unknown as ActivityLog[]).length > 0 ? (
              (recentActivity as unknown as ActivityLog[]).map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        flexShrink: 0,
                      }}
                    />
                    <span>
                      <strong style={{ textTransform: 'capitalize' }}>
                        {entry.action.replace(/_/g, ' ')}
                      </strong>
                      {entry.payload &&
                        typeof entry.payload === 'object' &&
                        'to' in (entry.payload as Record<string, unknown>) && (
                          <span className="text-muted">
                            {' '}→{' '}
                            <StatusBadge status={(entry.payload as { to: string }).to} />
                          </span>
                        )}
                    </span>
                  </div>
                  <span className="text-faint" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {timeAgo(entry.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: '32px' }}>
                <p className="text-muted">No activity yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}
