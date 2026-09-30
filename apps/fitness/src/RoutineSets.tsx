import {
  id,
  plannedSet,
  setTypes,
  type Exercise,
  type PlannedSet,
  type Prescription,
} from "./domain/model";
export function RoutineSets({
  exercise,
  value,
  unit,
  onChange,
}: {
  exercise: Exercise;
  value: Prescription;
  unit: "lb" | "kg";
  onChange: (value: Prescription) => void;
}) {
  const edit = (setId: string, patch: Partial<PlannedSet>) =>
    onChange({
      ...value,
      sets: value.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    });
  return (
    <>
      <label>
        Rest between sets (sec)
        <input
          type="number"
          min={0}
          step={1}
          value={value.rest}
          onChange={(e) => {
            const rest = Number(e.target.value);
            if (Number.isFinite(rest) && rest >= 0)
              onChange({ ...value, rest });
          }}
        />
      </label>
      {value.sets.map((set, index) => (
        <fieldset className="routine-set" key={set.id}>
          <legend>Set {index + 1}</legend>
          <div className="builder-inputs">
            <label>
              Set type
              <select
                aria-label={`Set type for ${exercise.name} set ${index + 1}`}
                value={set.type}
                onChange={(e) =>
                  edit(set.id, { type: e.target.value as PlannedSet["type"] })
                }
              >
                {setTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            {(["weight", "reps", "duration", "distance"] as const)
              .filter((key) =>
                exercise.metric === "reps"
                  ? key === "reps" || (key === "weight" && exercise.loaded)
                  : key === exercise.metric,
              )
              .map((key) => (
                <label key={key}>
                  {key === "weight"
                    ? `Weight (${unit})`
                    : key === "reps"
                      ? "Reps"
                      : key === "duration"
                        ? "Seconds"
                        : "Distance (km)"}
                  <input
                    type="number"
                    min={0}
                    step={key === "weight" || key === "distance" ? "any" : 1}
                    value={set[key]}
                    aria-label={`${key === "weight" ? `Weight (${unit})` : key === "reps" ? "Reps" : key === "duration" ? "Seconds" : "Distance (km)"} for ${exercise.name} set ${index + 1}`}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (
                        Number.isFinite(next) &&
                        next >= 0 &&
                        (key === "weight" ||
                          key === "distance" ||
                          Number.isInteger(next))
                      )
                        edit(set.id, { [key]: next });
                    }}
                  />
                </label>
              ))}
          </div>
          <div className="row">
            <button
              className="quiet"
              disabled={index === 0}
              aria-label={`Move ${exercise.name} set ${index + 1} up`}
              onClick={() => {
                const sets = [...value.sets];
                [sets[index - 1], sets[index]] = [sets[index], sets[index - 1]];
                onChange({ ...value, sets });
              }}
            >
              Move up
            </button>
            <button
              className="quiet"
              disabled={value.sets.length === 1}
              aria-label={`Remove ${exercise.name} set ${index + 1}`}
              onClick={() =>
                onChange({
                  ...value,
                  sets: value.sets.filter((s) => s.id !== set.id),
                })
              }
            >
              Remove set
            </button>
          </div>
        </fieldset>
      ))}
      <button
        className="quiet"
        disabled={value.sets.length >= 50}
        onClick={() =>
          onChange({
            ...value,
            sets: [
              ...value.sets,
              { ...(value.sets.at(-1) ?? plannedSet()), id: id() },
            ],
          })
        }
      >
        Add set
      </button>
    </>
  );
}
