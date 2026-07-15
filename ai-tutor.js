/* ============================================
   PEAKPOINT SAT PREP — AI tutor widget
   Uses secure server routes and degrades gracefully.
   ============================================ */

window.PP = window.PP || {};

PP.tutor = (() => {
  const quickBefore = [
    ['Hint', 'Give me a hint'],
    ['Concept', 'Explain the concept'],
    ['Guide', 'Ask me a guiding question']
  ];
  const quickAfter = [
    ['Mistake', 'Explain my mistake'],
    ['Faster', 'How can I solve this faster?'],
    ['Simple', 'Explain more simply'],
    ['Desmos', 'Show the Desmos method'],
    ['Example', 'Give me a similar example']
  ];

  function mount(container, getContext, options = {}) {
    if (!container) return null;
    container.classList.add('ai-tutor');
    container.innerHTML = `
      <div class="ai-tutor-head">
        <div>
          <span class="ai-kicker">PeakPoint AI</span>
          <h3>AI Tutor</h3>
        </div>
        <span class="ai-status" data-ai-status>Checking...</span>
      </div>
      <div class="ai-messages" data-ai-messages>
        <div class="ai-message ai-message-bot">Ask for a hint, a simpler explanation, or a faster method. I will not reveal answers before you submit.</div>
      </div>
      <div class="ai-quick" data-ai-quick></div>
      <form class="ai-form" data-ai-form>
        <input data-ai-input type="text" autocomplete="off" placeholder="Ask PeakPoint AI..." />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>`;

    const status = container.querySelector('[data-ai-status]');
    const messages = container.querySelector('[data-ai-messages]');
    const quick = container.querySelector('[data-ai-quick]');
    const form = container.querySelector('[data-ai-form]');
    const input = container.querySelector('[data-ai-input]');

    function addMessage(role, text) {
      const div = document.createElement('div');
      div.className = `ai-message ai-message-${role}`;
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      if (options.onMessage) options.onMessage(role, text);
    }

    function renderQuick() {
      const context = getContext ? getContext() : {};
      const items = context && context.submitted ? quickAfter : quickBefore;
      quick.innerHTML = '';
      for (const [label, prompt] of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ai-chip';
        button.textContent = label;
        button.addEventListener('click', () => ask(prompt, label));
        quick.appendChild(button);
      }
    }

    async function ask(message, action) {
      const text = String(message || input.value || '').trim();
      if (!text) return;
      input.value = '';
      addMessage('user', text);
      status.textContent = 'Thinking...';
      const result = await PP.api.tutor(text, getContext ? getContext() : {}, action || text);
      if (!result.ok) {
        addMessage('bot', result.error || 'PeakPoint AI is unavailable right now. You can keep practicing without it.');
        status.textContent = result.unavailable ? 'Unavailable' : 'Retry';
        return;
      }
      addMessage('bot', result.text || 'I am here, but I did not receive a useful response. Try asking another way.');
      status.textContent = 'Ready';
    }

    PP.api.health().then((health) => {
      status.textContent = health?.ai?.available ? 'Ready' : 'Unavailable';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      ask(input.value);
    });

    renderQuick();
    return { ask, addMessage, renderQuick };
  }

  return { mount };
})();
