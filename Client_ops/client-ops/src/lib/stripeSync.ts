import Stripe from 'stripe'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

function billingMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export async function syncClientWithStripe(clientId: string): Promise<Database['public']['Tables']['clients']['Row'] | null> {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 1. Fetch current client from DB
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) return null

    // 2. Fetch completed checkout sessions from Stripe
    const sessions = await stripe.checkout.sessions.list({ limit: 20 })
    const matchingSession = sessions.data.find(
      s => (s.metadata?.client_id === clientId ||
            (s.customer_details?.email && s.customer_details.email.toLowerCase() === client.email.toLowerCase()) ||
            (s.customer_email && s.customer_email.toLowerCase() === client.email.toLowerCase())) &&
           (s.payment_status === 'paid' || s.status === 'complete')
    )

    let subscriptionId: string | null = client.stripe_subscription_id || (matchingSession?.subscription as string) || null
    let customerId: string | null = client.stripe_customer_id || (matchingSession?.customer as string) || null
    let customerEmail = matchingSession?.customer_details?.email || matchingSession?.customer_email || client.email

    // 3. Fallback: Search Stripe Customers by email if no session found
    if (!subscriptionId && client.email) {
      const customers = await stripe.customers.list({ email: client.email, limit: 3 })
      if (customers.data.length > 0) {
        customerId = customers.data[0].id
        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 3 })
        if (subs.data.length > 0) {
          subscriptionId = subs.data[0].id
        }
      }
    }

    if (!subscriptionId && !matchingSession) {
      return client
    }

    let purchaseDate = client.purchase_date || new Date().toISOString().split('T')[0]
    let activeStatus: Database['public']['Tables']['clients']['Row']['status'] = 'active'

    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        if (sub.billing_cycle_anchor) {
          purchaseDate = new Date(sub.billing_cycle_anchor * 1000).toISOString().split('T')[0]
        }
        if (!customerId && sub.customer) {
          customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        }

        activeStatus = (sub.status === 'active' || sub.status === 'trialing')
          ? 'active'
          : sub.status === 'past_due' ? 'past_due' : sub.status === 'canceled' ? 'churned' : 'active'

        // Upsert subscription mirror
        await supabaseAdmin.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          client_id: clientId,
          org_id: client.org_id,
          status: sub.status as Database['public']['Tables']['subscriptions']['Row']['status'],
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          latest_invoice_id: (typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice?.id) || null,
        })

        // Upsert latest invoice
        if (sub.latest_invoice) {
          const invId = typeof sub.latest_invoice === 'string' ? sub.latest_invoice : sub.latest_invoice.id
          try {
            const inv = await stripe.invoices.retrieve(invId)
            await supabaseAdmin.from('invoices').upsert({
              stripe_invoice_id: inv.id,
              client_id: clientId,
              org_id: client.org_id,
              amount_cents: inv.amount_paid || inv.amount_due || (client.plan_price_cents ?? 0),
              currency: (inv.currency || client.currency || 'EUR').toUpperCase(),
              status: inv.status === 'paid' ? 'paid' : 'open',
              paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(),
              attempt_count: inv.attempt_count || 1,
              hosted_invoice_url: inv.hosted_invoice_url || null,
              invoice_pdf: inv.invoice_pdf || null,
              billing_month: billingMonth(new Date()),
            })
          } catch (invErr) {
            console.warn('[stripeSync] invoice retrieval error:', invErr)
          }
        }
      } catch (subErr) {
        console.warn('[stripeSync] sub retrieval error:', subErr)
      }
    }

    // Update client record in DB
    const { data: updatedClient } = await supabaseAdmin
      .from('clients')
      .update({
        status: activeStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        purchase_date: purchaseDate,
        email: customerEmail,
      })
      .eq('id', clientId)
      .select('*')
      .single()

    return updatedClient || client
  } catch (err) {
    console.error('[stripeSync] error syncing client:', err)
    return null
  }
}
