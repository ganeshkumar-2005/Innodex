'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/app/auth-actions';
import Link from 'next/link';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await register(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      router.push('/login');
    }
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1 className="welcome-title" style={{ fontSize: '2rem', marginBottom: '10px' }}>Join Innodex</h1>
        <p className="welcome-subtitle" style={{ marginBottom: '20px' }}>Create your account to start evaluating your startup ideas safely.</p>
        
        {error && <div style={{ color: '#ec4899', marginBottom: '10px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input className="setup-input" name="username" placeholder="Username" required minLength={4} />
          <input className="setup-input" type="password" name="password" placeholder="Password (min 4 characters)" required minLength={4} />
          
          <button type="submit" className="new-chat-btn" style={{ width: '100%', margin: '10px 0 0 0' }}>
            Register
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
          <span style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>or</span>
          <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
        </div>

        <a href="/api/auth/google" className="new-chat-btn" style={{ width: '100%', background: '#fff', color: '#000', display: 'flex', justifyContent: 'center', gap: '10px', margin: 0, textDecoration: 'none' }}>
          <img src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} />
          Register with Gmail
        </a>
        
        <p style={{ marginTop: '20px', color: '#8b92a5', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: '#6366f1' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
