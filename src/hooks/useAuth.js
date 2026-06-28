import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(finish, 4000);

    const unsub = onAuthStateChanged(
      auth,
      (next) => {
        setUser(next);
        finish();
      },
      () => finish()
    );

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not configured');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => (auth ? signOut(auth) : Promise.resolve());

  return { user, loading, signInWithGoogle, logout, isAvailable: isFirebaseConfigured && !!auth };
}
