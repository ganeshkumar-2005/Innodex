'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function SidebarWrapper({ chats, user, children }: { chats: any[], user: any, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsOpen(true)}>
          <Menu size={24} />
        </button>
        <Link href="/chat" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#fff' }}>
          <img src="/logo.png" alt="Innodex" style={{ height: '28px', borderRadius: '4px' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Innodex</h2>
        </Link>
        <div style={{ width: '24px' }}></div> {/* Spacer */}
      </div>

      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={() => setIsOpen(false)}></div>
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-close" style={{ position: 'absolute', top: '15px', right: '15px', display: 'none' }}>
           <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white' }}>
             <X size={24} />
           </button>
        </div>
        <Sidebar chats={chats} user={user} onClose={() => setIsOpen(false)} />
      </div>

      <main className="main-area" onClick={() => setIsOpen(false)}>
        {children}
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-close {
            display: block !important;
            z-index: 1001;
          }
        }
      `}</style>
    </div>
  );
}
