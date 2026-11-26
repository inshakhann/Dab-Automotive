
const pool = require("../config/db");
const { sendBookingReminder } = require("../integrations/email.service");

let running = false;

const processDueReminders = async () => {
  if (running) return;
  running = true;

  try {
    while (true) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const result = await client.query(`
          SELECT r.reminder_id, r.reminder_type,
                 b.booking_reference, b.start_time,
                 u.email, p.name AS package_name,
                 v.make, v.model
          FROM reminders r
          JOIN service_bookings b ON b.booking_id = r.booking_id
          JOIN customers c ON c.customer_id = b.customer_id
          JOIN users u ON u.id = c.user_id
          JOIN service_packages p ON p.package_id = b.package_id
          JOIN vehicles v ON v.vehicle_id = b.vehicle_id
          WHERE r.status = 'pending'
            AND r.scheduled_at <= CURRENT_TIMESTAMP
            AND b.status IN ('pending', 'confirmed')
          ORDER BY r.scheduled_at
          LIMIT 1
          FOR UPDATE OF r, b SKIP LOCKED
        `);

        if (result.rows.length === 0) {
          await client.query("COMMIT");
          break;
        }

        const reminder = result.rows[0];

        try {
          await sendBookingReminder({
            ...reminder,
            reminderType: reminder.reminder_type,
            bookingReference: reminder.booking_reference,
            startTime: reminder.start_time,
            packageName: reminder.package_name
          });

          await client.query(
            "UPDATE reminders SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE reminder_id = $1",
            [reminder.reminder_id]
          );
        } catch (error) {
          await client.query(
            "UPDATE reminders SET status = 'failed' WHERE reminder_id = $1",
            [reminder.reminder_id]
          );
          console.error("Booking reminder failed:", error.message);
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error("Reminder scheduler error:", error.message);
  } finally {
    running = false;
  }
};

const startReminderScheduler = () => {
  processDueReminders();
  setInterval(processDueReminders, 60000);
  console.log("Booking reminder scheduler started");
};

module.exports = { startReminderScheduler, processDueReminders };
