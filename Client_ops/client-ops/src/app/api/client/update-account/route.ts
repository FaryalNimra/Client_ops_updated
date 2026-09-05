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
      .select('role, org_id, client_id, full_name, email')
      .eq('id', user.id)
      .single()

    const profile = rawProfile as { role: string; org_id: string | null; client_id: string | null } | null

    if (!profile || profile.role !== 'client' || !profile.client_id) {
      return NextResponse.json({ error: 'Forbidden: Client session invalid' }, { status: 403 })
    }

    const body = await req.json()
    const { contact_name, email, phone } = body

    if (!contact_name || !email) {
      return NextResponse.json({ error: 'Contact name and email are required' }, { status: 400 })
    }

    // Update clients table - strictly scoped to user's client_id JWT claim / profile link
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedClient, error: updateErr } = await (supabase.from('clients') as any)
      .update({
        contact_name,
        email,
        phone: phone || null,
      })
      .eq('id', profile.client_id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log update in activity_log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('activity_log') as any).insert({
      org_id: profile.org_id,
      client_id: profile.client_id,
      actor: contact_name || user.email,
      action: 'client_contact_updated',
      payload: {
        contact_name,
        email,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, client: updatedClient })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
