import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { config } from "..";
import { UserModel } from "../../repository/schemas";
import { permissionService } from "../../services/permission.service";

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
        const user = await UserModel.findOne({
          _id: payload.sub,
          isActive: true,
          emailVerified: true,
          isDeleted: false,
        });
        if (!user) return done(null, false);
        return done(null, await permissionService.buildAuthUser(user));
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

export default passport;
