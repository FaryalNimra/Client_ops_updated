import { createClient } from '@supabase/supabase-js'

// ── Credentials (change agar aap chahein) ─────────────────────────
const SUPER_ADMIN_EMAIL    = 'superadmin@clientops.com'
const SUPER_ADMIN_PASSWORD = 'Admin@1234!'
const SUPER_ADMIN_NAME     = 'Super Admin'
// ──────────────────────────────────────────────────────────────────

const SUPABASE_URL              = 'https://euiubqsosjmqqvnizynb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('🔧 Creating super admin user...')

  // Step 1: Auth user banana (service role se — email confirm nahi chahiye)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    email_confirm: true,   // auto-confirm
    user_metadata: { full_name: SUPER_ADMIN_NAME, role: 'super_admin' }
  })

  if (authError) {
    // Agar user pehle se exist karta hai
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      console.log('⚠️  User pehle se exist karta hai — profile update karte hain...')

      // Existing user dhundo
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) { console.error('❌ Users list error:', listError.message); process.exit(1) }

      const existing = users.find(u => u.email === SUPER_ADMIN_EMAIL)
      if (!existing) { console.error('❌ User nahi mila'); process.exit(1) }

      await upsertProfile(existing.id)
      return
    }
    console.error('❌ Auth error:', authError.message)
    process.exit(1)
  }

  const userId = authData.user.id
  console.log('✅ Auth user bana gaya! ID:', userId)

  await upsertProfile(userId)
}

async function upsertProfile(userId) {
  // Update user_metadata and app_metadata in Auth system
  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: SUPER_ADMIN_PASSWORD,
    user_metadata: { full_name: SUPER_ADMIN_NAME, role: 'super_admin' },
    app_metadata: { role: 'super_admin' }
  })
  if (updateError) {
    console.error('❌ User metadata update error:', updateError.message)
  } else {
    console.log('✅ Auth user metadata & password updated!')
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id:        userId,
      email:     SUPER_ADMIN_EMAIL,
      full_name: SUPER_ADMIN_NAME,
      role:      'super_admin',
      org_id:    null,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('❌ Profile error:', profileError.message)
    process.exit(1)
  }

  console.log('')
  console.log('🎉 Super Admin tayar hai!')
  console.log('─────────────────────────────')
  console.log('  Email   :', SUPER_ADMIN_EMAIL)
  console.log('  Password:', SUPER_ADMIN_PASSWORD)
  console.log('  Role    : super_admin')
  console.log('─────────────────────────────')
  console.log('  Login URL: http://localhost:3001/auth')
  console.log('')
}

main()
