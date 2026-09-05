import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://euiubqsosjmqqvnizynb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  console.log('Fetching users...')
  const { data: { users } } = await supabase.auth.admin.listUsers()
  console.log('Users:', users.map(u => ({ id: u.id, email: u.email, metadata: u.user_metadata })))

  console.log('Fetching profiles...')
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*')
  console.log('Profiles:', profiles, 'Error:', pErr)

  console.log('Fetching organizations...')
  const { data: orgs, error: oErr } = await supabase.from('organizations').select('*')
  console.log('Orgs:', orgs, 'Error:', oErr)

  console.log('Fetching org_mrr...')
  const { data: mrr, error: mErr } = await supabase.from('org_mrr').select('*')
  console.log('MRR:', mrr, 'Error:', mErr)
}

test()
