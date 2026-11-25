const { db } = require('../data/db');
const inventoryRepo = require('../repositories/inventory.repository');
const requisitionRepo = require('../repositories/requisition.repository');

class InventoryService {
  // Query parts catalog & stock
  async getAllInventory(options = {}) {
    return inventoryRepo.getAllParts(options);
  }

  async getPartById(partId) {
    const part = inventoryRepo.findPartById(partId);
    if (!part) throw new Error(`Part #${partId} not found`);
    return part;
  }

  async createPart(data) {
    return inventoryRepo.createPart(data);
  }

  async updatePart(partId, data) {
    return inventoryRepo.updatePart(partId, data);
  }

  // Stock Adjustment (Restock/Purchase, Allocation, Count correction)
  async adjustStock({ partId, adjustmentType, quantity, sourceStock, destinationStock, performedBy, notes }) {
    if (!partId || !quantity || quantity <= 0) {
      throw new Error('Valid partId and positive quantity are required');
    }
    const result = inventoryRepo.adjustStock({
      partId,
      adjustmentType,
      quantity,
      sourceStock,
      destinationStock,
      performedBy,
      notes
    });

    // Check low stock alert after adjustment
    this.checkAndTriggerLowStockAlert(partId);

    return result;
  }

  // Check and trigger low stock alerts (US-25 / UC-21)
  checkAndTriggerLowStockAlert(partId) {
    const part = inventoryRepo.findPartById(partId);
    if (!part) return;

    const totalQty = part.workshop_qty + part.web_qty;
    if (totalQty <= part.low_stock_threshold) {
      // Check if recent unread notification exists to prevent spam
      const existing = db.prepare(`
        SELECT id FROM notifications
        WHERE type = 'LOW_STOCK' AND role_target = 'Store Manager' AND is_read = 0
        AND message LIKE ?
      `).get(`%${part.sku}%`);

      if (!existing) {
        db.prepare(`
          INSERT INTO notifications (role_target, type, title, message)
          VALUES ('Store Manager', 'LOW_STOCK', ?, ?)
        `).run(
          `Low Stock Warning: ${part.name}`,
          `Part ${part.name} (SKU: ${part.sku}) has reached low stock level. Current available: ${totalQty} (Threshold: ${part.low_stock_threshold}). Restock required.`
        );
      }
    }
  }

  // Scan all parts for low stock (Scheduler hook)
  scanLowStock() {
    const lowStockItems = inventoryRepo.getLowStockItems();
    for (const item of lowStockItems) {
      this.checkAndTriggerLowStockAlert(item.id);
    }
    return lowStockItems;
  }

  // Submit Requisition (US-21 / UC-18)
  async submitRequisition({ jobCardId, requestedBy, items }) {
    if (!jobCardId || !items || !items.length) {
      throw new Error('jobCardId and a non-empty items array are required');
    }

    const requisition = requisitionRepo.createRequisition({ jobCardId, requestedBy, items });

    // Notify Store Manager
    db.prepare(`
      INSERT INTO notifications (role_target, type, title, message)
      VALUES ('Store Manager', 'REQUISITION_PENDING', ?, ?)
    `).run(
      `New Parts Requisition #${requisition.id}`,
      `Mechanic submitted requisition #${requisition.id} for Job Card #${jobCardId} containing ${items.length} item(s).`
    );

    return requisition;
  }

