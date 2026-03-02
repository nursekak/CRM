import { query } from './pool.js';

const schema = `
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  destination VARCHAR(500) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  part_id INTEGER REFERENCES parts(id),
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_sent INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
`;

async function run() {
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const st of statements) {
    try {
      await query(st + ';');
      console.log('OK:', st.substring(0, 50) + '...');
    } catch (e) {
      if (e.message?.includes('already exists')) continue;
      console.error('Error:', e.message);
    }
  }
  console.log('Shipments migration done.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
