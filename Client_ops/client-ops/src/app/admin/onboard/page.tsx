import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardWizard from '@/components/OnboardWizard'

export default async function OnboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const profile = rawProfile as { org_id: string | null } | null

  if (!profile?.org_id) redirect('/admin/dashboard')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboard new client</h1>
          <p className="page-subtitle">Complete all steps in under 5 minutes</p>
        </div>
      </div>
      <div className="page-body">
        <OnboardWizard orgId={profile.org_id} />
      </div>
    </>
  )
}
