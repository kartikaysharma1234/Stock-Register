import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { config } from "../config";
import { Role } from "../constants/roles";
import { AuthUser } from "../types/auth";

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  familyId: string;
  tokenType: "refresh";
}

export const generateAccessToken = (user: AuthUser) =>
  jwt.sign(
    {
      role: user.role,
      organizationId: user.organizationId,
      departmentIds: user.departmentIds,
      warehouseIds: user.warehouseIds,
      tokenType: "access",
    },
    config.jwtAccessSecret,
    {
      subject: user.id,
      expiresIn: config.jwtAccessTtl as SignOptions["expiresIn"],
    },
  );

export const generateRefreshToken = (userId: string, familyId: string) =>
  jwt.sign(
    { familyId, tokenType: "refresh" },
    config.jwtRefreshSecret,
    {
      subject: userId,
      expiresIn: `${config.jwtRefreshTtlDays}d`,
    },
  );

export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as RefreshTokenPayload;
  if (payload.tokenType !== "refresh" || !payload.sub || !payload.familyId) {
    throw new Error("Invalid refresh token");
  }
  return payload;
};

export const authUserFromJwt = (payload: JwtPayload): AuthUser => ({
  id: String(payload.sub),
  organizationId: payload.organizationId
    ? String(payload.organizationId)
    : undefined,
  role: payload.role as Role,
  departmentIds: Array.isArray(payload.departmentIds)
    ? payload.departmentIds.map(String)
    : [],
  warehouseIds: Array.isArray(payload.warehouseIds)
    ? payload.warehouseIds.map(String)
    : [],
});
