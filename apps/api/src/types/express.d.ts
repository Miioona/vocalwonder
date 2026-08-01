/**
 * Erweitert `Request` um den angemeldeten Nutzer. Gesetzt von `require-session`, sonst
 * nicht vorhanden — deshalb optional.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export {};
