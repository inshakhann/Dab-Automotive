const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client;
let isReady = false;

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function formatWhatsAppId(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  }
  return `${digits}@c.us`;
}

function initWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== "true") {
    console.log("WhatsApp reminders disabled (set WHATSAPP_ENABLED=true in .env to enable)");
    return;
  }

  if (client) return;

  const executablePath = findBrowserExecutable();
  console.log("Initializing WhatsApp client...", executablePath ? `Using ${executablePath}` : "Using bundled Chromium");

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    webVersionCache: { type: "none" },
    authTimeoutMs: 120000,
    qrMaxRetries: 5,
    puppeteer: {
      headless: true,
      executablePath,
      timeout: 120000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });

  client.on("qr", (qr) => {
    console.log("\n=== SCAN THIS WHATSAPP QR CODE FOR DAB AUTOMOTIVE ===");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated! Loading chats...");
  });

  client.on("ready", () => {
    isReady = true;
    console.log("WhatsApp Reminder Client is READY!");
  });

  client.on("auth_failure", (msg) => {
    isReady = false;
    console.error("WhatsApp auth failure:", msg);
  });

  client.on("disconnected", (reason) => {
    isReady = false;
    console.warn("WhatsApp client disconnected:", reason);
  });

  client.initialize().catch((err) => {
    console.error("WhatsApp init error:", err.message);
  });
}

async function sendBookingWhatsAppReminder(reminder) {
  if (process.env.WHATSAPP_ENABLED !== "true") {
    return { skipped: true, reason: "WHATSAPP_ENABLED is not true" };
  }

  if (!isReady || !client) {
    throw new Error("WhatsApp client is not ready yet (scan QR code first).");
  }

  const chatId = formatWhatsAppId(reminder.phone);
  if (!chatId) {
    throw new Error("Customer phone number is missing.");
  }

  const hours = reminder.reminderType === "24_hours" ? "24 hours" : "2 hours";
  const start = new Date(reminder.startTime).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const workshopAddress =
    process.env.WORKSHOP_ADDRESS || "Plot 42, Auto Market, Sector I-9/3, Islamabad";
  const workshopMapUrl =
    process.env.WORKSHOP_MAP_URL || "https://maps.google.com/?q=33.6626,73.0487";
  const workshopHelpline =
    process.env.WORKSHOP_HELPLINE || "+92-51-111-322-288";

  const message = [
    `*Dab Automotive - Service Appointment Reminder*`,
    ``,
    `Assalam-o-Alaikum *${reminder.fullName || "Valued Customer"}*,`,
    `This is a reminder that your vehicle service is scheduled in *${hours}*.`,
    ``,
    `*Booking Details:*`,
    `• *Reference:* ${reminder.bookingReference}`,
    `• *Vehicle:* ${reminder.make} ${reminder.model}`,
    `• *Service Package:* ${reminder.packageName}`,
    `• *Date & Time:* ${start}`,
    ``,
    `*Workshop Location:*`,
    `${workshopAddress}`,
    `Google Maps: ${workshopMapUrl}`,
    ``,
    `*24/7 Helpline:* ${workshopHelpline}`,
    ``,
    `_Please arrive 10 minutes before your scheduled slot. Thank you for choosing Dab Automotive!_`,
  ].join("\n");

  await client.sendMessage(chatId, message);
  return { sent: true, to: chatId };
}

module.exports = {
  initWhatsApp,
  sendBookingWhatsAppReminder,
};
