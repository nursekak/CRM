import { query } from './pool.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);
  await query(
    `INSERT INTO users (email, password_hash, name, role) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (email) DO NOTHING`,
    ['admin@crm.local', hash, 'Администратор', 'admin']
  );
  await query(
    `INSERT INTO users (email, password_hash, name, role) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (email) DO NOTHING`,
    ['operator@crm.local', hash, 'Оператор', 'operator']
  );
  await query(
    `INSERT INTO printers (code, model, status, location) 
     VALUES ('P-01', 'Prusa i3', 'working', 'Цех 1'), 
            ('P-02', 'Ender 3', 'working', 'Цех 1')
     ON CONFLICT (code) DO NOTHING`
  );
  await query(
    `INSERT INTO consumables (sku, name, category, subtype, quantity, unit, min_threshold) 
     VALUES ('PLA-W-01', 'PLA белый', 'filament', 'PLA 1.75mm', 5, 'kg', 0.5),
            ('NOZ-04', 'Сопло 0.4', 'spare_part', 'nozzle 0.4', 10, 'pcs', 2)
     ON CONFLICT (sku) DO NOTHING`
  );
  console.log('Seed done. Login: admin@crm.local / operator@crm.local, password: admin123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
