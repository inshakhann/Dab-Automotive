const pool = require("../config/db");
const {
  sendBookingReminder,
  sendOwnerOperationalAlert,
} = require("../integrations/email.service");

const MAX_RETRIES = 3;
let running = false;

async function insertInAppNotificationSafe(client, { userId, title, message, type }) {
  const check = await client.query(
    "SELECT to_regclass('public.notifications') AS table_name"
  );
  if (!check.rows[0]?.table_name) {
    return false;
  }

  await client.query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type || "reminder"]
  );
  return true;
}

async function getActiveOwners(client) {
  const result = await client.query(
    `SELECT u.id, u.full_name, u.email
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'owner' AND u.status = 'active'`
  );
  return result.rows;
}

async function scanAndAlertOwnerIssues() {
  const client = await pool.connect();

  try {
    const owners = await getActiveOwners(client);
    if (owners.length === 0) {
      return { delayedAlerts: 0, unconfirmedAlerts: 0 };
    }

    let delayedAlerts = 0;
    let unconfirmedAlerts = 0;

    // 1. Scan unconfirmed (pending) bookings starting within 2 hours or already past start_time
    const unconfirmedResult = await client.query(
      `SELECT b.booking_id, b.booking_reference, b.start_time,
              p.name AS package_name, v.make, v.model, v.plate_no
       FROM service_bookings b
       JOIN service_packages p ON p.package_id = b.package_id
       JOIN vehicles v ON v.vehicle_id = b.vehicle_id
       WHERE b.status = 'pending'
         AND b.start_time <= CURRENT_TIMESTAMP + INTERVAL '2 hours'`
    );

    for (const booking of unconfirmedResult.rows) {
      const insertCheck = await client.query(
        `INSERT INTO reminders (booking_id, reminder_type, scheduled_at, status, alert_date)
         VALUES ($1, 'unconfirmed_booking', CURRENT_TIMESTAMP, 'pending', CURRENT_DATE)
         ON CONFLICT (booking_id, reminder_type, alert_date) DO NOTHING
         RETURNING reminder_id`,
        [booking.booking_id]
      );

      if (insertCheck.rows.length === 0) continue;

      const reminderId = insertCheck.rows[0].reminder_id;
      const startStr = new Date(booking.start_time).toLocaleString("en-PK", {
        timeZone: "Asia/Karachi",
      });
      const title = `Unconfirmed Booking Alert: ${booking.booking_reference}`;
      const message = `Booking ${booking.booking_reference} for ${booking.make} ${booking.model} (${booking.plate_no}) - ${booking.package_name} scheduled at ${startStr} is still unconfirmed.`;

      try {
        for (const owner of owners) {
          await sendOwnerOperationalAlert({ email: owner.email, title, message });
          await insertInAppNotificationSafe(client, {
            userId: owner.id,
            title,
            message,
            type: "unconfirmed_booking",
          });
        }

        await client.query(
          "UPDATE reminders SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE reminder_id = $1",
          [reminderId]
        );
        unconfirmedAlerts += 1;
      } catch (err) {
        await client.query(
          "UPDATE reminders SET status = 'failed', retry_count = retry_count + 1 WHERE reminder_id = $1",
          [reminderId]
        );
        console.error("Unconfirmed booking alert failed:", err.message);
      }
    }

    // 2. Scan delayed jobs (uses job_cards if merged, otherwise overdue confirmed bookings)
    const jobCardsCheck = await client.query(
      "SELECT to_regclass('public.job_cards') AS table_name"
    );
    const hasJobCardsTable = Boolean(jobCardsCheck.rows[0]?.table_name);

    const delayedQuery = hasJobCardsTable
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

    const delayedResult = await client.query(delayedQuery);

    for (const job of delayedResult.rows) {
      const insertCheck = await client.query(
        `INSERT INTO reminders (booking_id, reminder_type, scheduled_at, status, alert_date)
         VALUES ($1, 'delayed_job', CURRENT_TIMESTAMP, 'pending', CURRENT_DATE)
         ON CONFLICT (booking_id, reminder_type, alert_date) DO NOTHING
         RETURNING reminder_id`,
        [job.booking_id]
      );

      if (insertCheck.rows.length === 0) continue;

      const reminderId = insertCheck.rows[0].reminder_id;
      const dueStr = new Date(job.due_time).toLocaleString("en-PK", {
        timeZone: "Asia/Karachi",
      });
      const title = `Delayed Job Alert: ${job.booking_reference}`;
      const message = `Service job for booking ${job.booking_reference} (${job.make} ${job.model} - ${job.plate_no}, ${job.package_name}) passed its expected completion time (${dueStr}).`;

      try {
        for (const owner of owners) {
          await sendOwnerOperationalAlert({ email: owner.email, title, message });
          await insertInAppNotificationSafe(client, {
            userId: owner.id,
            title,
            message,
            type: "delayed_job",
          });
        }

        await client.query(
          "UPDATE reminders SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE reminder_id = $1",
          [reminderId]
        );
        delayedAlerts += 1;
      } catch (err) {
        await client.query(
          "UPDATE reminders SET status = 'failed', retry_count = retry_count + 1 WHERE reminder_id = $1",
          [reminderId]
        );
        console.error("Delayed job alert failed:", err.message);
      }
    }

    return { delayedAlerts, unconfirmedAlerts };
  } finally {
    client.release();
  }
}

const processDueReminders = async () => {
  if (running) return;
  running = true;

  try {
    while (true) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const result = await client.query(
          `SELECT r.reminder_id, r.reminder_type, r.retry_count,
                  b.booking_reference, b.start_time,
                  u.id AS user_id, u.email, p.name AS package_name,
                  v.make, v.model
           FROM reminders r
           JOIN service_bookings b ON b.booking_id = r.booking_id
           JOIN customers c ON c.customer_id = b.customer_id
           JOIN users u ON u.id = c.user_id
           JOIN service_packages p ON p.package_id = b.package_id
           JOIN vehicles v ON v.vehicle_id = b.vehicle_id
           WHERE r.reminder_type IN ('24_hours', '2_hours')
             AND (
               (r.status = 'pending' AND r.scheduled_at <= CURRENT_TIMESTAMP)
               OR (r.status = 'failed' AND r.retry_count < $1)
             )
             AND b.status IN ('pending', 'confirmed')
           ORDER BY r.scheduled_at
           LIMIT 1
           FOR UPDATE OF r, b SKIP LOCKED`,
          [MAX_RETRIES]
        );

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
            packageName: reminder.package_name,
          });

          const hoursLabel = reminder.reminder_type === "24_hours" ? "24 hours" : "2 hours";
          await insertInAppNotificationSafe(client, {
            userId: reminder.user_id,
            title: `Booking Reminder (${hoursLabel})`,
            message: `Your ${reminder.package_name} booking (${reminder.booking_reference}) for ${reminder.make} ${reminder.model} is coming up in ${hoursLabel}.`,
            type: "booking_reminder",
          });

          await client.query(
            "UPDATE reminders SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE reminder_id = $1",
            [reminder.reminder_id]
          );
        } catch (error) {
          const nextRetry = (reminder.retry_count || 0) + 1;
          await client.query(
            "UPDATE reminders SET status = 'failed', retry_count = $2 WHERE reminder_id = $1",
            [reminder.reminder_id, nextRetry]
          );
          console.error(`Booking reminder failed (attempt ${nextRetry}/${MAX_RETRIES}):`, error.message);
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    await scanAndAlertOwnerIssues();
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

module.exports = {
  startReminderScheduler,
  processDueReminders,
  scanAndAlertOwnerIssues,
};
