import { Role } from "../constants/roles";
import { RefreshTokenModel, UserModel } from "./schemas";

export class UserRepository {
  create(data: {
    organizationId?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    departmentIds?: string[];
    warehouseIds?: string[];
    emailVerified?: boolean;
  }) {
    return UserModel.create(data);
  }

  findById(id: string) {
    return UserModel.findById(id);
  }

  findByIdWithSecrets(id: string) {
    return UserModel.findById(id).select(
      "+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +invitationTokenHash +invitationExpiresAt",
    );
  }

  findByEmail(email: string, includeSecrets = false) {
    const query = UserModel.findOne({ email: email.toLowerCase() });
    return includeSecrets
      ? query.select(
          "+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +invitationTokenHash +invitationExpiresAt",
        )
      : query;
  }

  findByPasswordResetToken(tokenHash: string) {
    return UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select(
      "+passwordHash +passwordResetTokenHash +passwordResetExpiresAt",
    );
  }

  findByInvitationToken(tokenHash: string) {
    return UserModel.findOne({
      invitationTokenHash: tokenHash,
      invitationExpiresAt: { $gt: new Date() },
    }).select("+passwordHash +invitationTokenHash +invitationExpiresAt");
  }

  list(organizationId?: string) {
    const filter = organizationId ? { organizationId } : {};
    return UserModel.find(filter).sort({ name: 1 });
  }

  update(id: string, organizationId: string | undefined, data: Record<string, unknown>) {
    const filter =
      organizationId === undefined ? { _id: id } : { _id: id, organizationId };
    return UserModel.findOneAndUpdate(filter, data, {
      new: true,
      runValidators: true,
    });
  }

  findUsersForNotification(
    organizationId: string,
    roles: Role[],
    warehouseId?: string,
  ) {
    const filter: Record<string, unknown> = {
      organizationId,
      role: { $in: roles },
      isActive: true,
    };
    if (warehouseId) {
      filter.$or = [
        { role: Role.ADMIN },
        { role: Role.SUPER_ADMIN },
        { warehouseIds: warehouseId },
      ];
    }
    return UserModel.find(filter);
  }

  saveRefreshToken(data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
    createdByIp?: string;
  }) {
    return RefreshTokenModel.create(data);
  }

  findRefreshToken(tokenHash: string) {
    return RefreshTokenModel.findOne({ tokenHash });
  }

  rotateRefreshToken(
    tokenHash: string,
    replacedByTokenHash: string,
    revokedByIp?: string,
  ) {
    return RefreshTokenModel.findOneAndUpdate(
      { tokenHash, revokedAt: { $exists: false } },
      { revokedAt: new Date(), replacedByTokenHash, revokedByIp },
      { new: true },
    );
  }

  revokeRefreshToken(tokenHash: string, revokedByIp?: string) {
    return RefreshTokenModel.findOneAndUpdate(
      { tokenHash, revokedAt: { $exists: false } },
      { revokedAt: new Date(), revokedByIp },
      { new: true },
    );
  }

  revokeTokenFamily(familyId: string, revokedByIp?: string) {
    return RefreshTokenModel.updateMany(
      { familyId, revokedAt: { $exists: false } },
      { revokedAt: new Date(), revokedByIp },
    );
  }

  revokeAllUserTokens(userId: string, revokedByIp?: string) {
    return RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date(), revokedByIp },
    );
  }
}

export const userRepository = new UserRepository();
