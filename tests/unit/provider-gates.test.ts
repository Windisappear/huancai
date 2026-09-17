import { afterEach, it, expect } from 'vitest';
import { provider } from '../../src/lib/providers';
const before = process.env.DEMO_MODE;
afterEach(() => { if (before === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = before; });
it('blocks unverified adapters even in demo mode', () => { process.env.DEMO_MODE = 'true'; expect(() => provider('unconfigured')).toThrow(); });
it('blocks demo adapter when production mode is active', () => { process.env.DEMO_MODE = 'false'; expect(() => provider('demo')).toThrow(); });
