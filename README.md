# @philiprehberger/async-batcher

[![CI](https://github.com/philiprehberger/ts-async-batcher/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-async-batcher/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/async-batcher.svg)](https://www.npmjs.com/package/@philiprehberger/async-batcher)
[![Last updated](https://img.shields.io/github/last-commit/philiprehberger/ts-async-batcher)](https://github.com/philiprehberger/ts-async-batcher/commits/main)

Automatic batching and deduplication for async operations

## Installation

```bash
npm install @philiprehberger/async-batcher
```

## Usage

```ts
import { createBatcher } from '@philiprehberger/async-batcher';

const userLoader = createBatcher(async (ids: string[]) => {
  // Called once with all collected IDs
  return db.users.findMany({ where: { id: { in: ids } } });
});

// These are automatically batched into a single call
const user1 = await userLoader.load('user-1');
const user2 = await userLoader.load('user-2');

// Load multiple at once
const users = await userLoader.loadMany(['user-3', 'user-4']);
```

### Options

```ts
const loader = createBatcher(batchFn, {
  maxBatchSize: 100,  // Flush when batch reaches this size (default: 100)
  windowMs: 10,       // Batch window in milliseconds (default: 10)
});
```

### How It Works

1. `load(key)` adds the key to an internal queue and returns a promise
2. After `windowMs` or when `maxBatchSize` is reached, the queue is flushed
3. Duplicate keys within a batch window are deduplicated — the batch function receives unique keys only
4. Results are matched back to callers by index (batch function must return results in the same order as keys)

### Batch Metrics

Track batch performance and error rates with built-in metrics:

```ts
const loader = createBatcher(batchFn);

await loader.load('key-1');
await loader.load('key-2');

const metrics = loader.getMetrics();
console.log(metrics.totalBatches);          // number of batches executed
console.log(metrics.totalItems);            // total items processed
console.log(metrics.errorCount);            // number of failed batches
console.log(metrics.batchSizeDistribution); // array of batch sizes

// Reset counters
loader.resetMetrics();
```

### Max Queue Size Limit

Prevent unbounded memory growth by capping the queue size:

```ts
// Throw an error when the queue is full
const loader = createBatcher(batchFn, {
  maxQueueSize: 500,
  overflowStrategy: 'throw', // default
});

try {
  await loader.load('key');
} catch (err) {
  // BatcherQueueFullError: Queue is full (max size: 500)
}

// Drop the oldest item when the queue is full
const loader2 = createBatcher(batchFn, {
  maxQueueSize: 500,
  overflowStrategy: 'drop-oldest',
});
```

### Batch Prioritization

Assign priority levels so critical items are processed first within each batch:

```ts
const loader = createBatcher(batchFn);

// Items are sorted by priority before the batch function is called
loader.load('background-task', 'low');
loader.load('user-request', 'normal');
loader.load('payment', 'critical');
loader.load('admin-action', 'high');

// Priority order: critical > high > normal > low
```

### Retry on Batch Failure

Automatically retry failed batches with exponential backoff:

```ts
const loader = createBatcher(batchFn, {
  retryCount: 3,      // retry up to 3 times (default: 0)
  retryDelayMs: 100,   // initial delay of 100ms (default: 100)
});

// If batchFn fails, it retries with delays of 100ms, 200ms, 400ms
await loader.load('key');
```

## API

| Export | Description |
|--------|-------------|
| `createBatcher(batchFn, options?)` | Create a new batcher instance |
| `BatcherQueueFullError` | Error thrown when queue exceeds `maxQueueSize` with `throw` strategy |

### `Batcher<K, V>`

| Method | Description |
|--------|-------------|
| `load(key, priority?)` | Load a single value, batched automatically. Optional priority: `'low'`, `'normal'`, `'high'`, `'critical'` |
| `loadMany(keys, priority?)` | Load multiple values, returns `Promise<V[]>`. Optional priority applies to all keys |
| `getMetrics()` | Returns a snapshot of batch metrics |
| `resetMetrics()` | Resets all metric counters to zero |

### `BatcherOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxBatchSize` | `number` | `100` | Max keys per batch |
| `windowMs` | `number` | `10` | Batch collection window in ms |
| `maxQueueSize` | `number` | `undefined` | Max items allowed in the queue |
| `overflowStrategy` | `'drop-oldest' \| 'throw'` | `'throw'` | What to do when queue exceeds `maxQueueSize` |
| `retryCount` | `number` | `0` | Number of retry attempts on batch failure |
| `retryDelayMs` | `number` | `100` | Initial retry delay in ms (doubles each attempt) |

### `BatchMetrics`

| Property | Type | Description |
|----------|------|-------------|
| `totalBatches` | `number` | Total number of batches executed |
| `totalItems` | `number` | Total number of items processed |
| `errorCount` | `number` | Number of batches that failed |
| `batchSizeDistribution` | `number[]` | Array of unique-key counts per batch |

### `Priority`

`'low' | 'normal' | 'high' | 'critical'`

### `OverflowStrategy`

`'drop-oldest' | 'throw'`

## Development

```bash
npm install
npm run build
npm test
```

## Support

If you find this project useful:

⭐ [Star the repo](https://github.com/philiprehberger/ts-async-batcher)

🐛 [Report issues](https://github.com/philiprehberger/ts-async-batcher/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

💡 [Suggest features](https://github.com/philiprehberger/ts-async-batcher/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)

❤️ [Sponsor development](https://github.com/sponsors/philiprehberger)

🌐 [All Open Source Projects](https://philiprehberger.com/open-source-packages)

💻 [GitHub Profile](https://github.com/philiprehberger)

🔗 [LinkedIn Profile](https://www.linkedin.com/in/philiprehberger)

## License

[MIT](LICENSE)
