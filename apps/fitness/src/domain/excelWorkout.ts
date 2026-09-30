import type { Exercise } from "./model";
import type { WorkoutImport } from "./importWorkout";

export async function parseExcelWorkout(
  rows: unknown[][],
  catalog: Exercise[],
): Promise<WorkoutImport> {
  if (
    rows[0]?.[0] !== "Fitness Coach workout import v1" ||
    ["Exercise", "Set", "Weight", "Reps"].some((h, i) => rows[8]?.[i] !== h)
  )
    throw new Error(
      "Use the downloadable template and keep its headers in place.",
    );
  const name = rows[3]?.[1],
    rawDate = rows[4]?.[1],
    unit = rows[5]?.[1];
  const date =
    rawDate instanceof Date && Number.isFinite(rawDate.getTime())
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate ?? "").trim();
  if (typeof name !== "string" || !name.trim() || name.length > 100)
    throw new Error("Enter a workout name in B4 (up to 100 characters).");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("Enter a valid date in B5, using YYYY-MM-DD.");
  if (unit !== "lb" && unit !== "kg") throw new Error("Choose lb or kg in B6.");
  if (rows.length > 1510)
    throw new Error(
      "The file has too many rows. Import one workout at a time.",
    );
  const groups = new Map<string, Map<number, [number, number]>>();
  for (let i = 9; i < rows.length; i++) {
    const [label, set, weight, reps] = rows[i];
    if ([label, set, weight, reps].every((v) => v == null || v === ""))
      continue;
    const fail = (message: string): never => {
      throw new Error(`Row ${i + 1}: ${message}`);
    };
    if (typeof label !== "string") fail("enter an exercise name.");
    const normalized = String(label).trim().toLowerCase();
    const matches = catalog.filter((e) =>
      [e.name, ...e.aliases].some((n) => n.toLowerCase() === normalized),
    );
    if (matches.length !== 1)
      fail(
        "use a supported exercise name from the Exercises sheet. Custom names must match your saved custom exercise.",
      );
    const exercise = matches[0];
    if (exercise.metric !== "reps")
      fail("this template supports weight and rep exercises only.");
    if (
      typeof set !== "number" ||
      !Number.isInteger(set) ||
      set < 1 ||
      set > 50
    )
      fail("set number must be 1–50.");
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      weight > 100000
    )
      fail("weight must be a number from 0 to 100,000. Use 0 for bodyweight.");
    if (
      typeof reps !== "number" ||
      !Number.isInteger(reps) ||
      reps < 0 ||
      reps > 10000
    )
      fail("reps must be a whole number from 0 to 10,000.");
    const sets = groups.get(exercise.id) ?? new Map<number, [number, number]>();
    if (sets.has(set as number))
      fail("this exercise already has that set number.");
    sets.set(set as number, [weight as number, reps as number]);
    groups.set(exercise.id, sets);
  }
  if (!groups.size) throw new Error("Add at least one set starting at row 10.");
  if (groups.size > 30)
    throw new Error("Import up to 30 exercises per workout.");
  const exercises: WorkoutImport["exercises"] = [...groups].map(
    ([exercise, sets]) => {
      const sorted = [...sets].sort((a, b) => a[0] - b[0]);
      if (sorted.some(([n], i) => n !== i + 1))
        throw new Error(
          `Number sets from 1 without gaps for ${catalog.find((e) => e.id === exercise)?.name}.`,
        );
      return [exercise, sorted.map(([, values]) => values)];
    },
  );
  const content = {
    date,
    name: name.trim(),
    unit: unit as "lb" | "kg",
    exercises,
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(content)),
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return { v: 1, id: `xlsx-${hash}`, ...content };
}
