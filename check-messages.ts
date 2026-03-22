import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');

console.log('\n=== messages table ===');
const msgs = db.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 10').all();
console.table(msgs);

console.log('\n=== messages columns ===');
const cols = db.pragma('table_info(messages)');
cols.forEach((c: any) => console.log(` - ${c.name} (${c.type}) default: ${c.dflt_value}`));
