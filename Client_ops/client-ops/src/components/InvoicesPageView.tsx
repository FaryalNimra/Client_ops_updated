import React from 'react'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import MonthFilter from '@/app/admin/invoices/MonthFilter'

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function formatCents(c: number, cur = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(c / 100)
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface InvoicesPageViewProps {
  searchParams?: { status?: string; month?: string; q?: string }
  orgSlug?: string
}

export default async function InvoicesPageView({ searchParams = {}, orgSlug }: InvoicesPageViewProps) {
  const currentSlug = orgSlug

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const adminClient = createSupabaseAdmin()

  const { data: rawProfile } = await adminClient
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { role: string; org_id: string | null } | null

  let orgId = profile?.org_id

  if (currentSlug && (!orgId || profile?.role === 'super_admin')) {
    const { data: orgData } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', currentSlug)
      .maybeSingle()
    if (orgData?.id) {
      orgId = orgData.id
    }
  }

  const basePrefix = currentSlug ? `/org/${currentSlug}` : '/admin'

  let query = adminClient
    .from('invoices')
    .select(`
      stripe_invoice_id, amount_cents, currency, status,
      paid_at, created_at, attempt_count, billing_month,
      hosted_invoice_url, invoice_pdf,
      clients (id, business_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (orgId) {
    query = query.eq('org_id', orgId)
  }

  if (searchParams.status) query = query.eq('status', searchParams.status as never)
  if (searchParams.month)  query = query.eq('billing_month', searchParams.month)

  const { data: invoices } = await query

  const STATUSES = ['draft', 'open', 'paid', 'uncollectible', 'void']

  // Total paid
  const totalPaid = (invoices as unknown as Record<string, unknown>[])
    ?.filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount_cents), 0) ?? 0

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices?.length ?? 0} records</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total paid</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
            {formatCents(totalPaid)}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Link href={`${basePrefix}/invoices`} id="filter-all" className={`btn btn-sm ${!searchParams.status ? 'btn-primary' : 'btn-secondary'}`}>All</Link>
          {STATUSES.map(s => (
            <Link key={s} href={`${basePrefix}/invoices?status=${s}`} id={`filter-${s}`}
              className={`btn btn-sm ${searchParams.status === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s}
            </Link>
          ))}

          <div style={{ marginLeft: 'auto' }}>
            <MonthFilter basePrefix={basePrefix} currentMonth={searchParams.month} />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table" id="invoices-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid</th>
                <th>Attempts</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(invoices as unknown as Record<string, unknown>[])?.map(inv => {
                const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients
                return (
                  <tr key={String(inv.stripe_invoice_id)} id={`invoice-${String(inv.stripe_invoice_id)}`}>
                    <td>
                      {client ? (
                        <Link href={`${basePrefix}/clients/${(client as { id: string }).id}`} style={{ fontWeight: 600 }}>
                          {(client as { business_name: string }).business_name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="text-muted">{String(inv.billing_month ?? fmt(inv.created_at as string))}</td>
                    <td style={{ fontWeight: 600 }}>{formatCents(Number(inv.amount_cents), String(inv.currency))}</td>
                    <td><Badge status={String(inv.status)} /></td>
                    <td className="text-muted">{fmt(inv.paid_at as string | null)}</td>
                    <td className="text-muted">{Number(inv.attempt_count)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Boolean(inv.hosted_invoice_url) && (
                          <a id={`view-invoice-${String(inv.stripe_invoice_id)}`} href={String(inv.hosted_invoice_url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="View invoice">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {Boolean(inv.invoice_pdf) && (
                          <a id={`pdf-invoice-${String(inv.stripe_invoice_id)}`} href={String(inv.invoice_pdf)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Download PDF">
                            <FileText size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
