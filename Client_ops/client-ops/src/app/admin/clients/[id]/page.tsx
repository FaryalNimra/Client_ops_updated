import React from 'react'
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PauseSiteButton from '../PauseSiteButton'
import ReminderActionButton from '../../dashboard/ReminderActionButton'
import OffboardingChecklist from '../OffboardingChecklist'
import ChurnClientButton from '../ChurnClientButton'
import ClientPaymentActions from '@/components/ClientPaymentActions'
import ClientPortalAccessCard from '@/components/ClientPortalAccessCard'
import { syncClientWithStripe } from '@/lib/stripeSync'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function formatCents(c: number | null, cur = 'EUR') {
  if (!c) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(c / 100)
}

function fmt(d: string | null) {
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
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export default async function ClientDetailPage(props: {
  params: Promise<{ id: string; slug?: string }> | { id: string; slug?: string }
}) {
  const resolvedParams = await props.params
  const id = resolvedParams.id
  const slug = resolvedParams.slug
  const basePrefix = slug ? `/org/${slug}` : '/admin'

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: rawClient },
    { data: rawAssets },
    { data: rawInvoices },
    { data: rawRequests },
    { data: rawLifetime },
    { data: rawActivity },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('client_assets').select('*').eq('client_id', id).order('type'),
    supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('change_requests').select('*').eq('client_id', id).order('requested_at', { ascending: false }).limit(10),
    supabase.from('client_lifetime_value').select('*').eq('client_id', id).single(),
    supabase.from('activity_log').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  let client = rawClient as Client | null
  const assets = rawAssets as Record<string, unknown>[] | null
  let invoices = rawInvoices as Record<string, unknown>[] | null
  const requests = rawRequests as Record<string, unknown>[] | null
  const lifetime = rawLifetime as { total_paid_cents?: number } | null
  const activity = rawActivity as Record<string, unknown>[] | null

  if (!client) notFound()

  // Auto-sync with Stripe if onboarding or missing subscription ID
  if (client.status === 'onboarding' || !client.stripe_subscription_id) {
    const synced = await syncClientWithStripe(id)
    if (synced && synced.status === 'active') {
      client = synced
      // Refresh invoices if synced
      const { data: freshInvoices } = await supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(20)
      if (freshInvoices) invoices = freshInvoices as Record<string, unknown>[]
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link href={`${basePrefix}/clients`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} />
            <span>Back to clients</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: getAvatarGradient(client.business_name || 'Client'),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {getInitials(client.business_name || 'Client')}
            </div>
            <div>
              <h1 className="page-title">{client.business_name}</h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                <Badge status={client.status} />
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>{client.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {client.status === 'past_due' && (
            <ReminderActionButton
              clientId={id}
              clientName={client.business_name}
              contactName={client.contact_name}
              clientEmail={client.email}
              amountCents={client.plan_price_cents}
              currency={client.currency ?? 'EUR'}
            />
          )}

          <PauseSiteButton
            clientId={id}
            clientName={client.business_name}
            currentStatus={client.status}
          />

          <ChurnClientButton
            clientId={id}
            clientName={client.business_name}
            currentStatus={client.status}
          />
        </div>
      </div>

      <div className="page-body">
        {/* ── Persistent Offboarding Checklist (Renders only if status is churned) ── */}
        <OffboardingChecklist
          clientId={id}
          clientStatus={client.status}
          initialNotesStr={client.notes}
        />

        {/* ── Top row: Identity + Billing stats ────────── */}
        <div className="grid-2">
          {/* Identity */}
          <div className="card">
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 18, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Identity & Contact
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px 16px', fontSize: '0.875rem' }}>
              {[
                ['Contact',      client.contact_name],
                ['Email',        client.email],
                ['Phone',        client.phone],
                ['Country',      client.country],
                ['VAT ID',       client.vat_id],
              ].map(([label, val]) => val ? (
                <React.Fragment key={`frag-${label}`}>
                  <dt className="text-muted" style={{ fontWeight: 500 }}>{label}</dt>
                  <dd style={{ fontWeight: 600, color: 'var(--color-text)' }}>{val}</dd>
                </React.Fragment>
              ) : null)}
            </dl>
            {client.notes && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                {client.notes}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="card">
            <h2 style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 18, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Billing & Financials
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                ['Monthly plan',   formatCents(client.plan_price_cents, client.currency ?? 'EUR')],
                ['Lifetime value', formatCents(lifetime?.total_paid_cents ?? 0, client.currency ?? 'EUR')],
                ['Purchase date',  client.purchase_date ? `${new Date(client.purchase_date).getDate()} of month` : '—'],
                ['Setup fee',      formatCents(client.setup_fee_cents, client.currency ?? 'EUR')],
              ].map(([label, val]) => (
                <div key={label} style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: label === 'Monthly plan' ? 'var(--color-primary)' : 'var(--color-text)' }}>{val}</div>
                </div>
              ))}
            </div>
            {client.stripe_customer_id && (
              <a
                href={`https://dashboard.stripe.com/customers/${client.stripe_customer_id}`}
                id="view-stripe-customer"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ExternalLink size={14} />
                <span>View customer in Stripe</span>
              </a>
            )}
          </div>
        </div>

        {/* ── Stripe Payment & Checkout Actions ──────── */}
        <ClientPaymentActions client={client} />

        {/* ── Client Portal Login Credentials ────────── */}
        <ClientPortalAccessCard client={client} />

        {/* ── Assets ───────────────────────────────────── */}
        {assets && assets.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Site Assets</h2>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Type</th><th>Label</th><th>Value</th><th>URL</th><th>Vault ref</th><th>Expires</th></tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={String(a.id)}>
                      <td><span className="badge badge-lead">{String(a.type).replace(/_/g, ' ')}</span></td>
                      <td style={{ fontWeight: 600 }}>{String(a.label)}</td>
                      <td className="text-muted">{a.value ? String(a.value) : '—'}</td>
                      <td>
                        {a.url
                          ? <a href={String(a.url)} target="_blank" rel="noopener noreferrer" className="text-primary" style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                              <ExternalLink size={12} /> Open
                            </a>
                          : '—'}
                      </td>
                      <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{a.vault_ref ? String(a.vault_ref) : '—'}</td>
                      <td className="text-muted">{fmt(a.expires_at as string | null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Invoices ──────────────────────────────────── */}
        {invoices && invoices.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Invoices</h2>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Period</th><th>Amount</th><th>Status</th><th>Paid</th><th>Attempts</th><th></th></tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={String(inv.stripe_invoice_id)}>
                      <td className="text-muted">{String(inv.billing_month ?? fmt(inv.created_at as string))}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCents(Number(inv.amount_cents), String(inv.currency))}</td>
                      <td><Badge status={String(inv.status)} /></td>
                      <td className="text-muted">{fmt(inv.paid_at as string | null)}</td>
                      <td className="text-muted">{Number(inv.attempt_count)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {Boolean(inv.hosted_invoice_url) && (
                          <a href={String(inv.hosted_invoice_url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="View Hosted Invoice">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Change Requests ───────────────────────────── */}
        {requests && requests.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Change Requests</h2>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Month</th><th>Type</th><th>Description</th><th>Status</th><th>Submitted</th></tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={String(r.id)}>
                      <td className="text-muted">{String(r.billing_month)}</td>
                      <td><span className="badge badge-lead">{String(r.type).replace(/_/g, ' ')}</span></td>
                      <td style={{ maxWidth: 280 }} className="truncate">{String(r.description)}</td>
                      <td><Badge status={String(r.status)} /></td>
                      <td className="text-muted">{fmt(r.requested_at as string)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Activity Log ──────────────────────────────── */}
        {activity && activity.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Activity Log</h2>
            </div>
            <div style={{ padding: '6px 0' }}>
              {activity.map(entry => (
                <div key={String(entry.id)} style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)', flexShrink: 0 }} />
                    <span><strong style={{ textTransform: 'capitalize' }}>{String(entry.action).replace(/_/g, ' ')}</strong></span>
                    {Boolean(entry.payload && typeof entry.payload === 'object' && 'to' in (entry.payload as Record<string, unknown>)) && (
                      <Badge status={String((entry.payload as Record<string, unknown>).to)} />
                    )}
                  </div>
                  <span className="text-faint" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {fmt(String(entry.created_at))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
