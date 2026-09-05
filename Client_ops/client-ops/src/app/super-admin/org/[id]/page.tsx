'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Admin {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
  created_at_auth: string
  email_confirmed: boolean
}

interface Client {
  id: string
  business_name: string
  contact_name: string | null
  email: string
  phone: string | null
  status: string
  currency: string | null
  plan_price_cents: number | null
  setup_fee_cents: number | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  purchase_date: string | null
  created_at: string
}

interface OrgData {
  id: string
  name: string
  slug: string
  default_currency: string
  default_price_cents: number
  suspended: boolean
  created_by: string | null
  created_at: string
}

function formatCents(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(cents / 100)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  active:      { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', label: 'Active / Paid' },
  onboarding:  { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', label: 'Checkout Pending' },
  lead:        { bg: 'rgba(168,85,247,0.12)', color: '#A855F7', label: 'Lead / In Progress' },
  past_due:    { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', label: 'Past Due / Failed' },
  paused:      { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Paused' },
  churned:     { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Churned / Cancelled' },
}

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [org, setOrg] = useState<OrgData | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [mrr, setMrr] = useState({ mrr_cents: 0, active_clients: 0 })

  // Copy state for password tooltip
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/super-admin/org-details/${orgId}`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'Failed to load')
          return
        }
        setOrg(json.org)
        setAdmins(json.admins)
        setClients(json.clients)
        setMrr(json.mrr)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId])

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-muted)' }}>Loading organization details…</p>
        </div>
      </div>
    )
  }

  if (error || !org) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-danger)', marginBottom: 8 }}>Error</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>{error || 'Organization not found'}</p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => router.push('/super-admin')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const isSuspended = !!org.suspended

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Topbar ── */}
      <div style={{
        height: 60,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '1rem', color: '#fff',
          }}>C</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Client Ops</span>
            <span style={{
              marginLeft: 8, fontSize: '0.7rem', background: 'var(--color-primary-dim)',
              color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 600,
            }}>SUPER ADMIN</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Back button + Header */}
        <button
          onClick={() => router.push('/super-admin')}
          style={{
            background: 'none', border: 'none', color: 'var(--color-primary)',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, background: 'var(--color-primary-dim)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)',
          }}>
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
              {org.name}
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: isSuspended ? 'var(--color-danger-dim)' : 'rgba(34,197,94,0.12)',
                color: isSuspended ? 'var(--color-danger)' : 'var(--color-success)',
              }}>
                {isSuspended ? 'Suspended' : 'Active'}
              </span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 2 }}>
              <span style={{ fontFamily: 'monospace' }}>{org.slug}</span>
              <span style={{ margin: '0 8px' }}>·</span>
              Created {formatDate(org.created_at)}
            </p>
          </div>
        </div>

        {/* ── Overview Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Admins', value: admins.length, sub: 'Admin users' },
            { label: 'Clients', value: clients.length, sub: 'Total clients' },
            { label: 'Active Clients', value: mrr.active_clients, sub: 'Paying clients' },
            { label: 'MRR', value: formatCents(mrr.mrr_cents, org.default_currency), sub: 'Monthly recurring' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 4px', color: 'var(--color-text)' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Organization Info Card ── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 14, marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏢 Organization Info
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              <InfoItem label="Org ID" value={org.id} mono copyable onCopy={() => copyToClipboard(org.id, 'org-id')} copied={copiedId === 'org-id'} />
              <InfoItem label="Slug" value={org.slug} mono />
              <InfoItem label="Default Currency" value={org.default_currency} />
              <InfoItem label="Default Price" value={formatCents(org.default_price_cents, org.default_currency)} />
              <InfoItem label="Created At" value={formatDate(org.created_at)} />
              <InfoItem label="Status" value={isSuspended ? 'Suspended' : 'Active'}
                valueStyle={{ color: isSuspended ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 700 }} />
            </div>
          </div>
        </div>

        {/* ── Admins Section ── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 14, marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 Admins
              <span style={{
                fontSize: '0.7rem', background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
                padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              }}>{admins.length}</span>
            </span>
          </div>

          {admins.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No admins assigned to this organization yet.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {admins.map((admin, idx) => (
                <div
                  key={admin.id}
                  style={{
                    padding: '16px 24px',
                    borderBottom: idx < admins.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: 'var(--color-primary-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}>
                    {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {admin.full_name || 'Unnamed Admin'}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                        background: admin.email_confirmed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: admin.email_confirmed ? '#22C55E' : '#F59E0B',
                      }}>
                        {admin.email_confirmed ? 'Verified' : 'Unverified'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px', marginTop: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                        <div style={{ fontSize: '0.875rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace' }}>{admin.email}</span>
                          <button
                            onClick={() => copyToClipboard(admin.email, `email-${admin.id}`)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: copiedId === `email-${admin.id}` ? 'var(--color-success)' : 'var(--color-text-faint)',
                              fontSize: '0.75rem', padding: '2px 4px',
                            }}
                            title="Copy email"
                          >
                            {copiedId === `email-${admin.id}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID</span>
                        <div style={{ fontSize: '0.8rem', marginTop: 2, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
                          {admin.id.slice(0, 8)}…
                          <button
                            onClick={() => copyToClipboard(admin.id, `uid-${admin.id}`)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: copiedId === `uid-${admin.id}` ? 'var(--color-success)' : 'var(--color-text-faint)',
                              fontSize: '0.75rem', padding: '2px 4px', marginLeft: 4,
                            }}
                            title="Copy full ID"
                          >
                            {copiedId === `uid-${admin.id}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</span>
                        <div style={{ fontSize: '0.85rem', marginTop: 2 }}>{formatDate(admin.created_at)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Sign In</span>
                        <div style={{ fontSize: '0.85rem', marginTop: 2, color: admin.last_sign_in_at ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                          {admin.last_sign_in_at ? formatDate(admin.last_sign_in_at) : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border-subtle)', background: 'var(--color-surface-2)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
              💡 <strong>Note:</strong> Passwords are securely hashed and cannot be retrieved. If an admin forgets their password, 
              you can reset it from the Supabase dashboard or create a new admin account.
            </p>
          </div>
        </div>

        {/* ── Clients Section ── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 14, marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🏪 Clients
              <span style={{
                fontSize: '0.7rem', background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
                padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              }}>{clients.length}</span>
            </span>
          </div>

          {clients.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No clients in this organization yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Business / Client', 'Email & Contact', 'Plan & Pricing', 'Stripe Checkout Status', 'Stripe IDs', 'Joined / Purchased'].map(h => (
                      <th key={h} style={{
                        padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem',
                        color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => {
                    const sc = STATUS_COLORS[client.status] || STATUS_COLORS['active']
                    const hasSub = !!client.stripe_subscription_id
                    const isPaid = client.status === 'active' || hasSub
                    
                    return (
                      <tr key={client.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {/* Business */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                            {client.business_name}
                          </div>
                          {client.contact_name && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              👤 {client.contact_name}
                            </div>
                          )}
                        </td>

                        {/* Email & Phone */}
                        <td style={{ padding: '14px 20px', fontSize: '0.85rem' }}>
                          <div style={{ fontFamily: 'monospace', color: 'var(--color-text)' }}>
                            {client.email}
                          </div>
                          {client.phone && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: 2 }}>
                              📞 {client.phone}
                            </div>
                          )}
                        </td>

                        {/* Plan & Pricing */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                            {client.plan_price_cents ? formatCents(client.plan_price_cents, client.currency || org.default_currency) : '—'}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/mo</span>
                          </div>
                          {client.setup_fee_cents ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              +{formatCents(client.setup_fee_cents, client.currency || org.default_currency)} setup
                            </div>
                          ) : null}
                        </td>

                        {/* Stripe Checkout Status */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                              background: isPaid ? 'rgba(34,197,94,0.12)' : client.status === 'past_due' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                              color: isPaid ? '#22C55E' : client.status === 'past_due' ? '#EF4444' : '#F59E0B',
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPaid ? '#22C55E' : client.status === 'past_due' ? '#EF4444' : '#F59E0B' }} />
                              {hasSub ? 'Subscribed & Active' : isPaid ? 'Active Client' : client.status === 'past_due' ? 'Payment Failed' : 'Checkout Pending'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                              Stage: {client.status}
                            </span>
                          </div>
                        </td>

                        {/* Stripe Customer & Sub ID */}
                        <td style={{ padding: '14px 20px', fontSize: '0.8rem' }}>
                          {client.stripe_customer_id || client.stripe_subscription_id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {client.stripe_customer_id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Cus:</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {client.stripe_customer_id.slice(0, 10)}…
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(client.stripe_customer_id!, `cus-${client.id}`)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: copiedId === `cus-${client.id}` ? '#22C55E' : '#666' }}
                                    title="Copy Customer ID"
                                  >
                                    {copiedId === `cus-${client.id}` ? '✓' : '📋'}
                                  </button>
                                </div>
                              )}
                              {client.stripe_subscription_id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Sub:</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#22C55E' }}>
                                    {client.stripe_subscription_id.slice(0, 10)}…
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(client.stripe_subscription_id!, `sub-${client.id}`)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: copiedId === `sub-${client.id}` ? '#22C55E' : '#666' }}
                                    title="Copy Subscription ID"
                                  >
                                    {copiedId === `sub-${client.id}` ? '✓' : '📋'}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem' }}>No Stripe Record Yet</span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          <div>{formatDate(client.purchase_date || client.created_at)}</div>
                          {client.purchase_date && (
                            <div style={{ fontSize: '0.7rem', color: '#22C55E', marginTop: 2 }}>Paid Anchor</div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────────────────
function InfoItem({ label, value, mono, copyable, onCopy, copied, valueStyle }: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  onCopy?: () => void
  copied?: boolean
  valueStyle?: React.CSSProperties
}) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.9rem', fontWeight: 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        display: 'flex', alignItems: 'center', gap: 6,
        ...valueStyle,
      }}>
        <span style={{ wordBreak: 'break-all' }}>{value}</span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: copied ? 'var(--color-success)' : 'var(--color-text-faint)',
              fontSize: '0.75rem', padding: '2px 4px', flexShrink: 0,
            }}
            title="Copy"
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>
    </div>
  )
}
