import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      client_id,
      email,
      business_name,
      plan_price_cents,
      setup_fee_cents = 0,
      currency = 'eur',
      org_id,
    } = body

    if (!client_id || !email || !plan_price_cents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Landing Page Care',
            description: `Monthly subscription for ${business_name}`,
          },
          unit_amount: plan_price_cents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ]

    // Add one-time setup fee if present
    if (setup_fee_cents > 0) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: { name: 'Setup fee' },
          unit_amount: setup_fee_cents,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: lineItems,
      customer_email: email,
      metadata: {
        client_id,
        org_id,
        business_name,
      },
      subscription_data: {
        metadata: { client_id, org_id },
      },
      success_url: `${appUrl}/client/checkout-success?session_id={CHECKOUT_SESSION_ID}&client_id=${client_id}`,
      cancel_url:  `${appUrl}/client/checkout-cancelled?client_id=${client_id}`,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[create-checkout-session]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
