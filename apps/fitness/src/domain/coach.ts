import type { Difficulty, Profile, Session } from "./model";
export type CoachSuggestion = {
  exerciseId: string;
  sourceId: string;
  targetId: string;
  before: { weight: number; reps: number };
  after: { weight: number; reps: number };
  reason: string;
};
export function applyCoachUpdate(
  session: Session,
  suggestion: CoachSuggestion,
): Session {
  const next = applySuggestion(session, suggestion);
  if (next === session) return session;
  const difficulty = session.exercises
    .find((e) => e.id === suggestion.exerciseId)!
    .sets.find((s) => s.id === suggestion.sourceId)!.difficulty!;
  return {
    ...next,
    coachUpdates: {
      ...session.coachUpdates,
      [suggestion.sourceId]: {
        difficulty,
        ...suggestion.after,
        reason: suggestion.reason,
      },
    },
    coachFeedback: {
      exerciseId: suggestion.exerciseId,
      setId: suggestion.sourceId,
      applied: true,
    },
  };
}
export function recordDifficulty(
  session: Session,
  exerciseId: string,
  setId: string,
  difficulty: Difficulty,
  goal: string,
): Session {
  const exercise = session.exercises.find((e) => e.id === exerciseId),
    source = exercise?.sets.find((s) => s.id === setId);
  if (!source?.completedAt) return session;
  const next = structuredClone(session);
  next.exercises
    .find((e) => e.id === exerciseId)!
    .sets.find((s) => s.id === setId)!.difficulty = difficulty;
  const prior = session.coachUpdates?.[setId];
  next.coachFeedback = { exerciseId, setId, applied: !!prior };
  if (!next.coachAuto || prior) return next;
  const result = suggestNextSet(
    next,
    exerciseId,
    setId,
    goal,
    next.coachIncrement ?? (next.unit === "lb" ? 2.5 : 1),
  );
  return result.suggestion ? applyCoachUpdate(next, result.suggestion) : next;
}
export function suggestNextSet(
  session: Session,
  exerciseId: string,
  sourceId: string,
  goal: string,
  increment: number,
): { message: string; suggestion?: CoachSuggestion } {
  const exercise = session.exercises.find((e) => e.id === exerciseId);
  const index = exercise?.sets.findIndex((s) => s.id === sourceId) ?? -1;
  const source = exercise?.sets[index];
  if (!exercise || !source?.completedAt || !source.difficulty)
    return {
      message:
        "Log a set and choose its difficulty to get a next-set suggestion.",
    };
  if (exercise.exercise.metric !== "reps" || source.type !== "Working")
    return {
      message:
        "Automatic progression applies to working sets with reps. Keep warm-up, drop and timed sets as planned.",
    };
  const target = exercise.sets
    .slice(index + 1)
    .find((s) => !s.completedAt && !s.skipped && s.type === "Working");
  if (!target)
    return {
      message:
        "No unfinished working set remains for this exercise. Your feedback is saved for your coach.",
    };
  if (
    source.difficulty === "About right" ||
    source.difficulty === "Hard" ||
    goal === "Maintain"
  )
    return {
      message:
        source.difficulty === "Hard"
          ? "That set was hard. Keep the next target and recover. Ask your coach if you need to reduce it."
          : "Keep the next set as planned.",
    };
  let weight = target.weight,
    reps = target.reps,
    reason = "";
  if (source.difficulty === "Failed") {
    if (target.weight > source.weight || target.reps > source.reps)
      return {
        message:
          "You reported a failed set and the next target is higher. Ask your coach before attempting it, or lower the target manually.",
      };
    if (source.reps <= 1)
      return {
        message:
          "You reported a failed set with very few reps. Ask your coach about reducing the load before continuing.",
      };
    reps = Math.max(1, Math.min(source.reps - 1, target.reps));
    reason =
      "You reported a failed set. Try one fewer rep at the planned weight, or discuss a larger reduction with your coach.";
  } else {
    if (target.weight > source.weight || target.reps > source.reps)
      return {
        message:
          "The next set already has a higher target. Keep that planned progression first.",
      };
    if (target.weight < source.weight || target.reps < source.reps)
      return {
        message:
          "The next set has a deliberately lower target. Keep it as planned or ask your coach before changing it.",
      };
    const ceiling =
      source.targetRange?.max ??
      (goal === "Strength" ? 8 : goal === "Endurance" ? 20 : 12);
    if (
      goal === "Strength" &&
      exercise.exercise.loaded &&
      source.weight > 0 &&
      Number.isFinite(increment) &&
      increment > 0 &&
      increment <= source.weight * 0.05
    ) {
      weight = Math.round((source.weight + increment) * 100) / 100;
      reps = target.reps;
      reason = `For your Strength goal, try one equipment increment (+${increment} ${session.unit}) at the planned reps. Confirm this increment is available.`;
    } else if (source.reps < ceiling) {
      reps = Math.max(target.reps, source.reps + 1);
      reason = `For your ${goal} goal, try one more rep before adding load.`;
    } else if (
      exercise.exercise.loaded &&
      source.weight > 0 &&
      Number.isFinite(increment) &&
      increment > 0 &&
      increment <= source.weight * 0.05 &&
      goal !== "Endurance"
    ) {
      weight = Math.round((source.weight + increment) * 100) / 100;
      reason = `You reached this coach's rep threshold. Try one equipment increment (+${increment} ${session.unit}) at the planned reps. Confirm it is available.`;
    } else
      return {
        message:
          "Keep the planned load. The next available increment is too large for this conservative suggestion, or you reached the rep threshold. Ask your coach what to change next.",
      };
  }
  if (weight === target.weight && reps === target.reps)
    return { message: "Keep the next set as planned." };
  return {
    message: reason,
    suggestion: {
      exerciseId,
      sourceId,
      targetId: target.id,
      before: { weight: target.weight, reps: target.reps },
      after: { weight, reps },
      reason,
    },
  };
}
export function applySuggestion(
  session: Session,
  suggestion: CoachSuggestion,
): Session {
  const source = session.exercises
    .find((e) => e.id === suggestion.exerciseId)
    ?.sets.find((s) => s.id === suggestion.sourceId);
  const target = session.exercises
    .find((e) => e.id === suggestion.exerciseId)
    ?.sets.find((s) => s.id === suggestion.targetId);
  if (
    !source?.completedAt ||
    !target ||
    target.completedAt ||
    target.skipped ||
    target.type !== "Working" ||
    target.weight !== suggestion.before.weight ||
    target.reps !== suggestion.before.reps
  )
    return session;
  const next = structuredClone(session);
  const set = next.exercises
    .find((e) => e.id === suggestion.exerciseId)!
    .sets.find((s) => s.id === suggestion.targetId)!;
  Object.assign(set, suggestion.after);
  return next;
}
export function coachContext(
  session: Session,
  profile: Profile,
  question: string,
): string {
  return `Please coach my current workout. My question: ${question.trim() || "What should I do next?"}\nGoal: ${profile.goal}. Give a concrete suggestion and explain it. Do not assume pain, injury, equipment increments or difficulty when absent. Distinguish completed results from unfinished targets.\n${JSON.stringify({ name: session.name, unit: session.unit, exercises: session.exercises.map((e) => ({ name: e.exercise.name, equipment: e.exercise.equipment, restSeconds: e.rest, sets: e.sets.map((s, i) => ({ set: i + 1, type: s.type, targetRange: s.targetRange, weight: s.weight, reps: s.reps, seconds: s.duration, km: s.distance, status: s.completedAt ? "Completed" : s.skipped ? "Skipped" : "Planned", difficulty: s.difficulty })) })) }, null, 2)}`;
}
