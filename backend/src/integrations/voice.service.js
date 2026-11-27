function formatE164Pakistan(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  }
  return `+${digits}`;
}

async function sendBookingVoiceCallReminder(reminder) {
  if (process.env.VOICE_CALL_ENABLED !== "true") {
    return { skipped: true, reason: "VOICE_CALL_ENABLED is not true" };
  }

  const apiKey = process.env.BLAND_API_KEY;
  if (!apiKey) {
    throw new Error("BLAND_API_KEY missing in .env");
  }

  const phoneNumber = formatE164Pakistan(reminder.phone);
  if (!phoneNumber) {
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
  const workshopHelpline =
    process.env.WORKSHOP_HELPLINE || "+92-51-111-322-288";

  const firstSentence = `Assalam-o-Alaikum ${reminder.fullName || "Valued Customer"}. This is an automated service reminder call from Dab Automotive. Your ${reminder.make} ${reminder.model} is scheduled for ${reminder.packageName} in ${hours}, on ${start}.`;

  const task = `You are a polite, concise voice reminder assistant for Dab Automotive. Deliver the appointment reminder for booking reference ${reminder.bookingReference} (${reminder.make} ${reminder.model}, ${reminder.packageName} at ${start}). Workshop location is ${workshopAddress} and helpline is ${workshopHelpline}. Remind the customer to arrive 10 minutes early, answer any quick question if asked, then say "Thank you for choosing Dab Automotive, Allah Hafiz!" and end the call immediately.`;

  const response = await fetch("https://api.bland.ai/v1/calls", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      task,
      first_sentence: firstSentence,
      wait_for_greeting: true,
      max_duration: 1,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.status === "error") {
    throw new Error(data.message || JSON.stringify(data));
  }

  return { called: true, to: phoneNumber, callId: data.call_id };
}

module.exports = {
  sendBookingVoiceCallReminder,
};
