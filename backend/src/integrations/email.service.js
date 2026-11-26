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
    console.log(
      "Open this test email:",
      nodemailer.getTestMessageUrl(info)
    );
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
    console.log(
      "Open staff decision test email:",
      nodemailer.getTestMessageUrl(info)
    );
  }
}

async function sendBookingReminder(reminder) {
  const { transport, from } = await getMailer();
  const hours = reminder.reminderType === "24_hours" ? "24 hours" : "2 hours";
  const start = new Date(reminder.startTime).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi"
  });

  const info = await transport.sendMail({
    from: { name: "Dab Automotive", address: from },
    to: reminder.email,
    subject: "Upcoming Dab Automotive booking reminder",
    text: [
      "This is a reminder for your upcoming vehicle service booking.",
      "",
      `Booking reference: ${reminder.bookingReference}`,
      `Service package: ${reminder.packageName}`,
      `Vehicle: ${reminder.make} ${reminder.model}`,
      `Booking time: ${start}`,
      `Reminder: ${hours} before your booking`
    ].join("\n")
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
