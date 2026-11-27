const agentsService = require("./agents.service");

async function createConversation(req, res, next) {
  try {
    const agentType = req.body.agent_type || "GENERAL";
    const data = await agentsService.startConversation(req.user.id, agentType);
    return res.status(201).json({
      success: true,
      ...data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyConversations(req, res, next) {
  try {
    const conversations = await agentsService.listUserConversations(
      req.user.id
    );
    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    return next(error);
  }
}

async function getConversationDetail(req, res, next) {
  try {
    const data = await agentsService.getConversationMessages(
      req.params.id,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    return next(error);
  }
}

async function postMessage(req, res, next) {
  try {
    const data = await agentsService.sendMessage(
      req.params.id,
      req.user.id,
      req.body.content
    );
    return res.status(201).json({
      success: true,
      ...data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createConversation,
  getMyConversations,
  getConversationDetail,
  postMessage,
};