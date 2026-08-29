import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres.ncmkjutikqgbvrghqazp:Caramelit02%24%24%24@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log("Connected to Supabase PostgreSQL database.");

  const migrationsDir = path.resolve('supabase/migrations');
  let files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  // Custom ordering to ensure tables exist before functions/policies reference them
  const customOrder = [
    '20260806000000_codify_users.sql',
    '20240001_create_user_starred_songs.sql',
    '20240002_fix_starred_songs_fk.sql',
    '20240003_add_delete_user_function.sql',
    '20260305_songs_migration.sql',
    '20260307_collaborator_requests.sql',
    '20260312_posts.sql',
    '20260312_song_editor.sql',
    '20260312_song_language.sql',
    '20260316000000_setlist_teams_redesign.sql',
    '20260313_fix_function_search_paths.sql',
  ];

  // Sort files: custom order first, then remaining alphabetically
  files.sort((a, b) => {
    const idxA = customOrder.indexOf(a);
    const idxB = customOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const file of files) {
    console.log(`\n========================================`);
    console.log(`Applying migration: ${file}`);
    console.log(`========================================`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await client.query(sql);
      console.log(`SUCCESS: ${file}`);
    } catch (err) {
      console.error(`ERROR in ${file}:`, err.message);
      if (err.detail) console.error(`Detail: ${err.detail}`);
      if (err.hint) console.error(`Hint: ${err.hint}`);
      break;
    }
  }

  // Check tables in public schema
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;");
  console.log("\nTables currently in public schema:");
  console.log(res.rows.map(r => r.tablename).join(', '));

  await client.end();
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});


