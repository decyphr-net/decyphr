import { Request } from 'express';

export function getAuthClientId(req: Request): string | null {
  const clientId = req.cookies?.session ?? null;

  console.log('[AUTH]', {
    method: req.method,
    path: req.path,
    cookie: clientId,
  });

  return clientId;
}
