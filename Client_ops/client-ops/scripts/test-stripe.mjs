import Stripe from 'stripe'

const secretKey = 'sk_test_51SIN9e65l5myqnILGJxPtn1DbZeXIZnmSM6CQXpSoOZotBbB61bdKjPF4ebgpOwL4BOPPYf8PCWmP5L3a0NmfRk800K88Zcx1i'

const stripe = new Stripe(secretKey, {
  apiVersion: '2024-06-20',
})

async function testConnection() {
  try {
    const account = await stripe.accounts.retrieve()
    console.log('✅ Stripe Connected Successfully!')
    console.log('Account ID:', account.id)
    console.log('Business Name:', account.business_profile?.name || account.settings?.dashboard?.display_name || 'Standard Account')
    console.log('Charges Enabled:', account.charges_enabled)
    console.log('Details Submitted:', account.details_submitted)
  } catch (err) {
    // If it's a standard key without full accounts retrieve permission, try balance or customers
    try {
      const balance = await stripe.balance.retrieve()
      console.log('✅ Stripe Connected Successfully via Balance API!')
      console.log('Livemode:', balance.livemode)
      console.log('Available Balances:', balance.available)
    } catch (e) {
      console.error('❌ Stripe Connection Error:', e.message)
    }
  }
}

testConnection()
