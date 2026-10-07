import { useEffect, useRef, useState } from "react";
import { catalog, equipmentOptions, muscles } from "./domain/catalog";
import {
  workoutInUnits,
  deleteWorkout,
  changeSetType,
  returnToWorkouts,
  resumeSession,
  completeSet,
  emptyState,
  id,
  prescription,
  previousSet,
  searchExercises,
  startSession,
  volume,
  type Exercise,
  type Profile,
  setTypes,
  type PlannedSet,
  type Session,
  type State,
  type Workout,
} from "./domain/model";
import { importFromHash, importSharedPlan } from "./domain/importRoutine";
import { recordDifficulty } from "./domain/coach";
import { SessionCoach } from "./SessionCoach";
import { RoutineSets } from "./RoutineSets";
import { ExcelImport } from "./ExcelImport";
import { CloudSync } from "./CloudSync";
import {
  decodeWorkoutImport,
  importWorkout,
  workoutToken,
} from "./domain/importWorkout";
import { load, save } from "./data/storage";
import type { FitnessPlugin } from "./plugin/bridge";
import { PluginCoach } from "./plugin/PluginCoach";
import { validatePluginState } from "./domain/plugin";

type Tab = "Today" | "Train" | "History" | "Settings" | "AI Coach";
const defaultProfile: Profile = {
  name: "",
  goal: "General fitness",
  unit: "lb",
  involvement: "Coach",
  autonomy: "Suggest only",
  equipment: [],
};
const icons: Record<Tab, string> = {
  Today: "◉",
  Train: "▥",
  History: "↗",
  Settings: "⚙",
  "AI Coach": "✦",
};
export function App({ plugin }: { plugin?: FitnessPlugin } = {}) {
  const storage = plugin ?? { load, save };
  const savedLabel = plugin ? "Saved to your account" : "Saved on this device";
  const tabs = (Object.keys(icons) as Tab[]).filter((t) => plugin || t !== "AI Coach");
  const [state, setState] = useState<State>(emptyState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importLink, setImportLink] = useState("");
  const [status, setStatus] = useState("Loading");
  const [tab, setTab] = useState<Tab>("Today");
  const [editing, setEditingState] = useState<Workout>();
  const [detail, setDetail] = useState<Exercise>();
  const [custom, setCustom] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const confirmResolver = useRef<((value: boolean) => void) | undefined>(undefined);
  function confirmAction(message: string): Promise<boolean> {
    if (!plugin) return Promise.resolve(window.confirm(message));
    return new Promise((resolve) => { confirmResolver.current = resolve; setConfirmText(message); });
  }
  function resolveConfirmation(value: boolean) {
    confirmResolver.current?.(value); confirmResolver.current = undefined; setConfirmText("");
  }
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [available, setAvailable] = useState(false);
  const [now, setNow] = useState(Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockLayout, setDockLayout] = useState({
    left: 0,
    width: 0,
    height: 0,
  });
  useEffect(() => {
    if (!ready || tab !== "Today" || !state.active) return;
    const main = mainRef.current,
      dock = dockRef.current;
    if (!main || !dock) return;
    const measure = () => {
      const bounds = main.getBoundingClientRect();
      const css = getComputedStyle(main);
      const left = parseFloat(css.paddingLeft),
        right = parseFloat(css.paddingRight);
      setDockLayout({
        left: bounds.left + left,
        width: bounds.width - left - right,
        height: dock.getBoundingClientRect().height,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    observer.observe(dock);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ready, tab, !!state.active]);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const queue = useRef(Promise.resolve());
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    let alive = true;
    storage.load()
      .then(async (s) => {
        if (alive) {
          try {
            const available = [...catalog, ...s.custom];
            const plan = new URLSearchParams(location.search).get("plan");
            if (plan && location.hash)
              throw new Error("Open one import link at a time.");
            const imported = plan
              ? await importSharedPlan(s, plan, available)
              : importFromHash(s, location.hash, available);
            if (!alive) return;
            if (imported) {
              await storage.save(imported.next);
              if (!alive) return;
              setNotice(imported.notice);
              s = imported.next;
              window.history.replaceState(
                null,
                "",
                (() => {
                  const params = new URLSearchParams(location.search);
                  params.delete("plan");
                  return location.pathname + (params.size ? `?${params}` : "");
                })(),
              );
              setTab(imported.tab);
            }
          } catch (e) {
            if (!alive) return;
            setError(`Workout was not added: ${(e as Error).message}`);
          }
          setState(s);
          setEditingState(s.draft);
          setReady(true);
          setStatus(savedLabel);
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            `Could not open saved data: ${e.message}. ${plugin ? "Check your plugin connection and workout access, then reload." : "Enable browser storage, then reload."}`,
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      try {
        const current = latest.current;
        const imported = importFromHash(current, location.hash, [
          ...catalog,
          ...current.custom,
        ]);
        if (!imported) return;
        update(imported.next);
        setNotice(imported.notice);
        window.history.replaceState(
          null,
          "",
          location.pathname + location.search,
        );
        setTab(imported.tab);
      } catch (e) {
        setError(`Workout was not added: ${(e as Error).message}`);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, [ready]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!detail && !custom && !confirmText) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmText) resolveConfirmation(false);
        setDetail(undefined);
        setCustom(false);
      }
      if (event.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button, .modal input, .modal select, .modal textarea",
          ),
        ).filter((n) => !n.hasAttribute("disabled"));
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [detail, custom, confirmText]);
  function update(next: State) {
    let succeeded = false;
    latest.current = next;
    setState(next);
    setStatus("Saving…");
    queue.current = queue.current
      .catch(() => {})
      .then(() => storage.save(next))
      .then(() => {
        succeeded = true;
        if (latest.current === next) {
          setStatus(savedLabel);
          setError("");
        }
      })
      .catch((e) => {
        setStatus("Not saved");
        setError(
          `Saving failed: ${e.message}. Keep this window open and retry.`,
        );
      });
    return queue.current.then(() => succeeded);
  }
  function setEditing(
    action: Workout | undefined | ((w: Workout | undefined) => Workout),
  ) {
    const next =
      typeof action === "function" ? action(editingRef.current) : action;
    editingRef.current = next;
    setEditingState(next);
    update({ ...latest.current, draft: next });
  }
  const all = [...catalog, ...state.custom];
  const results = searchExercises(
    all,
    query,
    muscle,
    equipment,
    available ? state.profile?.equipment : [],
  );
  const session = state.active;
  const completed =
    session?.exercises.reduce(
      (n, e) => n + e.sets.filter((s) => s.completedAt).length,
      0,
    ) || 0;
  const total = session?.exercises.reduce((n, e) => n + e.sets.length, 0) || 0;
  function mutateSession(fn: (s: Session) => Session) {
    const current = latest.current;
    if (current.active) update({ ...current, active: fn(current.active) });
  }
  async function removeWorkout(workout: Workout) {
    if (
      !(await confirmAction(
        `Delete "${workout.name}" from saved workouts? Your workout history will be kept. Any saved in-progress sets will also be kept in History.`,
      ))
    )
      return;
    update(deleteWorkout(latest.current, workout.id));
    if (editing?.id === workout.id) setEditingState(undefined);
    setNotice(`"${workout.name}" deleted. Your workout history is preserved.`);
  }
  function begin(workout: Workout) {
    if (state.active) {
      setTab("Today");
      return;
    }
    try {
      const readySession = state.readySessions?.find(
        (s) => s.workoutId === workout.id,
      );
      update({
        ...state,
        active: readySession
          ? resumeSession(readySession)
          : startSession(workout, all, state.profile!.unit),
        readySessions: (state.readySessions ?? []).filter(
          (s) => s.workoutId !== workout.id,
        ),
      });
      setTab("Today");
      setEditing(undefined);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function finish() {
    if (!session) return;
    if (
      !(await confirmAction(
        "Finish this workout? Uncompleted sets will remain unlogged.",
      ))
    )
      return;
    update({
      ...state,
      active: undefined,
      history: [
        ...state.history,
        {
          ...session,
          finishedAt: Date.now(),
          restEndsAt: undefined,
          pausedRest: undefined,
        },
      ],
    });
    setTab("History");
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitness-coach-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!ready)
    return (
      <main className="loading">
        <h1>Fitness Coach</h1>
        <p role="alert">{error || "Opening your training space…"}</p>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    );
  return (
    <div className={plugin ? "app plugin-app" : "app"}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Today");
          }}
        >
          ▥{" "}
          <span>
            FITNESS<span className="brand-light"> COACH</span>
          </span>
        </a>
        <p className="sidebar-caption">YOUR TRAINING SPACE</p>
        <nav>
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "nav active" : "nav"}
              onClick={() => {
                setTab(t);
              }}
            >
              <span>{icons[t]}</span>
              {t}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="pill">TRAINING PREVIEW</span>
          <p>Built around your next set.</p>
          <small>{plugin ? "Your workouts. Your ChatGPT coach." : "Private history sync and read-only ChatGPT coaching."}</small>
        </div>
      </aside>
      <main ref={mainRef}>
        {tab === "Today" && session && (
          <div aria-hidden="true" style={{ height: dockLayout.height + 16 }} />
        )}
        <header>
          <div>
            <span className="eyebrow">
              {new Date(now).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
            <h1>
              {tab === "Today"
                ? `Let's get moving${state.profile?.name ? ", " + state.profile.name : ""}.`
                : tab === "Train"
                  ? "Build your next session."
                  : tab === "History"
                    ? "Every session counts."
                    : tab === "AI Coach" ? "Train with your AI Coach." : "Make it yours."}
            </h1>
          </div>
          <span className="save-status" role="status">
            ● {status}
          </span>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => update(state)}>Retry saving</button>
          </div>
        )}
        {notice && (
          <div className="import-notice" role="status">
            <span>{notice}</span>
            <button className="quiet" onClick={() => setNotice("")}>
              Dismiss
            </button>
          </div>
        )}
        {!plugin && <CloudSync state={state} saveReady={status === savedLabel} visible={tab === "Settings"} onChange={(fn) => {
          const next = fn(latest.current);
          if (next !== latest.current) update(next);
        }} />}
        {plugin && <div className="plugin-toolbar"><span>Connected to your Fitness Coach account</span><button className="quiet" onClick={() => plugin.expand().catch((e) => setError(e.message))}>Expand workout app</button></div>}
        {plugin && tab === "AI Coach" && <PluginCoach state={state} runtime={plugin} saved={status === savedLabel} onChange={update} />}
        {!state.profile ? (
          <section className="panel onboarding">
            <span className="eyebrow">START WITH YOU</span>
            <h2>Your goals. Your pace.</h2>
            <p>
              A few preferences to make training easier. Everything is editable
              later.
            </p>
            <ProfileForm
              initial={defaultProfile}
              coaching={Boolean(plugin)}
              onSave={(profile) => update({ ...state, profile })}
              submit="Start training"
            />
          </section>
        ) : (
          <>
            {tab === "Today" && (
              <>
                {session ? (
                  <>
                    <section className="session-header panel">
                      <div>
                        <span className="eyebrow">
                          IN PROGRESS · {session.unit.toUpperCase()}
                        </span>
                        <h2>{session.name}</h2>
                        <p>
                          {completed} of {total} sets complete ·{" "}
                          {Math.floor((now - session.startedAt) / 60000)} min
                          elapsed
                        </p>
                      </div>
                      <button
                        className="quiet"
                        onClick={() => {
                          update(returnToWorkouts(latest.current));
                          setNotice(
                            "Workout moved back. Your logged sets are saved—choose Resume workout to continue.",
                          );
                          window.scrollTo(0, 0);
                        }}
                      >
                        Back to workouts
                      </button>
                      <button className="quiet" onClick={finish}>
                        Finish workout
                      </button>
                      <div className="progress-track">
                        <div
                          style={{
                            width: `${total ? (completed / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </section>
                    <div
                      className="workout-dock"
                      ref={dockRef}
                      style={{
                        left: dockLayout.left,
                        width: dockLayout.width || undefined,
                      }}
                    >
                      <section className="rest panel" aria-label="Rest timer">
                        <div>
                          <span className="eyebrow">
                            {session.pausedRest !== undefined
                              ? "REST PAUSED"
                              : session.restEndsAt
                                ? "RECOVER & RESET"
                                : "READY FOR YOUR SET"}
                          </span>
                          <strong>
                            {formatTime(
                              session.pausedRest ??
                                Math.max(
                                  0,
                                  Math.ceil(
                                    ((session.restEndsAt || now) - now) / 1000,
                                  ),
                                ),
                            )}
                          </strong>
                        </div>
                        <div className="row">
                          <button
                            className="quiet"
                            disabled={
                              !session.restEndsAt &&
                              session.pausedRest === undefined
                            }
                            onClick={() =>
                              mutateSession((s) =>
                                s.pausedRest !== undefined
                                  ? {
                                      ...s,
                                      restEndsAt:
                                        Date.now() + s.pausedRest * 1000,
                                      pausedRest: undefined,
                                    }
                                  : {
                                      ...s,
                                      pausedRest: Math.max(
                                        0,
                                        Math.ceil(
                                          ((s.restEndsAt || now) - Date.now()) /
                                            1000,
                                        ),
                                      ),
                                      restEndsAt: undefined,
                                    },
                              )
                            }
                          >
                            {session.pausedRest !== undefined
                              ? "Resume"
                              : "Pause"}
                          </button>
                          <button
                            className="quiet"
                            onClick={() =>
                              mutateSession((s) =>
                                s.pausedRest !== undefined
                                  ? { ...s, pausedRest: s.pausedRest + 30 }
                                  : {
                                      ...s,
                                      restEndsAt:
                                        Math.max(
                                          Date.now(),
                                          s.restEndsAt || Date.now(),
                                        ) + 30000,
                                    },
                              )
                            }
                          >
                            +30s
                          </button>
                          <button
                            className="quiet"
                            onClick={() =>
                              mutateSession((s) => ({
                                ...s,
                                restEndsAt: undefined,
                                pausedRest: undefined,
                              }))
                            }
                          >
                            Skip rest
                          </button>
                        </div>
                      </section>
                      <SessionCoach
                        session={session}
                        profile={state.profile}
                        onChange={mutateSession}
                        embedded={!!plugin}
                      />
                      {plugin && <PluginCoach compact state={state} runtime={plugin} saved={status === savedLabel} onChange={update} />}
                    </div>
                    <div className="workout-grid">
                      {session.exercises.map((exercise, ei) => (
                        <section
                          className="panel exercise-session"
                          key={exercise.id}
                        >
                          <div className="section-heading">
                            <div>
                              <span className="eyebrow">
                                {String(ei + 1).padStart(2, "0")} /{" "}
                                {exercise.exercise.muscle}
                              </span>
                              <h2>{exercise.exercise.name}</h2>
                              <small>
                                {exercise.rest}s rest ·{" "}
                                {exercise.exercise.loaded
                                  ? `Record ${session.unit}; dumbbells use weight per hand`
                                  : "Bodyweight / unweighted"}
                              </small>
                            </div>
                            <button
                              className="info"
                              aria-label={`Instructions for ${exercise.exercise.name}`}
                              onClick={() => setDetail(exercise.exercise)}
                            >
                              i
                            </button>
                          </div>
                          {exercise.notes && <p>{exercise.notes}</p>}
                          {exercise.sets.map((set, si) => {
                            const previous = previousSet(
                              state.history,
                              exercise.exercise.id,
                              si,
                              session.unit,
                            );
                            return (
                              <div
                                className={`set ${set.completedAt ? "done" : ""} ${set.skipped ? "skipped" : ""}`}
                                key={set.id}
                              >
                                <div className="set-label">
                                  <strong>SET {si + 1}</strong>
                                  <span>
                                    {previous
                                      ? `Last: ${previous.weight} × ${previous.reps}`
                                      : set.type}
                                  </span>
                                </div>
                                <label className="set-type-control">
                                  Set type
                                  <select
                                    aria-label={`Set type for ${exercise.exercise.name} set ${si + 1}`}
                                    value={set.type}
                                    disabled={!!set.skipped}
                                    onChange={(event) =>
                                      mutateSession((s) =>
                                        editSet(
                                          s,
                                          exercise.id,
                                          set.id,
                                          changeSetType(
                                            set,
                                            event.target
                                              .value as PlannedSet["type"],
                                            exercise.exercise.loaded,
                                            exercise.sets.find(
                                              (s) =>
                                                s.type === "Working" &&
                                                s.weight > 0,
                                            )?.weight,
                                          ),
                                        ),
                                      )
                                    }
                                  >
                                    {setTypes.map((type) => (
                                      <option key={type}>{type}</option>
                                    ))}
                                  </select>
                                </label>
                                {set.warmupBaseWeight !== undefined &&
                                  !set.completedAt && (
                                    <p className="muted">
                                      Warm-up starts at 50% of{" "}
                                      {set.warmupBaseWeight} {session.unit}.
                                      Adjust for your equipment.
                                    </p>
                                  )}
                                {set.targetRange && (
                                  <p className="muted">
                                    Target: {set.targetRange.min}–
                                    {set.targetRange.max}{" "}
                                    {exercise.exercise.metric === "duration"
                                      ? "seconds"
                                      : "reps"}
                                  </p>
                                )}
                                <div className="set-inputs">
                                  {exercise.exercise.metric === "reps" ? (
                                    <>
                                      {exercise.exercise.loaded && (
                                        <NumberControl
                                          label={session.unit}
                                          value={set.weight}
                                          step={2.5}
                                          disabled={!!set.skipped}
                                          onChange={(weight) =>
                                            mutateSession((s) =>
                                              editSet(s, exercise.id, set.id, {
                                                weight,
                                              }),
                                            )
                                          }
                                        />
                                      )}
                                      <NumberControl
                                        label="reps"
                                        value={set.reps}
                                        step={1}
                                        disabled={!!set.skipped}
                                        onChange={(reps) =>
                                          mutateSession((s) =>
                                            editSet(s, exercise.id, set.id, {
                                              reps,
                                            }),
                                          )
                                        }
                                      />
                                    </>
                                  ) : (
                                    <NumberControl
                                      label={
                                        exercise.exercise.metric === "duration"
                                          ? "seconds"
                                          : "km"
                                      }
                                      value={
                                        exercise.exercise.metric === "duration"
                                          ? set.duration
                                          : set.distance
                                      }
                                      step={
                                        exercise.exercise.metric === "duration"
                                          ? 15
                                          : 0.1
                                      }
                                      disabled={!!set.skipped}
                                      onChange={(value) =>
                                        mutateSession((s) =>
                                          editSet(
                                            s,
                                            exercise.id,
                                            set.id,
                                            exercise.exercise.metric ===
                                              "duration"
                                              ? { duration: value }
                                              : { distance: value },
                                          ),
                                        )
                                      }
                                    />
                                  )}
                                </div>
                                <div className="row set-actions">
                                  <button
                                    className={
                                      set.completedAt
                                        ? "completed-button"
                                        : "primary"
                                    }
                                    disabled={
                                      !!set.completedAt || !!set.skipped
                                    }
                                    onClick={() => {
                                      try {
                                        mutateSession((s) =>
                                          completeSet(s, exercise.id, set.id),
                                        );
                                      } catch (e) {
                                        setError((e as Error).message);
                                      }
                                    }}
                                  >
                                    {set.completedAt
                                      ? "✓ Logged"
                                      : set.skipped
                                        ? "Skipped"
                                        : "Complete set"}
                                  </button>
                                  {!set.completedAt && (
                                    <button
                                      className="quiet"
                                      onClick={() =>
                                        mutateSession((s) =>
                                          editSet(s, exercise.id, set.id, {
                                            skipped: !set.skipped,
                                          }),
                                        )
                                      }
                                    >
                                      {set.skipped ? "Restore" : "Skip"}
                                    </button>
                                  )}
                                </div>
                                {set.completedAt && (
                                  <div className="difficulty">
                                    <span>How did it feel?</span>
                                    <div className="row">
                                      {(
                                        [
                                          "Easy",
                                          "About right",
                                          "Hard",
                                          "Failed",
                                        ] as const
                                      ).map((d) => (
                                        <button
                                          key={d}
                                          className={
                                            set.difficulty === d
                                              ? "chip selected"
                                              : "chip"
                                          }
                                          onClick={() =>
                                            mutateSession((s) =>
                                              recordDifficulty(
                                                s,
                                                exercise.id,
                                                set.id,
                                                d,
                                                state.profile!.goal,
                                              ),
                                            )
                                          }
                                        >
                                          {d}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </section>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <section className="hero">
                      <div>
                        <span className="eyebrow">
                          ONE GOOD SESSION AT A TIME
                        </span>
                        <h2>
                          Show up.
                          <br />
                          <em>Make progress.</em>
                        </h2>
                        <p>
                          Find your exercises, build a workout, and focus on the
                          next set.
                        </p>
                        <button
                          className="primary"
                          onClick={() => {
                            setTab("Train");
                            setEditing({
                              id: id(),
                              name: "My workout",
                              unit: state.profile!.unit,
                              exercises: [],
                            });
                          }}
                        >
                          Build a workout <span>↗</span>
                        </button>
                      </div>
                      <div className="hero-mark" aria-hidden="true">
                        ▥
                      </div>
                    </section>
                    <div className="stats">
                      <Stat
                        label="WORKOUTS COMPLETED"
                        value={String(state.history.length)}
                      />
                      <Stat
                        label="EXERCISES TO EXPLORE"
                        value={String(all.length)}
                      />
                      <Stat label="YOUR FOCUS" value={state.profile.goal} />
                    </div>
                    <section>
                      <div className="section-heading">
                        <h2>Ready when you are</h2>
                        <button
                          className="quiet"
                          onClick={() => setTab("Train")}
                        >
                          All workouts ↗
                        </button>
                      </div>
                      {state.workouts.length ? (
                        <div className="cards">
                          {state.workouts.map((w) => (
                            <WorkoutCard
                              key={w.id}
                              workout={w}
                              resumable={state.readySessions?.some(
                                (s) => s.workoutId === w.id,
                              )}
                              onStart={() => begin(w)}
                              onDelete={() => removeWorkout(w)}
                              onEdit={() => {
                                setTab("Train");
                                setEditing(
                                  workoutInUnits(w, state.profile!.unit),
                                );
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="panel empty">
                          <h3>Your first workout starts here.</h3>
                          <p>
                            Save a routine and it will be waiting for your next
                            gym visit.
                          </p>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
            {tab === "Train" && (
              <>
                <div className="section-heading">
                  <div className="row">
                    <button
                      className="primary"
                      onClick={() =>
                        setEditing({
                          id: id(),
                          name: "My workout",
                          unit: state.profile!.unit,
                          exercises: [],
                        })
                      }
                    >
                      + New workout
                    </button>
                    <button className="quiet" onClick={() => setCustom(true)}>
                      + Custom exercise
                    </button>
                  </div>
                </div>
                {editing && (
                  <section className="panel builder">
                    <div className="section-heading">
                      <h2>Workout builder</h2>
                      <button
                        className="quiet"
                        onClick={async () => {
                          if (
                            await confirmAction(
                              "Close builder? Unsaved changes will be discarded.",
                            )
                          )
                            setEditing(undefined);
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <label>
                      Workout name
                      <input
                        aria-label="Workout name"
                        value={editing.name}
                        maxLength={100}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                      />
                    </label>
                    {editing.exercises.map((p, i) => {
                      const e = all.find((e) => e.id === p.exerciseId)!;
                      return (
                        <div className="prescription" key={p.id}>
                          <div className="section-heading">
                            <h3>{e.name}</h3>
                            <div className="row">
                              <button
                                className="quiet"
                                disabled={i === 0}
                                aria-label={`Move ${e.name} up`}
                                onClick={() => {
                                  const copy = [...editing.exercises];
                                  [copy[i - 1], copy[i]] = [
                                    copy[i],
                                    copy[i - 1],
                                  ];
                                  setEditing({ ...editing, exercises: copy });
                                }}
                              >
                                ↑
                              </button>
                              <button
                                className="quiet"
                                aria-label={`Remove ${e.name}`}
                                onClick={() =>
                                  setEditing({
                                    ...editing,
                                    exercises: editing.exercises.filter(
                                      (x) => x.id !== p.id,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <RoutineSets
                            exercise={e}
                            value={p}
                            unit={editing.unit || state.profile!.unit}
                            onChange={(next) =>
                              setEditing({
                                ...editing,
                                exercises: editing.exercises.map((x) =>
                                  x.id === p.id ? next : x,
                                ),
                              })
                            }
                          />
                        </div>
                      );
                    })}
                    {!editing.exercises.length && (
                      <p>Choose exercises from the library below.</p>
                    )}
                    <button
                      className="primary"
                      disabled={
                        !editing.exercises.length || !editing.name.trim()
                      }
                      onClick={() => {
                        update({
                          ...state,
                          workouts: [
                            ...state.workouts.filter(
                              (w) => w.id !== editing.id,
                            ),
                            { ...editing, name: editing.name.trim() },
                          ],
                        });
                        setEditing(undefined);
                      }}
                    >
                      Save workout
                    </button>
                    {state.workouts.some((w) => w.id === editing.id) && (
                      <button
                        className="quiet"
                        onClick={() => removeWorkout(editing)}
                      >
                        Delete workout
                      </button>
                    )}
                  </section>
                )}
                {!editing && state.workouts.length > 0 && (
                  <div className="cards">
                    {state.workouts.map((w) => (
                      <WorkoutCard
                        key={w.id}
                        workout={w}
                        resumable={state.readySessions?.some(
                          (s) => s.workoutId === w.id,
                        )}
                        onStart={() => begin(w)}
                        onDelete={() => removeWorkout(w)}
                        onEdit={() =>
                          setEditing(workoutInUnits(w, state.profile!.unit))
                        }
                      />
                    ))}
                  </div>
                )}
                <section className="library">
                  <div className="section-heading">
                    <h2>Exercise library</h2>
                    <span className="count">{results.length} exercises</span>
                  </div>
                  <div className="search-filters">
                    <input
                      className="search"
                      aria-label="Search exercises"
                      placeholder="Search chest, dumbbell, leg press…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <select
                      aria-label="Muscle filter"
                      value={muscle}
                      onChange={(e) => setMuscle(e.target.value)}
                    >
                      <option value="">All muscles</option>
                      {muscles.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Equipment filter"
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                    >
                      <option value="">All equipment</option>
                      {equipmentOptions.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={available}
                      disabled={!state.profile.equipment.length}
                      onChange={(e) => setAvailable(e.target.checked)}
                    />
                    My available equipment
                    {!state.profile.equipment.length && " (set in Settings)"}
                  </label>
                  <div className="exercise-list">
                    {results.map((e) => (
                      <article className="exercise-card" key={e.id}>
                        <button
                          className="exercise-title"
                          onClick={() => setDetail(e)}
                        >
                          <span className="exercise-icon">
                            {e.muscle.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <strong>{e.name}</strong>
                            <small>
                              {e.muscle} · {e.equipment}
                              {e.custom ? " · Custom" : ""}
                            </small>
                          </span>
                        </button>
                        <button
                          className="add"
                          aria-label={`Add ${e.name}`}
                          onClick={() =>
                            setEditing((w) => ({
                              ...(w || {
                                id: id(),
                                name: "My workout",
                                unit: state.profile!.unit,
                                exercises: [],
                              }),
                              exercises: [
                                ...(w?.exercises || []),
                                prescription(e.id),
                              ],
                            }))
                          }
                        >
                          +
                        </button>
                      </article>
                    ))}
                  </div>
                  {!results.length && (
                    <div className="panel empty">
                      <h3>No matches yet.</h3>
                      <p>
                        Try another name or clear a filter. You can also add
                        your own exercise.
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}
            {tab === "History" && (
              <>
                {!state.history.length ? (
                  <div className="panel empty">
                    <h2>Your progress begins with a session.</h2>
                    <p>
                      Completed workouts and their actual sets will appear here.
                    </p>
                    <button className="primary" onClick={() => setTab("Train")}>
                      Build your workout
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="stats">
                      <Stat
                        label="TOTAL SESSIONS"
                        value={String(state.history.length)}
                      />
                      <Stat
                        label="COMPLETED SETS"
                        value={String(
                          state.history
                            .flatMap((s) => s.exercises.flatMap((e) => e.sets))
                            .filter((s) => s.completedAt).length,
                        )}
                      />
                      <Stat
                        label="LATEST SESSION"
                        value={new Date(
                          state.history.at(-1)!.startedAt,
                        ).toLocaleDateString()}
                      />
                    </div>
                    {[...state.history].reverse().map((s) => (
                      <details className="panel history" key={s.id}>
                        <summary>
                          <div>
                            <h2>{s.name}</h2>
                            <p>
                              {s.imported ? (
                                `${s.performedOn} · Imported · Duration not recorded`
                              ) : (
                                <>
                                  {new Date(s.startedAt).toLocaleString()} ·{" "}
                                  {Math.max(
                                    0,
                                    Math.round(
                                      ((s.finishedAt || s.startedAt) -
                                        s.startedAt) /
                                        60000,
                                    ),
                                  )}{" "}
                                  min
                                </>
                              )}
                            </p>
                          </div>
                          <span>
                            {volume(s).toLocaleString()} {s.unit} volume
                          </span>
                        </summary>
                        {s.exercises.map((e) => (
                          <div key={e.id}>
                            <h3>{e.exercise.name}</h3>
                            {e.sets.map((set, i) => (
                              <p key={set.id}>
                                Set {i + 1}:{" "}
                                {set.completedAt
                                  ? e.exercise.metric === "reps"
                                    ? `${e.exercise.loaded ? `${set.weight} ${s.unit} × ` : ""}${set.reps} reps`
                                    : e.exercise.metric === "duration"
                                      ? `${set.duration} seconds`
                                      : `${set.distance} km`
                                  : "Unlogged"}{" "}
                                {set.difficulty && `· ${set.difficulty}`}
                                {set.type !== "Working" && ` · ${set.type}`}
                              </p>
                            ))}
                          </div>
                        ))}
                      </details>
                    ))}
                  </>
                )}
              </>
            )}
            {tab === "Settings" && (
              <div className="settings-grid">
                <ExcelImport
                  catalog={all}
                  onImport={(payload) => {
                    try {
                      const current = latest.current;
                      const next = importWorkout(current, payload, all);
                      update(next);
                      setNotice(
                        next === current
                          ? "This workout is already in your history."
                          : "Workout added to your history.",
                      );
                      setTab("History");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />

                <section className="panel">
                  <h2>Training preferences</h2>
                  <ProfileForm
                    initial={state.profile}
                    coaching={Boolean(plugin)}
                    onSave={(profile) => update({ ...state, profile })}
                    submit="Save preferences"
                  />
                </section>
                <section className="panel">
                  <span className="eyebrow">YOUR DATA</span>
                  <h2>{plugin ? "Saved to your account." : "Saved on this device."}</h2>
                  {plugin ? <p>Your preferences, workouts, active session and results save to your private Fitness Coach account. Completed results are also available to your authorized coach. Changes from another open view are protected; reload if a save reports a conflict.</p> : <p>
                    Workouts save in this browser first. Enable cloud sync above
                    to back up completed results and share them with your coach.
                    Routines and in-progress sessions remain on this device.
                  </p>}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        const token = workoutToken(importLink);
                        if (!token)
                          throw new Error("Paste a workout import link.");
                        const current = latest.current;
                        const next = importWorkout(
                          current,
                          decodeWorkoutImport(token),
                          all,
                        );
                        update(next);
                        setNotice(
                          next === current
                            ? "This workout is already in your history."
                            : "Workout added to your history.",
                        );
                        setImportLink("");
                        setTab("History");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <label>
                      Import workout link
                      <input
                        type="url"
                        required
                        value={importLink}
                        onChange={(e) => setImportLink(e.target.value)}
                        placeholder="Paste your workout link"
                      />
                    </label>
                    <button className="quiet" type="submit">
                      Import workout
                    </button>
                  </form>
                  <button className="quiet" onClick={exportData}>
                    Export backup
                  </button>
                  {plugin && <label>Bring workouts from your existing app backup
                    <input type="file" accept="application/json,.json" onChange={async (event) => {
                      const file = event.target.files?.[0]; event.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 1400000) throw new Error("This backup is too large.");
                        const imported: unknown = JSON.parse(await file.text()); validatePluginState(imported);
                        const current = latest.current;
                        const merge = <T extends { id: string }>(left: T[], right: T[]) => [...left, ...right.filter((item) => !left.some((existing) => existing.id === item.id))];
                        const next = { ...current, profile: current.profile ?? imported.profile, custom: merge(current.custom, imported.custom), workouts: merge(current.workouts, imported.workouts), history: merge(current.history, imported.history).sort((a, b) => a.startedAt - b.startedAt), active: current.active ?? imported.active, readySessions: merge(current.readySessions ?? [], imported.readySessions ?? []) };
                        if (await update(next)) setNotice("Backup imported. Existing account workouts and results were preserved.");
                      } catch (error) { setError((error as Error).message); }
                    }} />
                  </label>}
                  <hr />
                  <h3>{plugin ? "Your AI Coach is connected." : "Coach is on the way."}</h3>
                  {plugin ? <p>Open AI Coach to ask ChatGPT for a workout, progress review, or set adjustment. Review suggestions before applying them. ChatGPT replies when you ask; local timers continue independently.</p> : <p>
                    Involvement and autonomy preferences are saved for the
                    upcoming Coach milestone. They do not currently adjust your
                    workouts.
                  </p>}
                </section>
              </div>
            )}
          </>
        )}
        <footer>
          FITNESS COACH <span>{plugin ? "ChatGPT coaching · Private account storage" : "Training foundation · Device storage"}</span>
        </footer>
      </main>
      <nav className="bottom-nav">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
            }}
          >
            <span>{icons[t]}</span>
            {t}
          </button>
        ))}
      </nav>
      {confirmText && <div className="overlay" onClick={() => resolveConfirmation(false)}>
        <section className="modal panel" role="dialog" aria-modal="true" aria-label="Confirm workout action" onClick={(e) => e.stopPropagation()}>
          <h2>Confirm action</h2><p>{confirmText}</p>
          <div className="row"><button className="quiet" autoFocus onClick={() => resolveConfirmation(false)}>Cancel</button><button className="primary" onClick={() => resolveConfirmation(true)}>Confirm</button></div>
        </section>
      </div>}
      {detail && (
        <div className="overlay" onClick={() => setDetail(undefined)}>
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-label={detail.name}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <span className="eyebrow">
                {detail.muscle} · {detail.equipment}
              </span>
              <button
                autoFocus
                className="quiet"
                onClick={() => setDetail(undefined)}
              >
                Close
              </button>
            </div>
            <h2>{detail.name}</h2>
            <ol>
              {detail.instructions.map((i, n) => (
                <li key={n}>{i}</li>
              ))}
            </ol>
            <h3>Form cue</h3>
            <p>{detail.cues}</p>
            <p className="muted">
              Use a comfortable, controlled range. Stop a movement that causes
              pain.
            </p>
          </section>
        </div>
      )}
      {custom && (
        <div className="overlay">
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Custom exercise"
          >
            <div className="section-heading">
              <h2>Your exercise</h2>
              <button className="quiet" onClick={() => setCustom(false)}>
                Close
              </button>
            </div>
            <CustomForm
              onSave={(exercise) => {
                update({ ...state, custom: [...state.custom, exercise] });
                setCustom(false);
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
function editSet(
  session: Session,
  exerciseId: string,
  setId: string,
  values: Partial<Session["exercises"][number]["sets"][number]>,
): Session {
  return {
    ...session,
    exercises: session.exercises.map((e) =>
      e.id === exerciseId
        ? {
            ...e,
            sets: e.sets.map((s) => (s.id === setId ? { ...s, ...values } : s)),
          }
        : e,
    ),
  };
}
function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function WorkoutCard({
  workout,
  resumable,
  onStart,
  onEdit,
  onDelete,
}: {
  workout: Workout;
  resumable?: boolean;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="panel workout-card">
      <span className="eyebrow">SAVED WORKOUT</span>
      <h3>{workout.name}</h3>
      <p>
        {workout.exercises.length} exercises ·{" "}
        {workout.exercises.reduce((s, e) => s + e.sets.length, 0)} sets
        {workout.scheduledFor && ` · Planned for ${workout.scheduledFor}`}
      </p>
      {resumable && (
        <p>
          Resume keeps your logged sets. Routine edits apply to your next
          workout.
        </p>
      )}
      <div className="row">
        <button className="primary" onClick={onStart}>
          {resumable ? "Resume workout" : "Start workout"}
        </button>
        <button className="quiet" onClick={onEdit}>
          Edit
        </button>
        <button
          className="quiet"
          onClick={onDelete}
          aria-label={`Delete ${workout.name}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
function NumberControl({
  label,
  value,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="number-control">
      <span>{label}</span>
      <div>
        <button
          aria-label={`Decrease ${label}`}
          disabled={disabled}
          onClick={() =>
            onChange(Math.max(0, Math.round((value - step) * 100) / 100))
          }
        >
          −
        </button>
        <input
          aria-label={label}
          type="number"
          min="0"
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
        />
        <button
          aria-label={`Increase ${label}`}
          disabled={disabled}
          onClick={() => onChange(Math.round((value + step) * 100) / 100)}
        >
          +
        </button>
      </div>
    </label>
  );
}
function ProfileForm({
  initial,
  onSave,
  submit,
  coaching = false,
}: {
  initial: Profile;
  coaching?: boolean;
  onSave: (p: Profile) => void;
  submit: string;
}) {
  const [profile, setProfile] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(profile);
      }}
    >
      <label>
        First name
        <input
          value={profile.name}
          maxLength={50}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          placeholder="What should we call you?"
        />
      </label>
      <label>
        Primary goal
        <select
          aria-label="Primary goal"
          value={profile.goal}
          onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
        >
          {[
            "General fitness",
            "Lose fat",
            "Build muscle",
            "Strength",
            "Endurance",
            "Maintain",
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>
      <label>
        Weight units
        <select
          aria-label="Weight units"
          value={profile.unit}
          onChange={(e) =>
            setProfile({ ...profile, unit: e.target.value as Profile["unit"] })
          }
        >
          <option value="lb">Pounds (lb)</option>
          <option value="kg">Kilograms (kg)</option>
        </select>
      </label>
      <p className="muted">
        Unit changes apply to new sessions; history retains its original units.
      </p>
      <fieldset>
        <legend>Available equipment</legend>
        <div className="equipment-options">
          {equipmentOptions.map((eq) => (
            <label className="checkbox" key={eq}>
              <input
                type="checkbox"
                checked={profile.equipment.includes(eq)}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    equipment: e.target.checked
                      ? [...profile.equipment, eq]
                      : profile.equipment.filter((x) => x !== eq),
                  })
                }
              />
              {eq}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        {coaching ? "Coach involvement" : "Coach involvement (upcoming)"}
        <select
          value={profile.involvement}
          onChange={(e) =>
            setProfile({ ...profile, involvement: e.target.value })
          }
        >
          {["Minimal", "Coach", "Highly engaged"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {coaching ? <p className="muted">AI Coach suggests changes for you to review and apply.</p> : <label>
        Coach autonomy (upcoming)
        <select
          value={profile.autonomy}
          onChange={(e) => setProfile({ ...profile, autonomy: e.target.value })}
        >
          <option>Suggest only</option>
          <option>Adapt within limits</option>
        </select>
      </label>}
      <button className="primary" type="submit">
        {submit}
      </button>
    </form>
  );
}
function CustomForm({ onSave }: { onSave: (e: Exercise) => void }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const metric = data.get("metric") as Exercise["metric"];
        const name = String(data.get("name")).trim();
        if (!name) {
          event.currentTarget
            .querySelector<HTMLInputElement>("[name=name]")
            ?.focus();
          return;
        }
        onSave({
          id: id(),
          name: String(data.get("name")).trim(),
          muscle: String(data.get("muscle")),
          equipment: String(data.get("equipment")),
          metric,
          loaded: data.get("loaded") === "on",
          aliases: String(data.get("aliases"))
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          secondary: [],
          pattern: "custom",
          instructions: [String(data.get("instructions"))],
          cues: String(data.get("cues")),
          custom: true,
        });
      }}
    >
      <label>
        Name
        <input autoFocus name="name" required maxLength={100} />
      </label>
      <label>
        Aliases, separated by commas
        <input name="aliases" />
      </label>
      <label>
        Primary muscle
        <select aria-label="Primary muscle" name="muscle">
          {muscles.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label>
        Equipment
        <select aria-label="Equipment" name="equipment">
          {equipmentOptions.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label>
        Track
        <select aria-label="Track" name="metric">
          <option value="reps">Reps</option>
          <option value="duration">Time (seconds)</option>
          <option value="distance">Distance (km)</option>
        </select>
      </label>
      <label className="checkbox">
        <input type="checkbox" name="loaded" />
        Uses external weight
      </label>
      <label>
        Instructions
        <textarea name="instructions" required />
      </label>
      <label>
        Form cues
        <input name="cues" />
      </label>
      <button className="primary">Save exercise</button>
    </form>
  );
}
