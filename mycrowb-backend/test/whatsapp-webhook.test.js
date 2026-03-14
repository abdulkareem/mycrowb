const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.WHATSAPP_PLATFORM_WEBHOOK_SECRET = 'webhook-secret';
process.env.WHATSAPP_PLATFORM_WEBHOOK_ALLOWED_IPS = '1.2.3.4';

function freshController() {
  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/controllers/whatsapp-integration.controller')];
  return require('../src/controllers/whatsapp-integration.controller');
}

function makeReq(body, headers = {}, ip = '1.2.3.4') {
  return {
    body,
    ip,
    socket: { remoteAddress: ip },
    headers,
    get(name) {
      return headers[name.toLowerCase()];
    }
  };
}

test('verifyWebhookRequest accepts valid signature header', () => {
  const { verifyWebhookRequest } = freshController();
  const body = { mobile: '919876543210', message: 'hi' };
  const digest = crypto.createHmac('sha256', 'webhook-secret').update(JSON.stringify(body)).digest('hex');
  const req = makeReq(body, { 'x-webhook-signature': `sha256=${digest}` }, '9.9.9.9');
  assert.equal(verifyWebhookRequest(req), true);
});

test('verifyWebhookRequest accepts allowlisted ip with token', () => {
  const { verifyWebhookRequest } = freshController();
  const req = makeReq({ keyword: 'MYCROWB' }, { 'x-webhook-token': 'webhook-secret' }, '1.2.3.4');
  assert.equal(verifyWebhookRequest(req), true);
});

test('verifyWebhookRequest rejects invalid token', () => {
  const { verifyWebhookRequest } = freshController();
  const req = makeReq({ keyword: 'MYCROWB' }, { 'x-webhook-token': 'wrong' }, '1.2.3.4');
  assert.equal(verifyWebhookRequest(req), false);
});
