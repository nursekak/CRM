import { query } from './pool.js';

const schema = `
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS title VARCHAR(200);
`;

async function run() {
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const st of statements) {
    try {
      await query(st + ';');
      console.log('OK:', st.substring(0, 60) + '...');
    } catch (e) {
      if (e.message?.includes('already exists')) continue;
      console.error(e.message);
    }
  }
  console.log('Shipments add title migration done.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

