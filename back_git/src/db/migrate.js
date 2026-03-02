import { query } from './pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schema = `
-- users (для JWT и ролей)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(200),
  role VARCHAR(30) DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT now()
);

-- printers
CREATE TABLE IF NOT EXISTS printers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  model VARCHAR(100),
  serial_number VARCHAR(100),
  location VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'offline',
  status_reason TEXT,
  current_job_id INTEGER NULL,
  last_maintenance TIMESTAMP,
  total_work_hours NUMERIC DEFAULT 0,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- consumables
CREATE TABLE IF NOT EXISTS consumables (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(200),
  category VARCHAR(50),
  subtype VARCHAR(100),
  quantity NUMERIC DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  min_threshold NUMERIC DEFAULT 0,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  sku VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'dev',
  owner_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- parts
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  name VARCHAR(200),
  part_code VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  archive_reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  archived_at TIMESTAMP NULL,
  recommended_material VARCHAR(100),
  estimated_print_time VARCHAR(50),
  weight_grams NUMERIC
);

-- model_files
CREATE TABLE IF NOT EXISTS model_files (
  id SERIAL PRIMARY KEY,
  part_id INTEGER REFERENCES parts(id),
  version VARCHAR(50),
  file_type VARCHAR(20),
  file_path TEXT,
  file_size_bytes BIGINT,
  file_hash VARCHAR(128),
  status VARCHAR(20) DEFAULT 'current',
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT now(),
  comment TEXT
);

-- jobs
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  job_code VARCHAR(100) UNIQUE,
  product_id INTEGER REFERENCES products(id),
  part_id INTEGER REFERENCES parts(id),
  model_file_id INTEGER REFERENCES model_files(id),
  quantity INTEGER DEFAULT 1,
  assigned_printer_id INTEGER REFERENCES printers(id),
  status VARCHAR(30) DEFAULT 'queued',
  progress_percent INTEGER DEFAULT 0,
  estimated_end TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);


-- printed_parts
CREATE TABLE IF NOT EXISTS printed_parts (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  product_id INTEGER REFERENCES products(id),
  part_id INTEGER REFERENCES parts(id),
  model_file_id INTEGER REFERENCES model_files(id),
  printer_id INTEGER REFERENCES printers(id),
  quantity INTEGER,
  printed_at TIMESTAMP DEFAULT now(),
  operator_id INTEGER REFERENCES users(id),
  notes TEXT
);

-- warehouse_items
CREATE TABLE IF NOT EXISTS warehouse_items (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  part_id INTEGER REFERENCES parts(id),
  model_file_id INTEGER REFERENCES model_files(id),
  status_label VARCHAR(20) DEFAULT 'new',
  quantity INTEGER DEFAULT 0,
  location VARCHAR(100),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS warehouse_product_part_model_status 
  ON warehouse_items(product_id, part_id, model_file_id, status_label);
`;

async function migrate() {
  try {
    const statements = schema.split(';').map(s => s.trim()).filter(Boolean);
    for (const st of statements) {
      try {
        await query(st + ';');
        console.log('OK:', st.substring(0, 55).replace(/\n/g, ' ') + '...');
      } catch (e) {
        if (e.message?.includes('already exists')) continue;
        console.error('Error:', e.message);
      }
    }
    try {
      await query('ALTER TABLE printers ADD CONSTRAINT printers_current_job_id_fkey FOREIGN KEY (current_job_id) REFERENCES jobs(id)');
      console.log('OK: printers FK to jobs');
    } catch (e) {
      if (!e.message?.includes('already exists')) console.error('FK:', e.message);
    }
    console.log('Migration done.');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
