import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    const profile = rawProfile as { client_id: string | null } | null

    const { data: rawClient } = await supabase
      .from('clients')
      .select('stripe_customer_id')
      .eq('id', profile?.client_id ?? '')
      .single()

    const client = rawClient as { stripe_customer_id: string | null } | null

    if (!client?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer record or portal subscription found' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${appUrl}/client/dashboard`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
