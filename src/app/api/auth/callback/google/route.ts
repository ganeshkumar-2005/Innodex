import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createUser, createSession } from '@/lib/db';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=NoCode', req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://innodex-asfa.vercel.app'}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth not configured on server' }, { status: 500 });
  }

  try {
    // 1. Get tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('Token Error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=OAuthTokenFailed', req.url));
    }

    // 2. Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();
    
    if (!userData.email) {
      return NextResponse.redirect(new URL('/login?error=NoEmail', req.url));
    }

    // 3. Authenticate or create user in our local SQLite DB
    // Use email as the username
    let user = await getUserByUsername(userData.email);

    if (!user) {
      // Create user
      user = {
        id: randomUUID(),
        username: userData.email,
        password_hash: 'GOOGLE_OAUTH_USER', // Dummy hash for OAuth users
        role: 'user', // Default down to user
        created_at: new Date().toISOString()
      };
      await createUser(user);
    }

    // 4. Create local session
    const sessionId = randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await createSession({
      id: sessionId,
      user_id: user.id,
      expires_at
    });

    const cookieStore = await cookies();
    cookieStore.set('innodex_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(expires_at)
    });

    // 5. Redirect to dashboard
    return NextResponse.redirect(new URL('/chat', req.url));

  } catch (error) {
    console.error('Google Auth Error:', error);
    return NextResponse.redirect(new URL('/login?error=AuthFailed', req.url));
  }
}
