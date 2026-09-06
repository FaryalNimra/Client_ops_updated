'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Building2,
  CheckCircle2,
  TrendingUp,
  Shield,
  ArrowLeft,
  Copy,
  Check,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg, #FF4500 0%, #FF6B35 100%)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', color: '#fff',
            boxShadow: '0 4px 12px rgba(255, 69, 0, 0.35)',
          }}>C</div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>Client Ops</span>
            <span style={{
              marginLeft: 8, fontSize: '0.68rem', background: 'var(--color-primary-dim)',
              color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>SUPER ADMIN</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/super-admin"
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ThemeToggle size="sm" />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 14px rgba(255, 87, 34, 0.35)',
            }}>
              {org.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {org.name}
                </h1>
                <span className={`badge ${isSuspended ? 'badge-past_due' : 'badge-active'}`}>
                  {isSuspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
                Workspace: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text)' }}>/{org.slug}</span>
                <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
                Created {formatDate(org.created_at)}
              </p>
            </div>
          </div>

          <Link href="/super-admin" className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
            <ArrowLeft size={14} /> Back to Organizations
          </Link>
        </div>

        {/* ── Overview Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="stat-card animate-in" style={{ animationDelay: '0ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Admins</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary-dim)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={17} />
              </div>
            </div>
            <div className="stat-card-value">{admins.length}</div>
            <div className="stat-card-sub">Assigned org admins</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '60ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Clients</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={17} />
              </div>
            </div>
            <div className="stat-card-value">{clients.length}</div>
            <div className="stat-card-sub">Total client accounts</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '120ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Active Clients</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-success-dim)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{mrr.active_clients}</div>
            <div className="stat-card-sub">Paying client subscriptions</div>
          </div>

          <div className="stat-card animate-in" style={{ animationDelay: '180ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-card-label">Monthly Revenue</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary-dim)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
              {formatCents(mrr.mrr_cents, org.default_currency)}
            </div>
            <div className="stat-card-sub">MRR recurring revenue</div>
          </div>
        </div>

        {/* ── Organization Info Card ── */}
        <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
            <Building2 size={18} style={{ color: 'var(--color-primary)' }} />
            Organization Details
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
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
        <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <Shield size={18} style={{ color: 'var(--color-primary)' }} />
              Admins
              <span className="badge badge-active" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {admins.length}
              </span>
            </span>
          </div>

          {admins.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <p className="text-muted">No admins assigned to this organization yet.</p>
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
                      <span className={`badge ${admin.email_confirmed ? 'badge-active' : 'badge-paused'}`} style={{ fontSize: '0.7rem' }}>
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
                            {copiedId === `email-${admin.id}` ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID</span>
                        <div style={{ fontSize: '0.8rem', marginTop: 2, fontFamily: 'monospace', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {admin.id.slice(0, 8)}…
                          <button
                            onClick={() => copyToClipboard(admin.id, `uid-${admin.id}`)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: copiedId === `uid-${admin.id}` ? 'var(--color-success)' : 'var(--color-text-faint)',
                              fontSize: '0.75rem', padding: '2px 4px',
                            }}
                            title="Copy full ID"
                          >
                            {copiedId === `uid-${admin.id}` ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
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
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)', lineHeight: 1.5, margin: 0 }}>
              💡 <strong>Note:</strong> Passwords are securely hashed. If an admin forgets their password, you can reset it or update their credentials from the Super Admin dashboard.
            </p>
          </div>
        </div>

        {/* ── Clients Section ── */}
        <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              Clients
              <span className="badge badge-active" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {clients.length}
              </span>
            </span>
          </div>

          {clients.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <p className="text-muted">No clients in this organization yet.</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    {['Business / Client', 'Email & Contact', 'Plan & Pricing', 'Stripe Status', 'Stripe IDs', 'Joined / Purchased'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => {
                    const hasSub = !!client.stripe_subscription_id
                    const isPaid = client.status === 'active' || hasSub
                    
                    return (
                      <tr key={client.id}>
                        {/* Business */}
                        <td>
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
                        <td style={{ fontSize: '0.85rem' }}>
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
                        <td>
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
                        <td>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
                            <span className={`badge ${isPaid ? 'badge-active' : client.status === 'past_due' ? 'badge-past_due' : 'badge-paused'}`}>
                              {hasSub ? 'Subscribed & Active' : isPaid ? 'Active Client' : client.status === 'past_due' ? 'Payment Failed' : 'Checkout Pending'}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                              Stage: {client.status}
                            </span>
                          </div>
                        </td>

                        {/* Stripe Customer & Sub ID */}
                        <td style={{ fontSize: '0.8rem' }}>
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
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: copiedId === `cus-${client.id}` ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                    title="Copy Customer ID"
                                  >
                                    {copiedId === `cus-${client.id}` ? <Check size={11} style={{ color: 'var(--color-success)' }} /> : <Copy size={11} />}
                                  </button>
                                </div>
                              )}
                              {client.stripe_subscription_id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Sub:</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-success)' }}>
                                    {client.stripe_subscription_id.slice(0, 10)}…
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(client.stripe_subscription_id!, `sub-${client.id}`)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: copiedId === `sub-${client.id}` ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                    title="Copy Subscription ID"
                                  >
                                    {copiedId === `sub-${client.id}` ? <Check size={11} style={{ color: 'var(--color-success)' }} /> : <Copy size={11} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem' }}>No Stripe Record Yet</span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          <div>{formatDate(client.purchase_date || client.created_at)}</div>
                          {client.purchase_date && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: 2, fontWeight: 600 }}>Paid Anchor</div>
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
