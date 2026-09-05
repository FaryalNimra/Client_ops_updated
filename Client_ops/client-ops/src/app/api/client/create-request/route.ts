import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

function getCurrentBillingMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('role, org_id, client_id, full_name, email')
      .eq('id', user.id)
      .single()

    const profile = rawProfile as { role: string; org_id: string | null; client_id: string | null; full_name: string | null; email: string } | null

    if (!profile || profile.role !== 'client' || !profile.client_id) {
      return NextResponse.json({ error: 'Forbidden: Only client users can submit change requests' }, { status: 403 })
    }

    const body = await req.json()
    const { type, description, targetPage, attachmentUrl } = body

    if (!type || !description) {
      return NextResponse.json({ error: 'Request type and description are required' }, { status: 400 })
    }

    const fullDescription = attachmentUrl ? `${description}\n\nAttachment: ${attachmentUrl}` : description
    const billingMonth = getCurrentBillingMonth()

    // ── Enforce 2 Requests / Month Quota (PRD v0.2 Requirement F5) ──
    const { data: existingRequests, error: countErr } = await supabase
      .from('change_requests')
      .select('id')
      .eq('client_id', profile.client_id)
      .eq('billing_month', billingMonth)

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 })
    }

    const usedQuota = existingRequests?.length || 0

    if (usedQuota >= 2) {
      return NextResponse.json({
        error: 'Monthly quota reached (2/2 requests used). Additional requests require a separate quote.',
        quotaExceeded: true,
      }, { status: 400 })
    }

    // Insert change request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requestRecord, error: insertErr } = await (supabase.from('change_requests') as any)
      .insert({
        client_id: profile.client_id,
        org_id: profile.org_id,
        submitted_by: profile.full_name || profile.email,
        type,
        description: fullDescription,
        target_page: targetPage || null,
        status: 'new',
        requested_at: new Date().toISOString(),
        billing_month: billingMonth,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Log to activity_log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: profile.client_id,
      actor: profile.full_name || profile.email,
      action: 'change_request_submitted',
      payload: {
        request_id: requestRecord.id,
        type,
        billing_month: billingMonth,
        remaining_quota: 2 - (usedQuota + 1),
      },
    })

    return NextResponse.json({
      success: true,
      request: requestRecord,
      remainingQuota: 2 - (usedQuota + 1),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
