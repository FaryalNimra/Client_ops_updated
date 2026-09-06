import AdminDashboardView from '@/components/AdminDashboardView'

export const dynamic = 'force-dynamic'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <AdminDashboardView orgSlug={slug} />
}
