import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'web_session';
const encoder = new TextEncoder();

export type SessionClaims = {
  userId: number;
  clientId: string;
  sessionId: string;
  email?: string;
};

function getSecret() {
  const raw = process.env.WEB_SESSION_SECRET;
  if (!raw) throw new Error('WEB_SESSION_SECRET is required');
  return encoder.encode(raw);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: Number(payload.userId),
      clientId: String(payload.clientId),
      sessionId: String(payload.sessionId),
      email: payload.email ? String(payload.email) : undefined
    };
  } catch {
    return null;
  }
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}
