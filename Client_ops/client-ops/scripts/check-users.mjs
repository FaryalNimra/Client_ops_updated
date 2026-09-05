import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://euiubqsosjmqqvnizynb.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1aXVicXNvc2ptcXF2bml6eW5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQ0MjgxMywiZXhwIjoyMTA0MDE4ODEzfQ.6BMpbJUTlduuZyp5jf11BouKLIiz1lmeSCdsP1dmp7E'

const supabase = createClient(supabaseUrl, serviceKey)

async function checkClients() {
  const { data: clients, error: cErr } = await supabase
    .from('clients')
    .select('id, business_name, email, contact_name, organization_id')
  
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, role, organization_id, full_name')
  
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers()

  console.log('--- CLIENTS TABLE ---')
  console.log(clients)

  console.log('--- PROFILES TABLE ---')
  console.log(profiles)

  console.log('--- AUTH USERS ---')
  console.log(users.map(u => ({ id: u.id, email: u.email })))
}

checkClients()
