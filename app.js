export function buildGreetingMessage(user) {
  if (!user || typeof user.name !== 'string' || user.name.trim() === '') {
    throw new Error('Missing user name');
  }

  return `Hello ${user.name}!`;
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