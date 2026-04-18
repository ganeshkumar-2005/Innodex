import { redirect } from 'next/navigation';

export async function GET() {
  const GITHUB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GITHUB_CLIENT_ID) {
    return new Response('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.', { status: 500 });
  }

  // Generate Google auth URL
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://innodex-asfa.vercel.app'}/api/auth/callback/google`,
    client_id: GITHUB_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  redirect(`${rootUrl}?${qs.toString()}`);
}
