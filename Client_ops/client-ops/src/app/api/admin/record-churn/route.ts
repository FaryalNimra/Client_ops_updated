import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rawProfile } = await supabase
      .from('profiles').select('role, org_id, full_name, email').eq('id', user.id).single()
    const profile = rawProfile as { role: string; org_id: string | null; full_name: string | null; email: string } | null

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { clientId, churnReason, churnNote } = body

    if (!clientId || !churnReason) {
      return NextResponse.json({ error: 'clientId and churnReason are required' }, { status: 400 })
    }

    // Update client: set status to churned + record reason
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase.from('clients') as any)
      .update({
        status: 'churned',
        churn_reason: churnReason,
        notes: churnNote || null,
      })
      .eq('id', clientId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Log to activity_log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: clientId,
      actor: profile.full_name || profile.email,
      action: 'client_churned',
      payload: { churn_reason: churnReason, note: churnNote, churned_at: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
