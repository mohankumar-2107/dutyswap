import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');

try {
  db.exec('ALTER TABLE messages ADD COLUMN sender_id INTEGER NOT NULL DEFAULT 0');
  console.log('✅ sender_id added');
} catch (e: any) {
  console.log('sender_id:', e.message);
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT empty');
  console.log('✅ content added');
} catch (e: any) {
  console.log('content:', e.message);
}

try {
  db.exec('ALTER TABLE messages ADD COLUMN sent_at INTEGER DEFAULT 0');
  console.log('✅ sent_at added');
} catch (e: any) {
  console.log('sent_at:', e.message);
}

console.log('Done! All columns processed.');
