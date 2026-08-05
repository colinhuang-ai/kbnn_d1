// Bỏ luôn cả nội dung bên trong <script>/<style>, kể cả khi thẻ không được đóng.
const RAW_TEXT_ELEMENT = /<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi;
const HTML_TAG = /<[^>]*>/g;

export function stripTags(value) {
  return value
    .replace(RAW_TEXT_ELEMENT, ' ')
    .replace(HTML_TAG, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildGreetingMessage(user) {
  if (!user || typeof user.name !== 'string') {
    throw new Error('Missing user name');
  }

  const name = stripTags(user.name);

  if (name === '') {
    throw new Error('Missing user name');
  }

  return `Hello ${name} ((:`;
}

export async function renderGreeting(fetchImpl, outputElement) {
  const response = await fetchImpl('api/user.json');

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const user = await response.json();
  outputElement.textContent = buildGreetingMessage(user);
  return outputElement.textContent;
}

export function attachGreeting(documentRef = globalThis.document, fetchImpl = globalThis.fetch) {
  const button = documentRef?.getElementById('greet-btn');

  if (!button) {
    return;
  }

  button.addEventListener('click', async () => {
    const outputElement = documentRef.getElementById('greeting');

    try {
      await renderGreeting(fetchImpl, outputElement);
    } catch (error) {
      outputElement.textContent = `Error: ${error.message}`;
    }
  });
}

if (typeof document !== 'undefined' && typeof fetch !== 'undefined') {
  attachGreeting();
}