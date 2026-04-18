'use server';

import { getUserByUsername, createUser, createSession, getSession, deleteSession, User } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'innodex_session';

export async function register(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password || password.length < 4) {
    return { error: 'Invalid username or password (minimum 4 characters)' };
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    return { error: 'Username already taken' };
  }

  const password_hash = await bcrypt.hash(password, 10);
  const role = 'user';

  const user: User = {
    id: crypto.randomUUID(),
    username,
    password_hash,
    role,
    created_at: new Date().toISOString()
  };

  await createUser(user);
  return { success: true };
}

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const user = await getUserByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: 'Invalid credentials' };
  }

  const sessionId = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await createSession({
    id: sessionId,
    user_id: user.id,
    expires_at
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expires_at)
  });

  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }

  redirect('/login');
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const session = await getSession(sessionId);
  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  // To avoid circular dependency or fetching more than needed, we can import getUserById here
  // but it's simpler to just query db again
  const { getUserById } = await import('@/lib/db');
  const user = await getUserById(session.user_id);
  
  if (!user) return null;
  
  // Omit password hash
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
