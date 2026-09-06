import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { ExternalLink, Globe, FileText, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react'
import ManageBillingButton from './ManageBillingButton'
import ClientRequestsSection from './ClientRequestsSection'
import ClientAccountForm from './ClientAccountForm'
import type { Database } from '@/types/database'

type ClientRecord = Database['public']['Tables']['clients']['Row']
type AssetRecord = Omit<Database['public']['Tables']['client_assets']['Row'], 'vault_ref'>
type InvoiceRecord = Database['public']['Tables']['invoices']['Row']

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function formatCents(cents: number | null, currency = 'EUR') {
  if (cents === null || cents === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-muted">—</span>
  const expDate = new Date(expiresAt)
  const today = new Date()
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const formattedDate = formatDate(expiresAt)

  if (diffDays < 0) {
    return <span className="badge badge-danger">⚠️ Expired ({formattedDate})</span>
  }
  if (diffDays <= 30) {
    return <span className="badge badge-warning">⏳ Renews in {diffDays}d ({formattedDate})</span>
  }
  return <span>{formattedDate}</span>
}

export default async function ClientDashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Extract client_id from session JWT or fallback profile query
  const { data: { session } } = await supabase.auth.getSession()

  // Helper to parse Edge runtime JWT payload if available
  let clientId: string | undefined = undefined
  if (session?.access_token) {
    try {
      const base64Url = session.access_token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const claims = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
      if (claims.client_id) clientId = claims.client_id
    } catch {
      // Fallback below
    }
  }

  if (!clientId) {
    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    const profile = rawProfile as { client_id: string | null } | null
    clientId = profile?.client_id ?? undefined
  }

  if (!clientId) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Account Setup Required</h2>
        <p className="text-muted">Your user profile is not associated with an active client account yet. Please contact support.</p>
      </div>
    )
  }

function getCurrentBillingMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

  // Fetch client, read-only assets (omitting vault_ref), invoices, and change requests in parallel
  const currentBillingMonth = getCurrentBillingMonth()
  const [
    { data: rawClient },
    { data: rawAssets },
    { data: rawInvoices },
    { data: rawRequests },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    // Select assets without vault_ref for client privacy & security
    supabase
      .from('client_assets')
      .select('id, client_id, org_id, type, label, value, url, expires_at, notes, created_at')
      .eq('client_id', clientId)
      .order('type', { ascending: true }),
    supabase
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('change_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('requested_at', { ascending: false }),
  ])

  const client = rawClient as ClientRecord | null
  const assets = rawAssets as AssetRecord[] | null
  const invoices = rawInvoices as InvoiceRecord[] | null
  const requests = rawRequests as Database['public']['Tables']['change_requests']['Row'][] | null

  if (!client) notFound()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Page Header & Overview Banner ────────────────── */}
      <div className="card animate-in" style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-2) 100%)', border: '1px solid var(--color-border)', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
                {client.business_name}
              </h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Client ID: <span style={{ fontFamily: 'monospace', color: 'var(--color-text-faint)' }}>{client.id}</span>
            </p>
          </div>

          {/* Manage Billing Action */}
          <ManageBillingButton />
        </div>

        {/* Subscription KPI row */}
        <div style={{
          marginTop: 28,
          paddingTop: 24,
          borderTop: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Monthly Care Plan
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatCents(client.plan_price_cents, client.currency ?? 'EUR')}
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: 4 }}>/ mo</span>
            </div>
          </div>

          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Billing Anchor Day
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
              {client.purchase_date ? `${new Date(client.purchase_date).getDate()}th of every month` : 'Pending'}
            </div>
          </div>

          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Account Status
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: client.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {client.status === 'active' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {client.status.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Read-Only Site Assets Section ──────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              🌐 Site Assets & Properties
            </h2>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
              Read-only list of domains, GitHub repositories, and analytics properties managed under your care plan.
            </p>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          {assets && assets.length > 0 ? (
            <table className="table" id="client-site-assets-table">
              <thead>
                <tr>
                  <th>Asset Type</th>
                  <th>Label</th>
                  <th>Value / Identifier</th>
                  <th>URL</th>
                  <th>SSL / Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <span className="badge badge-lead" style={{ textTransform: 'capitalize' }}>
                        {asset.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{asset.label}</td>
                    <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {asset.value || '—'}
                    </td>
                    <td>
                      {asset.url ? (
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary"
                          style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                        >
                          <Globe size={13} />
                          {asset.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <ExpiryBadge expiresAt={asset.expires_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '40px 24px' }}>
              <p className="text-muted">No site assets registered yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Billing & Invoices Section ─────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              💳 Billing & Invoice History
            </h2>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
              View and download past receipts or open invoices.
            </p>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          {invoices && invoices.length > 0 ? (
            <table className="table" id="client-invoices-table">
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th>Invoice Link</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.stripe_invoice_id}>
                    <td className="text-muted" style={{ fontWeight: 500 }}>
                      {inv.billing_month || formatDate(inv.created_at)}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatCents(inv.amount_cents, inv.currency)}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="text-muted">
                      {formatDate(inv.paid_at || inv.created_at)}
                    </td>
                    <td>
                      {inv.hosted_invoice_url ? (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 6 }}
                        >
                          <FileText size={14} />
                          View Invoice
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '40px 24px' }}>
              <p className="text-muted">No invoices generated yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Change Requests Section (Quota Enforced) ─────────── */}
      <ClientRequestsSection
        initialRequests={requests || []}
        clientId={clientId}
        currentBillingMonth={currentBillingMonth}
      />

      {/* ── Account Details & Primary Contact Self-Service Form ── */}
      <ClientAccountForm
        initialContactName={client.contact_name}
        initialEmail={client.email}
        initialPhone={client.phone}
      />

    </div>
  )
}
