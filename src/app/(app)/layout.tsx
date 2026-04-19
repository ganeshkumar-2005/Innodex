import { getChats } from '@/lib/db';
import SidebarWrapper from '@/components/SidebarWrapper';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const chats = await getChats(user.id);

  return (
    <SidebarWrapper chats={chats} user={user}>
      {children}
    </SidebarWrapper>
  );
}
