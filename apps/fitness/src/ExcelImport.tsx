import { useState } from "react";
import { readSheet } from "read-excel-file/browser";
import type { Exercise } from "./domain/model";
import type { WorkoutImport } from "./domain/importWorkout";
import { parseExcelWorkout } from "./domain/excelWorkout";

export function ExcelImport({
  catalog,
  onImport,
}: {
  catalog: Exercise[];
  onImport: (workout: WorkoutImport) => void;
}) {
  const [preview, setPreview] = useState<WorkoutImport>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function read(file?: File) {
    setPreview(undefined);
    setError("");
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".xlsx") ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose an .xlsx file up to 2 MB.");
      return;
    }
    setBusy(true);
    try {
      setPreview(
        await parseExcelWorkout(await readSheet(file, "Workout"), catalog),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not read this workbook.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel excel-import">
      <span className="eyebrow">EXCEL IMPORT</span>
      <h2>Add a completed workout</h2>
      <p>
        Download the template, fill in the workout details and one set per row,
        then upload it here. Use the Exercises sheet for supported names.
      </p>
      <a
        className="button quiet"
        href={`${import.meta.env.BASE_URL}workout-import-template.xlsx`}
        download
      >
        Download Excel template
      </a>
      <label>
        Upload completed template
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          onChange={(e) => {
            void read(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <p role="status">Reading workbook…</p>}
      {error && <p role="alert">{error}</p>}
      {preview && (
        <div className="import-preview">
          <h3>{preview.name}</h3>
          <p>
            {preview.date} · {preview.unit} ·{" "}
            {preview.exercises.reduce((n, [, s]) => n + s.length, 0)} sets
          </p>
          {preview.exercises.map(([id, sets]) => (
            <div key={id}>
              <strong>{catalog.find((e) => e.id === id)?.name}</strong>
              <p>
                {sets
                  .map(
                    ([weight, reps], i) => `Set ${i + 1}: ${weight} × ${reps}`,
                  )
                  .join(" · ")}
              </p>
            </div>
          ))}
          <p>
            These sets will be recorded as completed. Duration and difficulty
            are not recorded. An identical file is added only once.
          </p>
          <button
            onClick={() => {
              onImport(preview);
              setPreview(undefined);
            }}
          >
            Add to history
          </button>{" "}
          <button className="quiet" onClick={() => setPreview(undefined)}>
            Cancel import
          </button>
        </div>
      )}
    </section>
  );
}
