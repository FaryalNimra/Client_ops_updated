import AdminDashboard from '@/app/admin/dashboard/page'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <AdminDashboard orgSlug={slug} />
}
