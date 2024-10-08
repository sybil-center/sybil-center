import type { Disposable } from "typed-inject";
import { CacheClock } from "./cache-clock/index.js";
import { ClientErr } from "../backbone/errors.js";

export class TimedCache<TKey, TValue> implements Disposable {
  private readonly cacheClock;
  private readonly toKey: (k: TKey) => string;
  constructor(ttlMs: number, toKey: (k: TKey) => string = String) {
    this.cacheClock = new CacheClock({ ttl: ttlMs });
    this.toKey = toKey;
  }

  set(key: TKey, value: TValue): void {
    this.cacheClock.set(this.toKey(key), value);
  }

  get(key: TKey): TValue {
    const retrieved = this.cacheClock.get(this.toKey(key));
    if (!retrieved) throw new ClientErr(`No session with id = ${this.toKey(key)}`);
    return retrieved.v as TValue;
  }

  find(key: TKey): TValue | undefined {
    const retrieved = this.cacheClock.get(this.toKey(key));
    return retrieved?.v as TValue | undefined;
  }

  /**
   * Delete session by session key (session id)
   * @return deleted session or undefined if session is not present
   * @param key - session key
   */
  delete(key: TKey): TValue | undefined {
    const entry = this.cacheClock.del(this.toKey(key));
    return entry as TValue | undefined;
  }

  dispose(): void {
    return this.cacheClock.stop();
  }
}
