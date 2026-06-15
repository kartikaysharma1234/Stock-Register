import passport from "../config/auth/passportConfig";

export const authenticate = passport.authenticate("jwt", { session: false });
