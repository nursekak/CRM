import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT * FROM consumables ORDER BY category, name';
  const params = [];
  if (category) {
    sql = 'SELECT * FROM consumables WHERE category = $1 ORDER BY name';
    params.push(category);
  }
  const r = await query(sql, params);
  res.json(r.rows);
});

router.post('/', async (req, res) => {
  const { sku, name, category, subtype, quantity, unit, min_threshold, location } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Укажите name' });
  const r = await query(
    `INSERT INTO consumables (sku, name, category, subtype, quantity, unit, min_threshold, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [sku || null, name, category || 'filament', subtype || null, quantity ?? 0, unit || 'kg', min_threshold ?? 0, location || null]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { sku, name, category, subtype, quantity, unit, min_threshold, location } = req.body || {};
  const r = await query(
    `UPDATE consumables SET 
      sku = COALESCE($1, sku), name = COALESCE($2, name), category = COALESCE($3, category),
      subtype = COALESCE($4, subtype), quantity = COALESCE($5, quantity), unit = COALESCE($6, unit),
      min_threshold = COALESCE($7, min_threshold), location = COALESCE($8, location), updated_at = now()
     WHERE id = $9 RETURNING *`,
    [sku, name, category, subtype, quantity, unit, min_threshold, location, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Расходник не найден' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const r = await query('DELETE FROM consumables WHERE id = $1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Расходник не найден' });
  res.status(204).send();
});

export default router;
