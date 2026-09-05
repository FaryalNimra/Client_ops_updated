import { POST } from '../src/app/api/stripe/webhook/route'
import fs from 'fs'
import path from 'path'

// Load environment variables
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

async function testWebhookEndpoint() {
  console.log('========================================================')
  console.log('🧪 TESTING STRIPE WEBHOOK ROUTE HANDLER (INVOICE PAYMENT FAILED)')
  console.log('========================================================\n')

  process.env.BYPASS_WEBHOOK_SIG = 'true'

  // Test Case A: Undefined SLACK_WEBHOOK_URL
  delete process.env.SLACK_WEBHOOK_URL
  console.log('Test Case A: SLACK_WEBHOOK_URL is undefined...')

  const mockPayload = {
    id: `evt_sim_${Date.now()}`,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: `in_sim_${Date.now()}`,
        amount_due: 4500,
        currency: 'usd',
        attempt_count: 2,
        hosted_invoice_url: 'https://pay.stripe.com/invoice/test_sim',
        metadata: {
          client_id: '00000000-0000-0000-0000-000000000002',
          org_id: '00000000-0000-0000-0000-000000000001',
        },
      },
    },
  }

  const reqA = new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'mock_sig_123',
    },
    body: JSON.stringify(mockPayload),
  })

  const resA = await POST(reqA)
  const jsonA = await resA.json()

  console.log(`- Response HTTP Status: ${resA.status}`)
  console.log(`- Response Body: ${JSON.stringify(jsonA)}`)

  if (resA.status === 200) {
    console.log('✅ Test Case A Passed: Returns 200 OK when SLACK_WEBHOOK_URL is undefined.\n')
  } else {
    console.error(`❌ Test Case A Failed: Expected 200 OK, got ${resA.status}\n`)
  }

  // Test Case B: SLACK_WEBHOOK_URL set to timing out endpoint
  process.env.SLACK_WEBHOOK_URL = 'http://10.255.255.1:81/unreachable-webhook'
  console.log('Test Case B: SLACK_WEBHOOK_URL points to timing out endpoint...')

  const mockPayloadB = {
    id: `evt_sim_b_${Date.now()}`,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: `in_sim_b_${Date.now()}`,
        amount_due: 6000,
        currency: 'eur',
        attempt_count: 3,
        hosted_invoice_url: 'https://pay.stripe.com/invoice/test_sim_b',
        metadata: {
          client_id: '00000000-0000-0000-0000-000000000002',
          org_id: '00000000-0000-0000-0000-000000000001',
        },
      },
    },
  }

  const reqB = new Request('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'mock_sig_456',
    },
    body: JSON.stringify(mockPayloadB),
  })

  const resB = await POST(reqB)
  const jsonB = await resB.json()

  console.log(`- Response HTTP Status: ${resB.status}`)
  console.log(`- Response Body: ${JSON.stringify(jsonB)}`)

  if (resB.status === 200) {
    console.log('✅ Test Case B Passed: Returns 200 OK to Stripe even when Slack API times out.\n')
  } else {
    console.error(`❌ Test Case B Failed: Expected 200 OK, got ${resB.status}\n`)
  }

  console.log('========================================================')
  console.log('🎉 STRIPE WEBHOOK HANDLER TEST COMPLETE!')
  console.log('========================================================')
}

testWebhookEndpoint()
