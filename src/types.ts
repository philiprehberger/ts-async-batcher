export interface BatcherOptions {
  maxBatchSize?: number;
  windowMs?: number;
}

export interface Batcher<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<V[]>;
}
