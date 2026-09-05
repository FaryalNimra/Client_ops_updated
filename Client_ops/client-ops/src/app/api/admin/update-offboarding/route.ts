import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

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
    const { clientId, offboardingState } = body

    if (!clientId || !offboardingState) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Save offboarding state object as JSON inside clients table notes or payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: clientRecord, error: fetchErr } = await (supabase.from('clients') as any)
      .select('notes')
      .eq('id', clientId)
      .single()

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    // Merge offboarding state into existing notes field as JSON
    let existingNotesObj: Record<string, unknown> = {}
    try {
      if (clientRecord?.notes && clientRecord.notes.startsWith('{')) {
        existingNotesObj = JSON.parse(clientRecord.notes)
      }
    } catch {
      existingNotesObj = { legacy_notes: clientRecord?.notes }
    }

    const updatedNotesObj = {
      ...existingNotesObj,
      offboarding_checklist: offboardingState,
      offboarding_updated_at: new Date().toISOString(),
      offboarding_updated_by: profile.full_name || profile.email,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase.from('clients') as any)
      .update({ notes: JSON.stringify(updatedNotesObj) })
      .eq('id', clientId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log step in activity_log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: clientId,
      actor: profile.full_name || profile.email,
      action: 'offboarding_checklist_updated',
      payload: offboardingState,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
