import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL || 'postgresql://crm:crm@localhost:5432/crm';
// Подключаемся к служебной БД postgres, чтобы создать целевую
const baseUrl = url.replace(/\/[^/]*$/, '');
const dbName = (url.match(/\/([^/?]+)(\?|$)/) || [])[1] || 'crm';

const client = new pg.Client({ connectionString: baseUrl + '/postgres' });

async function run() {
  try {
    await client.connect();
    const r = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (r.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log('База данных "' + dbName + '" создана.');
    } else {
      console.log('База "' + dbName + '" уже существует.');
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

run();
