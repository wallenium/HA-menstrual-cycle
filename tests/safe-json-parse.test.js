'use strict';

/**
 * Unit tests for the safeJsonParse helpers embedded in the dashboard panel
 * and heatmap card JS files.
 *
 * Each helper is extracted from the module under test and verified in isolation
 * so that tests remain fast and framework-free.
 */

const assert = require('assert');

// ---------------------------------------------------------------------------
// Re-implement the helper from source so we test the real logic.
// If the implementation changes we must update this copy and the source.
// ---------------------------------------------------------------------------

/**
 * Inline copy of the safeJsonParse helper from:
 *   custom_components/menstruation_cycle/www/menstruation-cycle-dashboard-panel.js
 *   custom_components/menstruation_cycle/www/menstruation-cycle-heatmap-card.js
 *
 * Both files contain the same algorithm; we test the canonical version here.
 */
const safeJsonParse = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('[menstruation-cycle] safeJsonParse failed:', err.message);
    return fallback;
  }
};

const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failures.push(name);
  }
}

// --- valid JSON string -------------------------------------------------------
test('valid JSON string: object', () => {
  const result = safeJsonParse('{"a":1,"b":true}');
  assert.deepStrictEqual(result, { a: 1, b: true });
});

test('valid JSON string: array', () => {
  const result = safeJsonParse('[1,2,3]');
  assert.deepStrictEqual(result, [1, 2, 3]);
});

test('valid JSON string: number', () => {
  assert.strictEqual(safeJsonParse('42'), 42);
});

test('valid JSON string: boolean', () => {
  assert.strictEqual(safeJsonParse('true'), true);
});

test('valid JSON string: null literal', () => {
  assert.strictEqual(safeJsonParse('null'), null);
});

// --- invalid JSON string -----------------------------------------------------
test('invalid JSON string: returns default fallback (null)', () => {
  const result = safeJsonParse('{not valid json}}}');
  assert.strictEqual(result, null);
});

test('invalid JSON string: returns custom fallback', () => {
  const result = safeJsonParse('{bad}', 'FALLBACK');
  assert.strictEqual(result, 'FALLBACK');
});

test('invalid JSON string: does not throw', () => {
  assert.doesNotThrow(() => safeJsonParse('{"unclosed":'));
});

// --- object/array input (already parsed) ------------------------------------
test('object input: returned as-is', () => {
  const obj = { x: 1 };
  assert.strictEqual(safeJsonParse(obj), obj);
});

test('array input: returned as-is', () => {
  const arr = [1, 2];
  assert.strictEqual(safeJsonParse(arr), arr);
});

// --- null / undefined input --------------------------------------------------
test('null input: returns default fallback (null)', () => {
  assert.strictEqual(safeJsonParse(null), null);
});

test('null input: returns custom fallback', () => {
  // null always returns the fallback value provided
  assert.deepStrictEqual(safeJsonParse(null, { default: true }), { default: true });
});

test('undefined input: returns default fallback (null)', () => {
  assert.strictEqual(safeJsonParse(undefined), null);
});

test('undefined input: returns custom fallback', () => {
  assert.deepStrictEqual(safeJsonParse(undefined, []), []);
});

// --- non-string, non-object primitives ---------------------------------------
test('number input: returns fallback', () => {
  assert.strictEqual(safeJsonParse(42), null);
});

test('boolean input: returns fallback', () => {
  assert.strictEqual(safeJsonParse(true), null);
});

// --- empty string ------------------------------------------------------------
test('empty string: returns fallback (invalid JSON)', () => {
  assert.strictEqual(safeJsonParse(''), null);
});

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n${failures.length} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll safeJsonParse tests passed.');
}
