import { getChats } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import { getCurrentUser } from '@/app/auth-actions';
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
    <div className="app-container">
      <Sidebar chats={chats} user={user} />
      {children}
    </div>
  );
}
