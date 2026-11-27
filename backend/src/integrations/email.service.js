const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const mailMode = process.env.MAIL_MODE;

if (!["test", "smtp"].includes(mailMode)) {
  throw new Error("Set MAIL_MODE to test or smtp in .env.");
}

if (mailMode === "test" && process.env.NODE_ENV === "production") {
  throw new Error("Test email mode cannot be used in production.");
}

let mailerPromise;

async function buildMailer() {
  if (mailMode === "test") {
    const account = await nodemailer.createTestAccount();

    const transport = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      requireTLS: !account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    return {
      transport,
      from: account.user,
    };
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
  } = process.env;

  const port = Number(SMTP_PORT);

  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !MAIL_FROM ||
    ![465, 587].includes(port)
  ) {
    throw new Error("SMTP configuration is missing or invalid.");
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return {
    transport,
    from: MAIL_FROM,
  };
}

async function getMailer() {
  if (!mailerPromise) {
    mailerPromise = buildMailer().catch((error) => {
      mailerPromise = undefined;
      throw error;
    });
  }

  return mailerPromise;
}

async function sendPasswordResetOtp(email, otp) {
  const { transport, from } = await getMailer();

  const info = await transport.sendMail({
    from: {
      name: "Dab Automotive",
      address: from,
    },
    to: email,
    subject: "Your Dab Automotive password-reset code",
    text: [
      "You requested a password reset for Dab Automotive.",
      "",
      `Your OTP is: ${otp}`,
      "",
      "This code expires 10 minutes after it was requested.",
      "It can be used once.",
      "If you did not request this, ignore this email.",
    ].join("\n"),
  });

  if (!info.accepted || info.accepted.length === 0) {
    throw new Error("The email server did not accept the message.");
  }

  if (mailMode === "test") {
    console.log("Open this test email:", nodemailer.getTestMessageUrl(info));
  }
}

async function sendStaffDecisionEmail(user) {
  const { transport, from } = await getMailer();
  const approved = user.status === "active";

  const info = await transport.sendMail({
    from: {
      name: "Dab Automotive",
      address: from,
    },
    to: user.email,
    subject: "Your Dab Automotive staff account request",
    text: approved
      ? `Your staff account has been approved as ${user.role}. You can now log in with your registered email and password.`
      : "Your staff account request has been rejected. Contact the workshop administrator for more information.",
  });

  if (!info.accepted || info.accepted.length === 0) {
    throw new Error("The email server did not accept the message.");
  }

  if (mailMode === "test") {
    console.log("Open staff decision test email:", nodemailer.getTestMessageUrl(info));
  }
}

