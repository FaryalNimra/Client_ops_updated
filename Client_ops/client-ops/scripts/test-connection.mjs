import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://euiubqsosjmqqvnizynb.supabase.co'
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDI4MTMsImV4cCI6MjEwNDAxODgxM30.yMKYDY68_cNUqRrL80Dr5HqPYlyEqTAOqNLhdACjJZ4'
const SERVICE_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const EMAIL    = 'superadmin@clientops.com'
const PASSWORD = 'Admin@1234!'

const anonClient    = createClient(SUPABASE_URL, ANON_KEY)
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Supabase Connection Test')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// TEST 1: Basic connection
console.log('\n[1] Supabase URL reach ho raha hai?')
try {
  const res = await fetch(SUPABASE_URL)
  console.log('    ✅ Connected! Status:', res.status)
} catch (e) {
  console.log('    ❌ CANNOT REACH SUPABASE:', e.message)
}

// TEST 2: User exist karta hai?
console.log('\n[2] Auth user exist karta hai?')
const { data: { users }, error: listErr } = await serviceClient.auth.admin.listUsers()
if (listErr) {
  console.log('    ❌ Service role error:', listErr.message)
} else {
  const found = users.find(u => u.email === EMAIL)
  if (found) {
    console.log('    ✅ User mila! ID:', found.id)
    console.log('    Email confirmed?', found.email_confirmed_at ? '✅ Yes' : '❌ No')
  } else {
    console.log('    ❌ User nahi mila:', EMAIL)
  }
}

// TEST 3: Profile exist karta hai?
console.log('\n[3] Profile table mein record hai?')
const { data: profiles, error: profErr } = await serviceClient
  .from('profiles')
  .select('id, email, role')
  .eq('email', EMAIL)

if (profErr) {
  console.log('    ❌ Profile error:', profErr.message)
} else if (!profiles || profiles.length === 0) {
  console.log('    ❌ Profile nahi mila! profiles table mein record nahi hai')
} else {
  console.log('    ✅ Profile mila! Role:', profiles[0].role)
}

// TEST 4: Actual login test
console.log('\n[4] Email+Password se login test...')
const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
})
if (loginErr) {
  console.log('    ❌ LOGIN FAILED:', loginErr.message)
} else {
  console.log('    ✅ Login successful! User ID:', loginData.user.id)
  console.log('    Session token:', loginData.session ? '✅ Mila' : '❌ Missing')
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
