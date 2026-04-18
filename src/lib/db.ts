import { createClient } from '@libsql/client';

export const db = createClient({
  url: 'libsql://innodex-ganeshkumar.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT CHECK(role IN ('user', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      expires_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      role TEXT CHECK(role IN ('user', 'model')),
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);
}

// Call initDb on start
initDb().catch(console.error);

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username]
  });
  return result.rows[0] ? (JSON.parse(JSON.stringify(result.rows[0])) as unknown as User) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id]
  });
  return result.rows[0] ? (JSON.parse(JSON.stringify(result.rows[0])) as unknown as User) : undefined;
}

export async function createUser(user: User) {
  await db.execute({
    sql: 'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
    args: [user.id, user.username, user.password_hash, user.role]
  });
}

export async function createSession(session: Session) {
  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    args: [session.id, session.user_id, session.expires_at]
  });
}

export async function getSession(id: string): Promise<Session | undefined> {
  const result = await db.execute({
    sql: 'SELECT * FROM sessions WHERE id = ?',
    args: [id]
  });
  return result.rows[0] ? (JSON.parse(JSON.stringify(result.rows[0])) as unknown as Session) : undefined;
}

export async function deleteSession(id: string) {
  await db.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [id]
  });
}

export async function getChats(userId: string): Promise<Chat[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId]
  });
  return JSON.parse(JSON.stringify(result.rows)) as unknown as Chat[];
}

export async function getAllChatsAdmin(): Promise<(Chat & { username: string })[]> {
  const result = await db.execute(`
    SELECT chats.*, users.username 
    FROM chats 
    LEFT JOIN users ON chats.user_id = users.id 
    ORDER BY chats.created_at DESC
  `);
  return JSON.parse(JSON.stringify(result.rows)) as unknown as (Chat & { username: string })[];
}

export async function getAllUsersAdmin(): Promise<User[]> {
  const result = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
  return JSON.parse(JSON.stringify(result.rows)) as unknown as User[];
}

export async function deleteUserAdmin(userId: string) {
  await db.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId]
  });
}

export async function updateUserRole(userId: string, newRole: 'user' | 'admin') {
  await db.execute({
    sql: 'UPDATE users SET role = ? WHERE id = ?',
    args: [newRole, userId]
  });
}

export async function createChat(id: string, userId: string, title: string) {
  await db.execute({
    sql: 'INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)',
    args: [id, userId, title]
  });
  return { id, title };
}

export async function deleteChat(id: string) {
  await db.execute({
    sql: 'DELETE FROM chats WHERE id = ?',
    args: [id]
  });
}

export async function updateChatTitle(id: string, title: string) {
  await db.execute({
    sql: 'UPDATE chats SET title = ? WHERE id = ?',
    args: [title, id]
  });
}

export async function getMessages(chatId: string): Promise<Message[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
    args: [chatId]
  });
  return JSON.parse(JSON.stringify(result.rows)) as unknown as Message[];
}

export async function addMessage(id: string, chatId: string, role: string, content: string) {
  await db.execute({
    sql: 'INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, ?, ?)',
    args: [id, chatId, role, content]
  });
}
