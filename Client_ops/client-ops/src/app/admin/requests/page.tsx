import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import ChangeRequestActions from './ChangeRequestActions'

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as { role: string; org_id: string | null } | null

  let query = supabase
    .from('change_requests')
    .select(`
      id, type, description, target_page, status, admin_note,
      billing_month, requested_at, completed_at, attachment_url,
      clients (id, business_name)
    `)
    .order('requested_at', { ascending: false })
    .limit(200)

  if (profile?.org_id) {
    query = query.eq('org_id', profile.org_id)
  }

  if (searchParams.status) query = query.eq('status', searchParams.status as never)
  else query = query.in('status', ['new', 'in_progress', 'needs_client_input'])

  const { data: requests } = await query

  const STATUSES = ['new', 'in_progress', 'needs_client_input', 'done', 'rejected']

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Change requests</h1>
          <p className="page-subtitle">{requests?.length ?? 0} results</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div className="flex gap-3 flex-wrap">
          <Link href="/admin/requests" id="filter-active"
            className={`btn btn-sm ${!searchParams.status ? 'btn-primary' : 'btn-secondary'}`}>
            Active queue
          </Link>
          {STATUSES.map(s => (
            <Link key={s} href={`/admin/requests?status=${s}`} id={`filter-${s}`}
              className={`btn btn-sm ${searchParams.status === s ? 'btn-primary' : 'btn-secondary'}`}>
              {s.replace(/_/g, ' ')}
            </Link>
          ))}
        </div>

        {/* Request cards */}
        {requests && (requests as unknown as Record<string, unknown>[]).length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(requests as unknown as Record<string, unknown>[]).map(req => {
              const client = Array.isArray(req.clients) ? req.clients[0] : req.clients
              const reqId = String(req.id)
              return (
                <div key={reqId} id={`request-${reqId}`} className="card card-hover animate-in">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <div>
                      {client && (
                        <Link href={`/admin/clients/${(client as { id: string }).id}`} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                          {(client as { business_name: string }).business_name}
                        </Link>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-lead" style={{ textTransform: 'capitalize' }}>{String((req as Record<string, unknown>).type).replace(/_/g, ' ')}</span>
                        <Badge status={String((req as Record<string, unknown>).status)} />
                        <span className="text-muted" style={{ fontSize: '0.78rem' }}>{String((req as Record<string, unknown>).billing_month)} · {fmt(String((req as Record<string, unknown>).requested_at))}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', marginBottom: (req as Record<string, unknown>).target_page ? 8 : 0 }}>{String((req as Record<string, unknown>).description ?? '')}</p>
                  {Boolean((req as Record<string, unknown>).target_page) && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Page: <strong>{String((req as Record<string, unknown>).target_page)}</strong>
                    </p>
                  )}
                  {Boolean((req as Record<string, unknown>).admin_note) && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <strong>Note:</strong> {String((req as Record<string, unknown>).admin_note)}
                    </div>
                  )}
                  {Boolean((req as Record<string, unknown>).attachment_url) && (
                    <a href={String((req as Record<string, unknown>).attachment_url)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                      View attachment
                    </a>
                  )}

                  <ChangeRequestActions requestId={String((req as Record<string, unknown>).id)} currentStatus={String((req as Record<string, unknown>).status)} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p className="text-muted">No requests in this view.</p>
          </div>
        )}
      </div>
    </>
  )
}
