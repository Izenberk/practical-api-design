export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  invalidatePrefix(prefix: string): Promise<void>;
}