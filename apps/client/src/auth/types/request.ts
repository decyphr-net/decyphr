import { Session } from 'express-session';

export interface AuthenticatedRequest extends Request {
  session: Session & {
    user?: { id: number };
  };
}
