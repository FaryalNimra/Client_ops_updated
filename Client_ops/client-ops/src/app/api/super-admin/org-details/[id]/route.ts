import { NextResponse } from 'next/server'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params

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

    // Fetch organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch admins for this org
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('org_id', orgId)
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    // Fetch auth user details for admins to get last_sign_in
    const adminDetails = []
    for (const admin of admins ?? []) {
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(admin.id)
      adminDetails.push({
        ...admin,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        created_at_auth: authUser?.created_at ?? admin.created_at,
        email_confirmed: authUser?.email_confirmed_at ? true : false,
      })
    }

    // Fetch clients for this org with full Stripe details
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, business_name, contact_name, email, phone, status, currency, plan_price_cents, setup_fee_cents, stripe_customer_id, stripe_subscription_id, purchase_date, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // Fetch MRR
    const { data: mrrData } = await supabaseAdmin
      .from('org_mrr')
      .select('mrr_cents, active_clients')
      .eq('org_id', orgId)
      .single()

    return NextResponse.json({
      org,
      admins: adminDetails,
      clients: clients ?? [],
      mrr: mrrData ?? { mrr_cents: 0, active_clients: 0 },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
