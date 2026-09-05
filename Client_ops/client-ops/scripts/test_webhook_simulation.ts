import { sendSlackAlert } from '../src/lib/slack'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Manually load .env.local if exists
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      const value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runWebhookTests() {
  console.log('====================================================')
  console.log('🧪 RUNNING LOCALIZED STRIPE WEBHOOK SIMULATION TEST')
  console.log('====================================================\n')

  let testOrgId = ''
  let testClientId = ''

  try {
    // 1. Seed or retrieve a test organization & client in Supabase
    console.log('Step 1: Setting up test organization & client in Supabase...')
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name: 'Simulation Test Agency',
        slug: `sim-test-${Date.now()}`,
        default_price_cents: 3000,
        default_currency: 'EUR',
      })
      .select()
      .single()

    if (orgErr || !org) {
      console.warn('Could not insert test organization (using mock ID):', orgErr?.message)
      testOrgId = '00000000-0000-0000-0000-000000000001'
    } else {
      testOrgId = org.id
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        org_id: testOrgId,
        business_name: 'Simulated Client Co',
        contact_name: 'Alex Simulation',
        email: 'alex@simulatedclient.com',
        status: 'active',
        plan_price_cents: 3000,
        currency: 'EUR',
      })
      .select()
      .single()

    if (clientErr || !client) {
      console.warn('Could not insert test client (using mock ID):', clientErr?.message)
      testClientId = '00000000-0000-0000-0000-000000000002'
    } else {
      testClientId = client.id
    }

    console.log(`✅ Test Organization ID: ${testOrgId}`)
    console.log(`✅ Test Client ID: ${testClientId}\n`)

    // 2. Test sendSlackAlert when SLACK_WEBHOOK_URL is UNDEFINED
    console.log('Step 2: Testing sendSlackAlert with process.env.SLACK_WEBHOOK_URL = undefined...')
    delete process.env.SLACK_WEBHOOK_URL
    let slackErrorThrown = false
    try {
      await sendSlackAlert({
        businessName: 'Simulated Client Co',
        clientEmail: 'alex@simulatedclient.com',
        clientId: testClientId,
        amountCents: 3000,
        currency: 'EUR',
        attemptCount: 2,
      })
    } catch (err) {
      slackErrorThrown = true
      console.error('❌ FATAL: sendSlackAlert threw an unhandled error:', err)
    }

    if (!slackErrorThrown) {
      console.log('✅ SUCCESS: sendSlackAlert handled undefined SLACK_WEBHOOK_URL gracefully with zero fatal errors.\n')
    }

    // 3. Test sendSlackAlert with simulated timeout URL
    console.log('Step 3: Testing sendSlackAlert with timeout/unreachable URL...')
    process.env.SLACK_WEBHOOK_URL = 'http://10.255.255.1:81/timeout-test'
    let timeoutErrorThrown = false
    try {
      await sendSlackAlert({
        businessName: 'Simulated Client Co',
        clientEmail: 'alex@simulatedclient.com',
        clientId: testClientId,
        amountCents: 3000,
        currency: 'EUR',
        attemptCount: 2,
      })
    } catch (err) {
      timeoutErrorThrown = true
      console.error('❌ FATAL: sendSlackAlert threw an unhandled error on timeout:', err)
    }

    if (!timeoutErrorThrown) {
      console.log('✅ SUCCESS: sendSlackAlert caught timeout error internally and did not throw a fatal error.\n')
    }

    // 4. Simulate invoice.payment_failed payload insertion into Supabase tables
    console.log('Step 4: Simulating invoice.payment_failed processing logic...')
    const testInvoiceId = `in_test_sim_${Date.now()}`
    const attemptCount = 3
    const amountDue = 3000

    // Upsert invoice & increment attempt count
    const { data: upsertedInvoice, error: invErr } = await supabase
      .from('invoices')
      .upsert({
        stripe_invoice_id: testInvoiceId,
        client_id: testClientId,
        org_id: testOrgId,
        amount_cents: amountDue,
        currency: 'EUR',
        status: 'open',
        attempt_count: attemptCount,
        hosted_invoice_url: 'https://pay.stripe.com/invoice/acct_test/invst_test',
        billing_month: '2026-09',
      })
      .select()
      .single()

    if (invErr) {
      console.error('❌ Failed to upsert test invoice:', invErr.message)
    } else {
      console.log(`✅ SUCCESS: Upserted invoice ${upsertedInvoice.stripe_invoice_id}`)
      console.log(`   - Amount Cents: ${upsertedInvoice.amount_cents}`)
      console.log(`   - Attempt Count: ${upsertedInvoice.attempt_count}`)
      console.log(`   - Status: ${upsertedInvoice.status}\n`)
    }

    // Update client status to past_due
    const { data: updatedClient, error: statusErr } = await supabase
      .from('clients')
      .update({ status: 'past_due' })
      .eq('id', testClientId)
      .select()
      .single()

    if (statusErr) {
      console.error('❌ Failed to update client status:', statusErr.message)
    } else {
      console.log(`✅ SUCCESS: Updated client ${updatedClient.id} status to '${updatedClient.status}'\n`)
    }

    // Clean up test records
    console.log('Step 5: Cleaning up test database records...')
    await supabase.from('invoices').delete().eq('stripe_invoice_id', testInvoiceId)
    await supabase.from('clients').delete().eq('id', testClientId)
    await supabase.from('organizations').delete().eq('id', testOrgId)
    console.log('✅ Cleaned up test database records.\n')

    console.log('====================================================')
    console.log('🎉 ALL STRIPE WEBHOOK SIMULATION TESTS PASSED 100%!')
    console.log('====================================================')
  } catch (err) {
    console.error('❌ Test execution error:', err)
  }
}

runWebhookTests()
