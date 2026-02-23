import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { getPool } from './db';

const USER_TABLE = process.env.DB_USER_TABLE || 'user';
const MAGIC_LINK_TABLE = process.env.DB_MAGIC_LINK_TABLE || 'magic_link';
const LANGUAGE_SETTING_TABLE = process.env.DB_LANGUAGE_SETTING_TABLE || 'language_setting';

function qi(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `\`${name}\``;
}

type ResolvedTables = {
  user: string;
  magicLink: string;
  languageSetting: string;
};

let resolvedTablesCache: ResolvedTables | null = null;

async function listTables(): Promise<string[]> {
  const pool = getPool();
  const schema = process.env.DB_NAME || 'decyphr';
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [schema]
  );
  return (rows as Array<{ table_name: string }>).map((r) => r.table_name);
}

function pickTable(existing: string[], preferred: string, candidates: string[]): string {
  if (existing.includes(preferred)) return preferred;
  for (const candidate of candidates) {
    if (existing.includes(candidate)) return candidate;
  }
  throw new Error(
    `Could not resolve table "${preferred}". Existing tables: ${existing.join(', ')}`
  );
}

async function resolveTables(): Promise<ResolvedTables> {
  if (resolvedTablesCache) return resolvedTablesCache;
  const existing = await listTables();

  const resolved: ResolvedTables = {
    user: pickTable(existing, USER_TABLE, ['user', 'users', 'User']),
    magicLink: pickTable(existing, MAGIC_LINK_TABLE, [
      'magic_link',
      'magic_links',
      'magiclink',
      'magic_link_entity',
      'MagicLink'
    ]),
    languageSetting: pickTable(existing, LANGUAGE_SETTING_TABLE, [
      'language_setting',
      'language_settings',
      'languageSetting',
      'LanguageSetting'
    ])
  };

  resolvedTablesCache = resolved;
  return resolved;
}

export type AuthUser = {
  id: number;
  email: string;
  clientId: string;
};

async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const tables = await resolveTables();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, email, clientId FROM ${qi(tables.user)} WHERE email = ? LIMIT 1`,
    [email]
  );

  const user = (rows as any[])[0];
  if (!user) return null;

  return {
    id: Number(user.id),
    email: String(user.email),
    clientId: String(user.clientId),
  };
}

async function createUser(email: string): Promise<AuthUser> {
  const tables = await resolveTables();
  const pool = getPool();
  const clientId = uuidv4();

  const [result] = await pool.query(
    `INSERT INTO ${qi(tables.user)} (email, clientId, createdAt) VALUES (?, ?, NOW())`,
    [email, clientId]
  );

  const id = Number((result as any).insertId);
  return { id, email, clientId };
}

async function ensureDefaultLanguageSetting(userId: number): Promise<void> {
  const tables = await resolveTables();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id FROM ${qi(tables.languageSetting)} WHERE userId = ? LIMIT 1`,
    [userId]
  );

  if ((rows as any[]).length > 0) return;

  await pool.query(
    `INSERT INTO ${qi(tables.languageSetting)} (firstLanguage, targetLanguage, immersionLevel, userId) VALUES (?, ?, ?, ?)`,
    ['en', 'ga', 'normal', userId]
  );
}

async function issueMagicLink(userId: number): Promise<{ rawToken: string; expiresAt: Date }> {
  const tables = await resolveTables();
  const pool = getPool();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const token = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `INSERT INTO ${qi(tables.magicLink)} (token, expiresAt, createdAt, userId) VALUES (?, ?, NOW(), ?)`,
    [token, expiresAt, userId]
  );

  return { rawToken, expiresAt };
}

export async function generateMagicLink(email: string): Promise<{ verifyUrl: string }> {
  let user = await findUserByEmail(email);
  if (!user) user = await createUser(email);

  await ensureDefaultLanguageSetting(user.id);
  const { rawToken } = await issueMagicLink(user.id);

  const appUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
  const verifyUrl = `${appUrl}/auth/verify-request?token=${rawToken}&email=${encodeURIComponent(email)}`;
  return { verifyUrl };
}

export async function deliverMagicLinkEmail(email: string, verifyUrl: string): Promise<void> {
  const deliveryMode = process.env.EMAIL_DELIVERY || 'log';

  if (deliveryMode === 'log' || !process.env.RESEND_API_KEY) {
    console.log('—— MAGIC LINK (WEB) ——');
    console.log('To:', email);
    console.log('Verify URL:', verifyUrl);
    console.log('—————————————');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Your Magic Login Link',
    html: `<p>Click <a href="${verifyUrl}">here</a> to login.</p>`,
  });
}

export async function verifyMagicLink(email: string, rawToken: string): Promise<AuthUser> {
  const tables = await resolveTables();
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User not found');

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, token, expiresAt FROM ${qi(tables.magicLink)} WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`,
    [user.id]
  );

  const magicLink = (rows as any[])[0];
  if (!magicLink) throw new Error('Token not found');

  if (new Date(magicLink.expiresAt).getTime() < Date.now()) {
    throw new Error('Token expired');
  }

  const isValid = await bcrypt.compare(rawToken, String(magicLink.token));
  if (!isValid) throw new Error('Invalid token');

  await ensureDefaultLanguageSetting(user.id);
  return user;
}
