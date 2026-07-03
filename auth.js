/* ============================================
   PEAKPOINT SAT PREP — Client-side auth + storage
   NOTE: This is a front-end prototype. Accounts live in
   this browser's localStorage. Before a public launch,
   swap this layer for a real backend (see README.md).
   ============================================ */

window.PP = window.PP || {};

PP.auth = (() => {
  const USERS_KEY = 'pp_users';
  const SESSION_KEY = 'pp_session';

  // djb2 — obfuscation only, not real security (prototype)
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    }
    return 'h' + h.toString(36);
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch { return {}; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function signup(name, email, password) {
    email = normalizeEmail(email);
    name = String(name || '').trim();
    if (!name) return { ok: false, error: 'Please enter your name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    const users = getUsers();
    if (users[email]) return { ok: false, error: 'An account with this email already exists. Try logging in.' };

    users[email] = { name, pw: hash(password), created: Date.now() };
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true };
  }

  function login(email, password) {
    email = normalizeEmail(email);
    const users = getUsers();
    const user = users[email];
    if (!user || user.pw !== hash(password)) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    localStorage.setItem(SESSION_KEY, email);
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    const email = localStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const user = getUsers()[email];
    if (!user) return null;
    return { email, name: user.name, created: user.created };
  }

  // Redirects to login if there is no active session.
  function requireAuth() {
    const user = currentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  }

  /* ---------- Per-user study data ---------- */

  function dataKey(email) {
    return 'pp_data_' + email;
  }

  function defaultData() {
    return {
      profile: { targetScore: null, testDate: null },
      attempts: [],        // { qid, skill, section, difficulty, correct, t }
      sessions: [],        // { type: 'diagnostic'|'adaptive'|'skill'|'sprint', skill, total, correct, t }
      snapshots: [],       // { t, math, rw }
      days: [],            // 'YYYY-MM-DD' strings with any activity
      diagnosticDone: false,
      xp: 0,               // lifetime experience points
      bestCombo: 0,        // longest correct-answer streak in a session
      mastery: {},         // { skillId: 0-100 }
      badges: []           // earned badge ids
    };
  }

  function getData(email) {
    try {
      const raw = JSON.parse(localStorage.getItem(dataKey(email)));
      return Object.assign(defaultData(), raw || {});
    } catch {
      return defaultData();
    }
  }

  function saveData(email, data) {
    localStorage.setItem(dataKey(email), JSON.stringify(data));
  }

  function resetData(email) {
    localStorage.removeItem(dataKey(email));
  }

  return { signup, login, logout, currentUser, requireAuth, getData, saveData, resetData };
})();
