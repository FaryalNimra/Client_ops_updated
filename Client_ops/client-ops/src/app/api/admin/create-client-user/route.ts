import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabaseSession = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const { client_id, email, password, full_name, org_id } = await request.json()

    if (!client_id || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields: client_id, email, password' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const targetOrgId = org_id || profile?.org_id

    // Check if user already exists in auth
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = userList?.users?.find(
      u => u.email?.toLowerCase() === email.trim().toLowerCase()
    )

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      // Update existing user password and metadata
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password.trim(),
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'client',
          client_id,
          org_id: targetOrgId,
          full_name: full_name || existingUser.user_metadata?.full_name || email,
        },
      })
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
    } else {
      // Create new Auth user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password.trim(),
        email_confirm: true,
        user_metadata: {
          role: 'client',
          client_id,
          org_id: targetOrgId,
          full_name: full_name || email,
        },
      })
      if (createErr || !newUser.user) {
        return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // Upsert into profiles table
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: email.trim(),
      full_name: full_name || email,
      role: 'client',
      org_id: targetOrgId,
      client_id,
    })

    if (profErr) {
      console.warn('Profile upsert warning:', profErr)
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      email: email.trim(),
      message: existingUser ? 'Client portal password updated successfully' : 'Client portal account created successfully',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('[create-client-user]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
