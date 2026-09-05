import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PauseSiteButton from '../PauseSiteButton'
import ReminderActionButton from '../../dashboard/ReminderActionButton'
import OffboardingChecklist from '../OffboardingChecklist'
import ChurnClientButton from '../ChurnClientButton'
import ClientPaymentActions from '@/components/ClientPaymentActions'
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

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
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
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('client_assets').select('*').eq('client_id', params.id).order('type'),
    supabase.from('invoices').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('change_requests').select('*').eq('client_id', params.id).order('requested_at', { ascending: false }).limit(10),
    supabase.from('client_lifetime_value').select('*').eq('client_id', params.id).single(),
    supabase.from('activity_log').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(20),
  ])

  const client = rawClient as Client | null
  const assets = rawAssets as Record<string, unknown>[] | null
  const invoices = rawInvoices as Record<string, unknown>[] | null
  const requests = rawRequests as Record<string, unknown>[] | null
  const lifetime = rawLifetime as { total_paid_cents?: number } | null
  const activity = rawActivity as Record<string, unknown>[] | null

  if (!client) notFound()

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/admin/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to clients
          </Link>
          <h1 className="page-title">{client.business_name}</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
            <Badge status={client.status} />
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{client.email}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {client.status === 'past_due' && (
            <ReminderActionButton
              clientId={params.id}
              clientName={client.business_name}
              contactName={client.contact_name}
              clientEmail={client.email}
              amountCents={client.plan_price_cents}
              currency={client.currency ?? 'EUR'}
            />
          )}

          <PauseSiteButton
            clientId={params.id}
            clientName={client.business_name}
            currentStatus={client.status}
          />

          <ChurnClientButton
            clientId={params.id}
            clientName={client.business_name}
            currentStatus={client.status}
          />
        </div>
      </div>

      <div className="page-body">
        {/* ── Persistent Offboarding Checklist (Renders only if status is churned) ── */}
        <OffboardingChecklist
          clientId={params.id}
          clientStatus={client.status}
          initialNotesStr={client.notes}
        />

        {/* ── Top row: Identity + Billing stats ────────── */}
        <div className="grid-2">
          {/* Identity */}
          <div className="card">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--color-text-muted)' }}>IDENTITY</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: '0.875rem' }}>
              {[
                ['Contact',      client.contact_name],
                ['Email',        client.email],
                ['Phone',        client.phone],
                ['Country',      client.country],
                ['VAT ID',       client.vat_id],
              ].map(([label, val]) => val ? (
                <><dt key={`l-${label}`} className="text-muted">{label}</dt><dd key={`v-${label}`}>{val}</dd></>
              ) : null)}
            </dl>
            {client.notes && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {client.notes}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="card">
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, color: 'var(--color-text-muted)' }}>BILLING</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Monthly plan',   formatCents(client.plan_price_cents, client.currency ?? 'EUR')],
                ['Lifetime value', formatCents(lifetime?.total_paid_cents ?? 0, client.currency ?? 'EUR')],
                ['Purchase date',  client.purchase_date ? `${new Date(client.purchase_date).getDate()} of month` : '—'],
                ['Setup fee',      formatCents(client.setup_fee_cents, client.currency ?? 'EUR')],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{val}</div>
                </div>
              ))}
            </div>
            {client.stripe_customer_id && (
              <a
                href={`https://dashboard.stripe.com/customers/${client.stripe_customer_id}`}
                id="view-stripe-customer"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 16 }}
              >
                <ExternalLink size={14} /> View in Stripe
              </a>
            )}
          </div>
        </div>

        {/* ── Stripe Payment & Checkout Actions ──────── */}
        <ClientPaymentActions client={client} />

        {/* ── Assets ───────────────────────────────────── */}
        {assets && assets.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>SITE ASSETS</h2>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr><th>Type</th><th>Label</th><th>Value</th><th>URL</th><th>Vault ref</th><th>Expires</th></tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={String(a.id)}>
                      <td><span className="badge badge-lead" style={{ textTransform: 'capitalize' }}>{String(a.type).replace(/_/g, ' ')}</span></td>
                      <td style={{ fontWeight: 500 }}>{String(a.label)}</td>
                      <td className="text-muted">{a.value ? String(a.value) : '—'}</td>
                      <td>
                        {a.url
                          ? <a href={String(a.url)} target="_blank" rel="noopener noreferrer" className="text-primary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>INVOICES</h2>
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
                      <td style={{ fontWeight: 600 }}>{formatCents(Number(inv.amount_cents), String(inv.currency))}</td>
                      <td><Badge status={String(inv.status)} /></td>
                      <td className="text-muted">{fmt(inv.paid_at as string | null)}</td>
                      <td className="text-muted">{Number(inv.attempt_count)}</td>
                      <td>
                        {Boolean(inv.hosted_invoice_url) && (
                          <a href={String(inv.hosted_invoice_url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
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
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>CHANGE REQUESTS</h2>
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
                      <td><span className="badge badge-lead" style={{ textTransform: 'capitalize' }}>{String(r.type).replace(/_/g, ' ')}</span></td>
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
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>ACTIVITY LOG</h2>
            </div>
            <div style={{ padding: '8px 0' }}>
              {activity.map(entry => (
                <div key={String(entry.id)} style={{ padding: '10px 24px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                    <span style={{ textTransform: 'capitalize' }}>{String(entry.action).replace(/_/g, ' ')}</span>
                    {Boolean(entry.payload && typeof entry.payload === 'object' && 'to' in (entry.payload as Record<string, unknown>)) && (
                      <Badge status={String((entry.payload as Record<string, unknown>).to)} />
                    )}
                  </div>
                  <span className="text-faint" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {String(entry.created_at)}
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
