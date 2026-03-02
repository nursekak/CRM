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

const upload = multer({ dest: uploadDir, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

const router = Router();
router.use(authMiddleware);

router.get('/models/:model_id/download', async (req, res) => {
  const r = await query('SELECT id, file_path, version, file_type FROM model_files WHERE id = $1', [req.params.model_id]);
  const model = r.rows[0];
  if (!model || !model.file_path) return res.status(404).json({ error: 'Файл не найден' });
  const fullPath = path.join(uploadDir, path.basename(model.file_path));
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Файл не найден на диске' });
  const ext = (model.file_type || 'stl').toLowerCase();
  const filename = `${model.version || 'model'}.${ext}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', ext === 'stl' ? 'model/stl' : 'application/octet-stream');
  res.sendFile(path.resolve(fullPath));
});

router.get('/:id/models', async (req, res) => {
  const r = await query(
    `SELECT m.*, u.name as uploaded_by_name FROM model_files m
     LEFT JOIN users u ON u.id = m.uploaded_by
     WHERE m.part_id = $1 ORDER BY m.uploaded_at DESC`,
    [req.params.id]
  );
  res.json(r.rows);
});

router.patch('/:id', async (req, res) => {
  const { name, part_code, recommended_material, weight_grams, status, archive_reason } = req.body || {};
  const updates = [];
  const params = [];
  let n = 1;
  if (name !== undefined) { updates.push(`name = $${n++}`); params.push(name); }
  if (part_code !== undefined) { updates.push(`part_code = $${n++}`); params.push(part_code); }
  if (recommended_material !== undefined) { updates.push(`recommended_material = $${n++}`); params.push(recommended_material); }
  if (weight_grams !== undefined) { updates.push(`weight_grams = $${n++}`); params.push(weight_grams); }
  if (status) { updates.push(`status = $${n++}`); params.push(status); }
  if (archive_reason !== undefined) { updates.push(`archive_reason = $${n++}`); params.push(archive_reason); }
  if (status === 'archived') updates.push('archived_at = now()');
  if (updates.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
  params.push(req.params.id);
  const r = await query(
    `UPDATE parts SET ${updates.join(', ')} WHERE id = $${n} RETURNING *`,
    params
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Деталь не найдена' });
  res.json(r.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const [wh, mf] = await Promise.all([
    query('SELECT id FROM warehouse_items WHERE part_id = $1 LIMIT 1', [req.params.id]),
    query('SELECT id FROM model_files WHERE part_id = $1 LIMIT 1', [req.params.id]),
  ]);
  if (wh.rows.length > 0) return res.status(400).json({ error: 'Деталь есть на складе. Сначала обнулите остатки.' });
  if (mf.rows.length > 0) return res.status(400).json({ error: 'У детали есть 3D-модели. Удалите их или архивируйте деталь.' });
  const r = await query('DELETE FROM parts WHERE id = $1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'Деталь не найдена' });
  res.status(204).send();
});

router.post('/:part_id/models', upload.single('file'), async (req, res) => {
  const { version, file_type, comment, status } = req.body || {};
  const file = req.file;
  if (!version) return res.status(400).json({ error: 'Укажите version' });
  const partId = req.params.part_id;
  const filePath = file ? `/uploads/${path.basename(file.filename)}` : null;
  const fileSize = file?.size || null;
  const r = await query(
    `INSERT INTO model_files (part_id, version, file_type, file_path, file_size_bytes, status, uploaded_by, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [partId, version, file_type || (file?.originalname?.split('.').pop()) || 'stl', filePath, fileSize, status || 'current', req.user?.id || null, comment || null]
  );
  res.status(201).json(r.rows[0]);
});

router.post('/:id/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Загрузите файл' });
  const imagePath = `/uploads/${path.basename(req.file.filename)}`;
  await query('UPDATE parts SET image_path = $1 WHERE id = $2', [imagePath, req.params.id]);
  const r = await query('SELECT * FROM parts WHERE id = $1', [req.params.id]);
  res.json(r.rows[0]);
});

router.patch('/models/:model_id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Укажите status' });
  const r = await query(
    `UPDATE model_files SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.model_id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Модель не найдена' });
  res.json(r.rows[0]);
});

export default router;
