import { getAllUsersAdmin, getAllChatsAdmin } from '@/lib/db';
import { deleteUserAdminAction, deleteChatAdminAction, changeUserRoleAction } from './admin-actions';
import Link from 'next/link';
import { Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const users = await getAllUsersAdmin();
  const chats = await getAllChatsAdmin();

  const cardStyle = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '40px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
  };

  const thStyle = {
    textAlign: 'left' as const,
    padding: '12px',
    borderBottom: '1px solid var(--glass-border)',
    color: 'var(--text-muted)'
  };

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
  };

  return (
    <div>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: '20px', color: '#a5b4fc' }}>All Users ({users.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={tdStyle}><small>{user.id.slice(0, 8)}...</small></td>
                  <td style={tdStyle}><strong>{user.username}</strong></td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: user.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: user.role === 'admin' ? '#a5b4fc' : '#e2e8f0'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={tdStyle}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      {user.role === 'user' ? (
                        <form action={changeUserRoleAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value="admin" />
                          <button type="submit" title="Promote to Admin" style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <ArrowUpCircle size={18} />
                          </button>
                        </form>
                      ) : (
                        <form action={changeUserRoleAction}>
                          <input type="hidden" name="userId" value={user.id} />
                          <input type="hidden" name="role" value="user" />
                          <button type="submit" title="Demote to User" style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <ArrowDownCircle size={18} />
                          </button>
                        </form>
                      )}
                      
                      <form action={deleteUserAdminAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button 
                          type="submit" 
                          style={{ background: 'transparent', border: 'none', color: '#ec4899', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginBottom: '20px', color: '#6366f1' }}>All Chats ({chats.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Owner</th>
                <th style={thStyle}>Created at</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chats.map(chat => (
                <tr key={chat.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/chat/${chat.id}`} style={{ color: '#fff', textDecoration: 'none' }}>
                      {chat.title}
                    </Link>
                  </td>
                  <td style={tdStyle}><span style={{ color: '#a5b4fc' }}>@{chat.username || 'unknown'}</span></td>
                  <td style={tdStyle}>{new Date(chat.created_at).toLocaleString()}</td>
                  <td style={{ ...tdStyle, display: 'flex', gap: '15px' }}>
                    <Link href={`/admin/chat/${chat.id}`} style={{ color: '#6366f1', textDecoration: 'none' }}>View</Link>
                    <form action={deleteChatAdminAction}>
                      <input type="hidden" name="chatId" value={chat.id} />
                      <button 
                        type="submit" 
                        style={{ background: 'transparent', border: 'none', color: '#ec4899', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
