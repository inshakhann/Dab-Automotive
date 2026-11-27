const pool = require("../../config/db");
const { createNotification } = require("../notifications/notifications.service");

function generateAgentReply(agentType, message, currentState) {
  const lower = message.toLowerCase();
  const nextState = { ...(currentState || {}) };

  if (agentType === "BOOKING") {
    if (!nextState.serviceType) {
      if (lower.includes("oil")) nextState.serviceType = "Oil & Filter Change";
      else if (lower.includes("brake")) nextState.serviceType = "Brake Inspection & Pad Replacement";
      else if (lower.includes("ac") || lower.includes("cool")) nextState.serviceType = "AC Diagnostics & Recharge";
      else if (lower.includes("engine") || lower.includes("tune")) nextState.serviceType = "Full Engine Diagnostics";
    }

    if (!nextState.preferredDate) {
      const dateMatch = message.match(/\b(\d{4}-\d{2}-\d{2}|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      if (dateMatch) nextState.preferredDate = dateMatch[0];
    }

    if (!nextState.vehicleModel && (lower.includes("civic") || lower.includes("corolla") || lower.includes("city") || lower.includes("alto") || lower.includes("sportage") || lower.includes("car"))) {
      nextState.vehicleModel = message.trim().slice(0, 60);
    }

    if (!nextState.serviceType) {
      return {
        reply: "Welcome to Dab Automotive Booking Assistant! Which service do you need (e.g., Oil Change, Brake Service, AC Diagnostics, or Engine Tune-Up)?",
        state: nextState,
        completed: false,
      };
    }

    if (!nextState.preferredDate) {
      return {
        reply: `Got it — **${nextState.serviceType}**. What date would you like to book your workshop visit (e.g., tomorrow or YYYY-MM-DD)?`,
        state: nextState,
        completed: false,
      };
    }

    if (!nextState.confirmed && (lower.includes("confirm") || lower.includes("yes") || lower.includes("book"))) {
      nextState.confirmed = true;
      return {
        reply: `Your **${nextState.serviceType}** request for **${nextState.preferredDate}** has been logged! Our workshop coordinator will confirm your bay slot shortly.`,
        state: nextState,
        completed: true,
      };
    }

    return {
      reply: `I have **${nextState.serviceType}** scheduled for **${nextState.preferredDate}**. Reply **confirm** to submit this booking request.`,
      state: nextState,
      completed: false,
    };
  }

  // GENERAL automotive advisor agent
  if (lower.includes("hour") || lower.includes("open") || lower.includes("time")) {
    return {
      reply: "Dab Automotive is open Monday through Saturday from 9:00 AM to 7:00 PM.",
      state: nextState,
      completed: false,
    };
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("quote")) {
    return {
      reply: "Standard oil changes start at PKR 4,500, brake pad replacements from PKR 6,000, and full OBD-II computer diagnostics at PKR 2,500. Would you like to start a BOOKING conversation?",
      state: nextState,
      completed: false,
    };
  }

  if (lower.includes("brake") || lower.includes("noise") || lower.includes("squeak") || lower.includes("vibration")) {
    return {
      reply: "Squeaking or vibration while braking usually indicates worn brake pads or warped rotors. We recommend a 20-minute brake inspection before long highway drives.",
      state: nextState,
      completed: false,
    };
  }

  return {
    reply: "I am the Dab Automotive AI Assistant. Ask me about workshop hours, service pricing, vehicle symptoms, or switch to the BOOKING agent to schedule an appointment.",
    state: nextState,
    completed: false,
  };
}

async function startConversation(userId, agentType) {
  const welcomeText =
    agentType === "BOOKING"
      ? "Hello! I am your Dab Automotive Booking Assistant. What service does your vehicle need today?"
      : "Hello! I am the Dab Automotive AI Support Agent. How can I help with your vehicle or spare parts today?";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const convRes = await client.query(
      `INSERT INTO agent_conversations (user_id, agent_type, state)
       VALUES ($1, $2, '{}'::jsonb)
       RETURNING id, user_id, agent_type, state, created_at, updated_at`,
      [userId, agentType]
    );
    const conversation = convRes.rows[0];

    const msgRes = await client.query(
      `INSERT INTO agent_messages (conversation_id, sender, content, metadata)
       VALUES ($1, 'AGENT', $2, '{}'::jsonb)
       RETURNING id, sender, content, metadata, created_at`,
      [conversation.id, welcomeText]
    );

    await client.query("COMMIT");

    return {
      conversation,
      messages: [msgRes.rows[0]],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listUserConversations(userId) {
  const result = await pool.query(
    `SELECT id, agent_type, state, created_at, updated_at
     FROM agent_conversations
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

async function getConversationMessages(conversationId, userId) {
  const convRes = await pool.query(
    `SELECT id, user_id, agent_type, state, created_at, updated_at
     FROM agent_conversations
     WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (convRes.rowCount === 0) {
    const err = new Error("Conversation not found");
    err.status = 404;
    throw err;
  }

  const msgsRes = await pool.query(
    `SELECT id, sender, content, metadata, created_at
     FROM agent_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC, id ASC`,
    [conversationId]
  );

  return {
    conversation: convRes.rows[0],
    messages: msgsRes.rows,
  };
}

async function sendMessage(conversationId, userId, content) {
  const convRes = await pool.query(
    `SELECT id, user_id, agent_type, state
     FROM agent_conversations
     WHERE id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (convRes.rowCount === 0) {
    const err = new Error("Conversation not found");
    err.status = 404;
    throw err;
  }

  const conv = convRes.rows[0];
  const { reply, state, completed } = generateAgentReply(
    conv.agent_type,
    content,
    conv.state
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userMsgRes = await client.query(
      `INSERT INTO agent_messages (conversation_id, sender, content, metadata)
       VALUES ($1, 'USER', $2, '{}'::jsonb)
       RETURNING id, sender, content, metadata, created_at`,
      [conversationId, content]
    );

    const agentMsgRes = await client.query(
      `INSERT INTO agent_messages (conversation_id, sender, content, metadata)
       VALUES ($1, 'AGENT', $2, $3::jsonb)
       RETURNING id, sender, content, metadata, created_at`,
      [conversationId, reply, JSON.stringify({ completed })]
    );

    const updatedConvRes = await client.query(
      `UPDATE agent_conversations
       SET state = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, user_id, agent_type, state, created_at, updated_at`,
      [conversationId, JSON.stringify(state)]
    );

    await client.query("COMMIT");

    if (completed) {
      await createNotification({
        userId,
        type: "BOOKING_AGENT",
        title: "AI Booking Request Logged",
        message: `Your ${state.serviceType} request for ${state.preferredDate} has been recorded.`,
      });
    }

    return {
      conversation: updatedConvRes.rows[0],
      userMessage: userMsgRes.rows[0],
      agentMessage: agentMsgRes.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  startConversation,
  listUserConversations,
  getConversationMessages,
  sendMessage,
};