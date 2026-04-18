import { getMessages, getChats } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminChatViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  const { id } = await params;
  const messages = await getMessages(id);
  
  if (!messages || messages.length === 0) {
    return <div style={{ color: 'white' }}>Chat not found or empty.</div>;
  }

  // Basic markdown parser for display
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/# (.*?)\n/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div style={{ background: 'var(--panel-bg)', borderRadius: '16px', padding: '30px', border: '1px solid var(--glass-border)' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6366f1', textDecoration: 'none' }}>
           <ArrowLeft size={16} /> Back to Admin Panel
        </Link>
      </div>
      
      <h2 style={{ color: '#fff', marginBottom: '30px' }}>Chat History View</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              background: msg.role === 'user' ? 'var(--user-msg-bg)' : 'var(--ai-msg-bg)',
              color: '#fff',
              padding: '16px 22px',
              borderRadius: '20px',
              borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
              borderBottomLeftRadius: msg.role === 'model' ? '4px' : '20px',
              maxWidth: '80%',
              border: msg.role === 'model' ? '1px solid var(--glass-border)' : 'none'
            }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '8px', fontWeight: 'bold' }}>
                {msg.role === 'user' ? 'User' : 'Innodex Assistant'}
              </div>
              <div className="message">
                {renderMarkdown(msg.content)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
