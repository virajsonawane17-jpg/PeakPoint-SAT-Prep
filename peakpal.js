/* ============================================
   PEAKPOINT SAT PREP — PeakPal UI
   ============================================ */

(async () => {
  if (window.PP && PP.auth) {
    const user = await PP.auth.requireAuth();
    if (!user) return;
  }

  const form = document.getElementById('peakpal-form');
  const input = document.getElementById('peakpal-input');
  const conversation = document.getElementById('conversation-panel');
  const emptyCopy = document.getElementById('chat-empty-copy');
  const newChatButton = document.getElementById('new-chat-button');

  if (!form || !input || !conversation) return;

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }

  function addMessage(text, role) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    conversation.appendChild(row);
    if (emptyCopy) emptyCopy.textContent = 'Current chat';
    conversation.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  function askPeakPal(text) {
    const value = String(text || '').trim();
    if (!value) return;
    addMessage(value, 'user');
    addMessage('PeakPal is ready for this conversation UI. Full AI responses will be connected when the tutoring backend is added.', 'assistant');
  }

  input.addEventListener('input', resizeInput);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    askPeakPal(input.value);
    input.value = '';
    resizeInput();
  });

  document.querySelectorAll('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.prompt || '';
      resizeInput();
      input.focus();
    });
  });

  if (newChatButton) {
    newChatButton.addEventListener('click', () => {
      conversation.innerHTML = '';
      input.value = '';
      resizeInput();
      if (emptyCopy) emptyCopy.textContent = 'No chats yet.';
      input.focus();
    });
  }

  resizeInput();
})();
