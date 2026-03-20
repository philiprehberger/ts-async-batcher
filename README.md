# @philiprehberger/ts-async-batcher

[![CI](https://github.com/philiprehberger/ts-async-batcher/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-async-batcher/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/ts-async-batcher.svg)](https://www.npmjs.com/package/@philiprehberger/ts-async-batcher)
[![License](https://img.shields.io/github/license/philiprehberger/ts-async-batcher)](LICENSE)

Automatic batching and deduplication for async operations

## Installation

```bash
npm install @philiprehberger/ts-async-batcher
```

## Usage

```ts
import { createBatcher } from '@philiprehberger/ts-async-batcher';

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

## API

| Export | Description |
|--------|-------------|
| `createBatcher(batchFn, options?)` | Create a new batcher instance |

### `Batcher<K, V>`

| Method | Description |
|--------|-------------|
| `load(key)` | Load a single value, batched automatically |
| `loadMany(keys)` | Load multiple values, returns `Promise<V[]>` |

### `BatcherOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxBatchSize` | `number` | `100` | Max keys per batch |
| `windowMs` | `number` | `10` | Batch collection window in ms |


## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
