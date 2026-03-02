import { query } from './pool.js';

/**
 * Отправка только из склада: позиция = конкретный остаток (изделие + деталь + версия + материал).
 * shipment_items привязываем к складу: model_file_id, consumable_id, status_label.
 * warehouse_items: уникальность по (product, part, model, status, consumable) — один «ящик» на материал.
 */
async function run() {
  try {
    await query(`
      INSERT INTO consumables (sku, name, category, quantity, unit, min_threshold)
      SELECT 'UNKNOWN', 'Не указан', 'filament', 0, 'kg', 0
      WHERE NOT EXISTS (SELECT 1 FROM consumables WHERE sku = 'UNKNOWN')
    `);
    const r = await query(`SELECT id FROM consumables WHERE sku = 'UNKNOWN' LIMIT 1`);
    const unknownId = r.rows[0]?.id;
    if (unknownId) {
      await query('UPDATE warehouse_items SET consumable_id = $1 WHERE consumable_id IS NULL', [unknownId]);
      await query(`
        UPDATE warehouse_items w SET quantity = agg.qty FROM (
          SELECT product_id, part_id, model_file_id, status_label, consumable_id, MIN(id) as mid, SUM(quantity)::INTEGER as qty
          FROM warehouse_items GROUP BY 1,2,3,4,5 HAVING COUNT(*) > 1
        ) agg
        WHERE w.product_id = agg.product_id AND w.part_id = agg.part_id AND w.model_file_id = agg.model_file_id AND w.status_label = agg.status_label AND w.consumable_id = agg.consumable_id AND w.id = agg.mid
      `);
      await query(`
        DELETE FROM warehouse_items w WHERE EXISTS (
          SELECT 1 FROM warehouse_items w2 WHERE w2.product_id = w.product_id AND w2.part_id = w.part_id AND w2.model_file_id = w.model_file_id AND w2.status_label = w.status_label AND w2.consumable_id = w.consumable_id AND w2.id < w.id
        )
      `);
    }

    await query(`
      ALTER TABLE shipment_items
        ADD COLUMN IF NOT EXISTS model_file_id INTEGER REFERENCES model_files(id),
        ADD COLUMN IF NOT EXISTS consumable_id INTEGER REFERENCES consumables(id),
        ADD COLUMN IF NOT EXISTS status_label VARCHAR(20) DEFAULT 'new'
    `);

    await query('DROP INDEX IF EXISTS warehouse_product_part_model_status');
    await query('DROP INDEX IF EXISTS warehouse_product_part_model_status_material');
    await query(`
      CREATE UNIQUE INDEX warehouse_product_part_model_status_material
      ON warehouse_items(product_id, part_id, model_file_id, status_label, consumable_id)
    `);
    console.log('OK: shipment from warehouse migration');
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
