import { describe, it, expect } from 'vitest';
import { createIdentity } from './identity';
import { HOSTS } from './vocab';

describe('createIdentity', () => {
  it('builds a root@host handle from the host bank', () => {
    const { host } = createIdentity();
    expect(host.startsWith('root@')).toBe(true);
    expect(HOSTS).toContain(host.slice('root@'.length));
  });

  it('builds a truncated session id', () => {
    const { session } = createIdentity();
    expect(session).toHaveLength(18);
    expect(session).toMatch(/^[0-9a-f-]+$/);
  });
});
