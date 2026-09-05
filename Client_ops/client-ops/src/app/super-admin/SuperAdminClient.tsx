'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Org = Database['public']['Tables']['organizations']['Row']

interface Props {
  superAdmin: { name: string }
  orgs: Org[]
  orgStats: Record<string, { clients: number; mrr_cents: number }>
}

function formatCents(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(cents / 100)
}

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SuperAdminClient({ superAdmin, orgs: initialOrgs, orgStats: initialStats }: Props) {
  const [orgs, setOrgs] = useState(initialOrgs)
  const [orgStats, setOrgStats] = useState(initialStats)

  // ── Create Org modal state ──
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', currency: 'EUR', default_price_cents: 3000 })
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState('')

  // ── Create Admin modal state ──
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminOrgId, setAdminOrgId] = useState('')
  const [adminForm, setAdminForm] = useState({ full_name: '', email: '', password: '' })
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSuccess, setAdminSuccess] = useState('')

  // ── Suspend Org state ──
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null)

  // ── Success toast ──
  const [toast, setToast] = useState('')
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Create Org ──
  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    setOrgLoading(true)
    setOrgError('')
    const finalSlug = (orgForm.slug || makeSlug(orgForm.name)).trim()

    const res = await fetch('/api/super-admin/create-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...orgForm, slug: finalSlug }),
    })
    const json = await res.json()

    if (!res.ok) {
      setOrgError(json.error || 'Something went wrong')
    } else {
      setOrgs(prev => [json.org, ...prev])
      setOrgStats(prev => ({ ...prev, [json.org.id]: { clients: 0, mrr_cents: 0 } }))
      setShowOrgModal(false)
      setOrgForm({ name: '', slug: '', currency: 'EUR', default_price_cents: 3000 })
      showToast('✅ Organization created with custom workspace!')
    }
    setOrgLoading(false)
  }

  // ── Create Admin ──
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError('')
    setAdminSuccess('')

    const res = await fetch('/api/super-admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...adminForm, org_id: adminOrgId }),
    })
    const json = await res.json()

    if (!res.ok) {
      setAdminError(json.error || 'Something went wrong')
    } else {
      setAdminSuccess(`Admin created!\nEmail: ${adminForm.email}\nPassword: ${adminForm.password}`)
    }
    setAdminLoading(false)
  }

  // ── Suspend / Unsuspend Org ──
  async function handleSuspendOrg(orgId: string, suspend: boolean) {
    setSuspendLoading(orgId)
    const res = await fetch('/api/super-admin/suspend-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, suspend }),
    })
    const json = await res.json()
    if (!res.ok) {
      showToast(`❌ ${json.error || 'Failed to update org'}`)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, ...(json.org as any) } : o))
      showToast(suspend ? '⏸️ Organization suspended.' : '✅ Organization reactivated.')
    }
    setSuspendLoading(null)
  }

  // ── Logout ──
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const totalClients = Object.values(orgStats).reduce((s, o) => s + o.clients, 0)
  const totalMRR     = Object.values(orgStats).reduce((s, o) => s + o.mrr_cents, 0)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {superAdmin.name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', padding: '6px 14px', borderRadius: 8,
              cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Super Admin Dashboard</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
              Manage all organizations and their admins
            </p>
          </div>
          <button
            id="create-org-btn"
            onClick={() => setShowOrgModal(true)}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            + New Organization
          </button>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Organizations', value: orgs.length, sub: 'Total active orgs' },
            { label: 'Total Clients', value: totalClients, sub: 'Across all orgs' },
            { label: 'Total MRR', value: formatCents(totalMRR), sub: 'Monthly recurring revenue' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 4px', color: 'var(--color-text)' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Orgs Table ── */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', fontWeight: 700 }}>
            Organizations
          </div>

          {orgs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No organizations yet. Create your first one!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Organization', 'Slug', 'Clients', 'MRR', 'Currency', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left', fontSize: '0.75rem',
                      color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const isSuspended = !!(org as any).suspended
                  return (
                    <tr key={org.id} style={{
                      borderBottom: '1px solid var(--color-border-subtle)',
                      opacity: isSuspended ? 0.7 : 1,
                    }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                        <a
                          href={`/super-admin/org/${org.id}`}
                          style={{
                            color: 'var(--color-text)', textDecoration: 'none',
                            borderBottom: '1px dashed var(--color-text-faint)',
                            transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.borderColor = 'var(--color-text-faint)' }}
                        >
                          {org.name}
                        </a>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{org.slug}</td>
                      <td style={{ padding: '14px 20px' }}>{orgStats[org.id]?.clients ?? 0}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {formatCents(orgStats[org.id]?.mrr_cents ?? 0, org.default_currency)}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--color-text-muted)' }}>{org.default_currency}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: isSuspended ? 'var(--color-danger-dim)' : 'rgba(34,197,94,0.12)',
                          color: isSuspended ? 'var(--color-danger)' : 'var(--color-success)',
                        }}>
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            id={`add-admin-${org.id}`}
                            onClick={() => { setAdminOrgId(org.id); setShowAdminModal(true); setAdminSuccess(''); setAdminError(''); setAdminForm({ full_name: '', email: '', password: '' }) }}
                            style={{
                              background: 'var(--color-primary-dim)', color: 'var(--color-primary)',
                              border: '1px solid var(--color-border-active)', padding: '6px 14px',
                              borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                            }}
                          >
                            + Add Admin
                          </button>

                          <button
                            id={`suspend-org-${org.id}`}
                            onClick={() => handleSuspendOrg(org.id, !isSuspended)}
                            disabled={suspendLoading === org.id}
                            style={{
                              background: isSuspended ? 'rgba(34,197,94,0.1)' : 'var(--color-danger-dim)',
                              color: isSuspended ? 'var(--color-success)' : 'var(--color-danger)',
                              border: `1px solid ${isSuspended ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                              padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                              fontSize: '0.8rem', fontWeight: 600,
                              opacity: suspendLoading === org.id ? 0.6 : 1,
                            }}
                          >
                            {suspendLoading === org.id ? '…' : isSuspended ? '✓ Reactivate' : '⏸ Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Org Modal ── */}
      {showOrgModal && (
        <Modal title="Create New Organization" onClose={() => setShowOrgModal(false)}>
          <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Organization / Business Name" id="org-name">
              <input id="org-name" className="form-input" placeholder="e.g. My Books Shop, Cups & More" required
                value={orgForm.name} 
                onChange={e => {
                  const newName = e.target.value
                  setOrgForm(f => ({ 
                    ...f, 
                    name: newName,
                    slug: f.slug === makeSlug(f.name) || !f.slug ? makeSlug(newName) : f.slug 
                  }))
                }} 
                autoFocus 
              />
            </Field>

            <Field label="Dashboard URL Slug / Domain Identifier" id="org-slug">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>app.clientops/</span>
                <input 
                  id="org-slug" 
                  className="form-input" 
                  placeholder="my-books-shop" 
                  required
                  style={{ fontFamily: 'monospace' }}
                  value={orgForm.slug} 
                  onChange={e => setOrgForm(f => ({ ...f, slug: makeSlug(e.target.value) }))} 
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
                Custom workspace URL identifier for this organization.
              </span>
            </Field>

            <Field label="Default Currency" id="org-currency">
              <select id="org-currency" className="form-input"
                value={orgForm.currency} onChange={e => setOrgForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </Field>

            <Field label="Default Monthly Price (cents)" id="org-price">
              <input id="org-price" type="number" className="form-input" min={0}
                value={orgForm.default_price_cents}
                onChange={e => setOrgForm(f => ({ ...f, default_price_cents: Number(e.target.value) }))} />
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', marginTop: 4 }}>
                3000 = €30.00 / month
              </span>
            </Field>

            {orgError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{orgError}</div>}
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={orgLoading}>
              {orgLoading ? 'Creating…' : 'Create Organization Workspace'}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Create Admin Modal ── */}
      {showAdminModal && (
        <Modal title="Add Admin to Organization" onClose={() => { setShowAdminModal(false); setAdminSuccess('') }}>
          {adminSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'var(--color-success-dim)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 10, padding: 16, fontSize: '0.875rem', whiteSpace: 'pre-line',
                color: 'var(--color-success)',
              }}>{adminSuccess}</div>
              <button className="btn btn-primary" style={{ justifyContent: 'center' }}
                onClick={() => { setShowAdminModal(false); setAdminSuccess('') }}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Full Name" id="admin-name">
                <input id="admin-name" className="form-input" placeholder="John Doe" required
                  value={adminForm.full_name} onChange={e => setAdminForm(f => ({ ...f, full_name: e.target.value }))} autoFocus />
              </Field>
              <Field label="Email" id="admin-email">
                <input id="admin-email" type="email" className="form-input" placeholder="admin@agency.com" required
                  value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Password" id="admin-password">
                <input id="admin-password" type="text" className="form-input" placeholder="Min 8 characters" required minLength={8}
                  value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} />
              </Field>
              {adminError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{adminError}</div>}
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={adminLoading}>
                {adminLoading ? 'Creating admin…' : 'Create Admin User'}
              </button>
            </form>
          )}
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 100,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: '14px 20px', boxShadow: 'var(--shadow-lg)',
          fontSize: '0.875rem', fontWeight: 500, animation: 'fadeIn 0.3s ease',
        }}>{toast}</div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 99, padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}</label>
      {children}
    </div>
  )
}
