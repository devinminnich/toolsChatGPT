import { useEffect, useRef, useState } from "react";
import type { State } from "../domain/model";
import { applyAdvice, type CoachProposal } from "../domain/plugin";
import type { FitnessPlugin } from "./bridge";
import { catalog } from "../domain/catalog";

export function PluginCoach({ state, runtime, saved, onChange, compact = false }: {
  state: State; runtime: FitnessPlugin; saved: boolean; onChange: (state: State) => Promise<boolean>; compact?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [proposals, setProposals] = useState<CoachProposal[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(!compact);
  const [undo, setUndo] = useState<CoachProposal>();
  const latest = useRef(state); latest.current = state;
  function targetText(proposal: CoachProposal, after = false) {
    const advice = proposal.payload;
    const exercise = state.active?.exercises.find((e) => e.id === advice.exerciseId);
    const target = after ? { ...advice.before, ...advice.after } : advice.before;
    if (!target) return "Target unavailable";
    const unit = state.active?.unit ?? state.profile?.unit ?? "lb";
    return `${exercise?.exercise.loaded ? `${target.weight} ${unit} × ` : ""}${exercise?.exercise.metric === "duration" ? `${target.duration} seconds` : exercise?.exercise.metric === "distance" ? `${target.distance} km` : `${target.reps} reps`}`;
  }
  async function refresh() {
    try { setProposals(await runtime.proposals()); }
    catch (error) { setMessage((error as Error).message); }
  }
  useEffect(() => {
    let alive = true;
    const read = async () => {
      if (document.visibilityState !== "visible") return;
      try { const data = await runtime.proposals(); if (alive) setProposals(data); }
      catch (error) { if (alive) setMessage((error as Error).message); }
    };
    void read();
    const timer = window.setInterval(read, 15000);
    document.addEventListener("visibilitychange", read);
    return () => { alive = false; clearInterval(timer); document.removeEventListener("visibilitychange", read); };
  }, [runtime]);
  async function act(proposal: CoachProposal, apply: boolean) {
    setBusy(true); setMessage("");
    try {
      if (apply) {
        const next = applyAdvice(latest.current, proposal.payload);
        if (!(await onChange(next))) throw new Error("Save failed. Your coach suggestion remains available; retry saving before continuing.");
        if (proposal.payload.kind === "set") setUndo(proposal);
      }
      await runtime.review(proposal.id);
      setProposals((items) => items.filter((p) => p.id !== proposal.id));
      setMessage(apply ? "Coach suggestion applied and saved." : "Coach suggestion dismissed.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="panel plugin-coach" aria-label="AI Coach">
    <div className="coach-bar"><h2>AI Coach</h2>{compact && <button className="quiet" aria-expanded={opened} onClick={() => setOpened(!opened)}>{opened ? "Close AI Coach" : "Ask AI Coach"}</button>}</div>
    {opened && <>
      <p>Your ChatGPT coach can review results, build workouts, and suggest your next set. Changes appear here for you to apply.</p>
      <div className="row">
        {['Plan my next workout', 'Review my progress', 'What should I do next set?'].map((prompt) => <button key={prompt} className="quiet" onClick={() => setQuestion(prompt)}>{prompt}</button>)}
      </div>
      <form onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setMessage("");
        try { await runtime.ask(latest.current, question); setQuestion(""); setMessage("Sent to your ChatGPT coach. The reply will appear in the conversation; refresh coach replies to see the recommendation here."); }
        catch (error) { setMessage((error as Error).message); }
        finally { setBusy(false); }
      }}>
        <label>Ask your AI Coach<textarea value={question} maxLength={2000} onChange={(event) => setQuestion(event.target.value)} placeholder="Make tomorrow’s workout using my latest results." /></label>
        <button className="primary" type="submit" disabled={busy || !saved}>Send to AI Coach</button>
        {!saved && <p role="status">Save your latest changes before asking the coach.</p>}
      </form>
      <button className="quiet" disabled={busy} onClick={() => void refresh()}>Refresh coach replies</button>
      {proposals.length === 0 && <p>No new coach replies yet.</p>}
      {proposals.map((proposal) => <article className="coach-suggestion" key={proposal.id}>
        <h3>{proposal.payload.title}</h3><p className="coach-reply">{proposal.payload.message}</p>
        {proposal.payload.kind === "routine" && <div>
          <h4>{proposal.payload.routine?.name} · {proposal.payload.routine?.date}</h4>
          {proposal.payload.routine?.exercises.map((e, i) => {
            const exercise = [...catalog, ...state.custom].find((item) => item.id === e.exerciseId);
            return <p key={i}>{exercise?.name ?? e.exerciseId}: {e.sets.map((s) => `${s.type} ${exercise?.loaded ? `${s.weight} ${proposal.payload.routine?.unit} × ` : ""}${s.min}–${s.max} ${exercise?.metric === "duration" ? "seconds" : "reps"}`).join("; ")}{e.notes && ` · ${e.notes}`}</p>;
          })}
        </div>}
        {proposal.payload.kind === "set" && <p>Next set: {targetText(proposal)} → {targetText(proposal, true)}</p>}
        <div className="row">{proposal.payload.kind !== "feedback" && <button className="primary" disabled={busy || !saved} onClick={() => void act(proposal, true)}>{proposal.payload.kind === "routine" ? "Add this workout" : "Apply to this set"}</button>}
          <button className="quiet" disabled={busy} onClick={() => void act(proposal, false)}>{proposal.payload.kind === "feedback" ? "Mark read" : "Dismiss"}</button></div>
      </article>)}
      {undo && <button className="quiet" disabled={busy || !saved} onClick={async () => {
        setBusy(true);
        try {
          const p = undo.payload;
          const before = { ...p.before!, ...p.after };
          const next = applyAdvice(latest.current, { ...p, before, after: p.before });
          if (await onChange(next)) { setUndo(undefined); setMessage("Set adjustment undone."); }
        } catch (error) { setMessage((error as Error).message); }
        finally { setBusy(false); }
      }}>Undo last AI set adjustment</button>}
      {message && <p role="status">{message}</p>}
    </>}
  </section>;
}
