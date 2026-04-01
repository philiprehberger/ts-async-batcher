import type { BatcherOptions, Batcher, BatchMetrics, Priority, OverflowStrategy } from './types.js';

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

interface QueueEntry<K, V> {
  key: K;
  priority: Priority;
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
}

export class BatcherQueueFullError extends Error {
  constructor(maxQueueSize: number) {
    super(`Queue is full (max size: ${maxQueueSize})`);
    this.name = 'BatcherQueueFullError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createBatcher<K, V>(
  batchFn: (keys: K[]) => Promise<V[]>,
  options: BatcherOptions = {},
): Batcher<K, V> {
  const {
    maxBatchSize = 100,
    windowMs = 10,
    maxQueueSize,
    overflowStrategy = 'throw',
    retryCount = 0,
    retryDelayMs = 100,
  } = options;

  let queue: QueueEntry<K, V>[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const metrics: BatchMetrics = {
    totalBatches: 0,
    totalItems: 0,
    errorCount: 0,
    batchSizeDistribution: [],
  };

  function scheduleFlush(): void {
    if (timer === null) {
      timer = setTimeout(flush, windowMs);
    }
  }

  async function executeBatchWithRetry(
    uniqueKeys: K[],
    attempt: number,
  ): Promise<V[]> {
    try {
      return await batchFn(uniqueKeys);
    } catch (error) {
      if (attempt < retryCount) {
        const backoff = retryDelayMs * Math.pow(2, attempt);
        await delay(backoff);
        return executeBatchWithRetry(uniqueKeys, attempt + 1);
      }
      throw error;
    }
  }

  function flush(): void {
    timer = null;
    if (queue.length === 0) return;

    // Sort by priority (lower PRIORITY_ORDER value = higher priority)
    queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    const batch = queue;
    queue = [];

    const keyMap = new Map<K, number>();
    const uniqueKeys: K[] = [];

    for (const entry of batch) {
      if (!keyMap.has(entry.key)) {
        keyMap.set(entry.key, uniqueKeys.length);
        uniqueKeys.push(entry.key);
      }
    }

    metrics.totalBatches++;
    metrics.totalItems += batch.length;
    metrics.batchSizeDistribution.push(uniqueKeys.length);

    executeBatchWithRetry(uniqueKeys, 0).then(
      (results) => {
        if (results.length !== uniqueKeys.length) {
          const err = new Error(
            `Batch function returned ${results.length} results for ${uniqueKeys.length} keys`,
          );
          metrics.errorCount++;
          for (const entry of batch) {
            entry.reject(err);
          }
          return;
        }

        for (const entry of batch) {
          const index = keyMap.get(entry.key)!;
          entry.resolve(results[index]);
        }
      },
      (error) => {
        metrics.errorCount++;
        for (const entry of batch) {
          entry.reject(error);
        }
      },
    );
  }

  function enforceQueueLimit(strategy: OverflowStrategy, max: number): void {
    if (queue.length < max) return;

    if (strategy === 'throw') {
      throw new BatcherQueueFullError(max);
    }

    // drop-oldest: remove the first (oldest) entry and reject its promise
    const dropped = queue.shift();
    if (dropped) {
      dropped.reject(new Error('Dropped from queue due to overflow'));
    }
  }

  function load(key: K, priority: Priority = 'normal'): Promise<V> {
    if (maxQueueSize !== undefined) {
      enforceQueueLimit(overflowStrategy, maxQueueSize);
    }

    return new Promise<V>((resolve, reject) => {
      queue.push({ key, priority, resolve, reject });

      if (queue.length >= maxBatchSize) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        flush();
      } else {
        scheduleFlush();
      }
    });
  }

  function loadMany(keys: K[], priority: Priority = 'normal'): Promise<V[]> {
    return Promise.all(keys.map((k) => load(k, priority)));
  }

  function getMetrics(): BatchMetrics {
    return { ...metrics, batchSizeDistribution: [...metrics.batchSizeDistribution] };
  }

  function resetMetrics(): void {
    metrics.totalBatches = 0;
    metrics.totalItems = 0;
    metrics.errorCount = 0;
    metrics.batchSizeDistribution = [];
  }

  return { load, loadMany, getMetrics, resetMetrics };
}
