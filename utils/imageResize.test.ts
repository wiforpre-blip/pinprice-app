import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getMaxLongEdgeResize, getMaxLongEdgeTargetSize } from './imageResize.ts';

const CAP = 1440;

describe('getMaxLongEdgeResize', () => {
  it('returns width cap for landscape sources', () => {
    assert.deepEqual(getMaxLongEdgeResize(4000, 3000, CAP), { width: CAP });
  });

  it('returns height cap for portrait sources', () => {
    assert.deepEqual(getMaxLongEdgeResize(3000, 4000, CAP), { height: CAP });
  });

  it('returns null when the long edge is already at the cap (no upscale)', () => {
    assert.equal(getMaxLongEdgeResize(1440, 1080, CAP), null);
    assert.equal(getMaxLongEdgeResize(1080, 1440, CAP), null);
  });

  it('returns null for sources smaller than the cap (no upscale)', () => {
    assert.equal(getMaxLongEdgeResize(1000, 800, CAP), null);
    assert.equal(getMaxLongEdgeResize(800, 1000, CAP), null);
  });

  it('returns null for invalid input', () => {
    assert.equal(getMaxLongEdgeResize(0, 100, CAP), null);
    assert.equal(getMaxLongEdgeResize(-1, 100, CAP), null);
    assert.equal(getMaxLongEdgeResize(4000, 3000, 0), null);
  });
});

describe('getMaxLongEdgeTargetSize', () => {
  it('downscales landscape to the exact long edge', () => {
    assert.deepEqual(getMaxLongEdgeTargetSize(4000, 3000, CAP), { width: 1440, height: 1080 });
  });

  it('downscales portrait to the exact long edge', () => {
    assert.deepEqual(getMaxLongEdgeTargetSize(3000, 4000, CAP), { width: 1080, height: 1440 });
  });

  it('preserves 9:16 aspect', () => {
    assert.deepEqual(getMaxLongEdgeTargetSize(3000, 5333, CAP), { width: 810, height: 1440 });
  });

  it('never returns dimensions above the cap', () => {
    const result = getMaxLongEdgeTargetSize(2500, 2500, CAP);
    assert.ok(result);
    assert.ok(Math.max(result.width, result.height) <= CAP);
  });

  it('returns null when no downscale is needed (never upscales)', () => {
    assert.equal(getMaxLongEdgeTargetSize(1440, 900, CAP), null);
    assert.equal(getMaxLongEdgeTargetSize(1200, 900, CAP), null);
  });
});
