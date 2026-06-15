import { randomUUID } from "crypto";
import { config } from "../config";
import { NotificationType, Permission, Role } from "../constants";
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
import { IUser } from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";
import { notificationService } from "./notification.service";
import { permissionService } from "./permission.service";
import { userService } from "./user.service";

export interface InviteUserInput {
  name: string;
  email: string;
  role: Role;
  customRoleId?: string;
  permissions?: Permission[];
  departmentId?: string;
  warehouseId?: string;
  departmentIds?: string[];
  warehouseIds?: string[];
  organizationId?: string;
}

export class AuthService {
  async createSession(
    user: IUser,
    ipAddress?: string,
    familyId = randomUUID(),
  ) {
    const authUser = await permissionService.buildAuthUser(user);
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
    if (!user.emailVerified) {
      throw new ApiError(403, "Verify your email before signing in");
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
    if (!user?.isActive || !user.emailVerified) {
      throw new ApiError(401, "User is inactive or unverified");
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
    const authUser = await permissionService.buildAuthUser(user);
    return {
      accessToken: generateAccessToken(authUser),
      refreshToken: nextRefreshToken,
      user: authUser,
    };
  }

  async logout(refreshToken: string, ipAddress?: string) {
    await userRepository.revokeRefreshToken(hashToken(refreshToken), ipAddress);
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user?.isActive) return;
    const token = generateSecureToken();
    const userId = user._id.toString();
    await userRepository.update(userId, user.organizationId?.toString(), {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await notificationService.notifyUser({
      organizationId: user.organizationId?.toString(),
      userId,
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

  async sendEmailVerification(user: IUser) {
    if (user.emailVerified) return;
    const token = generateSecureToken();
    const userId = user._id.toString();
    await userRepository.update(userId, user.organizationId?.toString(), {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ),
    });
    await notificationService.notifyUser({
      organizationId: user.organizationId?.toString(),
      userId,
      type: NotificationType.SYSTEM,
      title: "Verify your Stock Register email",
      message: "Verify your email address to activate sign-in.",
      template: "verifyEmail",
      variables: {
        name: user.name,
        verifyUrl: `${config.appUrl}/verify-email?token=${token}`,
      },
    });
  }

  async verifyEmail(token: string) {
    const user = await userRepository.findByEmailVerificationToken(
      hashToken(token),
    );
    if (!user) {
      throw new ApiError(400, "Email verification token is invalid or expired");
    }
    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    return user;
  }

  async inviteUser(actor: AuthUser, data: InviteUserInput) {
    const user = await userService.create(actor, {
      ...data,
      password: generateSecureToken(),
    });
    const inviteToken = generateSecureToken();
    await userRepository.update(
      user.id,
      user.organizationId?.toString(),
      {
        invitedBy: actor.id,
        invitationTokenHash: hashToken(inviteToken),
        invitationExpiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      },
    );
    await notificationService.notifyUser({
      organizationId: user.organizationId?.toString(),
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
    user.isActive = true;
    user.invitationTokenHash = undefined;
    user.invitationExpiresAt = undefined;
    await user.save();
    return user;
  }
}

export const authService = new AuthService();
