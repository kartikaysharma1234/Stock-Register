import { randomUUID } from "crypto";
import { config } from "../config";
import { NotificationType } from "../constants/status";
import { Role } from "../constants/roles";
import {
  comparePassword,
  generateSecureToken,
  hashPassword,
  hashToken,
} from "../helpers/hashing.helper";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../helpers/jwt.helper";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";

const toAuthUser = (user: {
  _id: { toString(): string };
  organizationId?: { toString(): string };
  role: Role;
  departmentIds: Array<{ toString(): string }>;
  warehouseIds: Array<{ toString(): string }>;
}): AuthUser => ({
  id: user._id.toString(),
  organizationId: user.organizationId?.toString(),
  role: user.role,
  departmentIds: user.departmentIds.map(String),
  warehouseIds: user.warehouseIds.map(String),
});

export class AuthService {
  async createSession(
    user: Parameters<typeof toAuthUser>[0],
    ipAddress?: string,
    familyId = randomUUID(),
  ) {
    const authUser = toAuthUser(user);
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser.id, familyId);
    await userRepository.saveRefreshToken({
      userId: authUser.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() + config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
      ),
      createdByIp: ipAddress,
    });
    return { accessToken, refreshToken, user: authUser };
  }

  async login(email: string, password: string, ipAddress?: string) {
    const user = await userRepository.findByEmail(email, true);
    if (
      !user ||
      !user.isActive ||
      !(await comparePassword(password, user.passwordHash))
    ) {
      throw new ApiError(401, "Invalid email or password");
    }
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = await this.createSession(user, ipAddress);
    await auditService.record(
      {
        actorId: user.id,
        organizationId: user.organizationId,
        ipAddress,
      },
      { action: "auth.login", entityType: "User", entityId: user.id },
    );
    return tokens;
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "Invalid or expired refresh token");
    }
    const tokenHash = hashToken(refreshToken);
    const stored = await userRepository.findRefreshToken(tokenHash);
    if (!stored) {
      throw new ApiError(401, "Refresh token is not recognized");
    }
    if (stored.revokedAt) {
      await userRepository.revokeTokenFamily(stored.familyId, ipAddress);
      throw new ApiError(401, "Refresh token reuse detected");
    }
    const user = await userRepository.findById(payload.sub);
    if (!user?.isActive) {
      throw new ApiError(401, "User is inactive");
    }
    const nextRefreshToken = generateRefreshToken(user.id, stored.familyId);
    const nextHash = hashToken(nextRefreshToken);
    const rotated = await userRepository.rotateRefreshToken(
      tokenHash,
      nextHash,
      ipAddress,
    );
    if (!rotated) {
      await userRepository.revokeTokenFamily(stored.familyId, ipAddress);
      throw new ApiError(401, "Refresh token reuse detected");
    }
    await userRepository.saveRefreshToken({
      userId: user.id,
      familyId: stored.familyId,
      tokenHash: nextHash,
      expiresAt: new Date(
        Date.now() + config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000,
      ),
      createdByIp: ipAddress,
    });
    return {
      accessToken: generateAccessToken(toAuthUser(user)),
      refreshToken: nextRefreshToken,
      user: toAuthUser(user),
    };
  }

  async logout(refreshToken: string, ipAddress?: string) {
    await userRepository.revokeRefreshToken(hashToken(refreshToken), ipAddress);
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return;
    const token = generateSecureToken();
    await userRepository.update(user.id, user.organizationId?.toString(), {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await notificationService.notifyUser({
      organizationId: user.organizationId?.toString(),
      userId: user.id,
      type: NotificationType.PASSWORD_RESET,
      title: "Reset your Stock Register password",
      message: "A password reset was requested for your account.",
      template: "forgotPassword",
      variables: {
        name: user.name,
        resetUrl: `${config.appUrl}/reset-password?token=${token}`,
      },
    });
  }

  async resetPassword(token: string, password: string) {
    const user = await userRepository.findByPasswordResetToken(hashToken(token));
    if (!user) {
      throw new ApiError(400, "Password reset token is invalid or expired");
    }
    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await userRepository.revokeAllUserTokens(user.id);
  }

  async inviteUser(
    actor: AuthUser,
    data: {
      name: string;
      email: string;
      role: Role;
      departmentIds?: string[];
      warehouseIds?: string[];
      organizationId?: string;
    },
  ) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN
        ? data.organizationId
        : actor.organizationId;
    if (!organizationId && data.role !== Role.SUPER_ADMIN) {
      throw new ApiError(400, "Organization is required");
    }
    if (actor.role !== Role.SUPER_ADMIN && data.role === Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only a super admin can invite a super admin");
    }
    if (await userRepository.findByEmail(data.email)) {
      throw new ApiError(409, "A user with this email already exists");
    }
    const inviteToken = generateSecureToken();
    const user = await userRepository.create({
      ...data,
      organizationId,
      passwordHash: await hashPassword(generateSecureToken()),
      emailVerified: false,
    });
    await userRepository.update(user.id, organizationId, {
      invitationTokenHash: hashToken(inviteToken),
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await notificationService.notifyUser({
      organizationId,
      userId: user.id,
      type: NotificationType.INVITATION,
      title: "You have been invited to Stock Register",
      message: "Complete your invitation to activate your account.",
      template: "inviteTeamMember",
      variables: {
        name: user.name,
        inviteUrl: `${config.appUrl}/accept-invite?token=${inviteToken}`,
      },
    });
    return user;
  }

  async acceptInvite(token: string, password: string) {
    const user = await userRepository.findByInvitationToken(hashToken(token));
    if (!user) {
      throw new ApiError(400, "Invitation token is invalid or expired");
    }
    user.passwordHash = await hashPassword(password);
    user.emailVerified = true;
    user.invitationTokenHash = undefined;
    user.invitationExpiresAt = undefined;
    await user.save();
    return user;
  }
}

export const authService = new AuthService();
