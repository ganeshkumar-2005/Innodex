const { createClient } = require('@libsql/client');
const fs = require('fs');

async function main() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = Object.fromEntries(
    envContent.split('\n')
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const i = l.indexOf('=');
        return [l.substring(0, i).trim(), l.substring(i + 1).trim()];
      })
  );

  const dbUrl = 'libsql://innodex-ganeshkumar.aws-ap-south-1.turso.io';
  
  const db = createClient({
    url: dbUrl,
    authToken: env.TURSO_AUTH_TOKEN
  });

  console.log("Creating tables remotely...");
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

  console.log("Successfully securely initialized Turso Tables!");
}

main().catch(console.error);
