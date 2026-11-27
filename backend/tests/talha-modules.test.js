require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { createAccessToken } = require("../src/config/jwt");
const app = require("../src/app");
const pool = require("../src/config/db");
const { scanAndAlertOwnerIssues } = require("../src/modules/reminders/reminder.service");

let server;
let baseUrl;
let customer1UserId;
let customer2UserId;
let ownerUserId;
let customer1Token;
let customer2Token;
let ownerToken;

const createdServiceIds = [];
const createdPackageIds = [];
const createdBayIds = [];
const createdBookingIds = [];
const createdVehicleIds = [];
const createdCustomerIds = [];
const createdUserIds = [];

const api = async (path, { method = "GET", token, body } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, body: json };
};

before(async () => {
  process.env.WORKSHOP_LATITUDE = process.env.WORKSHOP_LATITUDE || "33.6844";
  process.env.WORKSHOP_LONGITUDE = process.env.WORKSHOP_LONGITUDE || "73.0479";
  process.env.PICKUP_FEE_PER_KM = process.env.PICKUP_FEE_PER_KM || "50";

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const rolesRes = await pool.query("SELECT id, name FROM roles WHERE name IN ('customer', 'owner')");
  const roleMap = Object.fromEntries(rolesRes.rows.map((r) => [r.name, r.id]));

  const stamp = Date.now();
  const u1 = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id, status)
     VALUES ($1, $2, $3, 'test_hash', $4, 'active') RETURNING id`,
    ["Test Customer One", `talha_test_c1_${stamp}@example.com`, "03001111111", roleMap.customer]
  );
  customer1UserId = u1.rows[0].id;
  createdUserIds.push(customer1UserId);

  const u2 = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id, status)
     VALUES ($1, $2, $3, 'test_hash', $4, 'active') RETURNING id`,
    ["Test Customer Two", `talha_test_c2_${stamp}@example.com`, "03002222222", roleMap.customer]
  );
  customer2UserId = u2.rows[0].id;
  createdUserIds.push(customer2UserId);

  const uOwner = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id, status)
     VALUES ($1, $2, $3, 'test_hash', $4, 'active') RETURNING id`,
    ["Test Workshop Owner", `talha_test_owner_${stamp}@example.com`, "03003333333", roleMap.owner]
  );
  ownerUserId = uOwner.rows[0].id;
  createdUserIds.push(ownerUserId);

  customer1Token = createAccessToken({ id: customer1UserId, role: "customer", token_version: 0 });
  customer2Token = createAccessToken({ id: customer2UserId, role: "customer", token_version: 0 });
  ownerToken = createAccessToken({ id: ownerUserId, role: "owner", token_version: 0 });
});

after(async () => {
  if (createdBookingIds.length > 0) {
    await pool.query("DELETE FROM reminders WHERE booking_id = ANY($1::int[])", [createdBookingIds]);
    await pool.query("DELETE FROM pickup_requests WHERE booking_id = ANY($1::int[])", [createdBookingIds]);
    await pool.query("DELETE FROM service_bookings WHERE booking_id = ANY($1::int[])", [createdBookingIds]);
  }
  if (createdVehicleIds.length > 0) {
    await pool.query("DELETE FROM vehicles WHERE vehicle_id = ANY($1::int[])", [createdVehicleIds]);
  }
  if (createdCustomerIds.length > 0) {
    await pool.query("DELETE FROM customers WHERE customer_id = ANY($1::int[])", [createdCustomerIds]);
  }
  if (createdPackageIds.length > 0) {
    await pool.query("DELETE FROM service_packages WHERE package_id = ANY($1::int[])", [createdPackageIds]);
  }
  if (createdServiceIds.length > 0) {
    await pool.query("DELETE FROM services WHERE service_id = ANY($1::int[])", [createdServiceIds]);
  }
  if (createdBayIds.length > 0) {
    await pool.query("DELETE FROM workshop_bays WHERE bay_id = ANY($1::int[])", [createdBayIds]);
  }
  if (createdUserIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [createdUserIds]);
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

test("1. Swagger API docs endpoint is accessible", async () => {
  const res = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(res.status, 200);
});

test("2. Authentication and validation guard checks", async () => {
  const unauth = await api("/api/customers/me");
  assert.equal(unauth.status, 401);

  const badVehicle = await api("/api/vehicles", {
    method: "POST",
    token: customer1Token,
    body: { make: "", year: 1500 },
  });
  assert.equal(badVehicle.status, 400);
});

test("3. Customer Profile CRUD", async () => {
  const createRes = await api("/api/customers/me", {
    method: "POST",
    token: customer1Token,
    body: { address: "Street 5, F-10", city: "Islamabad" },
  });
  assert.equal(createRes.status, 201);
  createdCustomerIds.push(createRes.body.data.customer_id);

  const dupRes = await api("/api/customers/me", {
    method: "POST",
    token: customer1Token,
    body: { address: "Duplicate", city: "Lahore" },
  });
  assert.equal(dupRes.status, 409);

  const getRes = await api("/api/customers/me", { token: customer1Token });
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.data.city, "Islamabad");

  const patchRes = await api("/api/customers/me", {
    method: "PATCH",
    token: customer1Token,
    body: { city: "Rawalpindi" },
  });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.data.city, "Rawalpindi");

  const c2Res = await api("/api/customers/me", {
    method: "POST",
    token: customer2Token,
    body: { address: "G-11", city: "Islamabad" },
  });
  assert.equal(c2Res.status, 201);
  createdCustomerIds.push(c2Res.body.data.customer_id);
});

test("4. Vehicle CRUD, duplicate plate check, ownership isolation, and soft delete", async () => {
  const plate1 = `TST-${Date.now().toString().slice(-5)}`;
  const v1 = await api("/api/vehicles", {
    method: "POST",
    token: customer1Token,
    body: { make: "Toyota", model: "Corolla", year: 2021, plate_no: plate1, fuel_type: "Petrol", mileage: 25000 },
  });
  assert.equal(v1.status, 201);
  const vehicleId1 = v1.body.data.vehicle_id;
  createdVehicleIds.push(vehicleId1);

  const dupPlate = await api("/api/vehicles", {
    method: "POST",
    token: customer1Token,
    body: { make: "Toyota", model: "Corolla", year: 2021, plate_no: plate1.toLowerCase() },
  });
  assert.equal(dupPlate.status, 409);

  const otherUpdate = await api(`/api/vehicles/${vehicleId1}`, {
    method: "PATCH",
    token: customer2Token,
    body: { mileage: 99999 },
  });
  assert.equal(otherUpdate.status, 404);

  const ownUpdate = await api(`/api/vehicles/${vehicleId1}`, {
    method: "PATCH",
    token: customer1Token,
    body: { mileage: 26500 },
  });
  assert.equal(ownUpdate.status, 200);
  assert.equal(ownUpdate.body.data.mileage, 26500);

  const vTemp = await api("/api/vehicles", {
    method: "POST",
    token: customer1Token,
    body: { make: "Honda", model: "Civic", year: 2020, plate_no: `DEL-${Date.now().toString().slice(-5)}` },
  });
  assert.equal(vTemp.status, 201);
  createdVehicleIds.push(vTemp.body.data.vehicle_id);

  const delRes = await api(`/api/vehicles/${vTemp.body.data.vehicle_id}`, {
    method: "DELETE",
    token: customer1Token,
  });
  assert.equal(delRes.status, 200);
});

test("5. Services, Service Packages, and Workshop Bays", async () => {
  const s1 = await api("/api/services", {
    method: "POST",
    body: { name: `Test Oil Service ${Date.now()}`, description: "Full synthetic", price: 4000, duration: 30 },
  });
  assert.equal(s1.status, 201);
  const serviceId = s1.body.data.service_id;
  createdServiceIds.push(serviceId);

  const pkg = await api("/api/packages", {
    method: "POST",
    body: {
      name: `Test Maintenance Pkg ${Date.now()}`,
      description: "Oil + Inspection",
      price: 6500,
      duration: 60,
      serviceIds: [serviceId],
    },
  });
  assert.equal(pkg.status, 201);
  createdPackageIds.push(pkg.body.data.package_id);

  const bay = await api("/api/bays", {
    method: "POST",
    body: { name: `Test-Bay-${Date.now()}`, description: "Automated test bay" },
  });
  assert.equal(bay.status, 201);
  createdBayIds.push(bay.body.data.bay_id);
});

test("6. Slots, Booking Creation, Maintenance History, Pickup Estimate & Request, Reschedule, Job Card Lock & Cancel", async () => {
  const vehicleId = createdVehicleIds[0];
  const packageId = createdPackageIds[0];

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const yyyy = futureDate.getUTCFullYear();
  const mm = String(futureDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(futureDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const slotsRes = await api(`/api/bookings/available-slots?date=${dateStr}&packageId=${packageId}`, {
    token: customer1Token,
  });
  assert.equal(slotsRes.status, 200);
  assert.ok(Array.isArray(slotsRes.body.data) && slotsRes.body.data.length > 0);

  const chosenSlot = slotsRes.body.data[0].startTime;

  const bookingRes = await api("/api/bookings", {
    method: "POST",
    token: customer1Token,
    body: { vehicleId, packageId, startTime: chosenSlot },
  });
  assert.equal(bookingRes.status, 201);
  const bookingId = bookingRes.body.data.booking_id;
  createdBookingIds.push(bookingId);

  // Verify 24_hours and 2_hours reminders were created
  const remRows = await pool.query("SELECT reminder_type, status FROM reminders WHERE booking_id = $1", [bookingId]);
  assert.equal(remRows.rows.length, 2);

  // Verify active booking prevents vehicle deletion
  const blockedDelete = await api(`/api/vehicles/${vehicleId}`, {
    method: "DELETE",
    token: customer1Token,
  });
  assert.equal(blockedDelete.status, 400);

  // Verify vehicle maintenance history for customer and owner, and blocked for other customer
  const historyOwner = await api(`/api/vehicles/${vehicleId}/history`, { token: customer1Token });
  assert.equal(historyOwner.status, 200);
  assert.equal(historyOwner.body.data.records.length, 1);

  const historyWorkshopOwner = await api(`/api/vehicles/${vehicleId}/history`, { token: ownerToken });
  assert.equal(historyWorkshopOwner.status, 200);

  const historyStranger = await api(`/api/vehicles/${vehicleId}/history`, { token: customer2Token });
  assert.equal(historyStranger.status, 404);

  // Verify pickup fee estimation and pickup creation
  const estRes = await api("/api/pickups/estimate", {
    method: "POST",
    token: customer1Token,
    body: { latitude: 33.7104, longitude: 73.0405 },
  });
  assert.equal(estRes.status, 200);
  assert.ok(estRes.body.data.distance_km > 0);
  assert.ok(estRes.body.data.pickup_fee > 0);

  const pickupRes = await api("/api/pickups", {
    method: "POST",
    token: customer1Token,
    body: { bookingId, address: "F-8 Markaz, Islamabad", latitude: 33.7104, longitude: 73.0405 },
  });
  assert.equal(pickupRes.status, 201);

  // Reschedule booking
  const nextSlot = slotsRes.body.data[1].startTime;
  const reschedRes = await api(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    token: customer1Token,
    body: { startTime: nextSlot },
  });
  assert.equal(reschedRes.status, 200);

  // Lock booking via job_card_created = true and verify modification is blocked
  await pool.query("UPDATE service_bookings SET job_card_created = TRUE WHERE booking_id = $1", [bookingId]);
  const lockedPatch = await api(`/api/bookings/${bookingId}`, {
    method: "PATCH",
    token: customer1Token,
    body: { startTime: chosenSlot },
  });
  assert.equal(lockedPatch.status, 400);

  // Unlock and cancel booking, verify reminders become cancelled
  await pool.query("UPDATE service_bookings SET job_card_created = FALSE WHERE booking_id = $1", [bookingId]);
  const cancelRes = await api(`/api/bookings/${bookingId}`, {
    method: "DELETE",
    token: customer1Token,
  });
  assert.equal(cancelRes.status, 200);

  const remAfterCancel = await pool.query("SELECT status FROM reminders WHERE booking_id = $1", [bookingId]);
  assert.ok(remAfterCancel.rows.every((r) => r.status === "cancelled"));
});

test("7. Reminder Agent detects delayed jobs and unconfirmed bookings", async () => {
  const customerId = createdCustomerIds[0];
  const vehicleId = createdVehicleIds[0];
  const packageId = createdPackageIds[0];
  const bayId = createdBayIds[0];

  // Insert an overdue confirmed booking (delayed job) and an upcoming pending booking (unconfirmed)
  const delayedBooking = await pool.query(
    `INSERT INTO service_bookings (booking_reference, customer_id, vehicle_id, package_id, bay_id, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'confirmed')
     RETURNING booking_id`,
    [`BK-DLY-${Date.now().toString().slice(-4)}`, customerId, vehicleId, packageId, bayId]
  );
  createdBookingIds.push(delayedBooking.rows[0].booking_id);

  const unconfirmedBooking = await pool.query(
    `INSERT INTO service_bookings (booking_reference, customer_id, vehicle_id, package_id, bay_id, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP + INTERVAL '90 minutes', 'pending')
     RETURNING booking_id`,
    [`BK-UNC-${Date.now().toString().slice(-4)}`, customerId, vehicleId, packageId, bayId]
  );
  createdBookingIds.push(unconfirmedBooking.rows[0].booking_id);

  const alertSummary = await scanAndAlertOwnerIssues();
  assert.ok(alertSummary.delayedAlerts >= 1);
  assert.ok(alertSummary.unconfirmedAlerts >= 1);
});