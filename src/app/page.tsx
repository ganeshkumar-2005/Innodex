'use client';

import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="setup-container" style={{ flexDirection: 'column', textAlign: 'center', padding: '20px' }}>
      <img src="/logo.png" alt="Innodex Logo" className="welcome-logo" style={{ height: '100px', animation: 'logoFloat 5s ease-in-out infinite' }} />
      <h1 className="welcome-title" style={{ fontSize: '4rem', marginBottom: '20px' }}>Welcome to Innodex</h1>
      <p className="welcome-subtitle" style={{ fontSize: '1.3rem', maxWidth: '700px', margin: '0 auto 40px auto' }}>
        Your AI-powered startup feasibility partner. Let's stress-test your ideas, uncover market insights, and sharpen your vision before you build.
      </p>
      
      <div style={{ display: 'flex', gap: '20px', animation: 'slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards', opacity: 0 }}>
        <Link href="/login" style={{
          padding: '16px 36px',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '16px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          boxShadow: '0 10px 40px rgba(99, 102, 241, 0.5)',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Login
        </Link>
        <Link href="/register" style={{
          padding: '16px 36px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '16px',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