async function sendBookingReminder(reminder) {
  const { transport, from } = await getMailer();
  const hours = reminder.reminderType === "24_hours" ? "24 hours" : "2 hours";
  const start = new Date(reminder.startTime).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const workshopAddress =
    process.env.WORKSHOP_ADDRESS || "Plot 42, Auto Market, Sector I-9/3, Islamabad";
  const workshopMapUrl =
    process.env.WORKSHOP_MAP_URL || "https://maps.google.com/?q=Islamabad";
  const workshopHelpline =
    process.env.WORKSHOP_HELPLINE || "+92-51-111-322-288";

  const logoPath = path.join(__dirname, "../assets/logo.png");
  const hasLogoFile = fs.existsSync(logoPath);

  const attachments = hasLogoFile
    ? [
        {
          filename: "dab-automotive-logo.png",
          path: logoPath,
          cid: "dablogo",
        },
      ]
    : [];

  const logoHtml = hasLogoFile
    ? `<img src="cid:dablogo" alt="Dab Automotive" style="max-height:60px; width:auto; display:block; margin:0 auto 8px auto;" />`
    : `<div style="display:inline-block; background:#e11d48; color:#ffffff; font-weight:800; font-size:20px; padding:10px 18px; border-radius:8px; letter-spacing:1px;">DAB AUTOMOTIVE</div>`;

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif; background-color:#f3f4f6; padding:24px; color:#1f2937;">
    <div style="max-width:580px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- Header with Logo -->
      <div style="background:#0f172a; padding:24px; text-align:center; border-bottom:4px solid #e11d48;">
        ${logoHtml}
        <p style="color:#94a3b8; margin:6px 0 0 0; font-size:13px;">Smart Garage Management &amp; Automotive Care</p>
      </div>

      <!-- Body -->
      <div style="padding:28px 24px;">
        <span style="display:inline-block; background:#fef2f2; color:#dc2626; font-weight:600; font-size:12px; padding:4px 12px; border-radius:999px; margin-bottom:12px;">
          Service Reminder &bull; ${hours} remaining
        </span>
        <h2 style="margin:0 0 10px 0; font-size:20px; color:#111827;">Upcoming Vehicle Service Appointment</h2>
        <p style="margin:0 0 20px 0; font-size:14px; color:#4b5563; line-height:1.5;">
          Assalam-o-Alaikum, this is a friendly reminder that your vehicle service at <strong>Dab Automotive</strong> is scheduled in <strong>${hours}</strong>.
        </p>

        <!-- Booking Details Table -->
        <table style="width:100%; border-collapse:collapse; background:#f8fafc; border-radius:8px; overflow:hidden; margin-bottom:22px; font-size:14px;">
          <tr>
            <td style="padding:12px 16px; color:#64748b; border-bottom:1px solid #e2e8f0; width:40%;">Booking Reference</td>
            <td style="padding:12px 16px; font-weight:700; color:#0f172a; border-bottom:1px solid #e2e8f0;">${reminder.bookingReference}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px; color:#64748b; border-bottom:1px solid #e2e8f0;">Vehicle</td>
            <td style="padding:12px 16px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${reminder.make} ${reminder.model}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px; color:#64748b; border-bottom:1px solid #e2e8f0;">Service Package</td>
            <td style="padding:12px 16px; font-weight:600; color:#0f172a; border-bottom:1px solid #e2e8f0;">${reminder.packageName}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px; color:#64748b;">Appointment Time</td>
            <td style="padding:12px 16px; font-weight:700; color:#e11d48;">${start}</td>
          </tr>
        </table>

        <!-- Location & Helpline Box -->
        <div style="background:#f1f5f9; border-left:4px solid #0f172a; padding:16px; border-radius:6px; font-size:13px; line-height:1.6;">
          <p style="margin:0 0 8px 0;">
            <strong>Workshop Location:</strong><br/>
            ${workshopAddress} &mdash; <a href="${workshopMapUrl}" style="color:#2563eb; text-decoration:none; font-weight:600;">Open in Google Maps</a>
          </p>
          <p style="margin:0;">
            <strong>24/7 Helpline &amp; Support:</strong><br/>
            <a href="tel:${workshopHelpline}" style="color:#0f172a; font-weight:700; text-decoration:none;">${workshopHelpline}</a>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc; padding:16px 24px; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">
        Need to reschedule or request vehicle pickup? Contact our helpline or visit your Dab Automotive dashboard.
      </div>
    </div>
  </div>`;

  const info = await transport.sendMail({
    from: { name: "Dab Automotive", address: from },
    to: reminder.email,
    subject: `Reminder: ${reminder.make} ${reminder.model} Service in ${hours} (${reminder.bookingReference})`,
    text: [
      "DAB AUTOMOTIVE - BOOKING REMINDER",
      "",
      `Booking Reference: ${reminder.bookingReference}`,
      `Vehicle: ${reminder.make} ${reminder.model}`,
      `Service Package: ${reminder.packageName}`,
      `Appointment Time: ${start} (${hours} remaining)`,
      "",
      `Workshop Location: ${workshopAddress}`,
      `Google Maps: ${workshopMapUrl}`,
      `Helpline: ${workshopHelpline}`,
    ].join("\n"),
    html,
    attachments,
  });

  if (!info.accepted || info.accepted.length === 0) {
    throw new Error("The email server did not accept the reminder.");
  }

  if (mailMode === "test") {
    console.log("Open booking reminder test email:", nodemailer.getTestMessageUrl(info));
  }
}

async function sendOwnerOperationalAlert(alert) {
  const { transport, from } = await getMailer();

  const info = await transport.sendMail({
    from: { name: "Dab Automotive Reminder Agent", address: from },
    to: alert.email,
    subject: alert.title,
    text: alert.message,
  });

  if (!info.accepted || info.accepted.length === 0) {
    throw new Error("The email server did not accept the operational alert.");
  }

  if (mailMode === "test") {
    console.log("Open owner alert test email:", nodemailer.getTestMessageUrl(info));
  }
}

module.exports = {
  sendPasswordResetOtp,
  sendStaffDecisionEmail,
  sendBookingReminder,
  sendOwnerOperationalAlert,
};
