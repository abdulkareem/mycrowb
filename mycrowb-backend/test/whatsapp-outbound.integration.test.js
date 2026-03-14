const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.APP_API_KEY = 'integration-key';
process.env.WHATSAPP_PLATFORM_SEND_PATH = '/api/messages/send';

function freshClient() {
  delete require.cache[require.resolve('../src/config/env')];
  delete require.cache[require.resolve('../src/services/whatsapp-platform.client')];
  return require('../src/services/whatsapp-platform.client');
}

test('sendMessageToPlatform posts to mocked platform API', async () => {
  let receivedHeaders;
  let receivedBody;

  const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/messages/send') {
      res.statusCode = 404;
      res.end();
      return;
    }

    receivedHeaders = req.headers;
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      receivedBody = JSON.parse(data);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ messageId: 'platform-1', queued: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  process.env.WHATSAPP_PLATFORM_BASE_URL = `http://127.0.0.1:${port}`;

  const { sendMessageToPlatform } = freshClient();
  const result = await sendMessageToPlatform({
    mobile: '9876543210',
    message: 'Integration Test',
    correlationId: 'itest-1'
  });

  assert.deepEqual(result, { messageId: 'platform-1', queued: true });
  assert.equal(receivedHeaders['x-api-key'], 'integration-key');
  assert.equal(receivedBody.mobile, '919876543210');
  assert.equal(receivedBody.message, 'Integration Test');

  await new Promise((resolve) => server.close(resolve));
});
