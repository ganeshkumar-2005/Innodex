'use client';

import Link from 'next/link';
import { Plus, MessageSquare, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { startNewChat } from '@/app/actions';

import { logout } from '@/app/auth-actions';

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface User {
  username: string;
  role: 'user' | 'admin';
}

export default function Sidebar({ chats, user }: { chats: Chat[], user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNewChat = async () => {
    const id = await startNewChat('New Startup Idea');
    router.push(`/chat/${id}`);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/chat" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#fff' }}>
          <img src="/logo.png" alt="Innodex" style={{ height: '32px', borderRadius: '4px' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Innodex</h2>
        </Link>
      </div>

      <button onClick={handleNewChat} className="new-chat-btn">
        <Plus size={18} /> New Analysis
      </button>

      <div className="chat-list">
        {chats.map(chat => (
          <Link 
            key={chat.id} 
            href={`/chat/${chat.id}`}
            className={`chat-item ${pathname.includes(chat.id) ? 'active' : ''}`}
          >
            <MessageSquare size={16} />
            {chat.title}
          </Link>
        ))}
      </div>
      
      <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', paddingBottom: '40px' }}>
        <div style={{ marginBottom: '15px', fontSize: '0.85rem', color: '#fff', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Logged in as <strong>{user.username}</strong>
        </div>
        
        {user.role === 'admin' && (
          <Link href="/admin" className="chat-item" style={{ marginBottom: '10px', color: '#a5b4fc', display: 'flex' }}>
            Admin Panel
          </Link>
        )}
        
        <button 
          onClick={() => logout()} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            width: '100%', 
            padding: '12px', 
            background: 'rgba(236, 72, 153, 0.1)', 
            border: '1px solid rgba(236, 72, 153, 0.3)', 
            borderRadius: '10px', 
            color: '#ec4899', 
            cursor: 'pointer', 
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
