import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://euiubqsosjmqqvnizynb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function check() {
  const { data: orgs } = await supabase.from('organizations').select('*')
  console.log('--- ORGANIZATIONS ---')
  console.log(orgs)

  const { data: profiles } = await supabase.from('profiles').select('*')
  console.log('--- PROFILES ---')
  console.log(profiles)
}

check()
