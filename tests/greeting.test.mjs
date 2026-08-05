import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGreetingMessage, renderGreeting } from '../app.js';

test('buildGreetingMessage formats the expected greeting', () => {
  assert.equal(buildGreetingMessage({ name: 'mai' }), 'Hello mai!');
});

test('buildGreetingMessage rejects a missing name', () => {
  assert.throws(() => buildGreetingMessage({}), /Missing user name/);
});

test('renderGreeting uses a mocked fetch response', async () => {
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(url);

    return {
      ok: true,
      status: 200,
      json: async () => ({ name: 'maria' }),
    };
  };

  const outputElement = { textContent: '' };

  await renderGreeting(fetchMock, outputElement);

  assert.deepEqual(calls, ['api/user.json']);
  assert.equal(outputElement.textContent, 'Hello maria ^^');
});

test('renderGreeting surfaces non-OK responses', async () => {
  const outputElement = { textContent: '' };

  await assert.rejects(
    () =>
      renderGreeting(async () => ({
        ok: false,
        status: 503,
        json: async () => ({ name: 'ignored' }),
      }), outputElement),
    /HTTP 503/
  );

  assert.equal(outputElement.textContent, '');
});