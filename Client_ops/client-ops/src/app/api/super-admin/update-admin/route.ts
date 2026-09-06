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

    const { admin_id, org_id, full_name, password } = await request.json()

    if (!admin_id || !org_id) {
      return NextResponse.json({ error: 'admin_id and org_id are required' }, { status: 400 })
    }

    // Update profile
    const updateData: { full_name?: string } = {}
    if (typeof full_name === 'string') updateData.full_name = full_name

    if (Object.keys(updateData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', admin_id)
        .eq('org_id', org_id)

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }
    }

    // Update Auth user (metadata or password if provided)
    const authUpdatePayload: { user_metadata?: { full_name?: string }; password?: string } = {}
    if (typeof full_name === 'string') {
      authUpdatePayload.user_metadata = { full_name }
    }
    if (password && password.trim().length >= 6) {
      authUpdatePayload.password = password.trim()
    }

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        admin_id,
        authUpdatePayload
      )

      if (authUpdateError) {
        return NextResponse.json({ error: authUpdateError.message }, { status: 400 })
      }
    }

    // Return updated admin info
    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, org_id')
      .eq('id', admin_id)
      .single()

    return NextResponse.json({ success: true, admin: updatedProfile })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
