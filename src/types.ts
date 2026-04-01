export type OverflowStrategy = 'drop-oldest' | 'throw';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export interface BatcherOptions {
  maxBatchSize?: number;
  windowMs?: number;
  maxQueueSize?: number;
  overflowStrategy?: OverflowStrategy;
  retryCount?: number;
  retryDelayMs?: number;
}

export interface BatchMetrics {
  totalBatches: number;
  totalItems: number;
  errorCount: number;
  batchSizeDistribution: number[];
}

export interface Batcher<K, V> {
  load(key: K, priority?: Priority): Promise<V>;
  loadMany(keys: K[], priority?: Priority): Promise<V[]>;
  getMetrics(): BatchMetrics;
  resetMetrics(): void;
}
