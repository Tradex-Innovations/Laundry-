import { ensureDeliveryData } from "./deliveries";
import type { Database } from "./types";
import { seedDatabase } from "./seed";
import { ensurePlatform, LIVE_LAUNDRY_ID } from "./platform";

export const STORAGE_KEY = "laundry.prototype4.v1";

// All persistence is behind this adapter. A future API adapter can replace it.
export interface Repository {
  load(): Database;
  update<T>(operation: (db: Database) => T): { db: Database; result: T };
}
export const localRepository: Repository = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = seedDatabase();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    const db = JSON.parse(raw) as Database;
    if (db.schemaVersion !== 1 || !Array.isArray(db.dispatches) || !Array.isArray(db.items) || !db.company) {
      throw new Error("This browser contains an unsupported demo data format.");
    }
    const needsPlatform = !db.laundries?.length || !db.users?.length || db.laundries.some(l => !("legalName" in l)) || !db.laundryWorkspaces || db.laundries.some(l => l.id !== LIVE_LAUNDRY_ID && !Object.hasOwn(db.laundryWorkspaces!, l.id));
    if (needsPlatform) ensurePlatform(db);
    const deliveryMigration = ensureDeliveryData(db);
    if (needsPlatform || deliveryMigration) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  },
  update(operation) {
    const db = this.load();
    const result = operation(db);
    // Persist before reporting success. A failed write never updates the UI state.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return { db, result };
  },
};
