import { createRng } from './rng';
import { HOSTS, uuid } from './vocab';

export interface NodeIdentity {
  readonly host: string;
  readonly session: string;
}

/**
 * Fresh fake node identity per request. Impure by design, which is why it
 * lives outside the component tree.
 */
export function createIdentity(): NodeIdentity {
  const rng = createRng(Date.now() & 0x7fffffff);
  return {
    host: `root@${rng.pick(HOSTS)}`,
    session: uuid(rng).slice(0, 18),
  };
}
