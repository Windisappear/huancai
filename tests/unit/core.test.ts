import { describe, it, expect } from 'vitest';
import { settlement, expiry, isAccessible } from '../../src/lib/core';
describe('money invariants', () => {
  it('releases only undelivered outputs', () => { expect(settlement(4, 37, 3)).toEqual({ frozen: 148, charge: 111, release: 37 }); });
  it('conserves funds across every partial result', () => { for (let n = 1; n <= 4; n++) for (let d = 0; d <= n; d++) { const s = settlement(n, 19, d); expect(s.charge + s.release).toBe(s.frozen); } });
  it('rejects fractional, negative and excessive delivery counts', () => { for (const n of [-1, 1.5, 5]) expect(() => settlement(4, 10, n)).toThrow(); });
});
describe('72 hour access', () => {
  const now = new Date('2026-09-09T00:00:00Z');
  it('denies access at the exact deadline', () => { const expiresAt = expiry(now); expect(isAccessible({ expiresAt, deletedAt: null }, new Date(expiresAt.getTime() - 1))).toBe(true); expect(isAccessible({ expiresAt, deletedAt: null }, expiresAt)).toBe(false); });
  it('deletion immediately takes precedence', () => expect(isAccessible({ expiresAt: expiry(now), deletedAt: now }, now)).toBe(false));
});
