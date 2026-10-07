import { useState } from "react";
import type { Profile, Session } from "./domain/model";
import { applyCoachUpdate, coachContext, suggestNextSet } from "./domain/coach";
export function SessionCoach({
  session,
  profile,
  onChange,
  embedded = false,
}: {
  session: Session;
  profile: Profile;
  onChange: (fn: (s: Session) => Session) => void;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [question, setQuestion] = useState(""),
    [copied, setCopied] = useState("");
  const latest = session.coachFeedback;
  const applied = latest ? session.coachUpdates?.[latest.setId] : undefined;
  const result = latest
    ? suggestNextSet(
        session,
        latest.exerciseId,
        latest.setId,
        profile.goal,
        session.coachIncrement ?? (session.unit === "lb" ? 2.5 : 1),
      )
    : undefined;
  return (
    <div className="session-coach">
      <div className="coach-bar">
        <button
          className="quiet"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="coach-panel"
        >
          {open ? "Close coach" : embedded ? "Next-set guidance" : "Coach & chat"}
        </button>
        <span>
          {result
            ? latest?.applied
              ? applied
                ? `Next: ${applied.weight} ${session.unit} × ${applied.reps}`
                : "Next set updated."
              : result.suggestion
                ? "Next-set suggestion ready."
                : result.message
            : "Choose set difficulty for coaching."}
        </span>
      </div>
      <label className="coach-mode checkbox">
        <input
          type="checkbox"
          checked={!!session.coachAuto}
          onChange={(event) =>
            onChange((s) => ({ ...s, coachAuto: event.target.checked }))
          }
        />
        Auto-adjust next set
      </label>
      {open && (
        <section
          id="coach-panel"
          className="coach-panel"
          aria-label="Workout coach"
        >
          <h3>Your workout coach</h3>
          <p>
            {embedded ? "Instant next-set suggestions use your logged difficulty. For personalized advice and workout plans, ask AI Coach." : <>ChatGPT coaches you in our conversation. This app offers local
            next-set suggestions and copies the context to bring there.
            </>}
          </p>
          <label>
            Available weight increment ({session.unit})
            <input
              type="number"
              min={0.01}
              step="any"
              value={
                session.coachIncrement ?? (session.unit === "lb" ? 2.5 : 1)
              }
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value > 0)
                  onChange((s) => ({
                    ...s,
                    coachIncrement: value,
                    coachFeedback: s.coachFeedback
                      ? { ...s.coachFeedback, applied: false }
                      : undefined,
                  }));
              }}
            />
          </label>
          {result && (
            <div className="coach-suggestion" role="status">
              <p>
                {latest?.applied
                  ? applied
                    ? `Updated next set to ${applied.weight} ${session.unit} × ${applied.reps} after ${applied.difficulty}. ${applied.reason}`
                    : "Suggestion applied to the next unfinished working set."
                  : result.message}
              </p>
              {result.suggestion && !latest?.applied && (
                <>
                  <p>
                    Next set: {result.suggestion.before.weight} {session.unit} ×{" "}
                    {result.suggestion.before.reps} →{" "}
                    {result.suggestion.after.weight} {session.unit} ×{" "}
                    {result.suggestion.after.reps}
                  </p>
                  <button
                    onClick={() =>
                      onChange((s) => applyCoachUpdate(s, result.suggestion!))
                    }
                  >
                    Apply to next set
                  </button>
                </>
              )}
            </div>
          )}
          {!embedded && <><label>
            Question for your coach
            <textarea
              value={question}
              maxLength={2000}
              onChange={(e) => {
                setQuestion(e.target.value);
                setCopied("");
              }}
              placeholder="That set felt easy. What should I do next?"
            />
          </label>
          <button
            className="quiet"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  coachContext(session, profile, question),
                );
                setCopied(
                  "Copied. Paste it into our ChatGPT conversation for coaching.",
                );
              } catch {
                setCopied(
                  "Copy unavailable. Select the context below and copy it manually.",
                );
              }
            }}
          >
            Copy question + workout for ChatGPT
          </button>
          {copied && <p role="status">{copied}</p>}
          <details>
            <summary>Workout context to share</summary>
            <textarea
              aria-label="Workout context for ChatGPT"
              readOnly
              value={coachContext(session, profile, question)}
            />
          </details>
          </>}
        </section>
      )}
    </div>
  );
}
