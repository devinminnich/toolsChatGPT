import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { State } from "./domain/model";
import { cloud, completedHistory, mergeHistory, syncHistory } from "./data/cloud";
import { coachServerUrl } from "./data/cloudConfig";
import { recoveryCredentials } from "./data/recovery";

type AuthorizationDetails = Extract<
  NonNullable<Awaited<ReturnType<typeof cloud.auth.oauth.getAuthorizationDetails>>["data"]>,
  { authorization_id: string }
>;

export function CloudSync({ state, visible, saveReady, onChange }: {
  state: State; visible: boolean; saveReady: boolean; onChange: (fn: (current: State) => State) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [recovery, setRecovery] = useState(() => new URLSearchParams(location.hash.slice(1)).get("type") === "recovery" || sessionStorage.getItem("fitness-password-recovery") === "1");
  const [resetLink, setResetLink] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState("Sign in to sync completed workouts.");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [authDetails, setAuthDetails] = useState<AuthorizationDetails>();
  const [grantCount, setGrantCount] = useState(0);
  const authId = new URLSearchParams(location.search).get("authorization_id");
  const latest = useRef(state);
  latest.current = state;
  const change = useRef(onChange);
  change.current = onChange;
  const currentUser = useRef(user);
  currentUser.current = user;
  const running = useRef(false);
  const ownerMatches = !state.cloudOwnerId || state.cloudOwnerId === user?.id;

  useEffect(() => {
    let alive = true;
    cloud.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      if (error || (!data.session && sessionStorage.getItem("fitness-password-recovery") === "1")) {
        setRecovery(false); setResetOpen(true);
        sessionStorage.removeItem("fitness-password-recovery");
        setMessage(error?.message ?? "Your reset session expired. Request a new reset email below.");
      }
    });
    const { data } = cloud.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        sessionStorage.setItem("fitness-password-recovery", "1");
      }
      if (event === "SIGNED_OUT") {
        setRecovery(false);
        sessionStorage.removeItem("fitness-password-recovery");
      }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || recovery) return;
    let alive = true;
    cloud.from("fitness_coach_grants").select("client_id", { count: "exact" })
      .then(({ count }) => { if (alive) setGrantCount(count ?? 0); });
    if (authId) cloud.auth.oauth.getAuthorizationDetails(authId).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setMessage(error.message); return; }
      if (!data) return;
      if ("authorization_id" in data) setAuthDetails(data);
      else window.location.assign(data.redirect_url);
    });
    return () => { alive = false; };
  }, [user?.id, authId, attempt, recovery]);

  useEffect(() => {
    const retry = () => setAttempt((n) => n + 1);
    const focus = () => { if (document.visibilityState === "visible") retry(); };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", focus);
    const timer = window.setInterval(retry, 60000);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", focus);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!user || recovery || !state.cloudSyncEnabled || !ownerMatches || !saveReady) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      if (running.current) return;
      running.current = true;
      setSyncStatus("Syncing completed workouts…");
      const source = latest.current.history;
      try {
        const remote = await syncHistory(user.id, source);
        if (!alive || currentUser.current?.id !== user.id || !latest.current.cloudSyncEnabled) return;
        change.current((current) => {
          const merged = mergeHistory(current.history, remote);
          return merged.length === current.history.length ? current : { ...current, history: merged };
        });
        setSyncStatus(`${remote.length} completed workout${remote.length === 1 ? "" : "s"} synced. Your coach can read these after connecting.`);
      } catch (error) {
        if (alive) setSyncStatus(`Saved on this device. Cloud sync will retry: ${(error as Error).message}`);
      } finally {
        running.current = false;
        if (currentUser.current?.id === user.id && latest.current.history !== source) setAttempt((n) => n + 1);
      }
    }, 800);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [user?.id, state.history, state.cloudSyncEnabled, ownerMatches, saveReady, attempt, recovery]);

  async function sendReset() {
    setBusy(true); setMessage("");
    try {
      const { error } = await cloud.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      setMessage("Password reset requested. Check your email. You can copy the reset link and paste it below without opening it.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function openResetLink() {
    setBusy(true); setMessage("");
    try {
      const credentials = recoveryCredentials(resetLink);
      setRecovery(true);
      const result = credentials.kind === "hash"
        ? await cloud.auth.verifyOtp({ token_hash: credentials.token_hash, type: "recovery" })
        : await cloud.auth.setSession({ access_token: credentials.access_token, refresh_token: credentials.refresh_token });
      if (result.error) throw result.error;
      sessionStorage.setItem("fitness-password-recovery", "1");
      setResetLink(""); setPassword(""); setConfirmPassword("");
    } catch (error) { setRecovery(false); setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function savePassword() {
    if (password !== confirmPassword) { setMessage("The passwords do not match."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await cloud.auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirmPassword(""); setRecovery(false); setResetOpen(false);
      sessionStorage.removeItem("fitness-password-recovery");
      setMessage("Password updated. You are signed in.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function signIn(create: boolean) {
    setBusy(true); setMessage("");
    try {
      const result = create
        ? await cloud.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
        : await cloud.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setPassword("");
      setMessage(create && !result.data.session ? "Check your email to confirm the account, then sign in here." : "Signed in. Enable syncing below to upload this device’s completed workouts.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function decide(approve: boolean) {
    if (!authId || !authDetails || !user) return;
    setBusy(true); setMessage("");
    try {
      if (approve) {
        const { error } = await cloud.from("fitness_coach_grants").upsert({
          user_id: user.id, client_id: authDetails.client.id,
        });
        if (error) throw error;
      }
      const { data, error } = approve
        ? await cloud.auth.oauth.approveAuthorization(authId)
        : await cloud.auth.oauth.denyAuthorization(authId);
      if (error) throw error;
      if (data) window.location.assign(data.redirect_url);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="panel cloud-sync" hidden={!visible && !authId && !recovery} aria-label="Cloud sync and coach connection">
      <span className="eyebrow">PRIVATE WORKOUT HISTORY</span>
      <h2>{authId ? "Connect your workout coach" : "Cloud sync & ChatGPT coach"}</h2>
      <p>Sync completed workout results across your devices and let your ChatGPT coach read them. Saved routines and in-progress sessions stay on this device.</p>
      {recovery ? (
        <form onSubmit={(event) => { event.preventDefault(); void savePassword(); }}>
          <h3>Choose a new password</h3>
          <label>New password<input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
          <button className="primary" disabled={busy || !user} type="submit">Save new password</button>
        </form>
      ) : !user ? (
        <form onSubmit={(event) => { event.preventDefault(); void signIn(false); }}>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <div className="row">
            <button className="primary" type="submit" disabled={busy}>Sign in</button>
            <button type="button" className="quiet" disabled={busy || !email || password.length < 6} onClick={() => void signIn(true)}>Create account</button>
            <button type="button" className="quiet" disabled={busy} onClick={() => { setResetOpen(true); setMessage(""); }}>Forgot password</button>
          </div>
          <p>Use your Fitness Coach account. Your Supabase dashboard login is a separate account.</p>
        </form>
      ) : (
        <>
          <p>Signed in as {user.email}</p>
          {!ownerMatches ? <p role="alert">This browser’s history belongs to a different account. Sign in to that account or use a separate browser for this account.</p> : (
            <>
              <label className="checkbox"><input type="checkbox" checked={!!state.cloudSyncEnabled} onChange={(e) => {
                const enabled = e.target.checked;
                onChange((current) => ({ ...current, cloudSyncEnabled: enabled, cloudOwnerId: enabled ? user.id : current.cloudOwnerId }));
              }} />Sync my completed workouts automatically</label>
              <p>Enabling sync uploads {completedHistory(state.history).length} existing completed workouts and future results to your private account.</p>
              <p role="status">{state.cloudSyncEnabled ? syncStatus : "Cloud sync is paused. Previously synced results remain available to your authorized coach."}</p>
              {state.cloudSyncEnabled && <button className="quiet" disabled={busy} onClick={() => setAttempt((n) => n + 1)}>Sync now</button>}
            </>
          )}
          <button className="quiet" disabled={busy} onClick={async () => {
            const { error } = await cloud.auth.signOut({ scope: "local" });
            if (error) setMessage(error.message);
          }}>Sign out</button>
          {authDetails && (
            <div className="coach-suggestion">
              <h3>Authorize {authDetails.client.name}</h3>
              <p>This connection can read your completed workout results, including weights, reps, timed holds and difficulty. It cannot change workouts or access your renovation workspace.</p>
              <p>Return destination: {authDetails.redirect_uri}</p>
              <div className="row"><button className="primary" disabled={busy || !ownerMatches} onClick={() => void decide(true)}>Allow read-only coach access</button><button className="quiet" disabled={busy} onClick={() => void decide(false)}>Deny</button></div>
            </div>
          )}
          <h3>Connect in ChatGPT</h3>
          <p>Add a custom MCP server named Fitness Coach in ChatGPT Plugins, choose OAuth, and use this server URL:</p>
          <input aria-label="Coach server URL" readOnly value={coachServerUrl} onFocus={(e) => e.target.select()} />
          <p>Then authorize this account and select Fitness Coach in your coaching project.</p>
          <p>{grantCount} authorized coach connection{grantCount === 1 ? "" : "s"}.</p>
          {grantCount > 0 && <button className="quiet" disabled={busy} onClick={async () => {
            setBusy(true);
            const { data: grants } = await cloud.from("fitness_coach_grants").select("client_id").eq("user_id", user.id);
            const { error } = await cloud.from("fitness_coach_grants").delete().eq("user_id", user.id);
            if (error) setMessage(error.message);
            else {
              for (const grant of grants ?? []) await cloud.auth.oauth.revokeGrant({ clientId: grant.client_id });
              setGrantCount(0); setMessage("Coach access revoked. Existing coach tokens can no longer read your workouts.");
            }
            setBusy(false);
          }}>Revoke all coach access</button>}
        </>
      )}
      {resetOpen && !recovery && <div>
        <h3>Reset your password</h3>
        <form onSubmit={(event) => { event.preventDefault(); void sendReset(); }}>
          <label>Reset email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="quiet" type="submit" disabled={busy}>Send reset email</button>
        </form>
        <p>On iPhone, press and hold the Reset password link in your email and choose Copy Link. Paste it here. If you already opened it and saw localhost, copy the full Safari address instead.</p>
        <form onSubmit={(event) => { event.preventDefault(); void openResetLink(); }}>
          <label>Password reset link<input type="password" autoComplete="off" required value={resetLink} onChange={(e) => setResetLink(e.target.value)} /></label>
          <button className="primary" type="submit" disabled={busy}>Continue to new password</button>
        </form>
      </div>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
