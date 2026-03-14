const handledMessageIds = new Map();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

function cleanupHandledIds() {
  const now = Date.now();
  for (const [messageId, processedAt] of handledMessageIds.entries()) {
    if ((now - processedAt) > IDEMPOTENCY_TTL_MS) {
      handledMessageIds.delete(messageId);
    }
  }
}

function markIfDuplicate(messageId) {
  if (!messageId) return false;
  cleanupHandledIds();
  if (handledMessageIds.has(messageId)) return true;
  handledMessageIds.set(messageId, Date.now());
  return false;
}

async function dispatchWhatsAppCommand(payload = {}) {
  const keyword = String(payload.keyword || payload.trigger?.keyword || '').trim().toLowerCase();
  const command = String(payload.command || payload.trigger?.command || '').trim().toLowerCase();

  if (keyword === 'mycrowb' && command === 'ping') {
    return {
      handled: true,
      action: 'ping',
      responseMessage: 'pong'
    };
  }

  if (keyword === 'mycrowb' && command === 'help') {
    return {
      handled: true,
      action: 'help',
      responseMessage: 'Available commands: ping, help'
    };
  }

  return {
    handled: false,
    action: 'unknown',
    responseMessage: 'Unknown command. Send MYCROWB HELP for supported commands.'
  };
}

module.exports = {
  dispatchWhatsAppCommand,
  markIfDuplicate
};
