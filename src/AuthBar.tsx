import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { workspacePersistence } from './lib/persistence';
import { isSupabaseConfigured, supabase } from './lib/supabase';

export default function AuthBar() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void workspacePersistence.sync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void workspacePersistence.sync();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim() || !online) return;
    setBusy(true);
    setMessage('');
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).href;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    setMessage(error ? error.message : 'Check your email for the sign-in link.');
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setMessage('Signed out. Local projects remain on this device.');
  }

  if (!online) {
    return <div className="auth-bar auth-local auth-offline"><span>Offline</span><span>Changes are stored on this device and will sync after reconnecting.</span></div>;
  }

  if (!isSupabaseConfigured) {
    return <div className="auth-bar auth-local"><span>Local mode</span><span>Cloud sync is ready but not configured.</span></div>;
  }

  if (user) {
    return (
      <div className="auth-bar">
        <span><strong>Cloud sync:</strong> {user.email}</span>
        <button type="button" disabled={busy} onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <form className="auth-bar auth-form" onSubmit={sendMagicLink}>
      <label><span>Cloud sync</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email sign-in link'}</button>
      {message && <span className="auth-message">{message}</span>}
    </form>
  );
}
