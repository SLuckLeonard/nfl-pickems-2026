import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase/config.js';

/**
 * Ensures there is always a signed-in Firebase user before the app talks to
 * Firestore. Every device — first visit, returning visit, or a device that
 * adopted another player's ID via "link device" — gets an anonymous auth
 * session. The Firestore security rules require `request.auth != null`, so
 * without this the app would be locked out.
 *
 * @returns {boolean} true once a user is signed in (or sign-in has been kicked off)
 */
export function useAuthReady() {
  const [ready, setReady] = useState(!!auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setReady(true);
      } else {
        // No session yet — start an anonymous one. onAuthStateChanged fires
        // again with the new user, which flips `ready` to true.
        signInAnonymously(auth).catch((err) => {
          console.error('[auth] anonymous sign-in failed:', err);
        });
      }
    });
    return unsub;
  }, []);

  return ready;
}
