import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const r = await query(`
    SELECT p.*, j.job_code as current_job_code, j.status as current_job_status
    FROM printers p
    LEFT JOIN jobs j ON j.id = p.current_job_id
    ORDER BY p.code
  `);
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const r = await query(
    `SELECT p.*, j.id as job_id, j.job_code, j.status as job_status, j.quantity as job_quantity
     FROM printers p
     LEFT JOIN jobs j ON j.id = p.current_job_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Принтер не найден' });
  res.json(r.rows[0]);
});

router.post('/', async (req, res) => {
  const { code, model, serial_number, location, status, ip_address } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Укажите code' });
  const r = await query(
    `INSERT INTO printers (code, model, serial_number, location, status, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [code, model || null, serial_number || null, location || null, status || 'offline', ip_address || null]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id/status', async (req, res) => {
  const { status, status_reason } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Укажите status' });
  const r = await query(
    `UPDATE printers SET status = $1, status_reason = $2, updated_at = now() WHERE id = $3 RETURNING *`,
    [status, status_reason || null, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Принтер не найден' });
  res.json(r.rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { code, model, serial_number, location, status, status_reason, ip_address } = req.body || {};
  const r = await query(
    `UPDATE printers SET 
      code = COALESCE($1, code), model = COALESCE($2, model), serial_number = COALESCE($3, serial_number),
      location = COALESCE($4, location), status = COALESCE($5, status),
      status_reason = COALESCE($6, status_reason), ip_address = COALESCE($7, ip_address),
      updated_at = now()
     WHERE id = $8 RETURNING *`,
    [code, model, serial_number, location, status, status_reason, ip_address, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Принтер не найден' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await query('UPDATE jobs SET assigned_printer_id = NULL WHERE assigned_printer_id = $1', [req.params.id]);
  const del = await query('DELETE FROM printers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!del.rows[0]) return res.status(404).json({ error: 'Принтер не найден' });
  res.status(204).send();
});

export default router;
