/* ============================================
   PEAKPOINT SAT PREP — Server API client
   Sends authenticated requests to secure backend routes.
   No secret keys are ever stored or sent from this file.
   ============================================ */

window.PP = window.PP || {};

PP.api = (() => {
  async function sessionToken() {
    if (!PP.sb || !PP.sb.auth) return null;
    const { data } = await PP.sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  }

  async function request(path, body = {}, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = await sessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(path, {
      method: options.method || 'POST',
      headers,
      body: options.method === 'GET' ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        unavailable: !!payload.unavailable || response.status === 503,
        error: payload.message || payload.error || 'PeakPoint could not complete that request.'
      };
    }
    return { ok: true, ...payload };
  }

  function health() {
    return fetch('/api/health').then((r) => r.json()).catch(() => ({ ok: false, ai: { available: false } }));
  }

  function tutor(message, context, action) {
    return request('/api/ai/tutor', { message, context, action });
  }

  function explanation(question, selectedAnswer, requestType) {
    return request('/api/ai/explanation', { question, selectedAnswer, requestType });
  }

  function summary(kind, metrics) {
    return request('/api/ai/summary', { kind, metrics });
  }

  function vocabulary(kind, metrics) {
    return request('/api/ai/vocabulary', { kind, metrics });
  }

  function generateQuestions(params) {
    return request('/api/admin/generate-questions', params);
  }

  return { explanation, generateQuestions, health, request, summary, tutor, vocabulary };
})();
