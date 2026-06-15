import { AuthUser } from "./auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
