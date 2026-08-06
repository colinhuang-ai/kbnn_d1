import assert from 'node:assert/strict';
import test from 'node:test';

import { stripTags, buildGreetingMessage, renderGreeting, attachGreeting, initAutoAttach } from '../app.js';

/**
 * Test stripTags function directly for various HTML/script scenarios
 */
test('stripTags removes HTML tags, script/style blocks and extra spaces', () => {
  assert.equal(stripTags('hello <script>alert("xss")</script> world'), 'hello world');
  assert.equal(stripTags('<style>body { color: red; }</style>test'), 'test');
  assert.equal(stripTags('<div><h1>Title</h1><p>Body</p></div>'), 'Title Body');
  assert.equal(stripTags('foo <span>bar</span> baz'), 'foo bar baz');
  assert.equal(stripTags('   multiple    spaces   '), 'multiple spaces');
});

/**
 * Object JS có name là mai, thì chào mai
 */
test('buildGreetingMessage formats the expected greeting', () => {
  assert.equal(buildGreetingMessage({ name: 'mai' }), 'Hello mai ^^');
});

/**
 * Object JS có name chứa HTML/script thì được stripTags và chào
 */
test('buildGreetingMessage strips tags from name', () => {
  assert.equal(buildGreetingMessage({ name: "mai <script>alert 'hhe'</script>" }), 'Hello mai ^^');
});

/**
 * Object JS không hợp lệ (null, undefined, không có name hoặc name không phải string)
 */
test('buildGreetingMessage rejects missing or non-string name', () => {
  assert.throws(() => buildGreetingMessage(null), /Missing user name/);
  assert.throws(() => buildGreetingMessage({}), /Missing user name/);
  assert.throws(() => buildGreetingMessage({ name: 123 }), /Missing user name/);
});

/**
 * Tên chỉ toàn khoảng trắng hoặc HTML tag sau khi stripTags thành chuỗi rỗng
 */
test('buildGreetingMessage rejects name that becomes empty after stripTags', () => {
  assert.throws(() => buildGreetingMessage({ name: '   ' }), /Missing user name/);
  assert.throws(() => buildGreetingMessage({ name: '<script>alert(1)</script>' }), /Missing user name/);
});

/**
 * Mock API trả về là maria --> chào Maria
 */
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

  const result = await renderGreeting(fetchMock, outputElement);

  assert.deepEqual(calls, ['api/user.json']);
  assert.equal(outputElement.textContent, 'Hello maria ^^');
  assert.equal(result, 'Hello maria ^^');
});

/**
 * API không trả về status 200 OK
 */
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

/**
 * attachGreeting khi documentRef không có hoặc không tìm thấy nút greet-btn
 */
test('attachGreeting handles missing document or missing button gracefully', () => {
  // Trường hợp không truyền tham số và globalThis.document chưa định nghĩa
  assert.doesNotThrow(() => attachGreeting());

  // Nút greet-btn không tồn tại
  const mockDocNoBtn = {
    getElementById: (id) => null,
  };
  assert.doesNotThrow(() => attachGreeting(mockDocNoBtn));
});

/**
 * attachGreeting khi nút greet-btn tồn tại: mô phỏng click thành công và click thất bại
 */
test('attachGreeting attaches click handler to greet-btn element', async () => {
  let clickListener;
  const buttonMock = {
    addEventListener: (event, listener) => {
      if (event === 'click') {
        clickListener = listener;
      }
    },
  };

  const outputElement = { textContent: '' };
  const mockDoc = {
    getElementById: (id) => {
      if (id === 'greet-btn') return buttonMock;
      if (id === 'greeting') return outputElement;
      return null;
    },
  };

  const fetchSuccessMock = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ name: 'maria' }),
  });

  attachGreeting(mockDoc, fetchSuccessMock);
  assert.equal(typeof clickListener, 'function');

  // Kích hoạt sự kiện click thành công
  await clickListener();
  assert.equal(outputElement.textContent, 'Hello maria ^^');

  // Kích hoạt sự kiện click bị lỗi
  const fetchErrorMock = async () => ({
    ok: false,
    status: 500,
  });

  attachGreeting(mockDoc, fetchErrorMock);
  await clickListener();
  assert.equal(outputElement.textContent, 'Error: HTTP 500');
});

/**
 * Kiểm tra initAutoAttach khi document và fetch được định nghĩa toàn cục
 */
test('initAutoAttach calls attachGreeting when document and fetch exist', () => {
  const originalDoc = globalThis.document;
  const originalFetch = globalThis.fetch;

  let getElementCalled = false;
  globalThis.document = {
    getElementById: (id) => {
      getElementCalled = true;
      return null;
    },
  };
  globalThis.fetch = async () => {};

  try {
    initAutoAttach();
    assert.equal(getElementCalled, true);
  } finally {
    if (originalDoc === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDoc;
    }
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
  }
});
