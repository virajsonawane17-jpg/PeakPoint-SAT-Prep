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

  /* ---------- Per-user study data (Supabase) ----------
     The game logic works on one in-memory `data` object with the shape
     below. We load it once per page (loadData), let the synchronous game
     code mutate it, then persist changes back (saveData):
       - profile aggregates (xp, mastery, badges, target…) -> profiles row
       - attempts / sessions / snapshots -> append-only rows
     `days` is derived from attempt timestamps, so it isn't stored. */

  function todayKey(d) {
    const dt = d || new Date();
    return dt.getFullYear() + '-' +
      String(dt.getMonth() + 1).padStart(2, '0') + '-' +
      String(dt.getDate()).padStart(2, '0');
  }

  function emptyData() {
    return {
      profile: { targetScore: null, testDate: null },
      attempts: [], sessions: [], snapshots: [], days: [],
      diagnosticDone: false, xp: 0, bestCombo: 0, mastery: {}, badges: []
    };
  }

  async function loadData(userId) {
    const sb = PP.sb;
    const ms = (ts) => (ts ? new Date(ts).getTime() : Date.now());

    const [prof, att, ses, snap] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
      sb.from('attempts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      sb.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      sb.from('snapshots').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    ]);

    const data = emptyData();
    const p = prof && prof.data;
    if (p) {
      data.profile.targetScore = p.target_score ?? null;
      data.profile.testDate = p.test_date ?? null;
      data.xp = p.xp ?? 0;
      data.bestCombo = p.best_combo ?? 0;
      data.diagnosticDone = !!p.diagnostic_done;
      data.mastery = p.mastery || {};
      data.badges = p.badges || [];
    }
    data.attempts = (att.data || []).map((r) => ({
      qid: r.qid, skill: r.skill, section: r.section,
      difficulty: r.difficulty, correct: r.correct, t: ms(r.created_at)
    }));
    data.sessions = (ses.data || []).map((r) => ({
      type: r.type, skill: r.skill, total: r.total, correct: r.correct, t: ms(r.created_at)
    }));
    data.snapshots = (snap.data || []).map((r) => ({ t: ms(r.created_at), math: r.math, rw: r.rw }));
    data.days = Array.from(new Set(data.attempts.map((a) => todayKey(new Date(a.t)))));

    // Bookkeeping for append-only persistence + save serialization.
    data._persisted = { attempts: data.attempts.length, sessions: data.sessions.length, snapshots: data.snapshots.length };
    data._chain = Promise.resolve();
    return data;
  }

  async function persist(userId, data) {
    const sb = PP.sb;

    // 1. Profile aggregates (insert if missing, update otherwise).
    await sb.from('profiles').upsert({
      id: userId,
      target_score: data.profile ? (data.profile.targetScore ?? null) : null,
      test_date: data.profile ? (data.profile.testDate ?? null) : null,
      xp: data.xp ?? 0,
      best_combo: data.bestCombo ?? 0,
      diagnostic_done: !!data.diagnosticDone,
      mastery: data.mastery ?? {},
      badges: data.badges ?? []
    }, { onConflict: 'id' });

    // 2. New event rows only (append-only; advance counters on success).
    const p = data._persisted || { attempts: 0, sessions: 0, snapshots: 0 };

    const newAttempts = data.attempts.slice(p.attempts);
    if (newAttempts.length) {
      const { error } = await sb.from('attempts').insert(newAttempts.map((a) => ({
        user_id: userId, qid: a.qid, skill: a.skill, section: a.section,
        difficulty: a.difficulty == null ? null : String(a.difficulty),
        correct: !!a.correct, created_at: new Date(a.t).toISOString()
      })));
      if (!error) p.attempts = data.attempts.length;
    }

    const newSessions = data.sessions.slice(p.sessions);
    if (newSessions.length) {
      const { error } = await sb.from('sessions').insert(newSessions.map((s) => ({
        user_id: userId, type: s.type, skill: s.skill ?? null,
        total: s.total ?? 0, correct: s.correct ?? 0, created_at: new Date(s.t).toISOString()
      })));
      if (!error) p.sessions = data.sessions.length;
    }

    const newSnaps = data.snapshots.slice(p.snapshots);
    if (newSnaps.length) {
      const { error } = await sb.from('snapshots').insert(newSnaps.map((s) => ({
        user_id: userId, math: s.math, rw: s.rw, created_at: new Date(s.t).toISOString()
      })));
      if (!error) p.snapshots = data.snapshots.length;
    }
  }

  // Serialize saves on the data object so rapid answers can't double-insert.
  function saveData(userId, data) {
    data._chain = (data._chain || Promise.resolve())
      .then(() => persist(userId, data))
      .catch((e) => console.error('[PeakPoint] save failed', e));
    return data._chain;
  }

  return { signup, login, logout, currentUser, requireAuth, loadData, saveData };
})();
