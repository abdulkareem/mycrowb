const test = require('node:test');
const assert = require('node:assert/strict');

const { dispatchWhatsAppCommand, markIfDuplicate } = require('../src/services/whatsapp-command-router.service');

test('dispatchWhatsAppCommand handles ping command', async () => {
  const result = await dispatchWhatsAppCommand({ keyword: 'MYCROWB', command: 'PING' });
  assert.equal(result.handled, true);
  assert.equal(result.action, 'ping');
});

test('dispatchWhatsAppCommand returns fallback for unknown command', async () => {
  const result = await dispatchWhatsAppCommand({ keyword: 'MYCROWB', command: 'INVALID' });
  assert.equal(result.handled, false);
  assert.equal(result.action, 'unknown');
});

test('markIfDuplicate reports duplicate IDs', () => {
  assert.equal(markIfDuplicate('msg-1'), false);
  assert.equal(markIfDuplicate('msg-1'), true);
});
