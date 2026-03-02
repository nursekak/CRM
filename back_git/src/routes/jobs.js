import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function genJobCode() {
  return 'J-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

router.get('/', async (req, res) => {
  const status = req.query.status;
  let sql = `
    SELECT j.*, p.code as printer_code, pr.name as product_name, pt.name as part_name, m.version as model_version
    FROM jobs j
    LEFT JOIN printers p ON p.id = j.assigned_printer_id
    LEFT JOIN products pr ON pr.id = j.product_id
    LEFT JOIN parts pt ON pt.id = j.part_id
    LEFT JOIN model_files m ON m.id = j.model_file_id
    ORDER BY j.created_at DESC
  `;
  const params = [];
  if (status) {
    sql = `
    SELECT j.*, p.code as printer_code, pr.name as product_name, pt.name as part_name, m.version as model_version
    FROM jobs j
    LEFT JOIN printers p ON p.id = j.assigned_printer_id
    LEFT JOIN products pr ON pr.id = j.product_id
    LEFT JOIN parts pt ON pt.id = j.part_id
    LEFT JOIN model_files m ON m.id = j.model_file_id
    WHERE j.status = $1
    ORDER BY j.created_at DESC
    `;
    params.push(status);
  }
  const r = await query(sql, params);
  res.json(r.rows);
});

router.get('/:id', async (req, res) => {
  const r = await query(
    `SELECT j.*, p.code as printer_code, p.status as printer_status, pr.name as product_name, pt.name as part_name, pt.status as part_status, m.version as model_version, m.status as model_status
     FROM jobs j
     LEFT JOIN printers p ON p.id = j.assigned_printer_id
     LEFT JOIN products pr ON pr.id = j.product_id
     LEFT JOIN parts pt ON pt.id = j.part_id
     LEFT JOIN model_files m ON m.id = j.model_file_id
     WHERE j.id = $1`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Задание не найдено' });
  res.json(r.rows[0]);
});

router.post('/', async (req, res) => {
  const { product_id, part_id, model_file_id, quantity, assigned_printer_id } = req.body || {};
  if (!product_id || !part_id || !model_file_id) {
    return res.status(400).json({ error: 'Укажите product_id, part_id, model_file_id' });
  }
  const jobCode = genJobCode();
  const r = await query(
    `INSERT INTO jobs (job_code, product_id, part_id, model_file_id, quantity, assigned_printer_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [jobCode, product_id, part_id, model_file_id, quantity ?? 1, assigned_printer_id || null, req.user?.id || null]
  );
  res.status(201).json(r.rows[0]);
});

router.patch('/:id/start', async (req, res) => {
  const r = await query(
    `UPDATE jobs SET status = 'running', started_at = now(), progress_percent = 0
     WHERE id = $1 AND status = 'queued' RETURNING *`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(400).json({ error: 'Задание не в очереди или уже запущено' });
  await query(
    'UPDATE printers SET current_job_id = $1, updated_at = now() WHERE id = $2',
    [req.params.id, r.rows[0].assigned_printer_id]
  );
  res.json(r.rows[0]);
});

router.patch('/:id/complete', async (req, res) => {
  const { actual_quantity, notes, quality_passed } = req.body || {};
  const jobId = req.params.id;
  const jobR = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  const job = jobR.rows[0];
  if (!job) return res.status(404).json({ error: 'Задание не найдено' });
  if (job.status !== 'running' && job.status !== 'queued') {
    return res.status(400).json({ error: 'Задание уже завершено или отменено' });
  }
  const qty = actual_quantity ?? job.quantity;
  await query('BEGIN');
  try {
    await query(
      `INSERT INTO printed_parts (job_id, product_id, part_id, model_file_id, printer_id, quantity, operator_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [jobId, job.product_id, job.part_id, job.model_file_id, job.assigned_printer_id, qty, req.user?.id || null, notes || null]
    );
    const partR = await query('SELECT status FROM parts WHERE id = $1', [job.part_id]);
    const statusLabel = partR.rows[0]?.status === 'archived' ? 'old' : 'new';
    const whR = await query(
      `SELECT id, quantity FROM warehouse_items WHERE product_id = $1 AND part_id = $2 AND model_file_id = $3 AND status_label = $4`,
      [job.product_id, job.part_id, job.model_file_id, statusLabel]
    );
    if (whR.rows[0]) {
      await query(
        'UPDATE warehouse_items SET quantity = quantity + $1, updated_at = now() WHERE id = $2',
        [qty, whR.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO warehouse_items (product_id, part_id, model_file_id, status_label, quantity) VALUES ($1, $2, $3, $4, $5)`,
        [job.product_id, job.part_id, job.model_file_id, statusLabel, qty]
      );
    }
    await query(
      `UPDATE jobs SET status = 'completed', progress_percent = 100, finished_at = now() WHERE id = $1`,
      [jobId]
    );
    await query('UPDATE printers SET current_job_id = NULL, updated_at = now() WHERE current_job_id = $1', [jobId]);
    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    throw e;
  }
  const updated = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  res.json(updated.rows[0]);
});

router.patch('/:id/cancel', async (req, res) => {
  const r = await query(
    `UPDATE jobs SET status = 'cancelled' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Задание не найдено' });
  await query('UPDATE printers SET current_job_id = NULL, updated_at = now() WHERE current_job_id = $1', [req.params.id]);
  res.json(r.rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { status, progress_percent, assigned_printer_id } = req.body || {};
  const r = await query(
    `UPDATE jobs SET 
      status = COALESCE($1, status), progress_percent = COALESCE($2, progress_percent),
      assigned_printer_id = COALESCE($3, assigned_printer_id)
     WHERE id = $4 RETURNING *`,
    [status, progress_percent, assigned_printer_id, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Задание не найдено' });
  res.json(r.rows[0]);
});

export default router;
