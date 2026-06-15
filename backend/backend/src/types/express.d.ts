import { AuthUser } from "./auth";
import { OrganizationContext } from "./organization";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      organization?: OrganizationContext;
      rawBody?: Buffer;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
