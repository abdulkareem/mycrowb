const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.APP_API_KEY = 'test-api-key';
process.env.WHATSAPP_PLATFORM_BASE_URL = 'http://localhost:9999';

function freshClient() {
  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/services/whatsapp-platform.client')];
  return require('../src/services/whatsapp-platform.client');
}

test('validateOutboundMessage normalizes and validates payload', () => {
  const { validateOutboundMessage } = freshClient();
  const payload = validateOutboundMessage({ mobile: '+91 98765 43210', message: '  hello   world ' });
  assert.equal(payload.mobile, '919876543210');
  assert.equal(payload.message, 'hello world');
});

test('sendMessageToPlatform retries transient failure then succeeds', async () => {
  const axios = require('axios');
  let calls = 0;
  const originalPost = axios.post;

  axios.post = async () => {
    calls += 1;
    if (calls < 2) {
      const err = new Error('temporary');
      err.response = { status: 503, data: { message: 'unavailable' } };
      throw err;
    }
    return { status: 200, data: { ok: true } };
  };

  const { sendMessageToPlatform } = freshClient();
  const data = await sendMessageToPlatform({ mobile: '9876543210', message: 'hi', correlationId: 'corr-1' });
  assert.deepEqual(data, { ok: true });
  assert.equal(calls, 2);

  axios.post = originalPost;
});

test('sendMessageToPlatform fails on non-retryable status', async () => {
  const axios = require('axios');
  const originalPost = axios.post;

  axios.post = async () => {
    const err = new Error('bad request');
    err.response = { status: 400, data: { message: 'invalid' } };
    throw err;
  };

  const { sendMessageToPlatform } = freshClient();
  await assert.rejects(
    () => sendMessageToPlatform({ mobile: '9876543210', message: 'hi' }),
    (error) => error.status === 400
  );

  axios.post = originalPost;
});

test('sendMessageToPlatform falls back to fixed endpoint and API key', async () => {
  const axios = require('axios');
  const originalPost = axios.post;
  delete process.env.APP_API_KEY;
  delete process.env.WHATSAPP_PLATFORM_API_KEY;
  delete process.env.WHATSAPP_PLATFORM_BASE_URL;
  delete process.env.WHATSAPP_PLATFORM_API_URL;

  let capturedUrl;
  let capturedConfig;
  axios.post = async (url, _payload, config) => {
    capturedUrl = url;
    capturedConfig = config;
    return { status: 200, data: { ok: true } };
  };

  const { sendMessageToPlatform } = freshClient();
  await sendMessageToPlatform({ mobile: '9876543210', message: 'hi' });

  assert.equal(capturedUrl, 'https://whatsappplatform-production.up.railway.app/api/messages/send');
  assert.equal(capturedConfig.headers['X-API-KEY'], 'fdbf0504626128f64e4ecb27de92c2ed1ab29600a20b02f2');

  axios.post = originalPost;
});
