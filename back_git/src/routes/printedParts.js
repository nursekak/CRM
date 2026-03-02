import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { product_id, from, to } = req.query;
  let sql = `
    SELECT pp.*, pr.name as product_name, pt.name as part_name, m.version as model_version, p.code as printer_code
    FROM printed_parts pp
    JOIN products pr ON pr.id = pp.product_id
    JOIN parts pt ON pt.id = pp.part_id
    LEFT JOIN model_files m ON m.id = pp.model_file_id
    LEFT JOIN printers p ON p.id = pp.printer_id
    WHERE 1=1
  `;
  const params = [];
  let n = 1;
  if (product_id) { sql += ` AND pp.product_id = $${n++}`; params.push(product_id); }
  if (from) { sql += ` AND pp.printed_at >= $${n++}`; params.push(from); }
  if (to) { sql += ` AND pp.printed_at <= $${n++}`; params.push(to); }
  sql += ' ORDER BY pp.printed_at DESC';
  const r = await query(sql, params);
  res.json(r.rows);
});

export default router;
