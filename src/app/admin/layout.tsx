import { getCurrentUser } from '@/app/auth-actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div style={{ padding: '40px', color: 'var(--text-main)', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
        <h1 className="welcome-title" style={{ fontSize: '2.5rem', margin: 0 }}>Admin Panel</h1>
        <Link href="/" className="new-chat-btn" style={{ margin: 0 }}>Back to Dashboard</Link>
      </div>
      {children}
    </div>
  );
}
