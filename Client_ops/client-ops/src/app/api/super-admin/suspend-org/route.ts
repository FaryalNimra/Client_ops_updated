import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rawProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const profile = rawProfile as { role: string } | null

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role
    if (role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: super admin only' }, { status: 403 })
    }

    const body = await req.json()
    const { org_id, suspend } = body // suspend: true = suspend, false = unsuspend

    if (!org_id || typeof suspend !== 'boolean') {
      return NextResponse.json({ error: 'org_id and suspend boolean required' }, { status: 400 })
    }

    const adminClient = createSupabaseAdmin()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: org, error } = await (adminClient.from('organizations') as any)
      .update({ suspended: suspend, suspended_at: suspend ? new Date().toISOString() : null })
      .eq('id', org_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, org })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
