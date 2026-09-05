import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://euiubqsosjmqqvnizynb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function fix() {
  // Get the super admin user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const superAdmin = users.find(u => u.email === 'superadmin@clientops.com')

  if (!superAdmin) {
    console.error('Super admin user not found!')
    return
  }

  console.log('Found super admin user:', superAdmin.id, superAdmin.email)

  // Insert the missing profile row
  const { data, error } = await supabase.from('profiles').upsert({
    id: superAdmin.id,
    email: superAdmin.email,
    full_name: superAdmin.user_metadata?.full_name || 'Super Admin',
    role: 'super_admin',
    org_id: null,
    client_id: null,
  }, { onConflict: 'id' }).select().single()

  if (error) {
    console.error('Failed to create profile:', error)
  } else {
    console.log('✅ Profile created/updated:', data)
  }

  // Verify
  const { data: profiles } = await supabase.from('profiles').select('*')
  console.log('All profiles now:', profiles)
}

fix()
