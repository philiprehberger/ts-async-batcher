import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../../dist/index.js');

describe('async-batcher', () => {
  it('should export createBatcher', () => {
    assert.ok(mod.createBatcher);
  });
});
