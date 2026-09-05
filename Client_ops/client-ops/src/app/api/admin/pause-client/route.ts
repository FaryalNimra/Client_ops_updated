import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

/**
 * Stub function to interact with external hosting provider API
 * (e.g., Cloudflare Workers redirect or Vercel Deployment Protection toggle).
 */
async function triggerExternalHostingPause(clientId: string, businessName: string) {
  console.log(`[Hosting Provider Integration Stub] Pausing live site deployments for client ID: ${clientId} (${businessName})`)
  
  // Example Cloudflare Worker API call:
  // await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/rules`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  //   body: JSON.stringify({ action: 'redirect', target: 'https://status.agency.com/site-paused' })
  // })

  // Example Vercel API call:
  // await fetch(`https://api.vercel.com/v9/projects/${projectId}/protection`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}` },
  //   body: JSON.stringify({ protectionEnabled: true })
  // })

  return { success: true, stub: true }
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
      .select('role, org_id, full_name, email')
      .eq('id', user.id)
      .single()

    const profile = rawProfile as { role: string; org_id: string | null; full_name: string | null; email: string } | null

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { clientId, reason } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Fetch client record
    const { data: rawClientRecord, error: clientErr } = await supabase
      .from('clients')
      .select('id, business_name, status')
      .eq('id', clientId)
      .single()

    const clientRecord = rawClientRecord as { id: string; business_name: string; status: string } | null

    if (clientErr || !clientRecord) {
      return NextResponse.json({ error: 'Client record not found' }, { status: 404 })
    }

    // Update status to 'paused'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase.from('clients') as any)
      .update({ status: 'paused' })
      .eq('id', clientId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Call external hosting provider pause integration stub
    await triggerExternalHostingPause(clientId, clientRecord.business_name)

    // Log action in activity_log table as 'site_paused' (PRD Requirement)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: clientId,
      actor: profile.full_name || profile.email,
      action: 'site_paused',
      payload: {
        previous_status: clientRecord.status,
        new_status: 'paused',
        reason: reason || 'Day 14 Non-Payment Automated Dunning Pause Protocol',
        paused_at: new Date().toISOString(),
        external_stub_executed: true,
      },
    })

    return NextResponse.json({ success: true, message: 'Client site paused successfully' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
