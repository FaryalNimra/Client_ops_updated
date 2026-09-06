import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import {
  AlertCircle,
  ExternalLink,
  Users as UsersIcon,
  TrendingUp,
  AlertTriangle,
  Inbox,
  Plus,
  Sparkles,
  ArrowUpRight,
  Activity,
} from 'lucide-react'
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

export default async function AdminDashboard({ orgSlug }: { orgSlug?: string } = {}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/auth')

  const orgId = (profile as { org_id: string | null } | null)?.org_id ?? ''

  // Determine base URL prefix: /org/[slug] or /admin (orgSlug passed as prop from org layout)
  const basePrefix = orgSlug ? `/org/${orgSlug}` : '/admin'

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
        <Link href={`${basePrefix}/onboard`} id="onboard-new-btn" className="btn btn-primary">
          <Plus size={16} />
          <span>Onboard client</span>
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
                  <Link href={`${basePrefix}/clients/${client.id}`} id={`view-client-${client.id}`} className="btn btn-ghost btn-sm">
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

        {/* ── Energetic Stat Counters ───────────────────── */}
        <div className="grid-4">
          {/* Active Clients Card */}
          <div className="stat-card animate-in" style={{ animationDelay: '0ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Active Clients</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--color-success-dim)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UsersIcon size={18} />
              </div>
            </div>
            <div className="stat-card-value">{activeCount}</div>
            <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
              Active recurring subscriptions
            </div>
          </div>

          {/* MRR Card */}
          <div className="stat-card animate-in" style={{ animationDelay: '60ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Monthly Revenue</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--color-primary-dim)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
              {formatCents(mrrCents, 'EUR')}
            </div>
            <div className="stat-card-sub">MRR recurring revenue</div>
          </div>

          {/* Failed Payments Card */}
          <div className="stat-card animate-in" style={{ animationDelay: '120ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Failed Payments</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: failedCount > 0 ? 'var(--color-danger-dim)' : 'var(--color-surface-2)',
                  color: failedCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={18} />
              </div>
            </div>
            <div
              className="stat-card-value"
              style={{ color: failedCount > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}
            >
              {failedCount}
            </div>
            <div className="stat-card-sub">
              {failedCount > 0 ? 'Requires dunning follow-up' : 'All invoices collected'}
            </div>
          </div>

          {/* Open Requests Card */}
          <div className="stat-card animate-in" style={{ animationDelay: '180ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Open Requests</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: openCount > 0 ? 'var(--color-warning-dim)' : 'var(--color-surface-2)',
                  color: openCount > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inbox size={18} />
              </div>
            </div>
            <div
              className="stat-card-value"
              style={{ color: openCount > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}
            >
              {openCount}
            </div>
            <div className="stat-card-sub">Change requests in backlog</div>
          </div>
        </div>

        {/* ── Client Table with Brand Avatars ───────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Client Roster</h2>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                Active client accounts and billing cadence
              </p>
            </div>
            <Link href={`${basePrefix}/clients`} id="view-all-clients" className="btn btn-secondary btn-sm">
              <span>View all clients</span>
              <ArrowUpRight size={14} />
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: getAvatarGradient(client.business_name || 'Client'),
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
                            {getInitials(client.business_name || 'Client')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                              {client.business_name}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {client.contact_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={client.status} />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {client.plan_price_cents
                            ? formatCents(client.plan_price_cents, client.currency ?? 'EUR')
                            : '—'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {client.purchase_date
                          ? `${new Date(client.purchase_date).getDate()} of each month`
                          : '—'}
                      </td>
                      <td className="text-muted">{formatDate(client.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`${basePrefix}/clients/${client.id}`}
                          id={`client-detail-${client.id}`}
                          className="btn btn-ghost btn-sm"
                          title="View Client Details"
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
                <UsersIcon className="empty-state-icon" />
                <p>No clients yet. <Link href={`${basePrefix}/onboard`} className="text-primary">Onboard your first client →</Link></p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Activity ───────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Activity</h2>
          </div>
          <div style={{ padding: '4px 0' }}>
            {recentActivity && (recentActivity as unknown as ActivityLog[]).length > 0 ? (
              (recentActivity as unknown as ActivityLog[]).map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '14px 24px',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        boxShadow: '0 0 8px var(--color-primary)',
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
