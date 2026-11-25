const { db } = require('../data/db');

class InventoryRepository {
  // Find part by ID
  findPartById(id) {
    const stmt = db.prepare(`
      SELECT p.*, i.workshop_qty, i.web_qty, i.reserved_qty, i.low_stock_threshold,
             (i.workshop_qty + i.web_qty) as total_available_qty
      FROM parts p
      LEFT JOIN inventory i ON p.id = i.part_id
      WHERE p.id = ?
    `);
    return stmt.get(id);
  }

  // Find part by SKU
  findPartBySku(sku) {
    const stmt = db.prepare(`
      SELECT p.*, i.workshop_qty, i.web_qty, i.reserved_qty, i.low_stock_threshold
      FROM parts p
      LEFT JOIN inventory i ON p.id = i.part_id
      WHERE p.sku = ?
    `);
    return stmt.get(sku);
  }

  // List all parts with inventory levels
  getAllParts(options = {}) {
    let query = `
      SELECT p.*, i.workshop_qty, i.web_qty, i.reserved_qty, i.low_stock_threshold,
             (i.workshop_qty + i.web_qty) as total_available_qty
      FROM parts p
      LEFT JOIN inventory i ON p.id = i.part_id
      WHERE 1=1
    `;
    const params = [];

    if (options.search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    if (options.lowStockOnly) {
      query += ` AND (i.workshop_qty + i.web_qty) <= i.low_stock_threshold`;
    }

    query += ` ORDER BY p.name ASC`;
    return db.prepare(query).all(...params);
  }

  // Create part and initialize inventory
  createPart({ sku, name, description, unit, unit_cost, unit_price, workshop_qty = 0, web_qty = 0, low_stock_threshold = 5 }) {
    const createTx = db.transaction(() => {
      const partStmt = db.prepare(`
        INSERT INTO parts (sku, name, description, unit, unit_cost, unit_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const info = partStmt.run(sku, name, description, unit || 'pcs', unit_cost, unit_price);
      const partId = info.lastInsertRowid;

      const invStmt = db.prepare(`
        INSERT INTO inventory (part_id, workshop_qty, web_qty, reserved_qty, low_stock_threshold)
        VALUES (?, ?, ?, 0, ?)
      `);
      invStmt.run(partId, workshop_qty, web_qty, low_stock_threshold);

      if (workshop_qty > 0 || web_qty > 0) {
        const transStmt = db.prepare(`
          INSERT INTO inventory_transactions (part_id, type, quantity, source_stock, destination_stock, reference_type, notes)
          VALUES (?, 'Purchase', ?, 'supplier', 'stock', 'Initial Stock', 'Initial stock setup')
        `);
        transStmt.run(partId, workshop_qty + web_qty);
      }

      return this.findPartById(partId);
    });

    return createTx();
  }

  // Update part thresholds or info
  updatePart(partId, { name, description, unit_cost, unit_price, low_stock_threshold, is_active }) {
    const updateTx = db.transaction(() => {
      const current = this.findPartById(partId);
      if (!current) throw new Error('Part not found');

      db.prepare(`
        UPDATE parts
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            unit_cost = COALESCE(?, unit_cost),
            unit_price = COALESCE(?, unit_price),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, description, unit_cost, unit_price, is_active, partId);

      if (low_stock_threshold !== undefined) {
        db.prepare(`
          UPDATE inventory
          SET low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
          WHERE part_id = ?
        `).run(low_stock_threshold, partId);
      }

      return this.findPartById(partId);
    });

    return updateTx();
  }

  // Adjust stock (Count / Damage / Supplier Purchase / Allocation)
  adjustStock({ partId, adjustmentType, quantity, sourceStock, destinationStock, performedBy, notes }) {
    // adjustmentType: 'Purchase', 'Allocation', 'Adjustment'
    const adjustTx = db.transaction(() => {
      const inv = db.prepare(`SELECT * FROM inventory WHERE part_id = ?`).get(partId);
      if (!inv) throw new Error('Inventory record not found for part ' + partId);

      let newWorkshop = inv.workshop_qty;
      let newWeb = inv.web_qty;

      if (adjustmentType === 'Purchase') {
        if (destinationStock === 'web') {
          newWeb += quantity;
        } else {
          newWorkshop += quantity;
        }
      } else if (adjustmentType === 'Allocation') {
        // e.g. from workshop to web or web to workshop
        if (sourceStock === 'workshop' && destinationStock === 'web') {
          if (newWorkshop < quantity) throw new Error('Insufficient workshop stock to allocate');
          newWorkshop -= quantity;
          newWeb += quantity;
        } else if (sourceStock === 'web' && destinationStock === 'workshop') {
          if (newWeb < quantity) throw new Error('Insufficient web stock to allocate');
          newWeb -= quantity;
          newWorkshop += quantity;
        }
      } else if (adjustmentType === 'Adjustment') {
        // Direct recount or manual correction
        if (sourceStock === 'web') {
          if (newWeb + quantity < 0) throw new Error('Web stock cannot be negative');
          newWeb += quantity;
        } else {
          if (newWorkshop + quantity < 0) throw new Error('Workshop stock cannot be negative');
          newWorkshop += quantity;
        }
      }

      db.prepare(`
        UPDATE inventory
        SET workshop_qty = ?, web_qty = ?, updated_at = CURRENT_TIMESTAMP
        WHERE part_id = ?
      `).run(newWorkshop, newWeb, partId);

      // Record transaction ledger
      db.prepare(`
        INSERT INTO inventory_transactions (
          part_id, type, quantity, source_stock, destination_stock, reference_type, performed_by, notes
        ) VALUES (?, ?, ?, ?, ?, 'Adjustment', ?, ?)
      `).run(partId, adjustmentType, quantity, sourceStock, destinationStock, performedBy, notes || '');

      return this.findPartById(partId);
    });

    return adjustTx();
  }

  // Atomic Issue for Requisition (Deduct Workshop Qty)
  issueWorkshopStock({ partId, quantity, requisitionId, performedBy }) {
    const inv = db.prepare(`SELECT * FROM inventory WHERE part_id = ?`).get(partId);
    if (!inv) throw new Error(`Inventory not found for part ${partId}`);
    if (inv.workshop_qty < quantity) {
      throw new Error(`Insufficient workshop stock for part ${partId}. Required: ${quantity}, Available: ${inv.workshop_qty}`);
    }

    db.prepare(`
      UPDATE inventory
      SET workshop_qty = workshop_qty - ?, updated_at = CURRENT_TIMESTAMP
      WHERE part_id = ?
    `).run(quantity, partId);

    db.prepare(`
      INSERT INTO inventory_transactions (
        part_id, type, quantity, source_stock, destination_stock, reference_type, reference_id, performed_by, notes
      ) VALUES (?, 'Issue', ?, 'workshop', 'job_card', 'Requisition', ?, ?, 'Issued to workshop repair')
    `).run(partId, quantity, requisitionId, performedBy);
  }

  // Atomic Reserve for E-Commerce Checkout (Holds Web Qty)
  reserveWebStock({ partId, quantity, orderId }) {
    const inv = db.prepare(`SELECT * FROM inventory WHERE part_id = ?`).get(partId);
    if (!inv) throw new Error(`Inventory not found for part ${partId}`);
    if (inv.web_qty < quantity) {
      throw new Error(`Insufficient web stock for part ${partId}. Required: ${quantity}, Available: ${inv.web_qty}`);
    }

    db.prepare(`
      UPDATE inventory
      SET web_qty = web_qty - ?, reserved_qty = reserved_qty + ?, updated_at = CURRENT_TIMESTAMP
      WHERE part_id = ?
    `).run(quantity, quantity, partId);

    db.prepare(`
      INSERT INTO inventory_transactions (
        part_id, type, quantity, source_stock, destination_stock, reference_type, reference_id, notes
      ) VALUES (?, 'Reserve', ?, 'web', 'reserved', 'Order', ?, 'Reserved at checkout')
    `).run(partId, quantity, orderId);
  }

  // Atomic Release Reserved Stock (Order Cancellation)
  releaseReservedStock({ partId, quantity, orderId }) {
    db.prepare(`
      UPDATE inventory
      SET web_qty = web_qty + ?, reserved_qty = reserved_qty - ?, updated_at = CURRENT_TIMESTAMP
      WHERE part_id = ?
    `).run(quantity, quantity, partId);

    db.prepare(`
      INSERT INTO inventory_transactions (
        part_id, type, quantity, source_stock, destination_stock, reference_type, reference_id, notes
      ) VALUES (?, 'Release', ?, 'reserved', 'web', 'Order', ?, 'Released from cancelled order')
    `).run(partId, quantity, orderId);
  }

  // Atomic Sale / Dispatch (Deducts Reserved Qty)
  dispatchReservedStock({ partId, quantity, orderId, performedBy }) {
    db.prepare(`
      UPDATE inventory
      SET reserved_qty = reserved_qty - ?, updated_at = CURRENT_TIMESTAMP
      WHERE part_id = ?
    `).run(quantity, partId);

    db.prepare(`
      INSERT INTO inventory_transactions (
        part_id, type, quantity, source_stock, destination_stock, reference_type, reference_id, performed_by, notes
      ) VALUES (?, 'Sale', ?, 'reserved', 'customer', 'Order', ?, ?, 'Dispatched to customer')
    `).run(partId, quantity, orderId, performedBy);
  }

  // Low stock query
  getLowStockItems() {
    return db.prepare(`
      SELECT p.id, p.sku, p.name, i.workshop_qty, i.web_qty, i.reserved_qty, i.low_stock_threshold,
             (i.workshop_qty + i.web_qty) as total_available
      FROM parts p
      JOIN inventory i ON p.id = i.part_id
      WHERE (i.workshop_qty + i.web_qty) <= i.low_stock_threshold
      ORDER BY total_available ASC
    `).all();
  }

  // Get transaction history
  getTransactions(partId = null) {
    let query = `
      SELECT t.*, p.name as part_name, p.sku as part_sku, u.name as user_name
      FROM inventory_transactions t
      JOIN parts p ON t.part_id = p.id
      LEFT JOIN users u ON t.performed_by = u.id
    `;
    const params = [];
    if (partId) {
      query += ` WHERE t.part_id = ?`;
      params.push(partId);
    }
    query += ` ORDER BY t.created_at DESC LIMIT 100`;
    return db.prepare(query).all(...params);
  }
}

module.exports = new InventoryRepository();
