/* ============================================
   PEAKPOINT SAT PREP — Auth (Supabase)
   Identity is handled by Supabase Auth. Per-user study data
   is still kept in this browser for now (keyed by the Supabase
   user id); a later step moves it into the database tables.

   All PP.auth identity methods are ASYNC — callers must await.
   ============================================ */

window.PP = window.PP || {};

PP.auth = (() => {
  const sb = () => PP.sb;

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  async function signup(name, email, password) {
    name = String(name || '').trim();
    email = normalizeEmail(email);
    if (!name) return { ok: false, error: 'Please enter your name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      const msg = /already registered|already exists/i.test(error.message)
        ? 'An account with this email already exists. Try logging in.'
        : error.message;
      return { ok: false, error: msg };
    }
    // If email confirmation is enabled, there is no session yet.
    if (!data.session) {
      return { ok: false, error: 'Almost there — check your email to confirm your account, then log in.', needsConfirm: true };
    }
    return { ok: true };
  }

  async function login(email, password) {
    email = normalizeEmail(email);
    const { error } = await sb().auth.signInWithPassword({ email, password });
    if (error) {
      const msg = /email not confirmed/i.test(error.message)
        ? 'Please confirm your email first — check your inbox.'
        : 'Incorrect email or password.';
      return { ok: false, error: msg };
    }
    return { ok: true };
  }

  async function logout() {
    await sb().auth.signOut();
  }

  // Resolves to { id, email, name } or null.
  async function currentUser() {
    const { data: { session } } = await sb().auth.getSession();
    if (!session || !session.user) return null;
    const u = session.user;
    return {
      id: u.id,
      email: u.email,
      name: (u.user_metadata && u.user_metadata.name) || (u.email ? u.email.split('@')[0] : '')
    };
  }

  // Redirects to login if there is no active session; otherwise resolves to the user.
  async function requireAuth() {
    const user = await currentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  }

  /* ---------- Per-user study data (local for now, keyed by user id) ---------- */

  function dataKey(id) {
    return 'pp_data_' + id;
  }

  function defaultData() {
    return {
      profile: { targetScore: null, testDate: null },
      attempts: [],
      sessions: [],
      snapshots: [],
      days: [],
      diagnosticDone: false,
      xp: 0,
      bestCombo: 0,
      mastery: {},
      badges: []
    };
  }

  function getData(id) {
    try {
      const raw = JSON.parse(localStorage.getItem(dataKey(id)));
      return Object.assign(defaultData(), raw || {});
    } catch {
      return defaultData();
    }
  }

  function saveData(id, data) {
    localStorage.setItem(dataKey(id), JSON.stringify(data));
  }

  function resetData(id) {
    localStorage.removeItem(dataKey(id));
  }

  return { signup, login, logout, currentUser, requireAuth, getData, saveData, resetData };
})();
