import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabaseSession = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin or super_admin
    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { org_id, business_name, contact_name, email, phone, country, vat_id, currency, notes, plan_price_cents, setup_fee_cents } = body

    if (!org_id || !business_name || !email) {
      return NextResponse.json({ error: 'org_id, business_name, and email are required' }, { status: 400 })
    }

    // Admin can only create clients for their own org
    if (role === 'admin' && profile?.org_id !== org_id) {
      return NextResponse.json({ error: 'Forbidden: cannot create clients for other orgs' }, { status: 403 })
    }

    const { data: client, error: dbErr } = await supabaseAdmin
      .from('clients')
      .insert({
        org_id,
        business_name,
        contact_name: contact_name || null,
        email,
        phone: phone || null,
        country: country || null,
        vat_id: vat_id || null,
        currency: currency || 'EUR',
        notes: notes || null,
        status: 'onboarding',
        plan_price_cents: plan_price_cents ?? 3000,
        setup_fee_cents: setup_fee_cents ?? 0,
      })
      .select('id')
      .single()

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 400 })
    }

    return NextResponse.json({ client })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
