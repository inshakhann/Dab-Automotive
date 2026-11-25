const { db } = require('../data/db');

class RequisitionRepository {
  createRequisition({ jobCardId, requestedBy, items }) {
    const createTx = db.transaction(() => {
      const reqStmt = db.prepare(`
        INSERT INTO parts_requisitions (job_card_id, requested_by, status)
        VALUES (?, ?, 'Pending')
      `);
      const info = reqStmt.run(jobCardId, requestedBy);
      const reqId = info.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO requisition_items (requisition_id, part_id, quantity_requested, quantity_issued)
        VALUES (?, ?, ?, 0)
      `);

      for (const item of items) {
        if (!item.part_id || item.quantity <= 0) {
          throw new Error('Valid part_id and quantity > 0 are required for requisition items');
        }
        itemStmt.run(reqId, item.part_id, item.quantity);
      }

      return this.findById(reqId);
    });

    return createTx();
  }

  findById(id) {
    const req = db.prepare(`
      SELECT r.*, u.name as mechanic_name, jc.status as job_status, jc.description as job_description
      FROM parts_requisitions r
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN job_cards jc ON r.job_card_id = jc.id
      WHERE r.id = ?
    `).get(id);

    if (!req) return null;

    const items = db.prepare(`
      SELECT ri.*, p.sku, p.name, p.unit, p.unit_price, i.workshop_qty as available_workshop_qty
      FROM requisition_items ri
      JOIN parts p ON ri.part_id = p.id
      LEFT JOIN inventory i ON p.id = i.part_id
      WHERE ri.requisition_id = ?
    `).all(id);

    req.items = items;
    return req;
  }

  getAll({ status, jobCardId }) {
    let query = `
      SELECT r.*, u.name as mechanic_name, jc.status as job_status
      FROM parts_requisitions r
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN job_cards jc ON r.job_card_id = jc.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (jobCardId) {
      query += ` AND r.job_card_id = ?`;
      params.push(jobCardId);
    }

    query += ` ORDER BY r.created_at DESC`;
    const list = db.prepare(query).all(...params);

    for (const item of list) {
      item.items = db.prepare(`
        SELECT ri.*, p.sku, p.name, p.unit, i.workshop_qty as available_workshop_qty
        FROM requisition_items ri
        JOIN parts p ON ri.part_id = p.id
        LEFT JOIN inventory i ON p.id = i.part_id
        WHERE ri.requisition_id = ?
      `).all(item.id);
    }

    return list;
  }

  updateStatus(id, status, rejectionReason = null) {
    db.prepare(`
      UPDATE parts_requisitions
      SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, rejectionReason, id);

    return this.findById(id);
  }

  updateItemIssuedQty(itemId, quantityIssued) {
    db.prepare(`
      UPDATE requisition_items
      SET quantity_issued = ?
      WHERE id = ?
    `).run(quantityIssued, itemId);
  }
}

module.exports = new RequisitionRepository();
