import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const r = await query(`
    SELECT s.*, u.name as created_by_name
    FROM shipments s
    LEFT JOIN users u ON u.id = s.created_by
    ORDER BY s.due_date ASC, s.id DESC
  `);
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const [ship, items] = await Promise.all([
    query('SELECT s.*, u.name as created_by_name FROM shipments s LEFT JOIN users u ON u.id = s.created_by WHERE s.id = $1', [req.params.id]),
    query(`
      SELECT si.*, pr.name as product_name, pt.name as part_name, m.version as model_version, c.name as consumable_name
      FROM shipment_items si
      LEFT JOIN products pr ON pr.id = si.product_id
      LEFT JOIN parts pt ON pt.id = si.part_id
      LEFT JOIN model_files m ON m.id = si.model_file_id
      LEFT JOIN consumables c ON c.id = si.consumable_id
      WHERE si.shipment_id = $1
      ORDER BY si.id
    `, [req.params.id]),
  ]);
  if (!ship.rows[0]) return res.status(404).json({ error: 'Отправка не найдена' });
  const row = ship.rows[0];
  row.items = items.rows;
  res.json(row);
});

router.post('/', async (req, res) => {
  const { title, destination, due_date, items } = req.body || {};
  if (!destination || !due_date) return res.status(400).json({ error: 'Укажите destination и due_date' });
  if (!items?.length) return res.status(400).json({ error: 'Добавьте хотя бы одну позицию' });

  for (const it of items) {
    const { product_id, part_id, model_file_id, consumable_id, quantity_ordered } = it;
    if (!product_id || !part_id) {
      return res.status(400).json({ error: 'У каждой позиции должно быть указано изделие и деталь' });
    }
    if (!model_file_id || consumable_id == null) {
      return res.status(400).json({ error: 'Укажите версию модели и материал для каждой позиции' });
    }
    const q = Number(quantity_ordered) || 0;
    if (q <= 0) return res.status(400).json({ error: 'Количество должно быть больше 0' });
  }

  const r = await query(
    `INSERT INTO shipments (title, destination, due_date, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [title || null, destination, due_date, req.user?.id || null]
  );
  const shipment = r.rows[0];
  for (const it of items) {
    await query(
      `INSERT INTO shipment_items (shipment_id, product_id, part_id, model_file_id, status_label, consumable_id, quantity_ordered)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [shipment.id, it.product_id, it.part_id, it.model_file_id, it.status_label || 'new', it.consumable_id, it.quantity_ordered ?? 1]
    );
  }
  const full = await query(
    'SELECT s.*, u.name as created_by_name FROM shipments s LEFT JOIN users u ON u.id = s.created_by WHERE s.id = $1',
    [shipment.id]
  );
  const fullRow = full.rows[0];
  fullRow.items = (await query(
    `SELECT si.*, pr.name as product_name, pt.name as part_name, m.version as model_version, c.name as consumable_name
     FROM shipment_items si
     LEFT JOIN products pr ON pr.id = si.product_id
     LEFT JOIN parts pt ON pt.id = si.part_id
     LEFT JOIN model_files m ON m.id = si.model_file_id
     LEFT JOIN consumables c ON c.id = si.consumable_id
     WHERE si.shipment_id = $1 ORDER BY si.id`,
    [shipment.id]
  )).rows;
  res.status(201).json(fullRow);
});

router.patch('/:id', async (req, res) => {
  const { title, destination, due_date, status } = req.body || {};
  const r = await query(
    `UPDATE shipments SET title = COALESCE($1, title), destination = COALESCE($2, destination), due_date = COALESCE($3, due_date), status = COALESCE($4, status) WHERE id = $5 RETURNING *`,
    [title, destination, due_date, status, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Отправка не найдена' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await query('SELECT id FROM shipments WHERE id = $1', [id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Отправка не найдена' });
  await query('DELETE FROM shipments WHERE id = $1', [id]);
  res.status(204).end();
});

router.post('/:id/fulfill', async (req, res) => {
  const { items } = req.body || {};
  if (!items?.length) return res.status(400).json({ error: 'Укажите items: [{ item_id, quantity_sent }]' });

  for (const it of items) {
    const qty = Number(it.quantity_sent) || 0;
    if (qty <= 0) continue;
    const si = await query(
      'SELECT product_id, part_id, model_file_id, status_label, consumable_id, quantity_ordered, quantity_sent FROM shipment_items WHERE id = $1 AND shipment_id = $2',
      [it.item_id, req.params.id]
    );
    if (!si.rows[0]) return res.status(400).json({ error: 'Позиция отправки не найдена' });
    const row = si.rows[0];
    const alreadySent = Number(row.quantity_sent) || 0;
    const maxCanSend = (Number(row.quantity_ordered) || 0) - alreadySent;
    if (qty > maxCanSend) return res.status(400).json({ error: `По позиции можно отправить не более ${maxCanSend}` });

    const wh = await query(
      `SELECT id, quantity FROM warehouse_items WHERE product_id = $1 AND part_id = $2 AND model_file_id = $3 AND status_label = $4 AND consumable_id = $5`,
      [row.product_id, row.part_id, row.model_file_id, row.status_label || 'new', row.consumable_id]
    );
    if (!wh.rows[0]) return res.status(400).json({ error: 'Этой позиции больше нет на складе' });
    const available = Number(wh.rows[0].quantity);
    if (available < qty) return res.status(400).json({ error: `На складе доступно ${available}, отправить ${qty} нельзя` });

    await query(
      'UPDATE warehouse_items SET quantity = quantity - $1, updated_at = now() WHERE id = $2',
      [qty, wh.rows[0].id]
    );
    await query(
      'UPDATE shipment_items SET quantity_sent = quantity_sent + $1 WHERE id = $2',
      [qty, it.item_id]
    );
  }

  const ship = await query('SELECT * FROM shipment_items WHERE shipment_id = $1', [req.params.id]);
  let allSent = true;
  let anySent = false;
  for (const it of ship.rows) {
    if (it.quantity_sent > 0) anySent = true;
    if (it.quantity_sent < it.quantity_ordered) allSent = false;
  }
  const newStatus = allSent ? 'sent' : (anySent ? 'partial' : 'pending');
  await query('UPDATE shipments SET status = $1 WHERE id = $2', [newStatus, req.params.id]);
  const updated = await query(
    'SELECT s.*, u.name as created_by_name FROM shipments s LEFT JOIN users u ON u.id = s.created_by WHERE s.id = $1',
    [req.params.id]
  );
  const out = updated.rows[0];
  out.items = (await query(
    `SELECT si.*, pr.name as product_name, pt.name as part_name, m.version as model_version, c.name as consumable_name
     FROM shipment_items si
     LEFT JOIN products pr ON pr.id = si.product_id
     LEFT JOIN parts pt ON pt.id = si.part_id
     LEFT JOIN model_files m ON m.id = si.model_file_id
     LEFT JOIN consumables c ON c.id = si.consumable_id
     WHERE si.shipment_id = $1 ORDER BY si.id`,
    [req.params.id]
  )).rows;
  res.json(out);
});

export default router;
