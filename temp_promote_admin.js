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

  const db = createClient({
    url: 'libsql://innodex-ganeshkumar.aws-ap-south-1.turso.io',
    authToken: env.TURSO_AUTH_TOKEN
  });

  await db.execute("UPDATE users SET role = 'admin' WHERE username = 'admin' OR username = 'gky8179@gmail.com'");
  console.log("Successfully promoted 'admin' and 'gky8179@gmail.com' to admin status!");
}

main().catch(console.error);
