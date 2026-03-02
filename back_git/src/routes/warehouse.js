import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const r = await query(`
    SELECT w.*, pr.name as product_name, pt.name as part_name, pt.weight_grams, m.version as model_version, c.name as consumable_name
    FROM warehouse_items w
    JOIN products pr ON pr.id = w.product_id
    JOIN parts pt ON pt.id = w.part_id
    LEFT JOIN model_files m ON m.id = w.model_file_id
    LEFT JOIN consumables c ON c.id = w.consumable_id
    WHERE w.quantity > 0
    ORDER BY pr.name, pt.name, w.status_label
  `);
  res.json(r.rows);
});

router.post('/adjust', async (req, res) => {
  const { product_id, part_id, model_file_id, status_label, quantity_delta, location, consumable_id, source } = req.body || {};
  if (!product_id || !part_id || !model_file_id) {
    return res.status(400).json({ error: 'Укажите product_id, part_id, model_file_id' });
  }
  const label = status_label || 'new';
  const qtyDelta = Number(quantity_delta) || 0;
  const src = source || 'stock';

  if (src === 'printed' && consumable_id && qtyDelta > 0) {
    const partR = await query('SELECT weight_grams FROM parts WHERE id = $1', [part_id]);
    const weightGrams = partR.rows[0]?.weight_grams;
    if (weightGrams != null) {
      const toDeduct = weightGrams * qtyDelta;
      const cons = await query('SELECT quantity FROM consumables WHERE id = $1', [consumable_id]);
      if (cons.rows[0]) {
        const newQ = Math.max(0, Number(cons.rows[0].quantity) - toDeduct / 1000);
        await query('UPDATE consumables SET quantity = $1, updated_at = now() WHERE id = $2', [newQ, consumable_id]);
      }
    }
  }

  const r = await query(
    `SELECT id, quantity FROM warehouse_items WHERE product_id = $1 AND part_id = $2 AND model_file_id = $3 AND status_label = $4`,
    [product_id, part_id, model_file_id, label]
  );
  let row;
  if (r.rows[0]) {
    const newQty = Math.max(0, (r.rows[0].quantity || 0) + qtyDelta);
    await query(
      'UPDATE warehouse_items SET quantity = $1, location = COALESCE($2, location), consumable_id = COALESCE($3, consumable_id), source = COALESCE($4, source), updated_at = now() WHERE id = $5',
      [newQty, location, consumable_id || null, src, r.rows[0].id]
    );
    row = (await query('SELECT * FROM warehouse_items WHERE id = $1', [r.rows[0].id])).rows[0];
  } else {
    const qty = Math.max(0, qtyDelta);
    await query(
      `INSERT INTO warehouse_items (product_id, part_id, model_file_id, status_label, quantity, location, consumable_id, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [product_id, part_id, model_file_id, label, qty, location || null, consumable_id || null, src]
    );
    const ins = await query(
      'SELECT * FROM warehouse_items WHERE product_id = $1 AND part_id = $2 AND model_file_id = $3 AND status_label = $4',
      [product_id, part_id, model_file_id, label]
    );
    row = ins.rows[0];
  }
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await query('SELECT id FROM warehouse_items WHERE id = $1', [id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Позиция на складе не найдена' });
  await query('DELETE FROM warehouse_items WHERE id = $1', [id]);
  res.status(204).end();
});

export default router;
