import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const r = await query('SELECT * FROM products ORDER BY name');
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const [prod, parts] = await Promise.all([
    query('SELECT * FROM products WHERE id = $1', [req.params.id]),
    query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM model_files m WHERE m.part_id = p.id AND m.status = 'current') as current_models
       FROM parts p WHERE p.product_id = $1 ORDER BY p.status, p.name`,
      [req.params.id]
    ),
  ]);
  if (!prod.rows[0]) return res.status(404).json({ error: 'Изделие не найдено' });
  const product = prod.rows[0];
  product.parts = parts.rows;
  res.json(product);
});

router.post('/', async (req, res) => {
  const { name, sku, description, status } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Укажите name' });
  const r = await query(
    `INSERT INTO products (name, sku, description, status, owner_user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, sku || null, description || null, status || 'dev', req.user?.id || null]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { name, sku, description, status } = req.body || {};
  const r = await query(
    `UPDATE products SET name = COALESCE($1, name), sku = COALESCE($2, sku),
      description = COALESCE($3, description), status = COALESCE($4, status), updated_at = now()
     WHERE id = $5 RETURNING *`,
    [name, sku, description, status, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Изделие не найдено' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const check = await query('SELECT id FROM parts WHERE product_id = $1 LIMIT 1', [req.params.id]);
  if (check.rows.length > 0) return res.status(400).json({ error: 'Сначала удалите все детали изделия' });
  const r = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Изделие не найдено' });
  res.status(204).send();
});

router.post('/:id/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Загрузите файл' });
  const imagePath = `/uploads/${path.basename(req.file.filename)}`;
  await query('UPDATE products SET image_path = $1, updated_at = now() WHERE id = $2', [imagePath, req.params.id]);
  const r = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  res.json(r.rows[0]);
});

// Parts
router.post('/:product_id/parts', async (req, res) => {
  const { name, part_code, recommended_material, weight_grams } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Укажите name детали' });
  const r = await query(
    `INSERT INTO parts (product_id, name, part_code, recommended_material, weight_grams)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.params.product_id, name, part_code || null, recommended_material || null, weight_grams || null]
  );
  res.status(201).json(r.rows[0]);
});

export default router;
