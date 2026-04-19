import { NextResponse } from 'next/server';
import { getUserByUsername, createUser } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || password.length < 4) {
      return NextResponse.json({ error: 'Invalid username or password (minimum 4 characters)' }, { status: 400 });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const role = 'user';

    const user = {
      id: crypto.randomUUID(),
      username,
      password_hash,
      role: 'user' as const,
      created_at: new Date().toISOString()
    };

    await createUser(user);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
