const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../dab_automotive.db');
const rawDb = new DatabaseSync(dbPath);

// Enable WAL mode and foreign key constraints
rawDb.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

// Create a friendly wrapper compatible with standard query interface
const db = {
  exec(sql) {
    return rawDb.exec(sql);
  },
  pragma(sql) {
    try {
      return rawDb.exec(`PRAGMA ${sql};`);
    } catch (e) {
      // pragma query ignored
    }
  },
  prepare(sql) {
    const stmt = rawDb.prepare(sql);
    return {
      run(...params) {
        const info = stmt.run(...params);
        return {
          changes: info ? info.changes : 0,
          lastInsertRowid: info ? Number(info.lastInsertRowid) : 0
        };
      },
      get(...params) {
        return stmt.get(...params);
      },
      all(...params) {
        return stmt.all(...params);
      }
    };
  },
  transaction(fn) {
    return (...args) => {
      rawDb.exec('BEGIN IMMEDIATE;');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT;');
        return result;
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    };
  }
};

// Initialize Member 4 Schema (plus foundation references for mock/shared integration)
function initSchema() {
  db.exec(`
    -- Base Users & Roles (Foundation references for auth & role simulation)
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- Base Customers & Vehicles (Talha reference)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      vin TEXT,
      license_plate TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Base Job Cards (Sana reference for requisitions)
    CREATE TABLE IF NOT EXISTS job_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      vehicle_id INTEGER,
      worker_id INTEGER,
      status TEXT DEFAULT 'In Repair',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- =======================================================
    -- MEMBER 4 (ROMAN) DOMAIN TABLES: INVENTORY & REQUISITIONS
    -- =======================================================

    -- 1. parts
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT DEFAULT 'pcs',
      unit_cost REAL NOT NULL DEFAULT 0.0,
      unit_price REAL NOT NULL DEFAULT 0.0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. inventory (1:1 with parts, segregating workshop and web stock)
    CREATE TABLE IF NOT EXISTS inventory (
      part_id INTEGER PRIMARY KEY,
      workshop_qty INTEGER NOT NULL DEFAULT 0,
      web_qty INTEGER NOT NULL DEFAULT 0,
      reserved_qty INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    );

    -- 3. inventory_transactions (Purchase, Allocation, Reserve, Issue, Sale, Release, Adjustment)
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      source_stock TEXT,
      destination_stock TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      performed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (part_id) REFERENCES parts(id),
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );

    -- 4. parts_requisitions (Job Card parts requests from mechanics)
    CREATE TABLE IF NOT EXISTS parts_requisitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_card_id INTEGER NOT NULL,
      requested_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_card_id) REFERENCES job_cards(id),
      FOREIGN KEY (requested_by) REFERENCES users(id)
    );

    -- 5. requisition_items
    CREATE TABLE IF NOT EXISTS requisition_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requisition_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      quantity_requested INTEGER NOT NULL,
      quantity_issued INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (requisition_id) REFERENCES parts_requisitions(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    -- =======================================================
    -- MEMBER 4 (ROMAN) DOMAIN TABLES: AUTOMOTIVE E-COMMERCE
    -- =======================================================

    -- 6. product_categories
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. products (Storefront catalog linked optionally to a part or standalone accessory)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      part_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES product_categories(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    -- 8. product_compatibility (Vehicle fitment: Make, Model, Year Range)
    CREATE TABLE IF NOT EXISTS product_compatibility (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year_from INTEGER NOT NULL,
      year_to INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 9. carts (1:1 with Customer)
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- 10. cart_items
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cart_id, product_id),
      FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 11. orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Placed',
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0.0,
      shipping_fee REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL,
      delivery_address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- 12. order_items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      part_id INTEGER,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    -- 13. System Notifications & Low Stock Alerts
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role_target TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initSchema();

module.exports = {
  db,
  initSchema
};
