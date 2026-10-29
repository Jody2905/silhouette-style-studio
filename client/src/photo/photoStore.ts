// Keeps the user's photo in this browser (IndexedDB) so try-on survives a page reload.
// It never leaves the device; "Remove photo" deletes it.
const DB = "silhouette", STORE = "photo", KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null; // private mode or storage blocked: try-on still works for this visit
  }
}

export const savePhoto = (blob: Blob) => run("readwrite", (s) => s.put(blob, KEY));
export const loadPhoto = () => run<Blob>("readonly", (s) => s.get(KEY));
export const clearPhoto = () => run("readwrite", (s) => s.delete(KEY));
