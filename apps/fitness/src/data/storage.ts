import { emptyState, migrateState, type State } from "../domain/model";
const DB = "fitness-coach";
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function load(): Promise<State> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("state")
        .objectStore("state")
        .get("current");
      request.onsuccess = () => {
        const data = request.result;
        if (
          data &&
          (![1, 2].includes(data.version) ||
            !Array.isArray(data.history) ||
            !Array.isArray(data.workouts) ||
            !Array.isArray(data.custom))
        )
          reject(new Error("Saved data format is unsupported."));
        else {
          try {
            resolve(data ? migrateState(data) : emptyState());
          } catch (error) {
            reject(error);
          }
        }
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function save(state: State): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(state, "current");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error("Saving failed."));
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
