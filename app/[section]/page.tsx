import {notFound} from 'next/navigation';
import Portal from '@/components/portal';
import {publicRoutes, workspaceRoutes} from '@/lib/routes';
export default async function SectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  if (![...publicRoutes, ...Object.values(workspaceRoutes)].includes('/' + section)) notFound();
  return <Portal />;
}
