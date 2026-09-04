import { describe, it, expect } from 'vitest';
import { createRng } from './rng';
import { semver, sha, ipv4, filePath, duration, uuid, port, sizeKb, PACKAGES, SERVICES } from './vocab';

const rng = () => createRng(2024);

describe('vocab word banks', () => {
  it('exposes non-empty, duplicate-free banks', () => {
    for (const bank of [PACKAGES, SERVICES]) {
      expect(bank.length).toBeGreaterThan(8);
      expect(new Set(bank).size).toBe(bank.length);
    }
  });
});

describe('fake value generators', () => {
  it('semver looks like a version', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) expect(semver(r)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('sha is hex of the requested length', () => {
    const r = rng();
    expect(sha(r)).toMatch(/^[0-9a-f]{7}$/);
    expect(sha(r, 40)).toMatch(/^[0-9a-f]{40}$/);
  });

  it('ipv4 has four octets in range', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      const parts = ipv4(r).split('.');
      expect(parts).toHaveLength(4);
      parts.forEach((p) => {
        const n = Number(p);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(255);
      });
    }
  });

  it('filePath is relative and has an extension', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      const p = filePath(r);
      expect(p.startsWith('/')).toBe(false);
      expect(p).toMatch(/\.[a-z]+$/);
      expect(p).toContain('/');
    }
  });

  it('duration renders a unit', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) expect(duration(r)).toMatch(/^\d+(\.\d+)?(ms|s)$/);
  });

  it('uuid is v4 shaped', () => {
    const r = rng();
    for (let i = 0; i < 20; i++) {
      expect(uuid(r)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it('port is a valid high port', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) {
      const p = port(r);
      expect(p).toBeGreaterThan(1023);
      expect(p).toBeLessThan(65536);
    }
  });

  it('sizeKb renders a human size', () => {
    const r = rng();
    for (let i = 0; i < 50; i++) expect(sizeKb(r)).toMatch(/^\d+(\.\d+)?(B|kB|MB|GB)$/);
  });
});
