import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { config } from "..";
import { authUserFromJwt } from "../../helpers/jwt.helper";
import { UserModel } from "../../repository/schemas";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtAccessSecret,
    },
    async (payload, done) => {
      try {
        if (payload.tokenType !== "access") {
          return done(null, false);
        }
        const user = await UserModel.findById(payload.sub);
        if (!user?.isActive) return done(null, false);
        return done(
          null,
          authUserFromJwt({
            ...payload,
            role: user.role,
            organizationId: user.organizationId,
            departmentIds: user.departmentIds,
            warehouseIds: user.warehouseIds,
          }),
        );
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

export default passport;
