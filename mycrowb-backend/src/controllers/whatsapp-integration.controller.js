const crypto = require('crypto');
const { sendMessageToPlatform } = require('../services/whatsapp-platform.client');
const { dispatchWhatsAppCommand, markIfDuplicate } = require('../services/whatsapp-command-router.service');
const { whatsappPlatformWebhookSecret, whatsappPlatformWebhookAllowedIps } = require('../config/env');

function safeMobileForLog(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || '').split(',')[0].trim();

  return firstForwarded || req.ip || req.socket?.remoteAddress || '';
}

function verifyWebhookRequest(req) {
  const secret = String(whatsappPlatformWebhookSecret || '');
  if (!secret) return true;

  const signature = req.get('x-webhook-signature') || req.get('x-signature-256');
  if (signature) {
    const digest = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    const expected = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const digestBuffer = Buffer.from(digest, 'utf8');

    return expectedBuffer.length === digestBuffer.length
      && crypto.timingSafeEqual(expectedBuffer, digestBuffer);
  }

  const incomingToken = req.get('x-webhook-token');
  const sourceIp = getClientIp(req);
  const allowlisted = whatsappPlatformWebhookAllowedIps.length === 0
    || whatsappPlatformWebhookAllowedIps.includes(sourceIp);

  return allowlisted && incomingToken === secret;
}

async function sendViaWhatsappPlatform(req, res, next) {
  try {
    const result = await sendMessageToPlatform({
      mobile: req.body?.mobile,
      message: req.body?.message,
      correlationId: req.correlationId
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

async function receiveWhatsappWebhook(req, res, next) {
  const startedAt = Date.now();

  try {
    if (!verifyWebhookRequest(req)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook authentication.' });
    }

    const payload = req.body || {};
    const messageId = String(payload.messageId || payload.id || payload.trigger?.id || '').trim();
    if (markIfDuplicate(messageId)) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        event: 'whatsapp_webhook_duplicate_ignored',
        correlationId: req.correlationId,
        messageId
      }));

      return res.status(200).json({ success: true, duplicate: true });
    }

    const result = await dispatchWhatsAppCommand(payload);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      event: 'whatsapp_webhook_processed',
      correlationId: req.correlationId,
      durationMs: Date.now() - startedAt,
      command: payload.command || payload.trigger?.command || null,
      keyword: payload.keyword || payload.trigger?.keyword || null,
      mobile: safeMobileForLog(payload.mobile),
      handled: result.handled
    }));

    return res.status(200).json({
      success: true,
      handled: result.handled,
      action: result.action,
      responseMessage: result.responseMessage
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
      event: 'whatsapp_webhook_failed',
      correlationId: req.correlationId,
      durationMs: Date.now() - startedAt,
      reason: error.message
    }));

    return next(error);
  }
}

module.exports = {
  sendViaWhatsappPlatform,
  receiveWhatsappWebhook,
  verifyWebhookRequest
};
