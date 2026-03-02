import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from './routes/auth.js';
import printers from './routes/printers.js';
import consumables from './routes/consumables.js';
import products from './routes/products.js';
import parts from './routes/parts.js';
import warehouse from './routes/warehouse.js';
import shipments from './routes/shipments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', auth);
app.use('/api/printers', printers);
app.use('/api/consumables', consumables);
app.use('/api/products', products);
app.use('/api/parts', parts);
app.use('/api/warehouse', warehouse);
app.use('/api/shipments', shipments);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`CRM API: http://localhost:${PORT}`);
});
