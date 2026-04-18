import { cookies } from 'next/headers';
import { getSession, getUserById } from '@/lib/db';

const SESSION_COOKIE = 'innodex_session';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const user = await getUserById(session.user_id);
  
  if (!user) return null;
  
  // Omit password hash
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
