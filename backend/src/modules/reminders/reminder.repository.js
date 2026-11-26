const pool = require("../../config/db");

const getClient = () => pool.connect();

const getActiveOwners = async (client) => {
  const result = await client.query(
    `SELECT u.id, u.full_name, u.email
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'owner' AND u.status = 'active'`
  );
  return result.rows;
};

const findUnconfirmedUpcomingBookings = async (client) => {
  const result = await client.query(
    `SELECT b.booking_id, b.booking_reference, b.start_time,
            p.name AS package_name, v.make, v.model, v.plate_no
     FROM service_bookings b
     JOIN service_packages p ON p.package_id = b.package_id
     JOIN vehicles v ON v.vehicle_id = b.vehicle_id
     WHERE b.status = 'pending'
       AND b.start_time <= CURRENT_TIMESTAMP + INTERVAL '2 hours'`
  );
  return result.rows;
};

const findDelayedJobs = async (client) => {
  const jobCardsCheck = await client.query("SELECT to_regclass('public.job_cards') AS table_name");
  const hasJobCardsTable = Boolean(jobCardsCheck.rows[0]?.table_name);

  const query = hasJobCardsTable
    ? `SELECT b.booking_id, b.booking_reference, jc.deadline AS due_time,
              p.name AS package_name, v.make, v.model, v.plate_no
       FROM job_cards jc
       JOIN service_bookings b ON b.booking_id = jc.booking_id
       JOIN service_packages p ON p.package_id = b.package_id
       JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE jc.status NOT IN ('Completed', 'Archived', 'Cancelled', 'completed', 'cancelled')
         AND jc.deadline IS NOT NULL
         AND jc.deadline < CURRENT_TIMESTAMP`
    : `SELECT b.booking_id, b.booking_reference, b.end_time AS due_time,
              p.name AS package_name, v.make, v.model, v.plate_no
       FROM service_bookings b
       JOIN service_packages p ON p.package_id = b.package_id
       JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE b.status = 'confirmed'
         AND b.end_time < CURRENT_TIMESTAMP`;

  const result = await client.query(query);
  return result.rows;
};

module.exports = {
  getClient,
  getActiveOwners,
  findUnconfirmedUpcomingBookings,
  findDelayedJobs,
};