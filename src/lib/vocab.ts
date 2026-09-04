import type { Rng } from './types';

export const PACKAGES = [
  'react-dom', 'esbuild', 'postcss', 'zod', 'lodash-es', 'date-fns', 'undici',
  'pino', 'drizzle-orm', 'vitest', 'rollup', 'tailwindcss', 'sharp', 'ws',
  'nanoid', 'ioredis', 'prisma', 'jose', 'valibot', 'tsx',
] as const;

export const SERVICES = [
  'api-gateway', 'auth-service', 'billing-worker', 'image-resizer', 'search-indexer',
  'notification-hub', 'session-store', 'edge-cache', 'webhook-relay', 'report-builder',
  'rate-limiter', 'media-encoder', 'graph-resolver', 'ledger-sync',
] as const;

export const MODULES = [
  'core', 'runtime', 'parser', 'codegen', 'scheduler', 'transport', 'registry',
  'telemetry', 'pipeline', 'resolver', 'compiler', 'hydration',
] as const;

export const DIRS = [
  'src/lib', 'src/app', 'src/components', 'src/server', 'packages/core/src',
  'internal/adapters', 'crates/engine/src', 'app/api/v2', 'services/worker',
] as const;

export const FILE_STEMS = [
  'index', 'client', 'handler', 'schema', 'router', 'store', 'mapper', 'guard',
  'stream', 'worker', 'context', 'codec', 'bridge', 'shard',
] as const;

export const EXTENSIONS = ['ts', 'tsx', 'rs', 'go', 'py', 'sql', 'wasm'] as const;

export const HOSTS = [
  'edge-fra1', 'edge-iad2', 'node-sfo3', 'runner-04', 'shard-11', 'cdn-lhr1',
  'db-primary', 'db-replica-2', 'cache-01', 'build-agent-7',
] as const;

export const BRANCHES = [
  'main', 'develop', 'feature/stream-codec', 'fix/leaky-socket', 'release/2.4',
  'hotfix/auth-drift', 'feature/edge-cache',
] as const;

export const HTTP_PATHS = [
  '/api/v2/sessions', '/api/v2/orders', '/healthz', '/graphql', '/assets/app.js',
  '/api/v2/users/me', '/webhooks/stripe', '/api/v2/search', '/metrics',
] as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const TABLES = [
  'users', 'orders', 'sessions', 'invoices', 'audit_log', 'webhooks', 'tenants',
  'embeddings', 'jobs',
] as const;

export const semver = (rng: Rng): string =>
  `${rng.int(0, 9)}.${rng.int(0, 24)}.${rng.int(0, 40)}`;

export const sha = (rng: Rng, length = 7): string => rng.hex(length);

export const ipv4 = (rng: Rng): string =>
  `${rng.int(10, 220)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;

export const filePath = (rng: Rng): string =>
  `${rng.pick(DIRS)}/${rng.pick(FILE_STEMS)}.${rng.pick(EXTENSIONS)}`;

export const duration = (rng: Rng): string =>
  rng.chance(0.6) ? `${rng.int(1, 980)}ms` : `${rng.float(1, 59, 1)}s`;

export const uuid = (rng: Rng): string =>
  `${rng.hex(8)}-${rng.hex(4)}-4${rng.hex(3)}-${rng.pick(['8', '9', 'a', 'b'])}${rng.hex(3)}-${rng.hex(12)}`;

export const port = (rng: Rng): number => rng.int(1024, 65535);

export const sizeKb = (rng: Rng): string => {
  const unit = rng.pick(['B', 'kB', 'MB', 'GB'] as const);
  return unit === 'B' ? `${rng.int(64, 999)}B` : `${rng.float(1, 940, 1)}${unit}`;
};

/** Wall-clock-looking stamp; drifts with the seed rather than the real clock. */
export const stamp = (rng: Rng): string => {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(rng.int(0, 23))}:${two(rng.int(0, 59))}:${two(rng.int(0, 59))}.${String(rng.int(0, 999)).padStart(3, '0')}`;
};

export const DOMAINS = [
  'acme.io', 'cdn.acme.io', 'api.acme.io', 'ledger.internal', 'assets.acme.io',
  'auth.acme.io', 'status.acme.io', 'grafana.internal',
] as const;

export const REGIONS = [
  'eu-central-1', 'us-east-1', 'ap-southeast-2', 'sa-east-1', 'us-west-2',
  'eu-west-3', 'me-south-1',
] as const;

export const TOPICS = [
  'orders.v2', 'payments.settled', 'users.events', 'audit.trail', 'clicks.raw',
  'inventory.delta', 'emails.outbound', 'jobs.retry',
] as const;

export const RESOURCES = [
  'aws_s3_bucket', 'aws_lambda_function', 'cloudflare_record', 'aws_rds_cluster',
  'kubernetes_deployment', 'aws_iam_role', 'random_password', 'aws_sqs_queue',
] as const;

export const CODECS = ['h264', 'hevc', 'av1', 'vp9', 'prores'] as const;

export const REDIS_COMMANDS = [
  'GET', 'SETEX', 'HGETALL', 'ZADD', 'LPUSH', 'INCR', 'EXPIRE', 'SCAN', 'XADD',
] as const;

export const APT_PACKAGES = [
  'libssl3', 'openssh-server', 'curl', 'ca-certificates', 'python3.12',
  'linux-headers', 'systemd', 'tzdata', 'git', 'nginx-core',
] as const;

export const GLYPHS = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾜ0123456789';

export const urlPath = (rng: Rng): string =>
  `https://${rng.pick(DOMAINS)}/${rng.pick(['blog', 'docs', 'shop', 'api', 'p'])}/${rng.hex(4)}`;
