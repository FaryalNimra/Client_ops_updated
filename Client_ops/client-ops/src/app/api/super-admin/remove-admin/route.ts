import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabaseSession = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is super_admin
    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role
    if (role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { admin_id, org_id } = await request.json()

    if (!admin_id || !org_id) {
      return NextResponse.json({ error: 'admin_id and org_id are required' }, { status: 400 })
    }

    // Delete profile from profiles table
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', admin_id)
      .eq('org_id', org_id)

    if (deleteProfileError) {
      return NextResponse.json({ error: deleteProfileError.message }, { status: 400 })
    }

    // Delete user from Supabase Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(admin_id)

    if (deleteAuthError) {
      // Return success even if auth user was already deleted, as profile is removed
      console.warn('Auth user deletion warning:', deleteAuthError.message)
    }

    return NextResponse.json({ success: true, admin_id, org_id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
