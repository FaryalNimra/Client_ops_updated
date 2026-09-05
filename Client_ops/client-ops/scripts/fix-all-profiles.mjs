import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://euiubqsosjmqqvnizynb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function fixProfiles() {
  // Ensure superadmin has profile
  const superAdminId = '269092b2-8b96-41f6-98c3-7a6a56424e16'
  const { error: saErr } = await supabase.from('profiles').upsert({
    id: superAdminId,
    email: 'superadmin@clientops.com',
    full_name: 'Super Admin',
    role: 'super_admin',
    org_id: null
  })
  console.log('Super admin profile upserted:', saErr || 'SUCCESS')

  // Check all orgs
  const { data: orgs } = await supabase.from('organizations').select('*')
  console.log('Orgs:', orgs.map(o => ({ name: o.name, slug: o.slug, id: o.id })))
}

fixProfiles()
