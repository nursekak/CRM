import { query } from './pool.js';

const schema = `
ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS consumable_id INTEGER REFERENCES consumables(id);
ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'stock';

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);
ALTER TABLE parts ADD COLUMN IF NOT EXISTS image_path VARCHAR(500);
`;

async function run() {
  for (const st of schema.split(';').map(s => s.trim()).filter(Boolean)) {
    try {
      await query(st + ';');
      console.log('OK:', st.substring(0, 60) + '...');
    } catch (e) {
      console.error(e.message);
    }
  }
  console.log('Warehouse/Image migration done.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
