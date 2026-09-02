import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const NODE_ENVS = ['development', 'production', 'test'] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

export interface EnvConfig {
  readonly PORT: number;
  readonly NODE_ENV: NodeEnv;
  readonly JWT_SECRET: string;
  readonly LOG_LEVEL: string;
  readonly JWT_EXPIRES_SECONDS: number;
  readonly ADMIN_EMAIL: string | null;
  readonly ADMIN_PASSWORD: string | null;
}

const problems: string[] = [];

const isNodeEnv = (value: string): value is NodeEnv =>
(NODE_ENVS as readonly string[]).includes(value);

const requireString = (key: string): string => {
  const raw = process.env[key];
  if (raw == undefined || raw.trim() === '') {
    problems.push(`${key} is required and has no default`);
    return '';
  }
  return raw;
};

const optionalPort = (key: string, fallback: number):
number => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    problems.push(`${key} must be an integer 1-65535, received "${raw}"`);
    return fallback;
  }
  return parsed;
};

const optionalNodeEnv = (key: string, fallback: NodeEnv):
NodeEnv => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (!isNodeEnv(raw)) {
    problems.push(
      `${key} must be one of ${NODE_ENVS.join(' | ')},
      received "${raw}"`,
    );
    return fallback;
  }
  return raw;
};

const optionalSeconds = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    problems.push(`${key} must be a positive integer, received "${raw}"`);
    return fallback;
  }
  return parsed;
};

const optionalString = (key: string): string | null => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return null;
  return raw;
};

const parsed: EnvConfig = {
  PORT: optionalPort('PORT', 3000),
  NODE_ENV: optionalNodeEnv('NODE_ENV', 'development'),
  JWT_SECRET: requireString('JWT_SECRET'),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  JWT_EXPIRES_SECONDS: optionalSeconds('JWT_EXPIRES_SECONDS', 900),
  ADMIN_EMAIL: optionalString('ADMIN_EMAIL'),
  ADMIN_PASSWORD: optionalString('ADMIN_PASSWORD'),
};

if (problems.length > 0) {
  throw new Error(
    `Invalid environment configuration:\n -
    ${problems.join('\n - ')}`,
  );
}

export const env: EnvConfig = Object.freeze(parsed);