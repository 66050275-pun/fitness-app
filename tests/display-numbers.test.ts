import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayNumber } from '../src/utils/safeNumbers.ts';
import { setLanguage } from '../src/i18n/index.ts';

for (const language of ['en', 'th'] as const) {
  test(`display numbers stay concise in ${language} without changing their source`, () => {
    setLanguage(language);
    const value = 0.15 + 0.3;
    assert.equal(formatDisplayNumber(value), '0.45');
    assert.equal(value, 0.44999999999999996);
    assert.equal(formatDisplayNumber(53.85), '53.85');
    assert.equal(formatDisplayNumber(4.1), '4.1');
    assert.equal(formatDisplayNumber(10000.555), '10,000.56');
    assert.equal(formatDisplayNumber(-12.345), '-12.35');
    assert.equal(formatDisplayNumber(0), '0');
    assert.equal(formatDisplayNumber(-0.0001), '0');
    assert.equal(formatDisplayNumber(123.456, 0), '123');
    assert.equal(formatDisplayNumber(0.0004, 4), '0.0004');
  });
}

test('missing and invalid numbers remain visibly unavailable', () => {
  for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
    assert.equal(formatDisplayNumber(value), '—');
  }
});
