import { createSupabaseAdmin } from '@/lib/supabase/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardWizard from '@/components/OnboardWizard'

export default async function OrgOnboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const adminClient = createSupabaseAdmin()
  const { data: rawProfile } = await adminClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  const profile = rawProfile as { org_id: string | null } | null
  if (!profile?.org_id) redirect(`/org/${slug}/dashboard`)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboard new client</h1>
          <p className="page-subtitle">Complete all steps in under 5 minutes</p>
        </div>
      </div>
      <div className="page-body">
        <OnboardWizard orgId={profile.org_id} orgSlug={slug} />
      </div>
    </>
  )
}
