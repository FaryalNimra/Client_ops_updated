'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ChevronRight, ChevronLeft, Check, Loader2, Globe, Link as LinkIcon, Copy, MessageCircle, Mail } from 'lucide-react'
import type { Database } from '@/types/database'

const STEPS = ['Business', 'Assets', 'Billing', 'Done']

const ASSET_TYPES = [
  { value: 'domain', label: 'Domain' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'github_repo', label: 'GitHub Repo' },
  { value: 'google_account', label: 'Google Account' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'dns', label: 'DNS' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
]

interface AssetRow {
  type: string
  label: string
  value: string
  url: string
  vault_ref: string
  expires_at: string
}

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function OnboardWizard({ orgId }: { orgId: string }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')

  // Step 1 — Business
  const [biz, setBiz] = useState({
    business_name: '', contact_name: '', email: '',
    phone: '', country: '', vat_id: '', currency: 'EUR', notes: '',
  })

  // Step 2 — Assets
  const [assets, setAssets] = useState<AssetRow[]>([
    { type: 'domain', label: 'Primary domain', value: '', url: '', vault_ref: '', expires_at: '' },
    { type: 'github_repo', label: 'Site repo', value: '', url: '', vault_ref: '', expires_at: '' },
    { type: 'google_account', label: 'GA4 + Search Console', value: '', url: '', vault_ref: '', expires_at: '' },
    { type: 'hosting', label: 'Deploy target', value: '', url: '', vault_ref: '', expires_at: '' },
  ])
  const [whoisStatus, setWhoisStatus] = useState<'idle' | 'checking' | 'found' | 'error'>('idle')
  const [whoisInfo, setWhoisInfo] = useState('')

  // Step 3 — Billing
  const [plan_price_cents, setPlanPriceCents] = useState(3000)
  const [setup_fee_cents, setSetupFeeCents] = useState(0)

  // ── Pre-fill assets from naming convention ─────────────
  function prefillAssets(slug: string) {
    setAssets(prev => prev.map(a => {
      if (a.type === 'github_repo' && !a.value)
        return { ...a, value: `agency/${slug}-site`, url: `https://github.com/agency/${slug}-site` }
      if (a.type === 'google_account' && !a.value)
        return { ...a, value: `${slug}.analytics@agency.com` }
      return a
    }))
  }

  // ── WHOIS domain lookup ────────────────────────────────
  async function checkWhois(domain: string) {
    if (!domain) return
    setWhoisStatus('checking')
    try {
      const res = await fetch(`https://whois.freeaiapi.xyz/?name=${encodeURIComponent(domain)}`)
      const data = await res.json()
      if (data?.expires_date) {
        setWhoisInfo(`Expires: ${data.expires_date}`)
        const domainIdx = assets.findIndex(a => a.type === 'domain')
        if (domainIdx >= 0) {
          const updated = [...assets]
          updated[domainIdx] = { ...updated[domainIdx], expires_at: data.expires_date }
          setAssets(updated)
        }
      } else {
        setWhoisInfo('Domain found — expiry not available')
      }
      setWhoisStatus('found')
    } catch {
      setWhoisStatus('error')
      setWhoisInfo('WHOIS lookup failed — enter expiry manually')
    }
  }

  // ── Save business details + create client record ────────
  async function saveBusiness() {
    setLoading(true)
    setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: dbErr } = await (supabase.from('clients') as any)
      .insert({
        org_id: orgId,
        business_name: biz.business_name,
        contact_name: biz.contact_name,
        email: biz.email,
        phone: biz.phone,
        country: biz.country,
        vat_id: biz.vat_id,
        currency: biz.currency,
        notes: biz.notes,
        status: 'onboarding',
        plan_price_cents,
        setup_fee_cents,
      })
      .select('id')
      .single()

    if (dbErr || !data) { setError(dbErr?.message ?? 'Failed to create client'); setLoading(false); return }
    setClientId((data as { id: string }).id)
    const slug = makeSlug(biz.business_name)
    prefillAssets(slug)
    setLoading(false)
    setStep(1)
  }

  // ── Save assets ─────────────────────────────────────────
  async function saveAssets() {
    setLoading(true)
    setError('')
    const rows = assets
      .filter(a => a.value || a.url)
      .map(a => ({
        client_id: clientId,
        org_id: orgId,
        type: a.type as Database['public']['Tables']['client_assets']['Row']['type'],
        label: a.label,
        value: a.value || null,
        url: a.url || null,
        vault_ref: a.vault_ref || null,
        expires_at: a.expires_at || null,
      }))

    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: asErr } = await (supabase.from('client_assets') as any).insert(rows)
      if (asErr) { setError(asErr.message); setLoading(false); return }
    }
    setLoading(false)
    setStep(2)
  }

  // ── Create Stripe Checkout link ─────────────────────────
  async function createCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          email: biz.email,
          business_name: biz.business_name,
          plan_price_cents,
          setup_fee_cents,
          currency: biz.currency,
          org_id: orgId,
        }),
      })
      const json = await res.json()
      if (json.url) {
        setCheckoutUrl(json.url)
        setStep(3)
      } else {
        setError(json.error ?? 'Failed to create checkout link')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    }
    setLoading(false)
  }

  function updateAsset(idx: number, field: keyof AssetRow, val: string) {
    const updated = [...assets]
    updated[idx] = { ...updated[idx], [field]: val }
    setAssets(updated)
  }

  function addAsset() {
    setAssets(prev => [...prev, { type: 'other', label: '', value: '', url: '', vault_ref: '', expires_at: '' }])
  }

  function removeAsset(idx: number) {
    setAssets(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Step progress */}
      <div className="step-progress">
        {STEPS.map((label, i) => (
          <div key={label} className="step-item">
            <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className="step-label" style={{ color: i === step ? 'var(--color-text)' : undefined }}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${i < step ? 'done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--color-danger-dim)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 24, padding: '14px 20px', color: 'var(--color-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Step 0: Business Details ─────────────────────── */}
      {step === 0 && (
        <div className="card animate-in">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Business details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Business name *</label>
                <input id="biz-name" className="form-input" value={biz.business_name}
                  onChange={e => setBiz(p => ({ ...p, business_name: e.target.value }))} placeholder="Acme GmbH" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact name</label>
                <input id="contact-name" className="form-input" value={biz.contact_name}
                  onChange={e => setBiz(p => ({ ...p, contact_name: e.target.value }))} placeholder="Jane Smith" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input id="client-email" className="form-input" type="email" value={biz.email}
                  onChange={e => setBiz(p => ({ ...p, email: e.target.value }))} placeholder="billing@acme.de" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input id="client-phone" className="form-input" type="tel" value={biz.phone}
                  onChange={e => setBiz(p => ({ ...p, phone: e.target.value }))} placeholder="+49 30 000000" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Country</label>
                <input id="client-country" className="form-input" value={biz.country}
                  onChange={e => setBiz(p => ({ ...p, country: e.target.value }))} placeholder="DE" />
              </div>
              <div className="form-group">
                <label className="form-label">VAT ID</label>
                <input id="client-vat" className="form-input" value={biz.vat_id}
                  onChange={e => setBiz(p => ({ ...p, vat_id: e.target.value }))} placeholder="DE123456789" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select id="client-currency" className="form-select" value={biz.currency}
                  onChange={e => setBiz(p => ({ ...p, currency: e.target.value }))}>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="GBP">GBP — Pound</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly plan (cents)</label>
                <input id="plan-price" className="form-input" type="number" value={plan_price_cents}
                  onChange={e => setPlanPriceCents(Number(e.target.value))} step={100} />
                <span className="form-hint">{(plan_price_cents / 100).toFixed(2)} {biz.currency}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (internal)</label>
              <textarea id="client-notes" className="form-textarea" value={biz.notes}
                onChange={e => setBiz(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              id="step-1-next"
              className="btn btn-primary"
              disabled={loading || !biz.business_name || !biz.email}
              onClick={saveBusiness}
            >
              {loading ? <Loader2 size={16} className="spin" /> : null}
              Save & continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Site Assets ───────────────────────────── */}
      {step === 1 && (
        <div className="card animate-in">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Site assets</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: '0.875rem' }}>
            Pre-filled from naming convention — confirm or update each field. Credentials go in 1Password/Bitwarden; add the vault ref here.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {assets.map((asset, idx) => (
              <div
                key={idx}
                className="card"
                style={{ background: 'var(--color-surface-2)', padding: 16, gap: 12 }}
              >
                <div className="grid-2" style={{ gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      id={`asset-type-${idx}`}
                      className="form-select"
                      value={asset.type}
                      onChange={e => updateAsset(idx, 'type', e.target.value)}
                    >
                      {ASSET_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <input
                      id={`asset-label-${idx}`}
                      className="form-input"
                      value={asset.label}
                      onChange={e => updateAsset(idx, 'label', e.target.value)}
                      placeholder="e.g. Primary domain"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Value / identifier</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id={`asset-value-${idx}`}
                      className="form-input"
                      value={asset.value}
                      onChange={e => updateAsset(idx, 'value', e.target.value)}
                      placeholder={asset.type === 'domain' ? 'acme.de' : 'identifier'}
                    />
                    {asset.type === 'domain' && (
                      <button
                        id={`whois-check-${idx}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => checkWhois(asset.value)}
                        disabled={!asset.value || whoisStatus === 'checking'}
                        title="WHOIS lookup"
                      >
                        <Globe size={14} />
                        {whoisStatus === 'checking' ? 'Checking…' : 'WHOIS'}
                      </button>
                    )}
                  </div>
                  {asset.type === 'domain' && whoisStatus !== 'idle' && (
                    <span
                      className="form-hint"
                      style={{ color: whoisStatus === 'error' ? 'var(--color-warning)' : 'var(--color-success)' }}
                    >
                      {whoisInfo}
                    </span>
                  )}
                </div>

                <div className="grid-2" style={{ gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">URL</label>
                    <input
                      id={`asset-url-${idx}`}
                      className="form-input"
                      type="url"
                      value={asset.url}
                      onChange={e => updateAsset(idx, 'url', e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vault ref (1Password / Bitwarden)</label>
                    <input
                      id={`asset-vault-${idx}`}
                      className="form-input"
                      value={asset.vault_ref}
                      onChange={e => updateAsset(idx, 'vault_ref', e.target.value)}
                      placeholder="op://vault/item"
                    />
                  </div>
                </div>

                {asset.type === 'domain' && (
                  <div className="form-group">
                    <label className="form-label">Domain / SSL expiry</label>
                    <input
                      id={`asset-expires-${idx}`}
                      className="form-input"
                      type="date"
                      value={asset.expires_at}
                      onChange={e => updateAsset(idx, 'expires_at', e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id={`remove-asset-${idx}`}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-text-faint)' }}
                    onClick={() => removeAsset(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button id="add-asset" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addAsset}>
              + Add asset
            </button>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button id="step-2-back" className="btn btn-ghost" onClick={() => setStep(0)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button id="step-2-next" className="btn btn-primary" disabled={loading} onClick={saveAssets}>
              {loading ? <Loader2 size={16} /> : null}
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Billing ───────────────────────────────── */}
      {step === 2 && (
        <div className="card animate-in">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Billing setup</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: '0.875rem' }}>
            This generates a Stripe Checkout link. Send it to the client or complete it with them live.
            The client stays at <strong>onboarding</strong> until the payment webhook confirms.
          </p>

          <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid-2">
              <div>
                <div className="form-label">Monthly plan</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>
                  {(plan_price_cents / 100).toFixed(2)} {biz.currency}
                </div>
              </div>
              <div>
                <div className="form-label">Setup fee</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 4 }}>
                  {(setup_fee_cents / 100).toFixed(2)} {biz.currency}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Setup fee (cents, 0 = none)</label>
              <input
                id="setup-fee"
                className="form-input"
                type="number"
                value={setup_fee_cents}
                onChange={e => setSetupFeeCents(Number(e.target.value))}
                step={100}
              />
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="form-label">Client</div>
                <div style={{ fontWeight: 600 }}>{biz.business_name}</div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>{biz.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="form-label">First charge</div>
                <div style={{ fontWeight: 700 }}>
                  {((plan_price_cents + setup_fee_cents) / 100).toFixed(2)} {biz.currency}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button id="step-3-back" className="btn btn-ghost" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button
              id="generate-checkout"
              className="btn btn-primary"
              disabled={loading}
              onClick={createCheckout}
            >
              {loading ? <Loader2 size={16} /> : <LinkIcon size={16} />}
              Generate checkout link
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirmation ──────────────────────────── */}
      {step === 3 && (
        <div className="card animate-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Client Onboarded!</h2>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: '0.9rem' }}>
            Send this secure Stripe Checkout link to <strong>{biz.business_name}</strong>. Once they complete payment, their status will
            automatically flip to <strong style={{ color: 'var(--color-success)' }}>Active</strong>.
          </p>

          {checkoutUrl && (
            <div style={{
              background: 'var(--color-surface-2)',
              border: '1px solid rgba(232, 68, 10, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              marginBottom: 24,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                💳 Stripe Payment Checkout Link:
              </div>

              <div style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: 'var(--color-text)',
                wordBreak: 'break-all',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <span>{checkoutUrl}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(checkoutUrl)
                    alert('Payment link copied to clipboard! ✅')
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  <Copy size={14} /> Copy Link
                </button>
              </div>

              {/* Quick WhatsApp / Email share */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <a
                  href={`https://wa.me/${biz.phone ? biz.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(
                    `Hello ${biz.contact_name || biz.business_name},\n\nHere is your secure checkout link for ${biz.business_name}:\n${checkoutUrl}\n\nPlease complete payment to activate your monthly care plan.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6, background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                >
                  <MessageCircle size={14} /> Send via WhatsApp
                </a>

                <a
                  href={`mailto:${biz.email}?subject=${encodeURIComponent(`Payment Link for ${biz.business_name}`)}&body=${encodeURIComponent(
                    `Hello ${biz.contact_name || biz.business_name},\n\nPlease use this secure Stripe checkout link to complete your payment:\n\n${checkoutUrl}\n\nThank you!`
                  )}`}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6, background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                >
                  <Mail size={14} /> Send via Email
                </a>

                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ gap: 6 }}
                >
                  <LinkIcon size={14} /> Open Checkout ↗
                </a>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              id="view-new-client"
              href={`/admin/clients/${clientId}`}
              className="btn btn-primary"
            >
              View Client Record →
            </a>
            <button
              id="onboard-another"
              className="btn btn-ghost"
              onClick={() => {
                setStep(0)
                setClientId('')
                setCheckoutUrl('')
                setBiz({ business_name: '', contact_name: '', email: '', phone: '', country: '', vat_id: '', currency: 'EUR', notes: '' })
              }}
            >
              + Onboard Another Client
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