  // Approve Requisition with Transaction and Stock Deduction (US-26 / UC-22 / SEQ-05 / AD-07)
  async approveRequisition(requisitionId, performedBy) {
    // Wrap entire approval in atomic database transaction
    const approvalTx = db.transaction(() => {
      const requisition = requisitionRepo.findById(requisitionId);
      if (!requisition) {
        throw new Error(`Requisition #${requisitionId} not found`);
      }
      if (requisition.status !== 'Pending') {
        throw new Error(`Requisition #${requisitionId} cannot be approved from status '${requisition.status}'`);
      }

      // 1. Verify stock availability for ALL items first
      for (const item of requisition.items) {
        const inv = db.prepare(`SELECT workshop_qty FROM inventory WHERE part_id = ?`).get(item.part_id);
        const available = inv ? inv.workshop_qty : 0;
        if (available < item.quantity_requested) {
          throw new Error(`Insufficient workshop stock for part '${item.name}' (SKU: ${item.sku}). Requested: ${item.quantity_requested}, Available: ${available}`);
        }
      }

      // 2. Deduct workshop stock and record 'Issue' transactions
      for (const item of requisition.items) {
        inventoryRepo.issueWorkshopStock({
          partId: item.part_id,
          quantity: item.quantity_requested,
          requisitionId: requisition.id,
          performedBy
        });
        requisitionRepo.updateItemIssuedQty(item.id, item.quantity_requested);
        this.checkAndTriggerLowStockAlert(item.part_id);
      }

      // 3. Update requisition status
      const updated = requisitionRepo.updateStatus(requisitionId, 'Approved/Issued');

      // 4. Notify mechanic
      db.prepare(`
        INSERT INTO notifications (user_id, role_target, type, title, message)
        VALUES (?, 'Mechanic', 'REQUISITION_APPROVED', ?, ?)
      `).run(
        requisition.requested_by,
        `Requisition #${requisition.id} Approved`,
        `Your requisition #${requisition.id} for Job Card #${requisition.job_card_id} has been approved and parts are issued.`
      );

      return updated;
    });

    return approvalTx();
  }

  // Reject Requisition (US-26 / UC-22)
  async rejectRequisition(requisitionId, reason, performedBy) {
    if (!reason) {
      throw new Error('Rejection reason is mandatory');
    }

    const requisition = requisitionRepo.findById(requisitionId);
    if (!requisition) {
      throw new Error(`Requisition #${requisitionId} not found`);
    }
    if (requisition.status !== 'Pending') {
      throw new Error(`Requisition #${requisitionId} is already ${requisition.status}`);
    }

    const updated = requisitionRepo.updateStatus(requisitionId, 'Rejected', reason);

    // Notify mechanic
    db.prepare(`
      INSERT INTO notifications (user_id, role_target, type, title, message)
      VALUES (?, 'Mechanic', 'REQUISITION_REJECTED', ?, ?)
    `).run(
      requisition.requested_by,
      `Requisition #${requisition.id} Rejected`,
      `Requisition #${requisition.id} for Job Card #${requisition.job_card_id} was rejected. Reason: ${reason}`
    );

    return updated;
  }

  // Get Requisitions
  async getRequisitions(filters = {}) {
    return requisitionRepo.getAll(filters);
  }

  async getRequisitionById(id) {
    const req = requisitionRepo.findById(id);
    if (!req) throw new Error(`Requisition #${id} not found`);
    return req;
  }

  // Get Inventory Dashboard Metrics (UC-35)
  async getDashboardMetrics() {
    const totalParts = db.prepare(`SELECT COUNT(*) as count FROM parts WHERE is_active = 1`).get().count;
    const stockSums = db.prepare(`
      SELECT SUM(workshop_qty) as total_workshop_stock,
             SUM(web_qty) as total_web_stock,
             SUM(reserved_qty) as total_reserved_stock
      FROM inventory
    `).get();

    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count FROM inventory
      WHERE (workshop_qty + web_qty) <= low_stock_threshold
    `).get().count;

    const pendingRequisitions = db.prepare(`
      SELECT COUNT(*) as count FROM parts_requisitions WHERE status = 'Pending'
    `).get().count;

    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status IN ('Placed', 'Packed')
    `).get().count;

    const recentTransactions = inventoryRepo.getTransactions().slice(0, 10);
    const lowStockItems = inventoryRepo.getLowStockItems();

    return {
      totalParts,
      totalWorkshopStock: stockSums.total_workshop_stock || 0,
      totalWebStock: stockSums.total_web_stock || 0,
      totalReservedStock: stockSums.total_reserved_stock || 0,
      lowStockCount,
      pendingRequisitions,
      pendingOrders,
      recentTransactions,
      lowStockItems
    };
  }

  // Notifications
  getNotifications(roleTarget = 'Store Manager') {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE role_target = ? OR role_target IS NULL
      ORDER BY created_at DESC LIMIT 50
    `).all(roleTarget);
  }

  markNotificationRead(id) {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(id);
    return true;
  }
}

module.exports = new InventoryService();
