export function formatAuthError(err) {
  const code = err?.code || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com';

  if (code === 'auth/unauthorized-domain') {
    return `Domain not authorized. Add "${hostname}" in Firebase Console → Authentication → Settings → Authorized domains, then retry.`;
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in cancelled. Please try again.';
  }
  return err?.message || 'Sign in failed';
}
