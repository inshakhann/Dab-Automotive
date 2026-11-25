const { db, initSchema } = require('./db');

function seedData() {
  initSchema();

  console.log('Seeding initial data for Dab Automotive (Roman - Member 4)...');

  // 1. Roles & Users (Foundation support)
  db.exec(`
    INSERT OR IGNORE INTO roles (id, name) VALUES
      (1, 'Administrator'),
      (2, 'Owner'),
      (3, 'Store Manager'),
      (4, 'Mechanic'),
      (5, 'Customer');

    INSERT OR IGNORE INTO users (id, role_id, name, email, password_hash, status) VALUES
      (1, 3, 'Roman Fatima (Store Manager)', 'store@dab.com', 'hash123', 'active'),
      (2, 4, 'Ali Mechanic', 'mechanic@dab.com', 'hash123', 'active'),
      (3, 5, 'Hamza Customer', 'customer@gmail.com', 'hash123', 'active'),
      (4, 2, 'Insha Owner', 'owner@dab.com', 'hash123', 'active');

    INSERT OR IGNORE INTO customers (id, user_id, phone, address) VALUES
      (1, 3, '+92 300 1234567', 'House 14, Street 8, F-10/2, Islamabad');

    INSERT OR IGNORE INTO vehicles (id, customer_id, make, model, year, vin, license_plate) VALUES
      (1, 1, 'Toyota', 'Corolla', 2021, 'JTDBR32E6310001', 'ICT-AB-123'),
      (2, 1, 'Honda', 'Civic', 2022, '1HGCV1F33NA0002', 'LHR-LE-456');

    INSERT OR IGNORE INTO job_cards (id, booking_id, vehicle_id, worker_id, status, description) VALUES
      (101, 1, 1, 2, 'In Repair', 'Periodic 40,000 KM Maintenance & Brake Replacement'),
      (102, 2, 2, 2, 'Inspection', 'Suspension Noise Inspection & Oil Change');
  `);

  // 2. Product Categories
  db.exec(`
    INSERT OR IGNORE INTO product_categories (id, name, slug, description) VALUES
      (1, 'Engine Oil & Lubricants', 'engine-oil-lubricants', 'High performance synthetic and mineral oils, transmission fluids'),
      (2, 'Brake Systems', 'brake-systems', 'Ceramic brake pads, disc rotors, callipers and brake fluids'),
      (3, 'Filters & Spark Plugs', 'filters-spark-plugs', 'Oil filters, air filters, cabin pollen filters and iridium spark plugs'),
      (4, 'Suspension & Steering', 'suspension-steering', 'Shock absorbers, struts, bushings, ball joints and tie rod ends'),
      (5, 'Batteries & Electrical', 'batteries-electrical', 'Dry cell and AGM batteries, alternators, fuses and LED headlight bulbs');
  `);

  // 3. Parts & Inventory (Workshop and Web stock segregation)
  const partsList = [
    {
      id: 1, sku: 'OIL-5W30-SYN', name: 'Total Quartz 9000 5W-30 Full Synthetic (4L)',
      desc: 'Advanced synthetic engine oil for modern gasoline engines',
      cost: 7200, price: 9500, workshop_qty: 15, web_qty: 25, threshold: 10,
      catId: 1, img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Toyota', model: 'Corolla', y1: 2014, y2: 2024 },
        { make: 'Honda', model: 'Civic', y1: 2016, y2: 2024 },
        { make: 'Suzuki', model: 'Cultus', y1: 2017, y2: 2024 }
      ]
    },
    {
      id: 2, sku: 'BRK-PAD-TOY-COR', name: 'Akebono Ceramic Front Brake Pads',
      desc: 'Ultra-quiet, dust-free ceramic brake pads with precision backing plate',
      cost: 4500, price: 6800, workshop_qty: 8, web_qty: 12, threshold: 5,
      catId: 2, img: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Toyota', model: 'Corolla', y1: 2014, y2: 2023 },
        { make: 'Toyota', model: 'Yaris', y1: 2020, y2: 2024 }
      ]
    },
    {
      id: 3, sku: 'FLT-OIL-DENSO-TY', name: 'Denso Genuine Oil Filter 90915-YZZE1',
      desc: 'High filtration efficiency resin-impregnated paper media',
      cost: 950, price: 1600, workshop_qty: 20, web_qty: 30, threshold: 8,
      catId: 3, img: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Toyota', model: 'Corolla', y1: 2008, y2: 2024 },
        { make: 'Toyota', model: 'Yaris', y1: 2020, y2: 2024 }
      ]
    },
    {
      id: 4, sku: 'SPK-NGK-IRID', name: 'NGK Laser Iridium Spark Plug (Set of 4)',
      desc: 'Long life iridium core spark plugs with trivalent metal plating',
      cost: 5800, price: 8200, workshop_qty: 6, web_qty: 10, threshold: 4,
      catId: 3, img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Honda', model: 'Civic', y1: 2012, y2: 2022 },
        { make: 'Honda', model: 'City', y1: 2010, y2: 2023 }
      ]
    },
    {
      id: 5, sku: 'BAT-AGS-65R', name: 'AGS Maintenance Free Battery 65AH',
      desc: 'Heavy duty cold cranking amps (CCA) with flame arrestor',
      cost: 16500, price: 21500, workshop_qty: 3, web_qty: 2, threshold: 4, // low stock trigger
      catId: 5, img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Toyota', model: 'Corolla', y1: 2014, y2: 2024 },
        { make: 'Honda', model: 'Civic', y1: 2016, y2: 2024 },
        { make: 'KIA', model: 'Sportage', y1: 2019, y2: 2024 }
      ]
    },
    {
      id: 6, sku: 'SUS-SHK-KYB-FR', name: 'KYB Excel-G Gas Shock Absorber (Front Pair)',
      desc: 'Restores original vehicle handling and damping control',
      cost: 22000, price: 28500, workshop_qty: 2, web_qty: 1, threshold: 3, // low stock trigger
      catId: 4, img: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=500&auto=format&fit=crop&q=60',
      compat: [
        { make: 'Toyota', model: 'Corolla', y1: 2014, y2: 2021 }
      ]
    }
  ];

  for (const p of partsList) {
    db.prepare(`
      INSERT OR REPLACE INTO parts (id, sku, name, description, unit, unit_cost, unit_price, is_active)
      VALUES (?, ?, ?, ?, 'pcs', ?, ?, 1)
    `).run(p.id, p.sku, p.name, p.desc, p.cost, p.price);

    db.prepare(`
      INSERT OR REPLACE INTO inventory (part_id, workshop_qty, web_qty, reserved_qty, low_stock_threshold)
      VALUES (?, ?, ?, 0, ?)
    `).run(p.id, p.workshop_qty, p.web_qty, p.threshold);

    // Initial transaction log
    db.prepare(`
      INSERT OR IGNORE INTO inventory_transactions (id, part_id, type, quantity, source_stock, destination_stock, reference_type, notes)
      VALUES (?, ?, 'Purchase', ?, 'supplier', 'stock', 'Initial Stock', 'Initial seed data load')
    `).run(p.id, p.id, p.workshop_qty + p.web_qty);

    // Product entry for e-commerce
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    db.prepare(`
      INSERT OR REPLACE INTO products (id, category_id, part_id, name, slug, sku, description, price, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(p.id, p.catId, p.id, p.name, slug, p.sku, p.desc, p.price, p.img);

    // Product compatibility
    for (const c of p.compat) {
      db.prepare(`
        INSERT OR IGNORE INTO product_compatibility (product_id, make, model, year_from, year_to)
        VALUES (?, ?, ?, ?, ?)
      `).run(p.id, c.make, c.model, c.y1, c.y2);
    }
  }

  // 4. Sample Requisition for Job Card #101
  db.exec(`
    INSERT OR IGNORE INTO parts_requisitions (id, job_card_id, requested_by, status)
    VALUES (1, 101, 2, 'Pending');

    INSERT OR IGNORE INTO requisition_items (id, requisition_id, part_id, quantity_requested, quantity_issued)
    VALUES
      (1, 1, 2, 1, 0), -- 1 Brake Pad set
      (2, 1, 3, 1, 0); -- 1 Oil filter
  `);

  console.log('Seed data successfully applied!');
}

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
