import type { BatcherOptions, Batcher } from './types.js';

interface QueueEntry<K, V> {
  key: K;
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
}

export function createBatcher<K, V>(
  batchFn: (keys: K[]) => Promise<V[]>,
  options: BatcherOptions = {},
): Batcher<K, V> {
  const { maxBatchSize = 100, windowMs = 10 } = options;

  let queue: QueueEntry<K, V>[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (timer === null) {
      timer = setTimeout(flush, windowMs);
    }
  }

  function flush(): void {
    timer = null;
    if (queue.length === 0) return;

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

    batchFn(uniqueKeys).then(
      (results) => {
        if (results.length !== uniqueKeys.length) {
          const err = new Error(
            `Batch function returned ${results.length} results for ${uniqueKeys.length} keys`,
          );
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
        for (const entry of batch) {
          entry.reject(error);
        }
      },
    );
  }

  function load(key: K): Promise<V> {
    return new Promise<V>((resolve, reject) => {
      queue.push({ key, resolve, reject });

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

  function loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((k) => load(k)));
  }

  return { load, loadMany };
}
