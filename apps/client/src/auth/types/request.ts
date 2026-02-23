import { Request } from 'express';
import { Session } from 'express-session';

export interface AuthContext {
  userId: number;
  clientId: string;
  sessionId?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  session?: Session & {
    user?: { id: number; clientId?: string; email?: string };
  };
  authContext?: AuthContext;
}
