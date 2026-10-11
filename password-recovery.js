(() => {
  const form = document.getElementById('recovery-form');
  const status = document.getElementById('recovery-status');
  const submit = document.getElementById('recovery-submit');
  let recovering = false;
  PP.sb.auth.onAuthStateChange((event) => {
    if (event !== 'PASSWORD_RECOVERY') return;
    recovering = true;
    document.getElementById('recovery-title').textContent = 'Choose a new password';
    document.getElementById('recovery-copy').textContent = 'Use at least 8 characters for your new password.';
    document.getElementById('recovery-email-field').hidden = true;
    document.getElementById('recovery-email').required = false;
    document.getElementById('recovery-password-field').hidden = false;
    document.getElementById('recovery-password').required = true;
    submit.textContent = 'Save new password';
  });
  // Do not enable updates merely from an arbitrary ?mode parameter.
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); submit.disabled = true; status.textContent = 'Working…';
    try {
      const result = recovering
        ? await PP.sb.auth.updateUser({ password: document.getElementById('recovery-password').value })
        : await PP.sb.auth.resetPasswordForEmail(document.getElementById('recovery-email').value.trim(), { redirectTo: new URL('reset-password.html', location.href).href });
      if (result.error) throw new Error('Request failed');
      status.textContent = recovering ? 'Password updated. Return to log in.' : 'If this email has an account, a reset link will be sent. Check your inbox.';
      if (recovering) { form.hidden = true; await PP.sb.auth.signOut(); }
    } catch {
      status.textContent = 'Unable to complete the request. Check your connection or request a fresh link and try again.';
    } finally { submit.disabled = false; }
  });
})();
