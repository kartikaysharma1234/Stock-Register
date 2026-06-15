import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import { Permission, Role } from "../constants";
import { IUser, RefreshTokenModel, UserModel } from "./schemas";

const secretFields =
  "+passwordHash +emailVerificationTokenHash +emailVerificationExpiresAt " +
  "+passwordResetTokenHash +passwordResetExpiresAt " +
  "+invitationTokenHash +invitationExpiresAt";

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
  departmentId?: string;
  warehouseId?: string;
  scopeDepartmentIds?: string[];
  scopeWarehouseIds?: string[];
}

export class UserRepository {
  create(
    data: {
      organizationId?: string;
      name: string;
      email: string;
      passwordHash: string;
      role: Role;
      customRoleId?: string;
      permissions?: Permission[];
      departmentId?: string;
      warehouseId?: string;
      departmentIds?: string[];
      warehouseIds?: string[];
      isActive?: boolean;
      emailVerified?: boolean;
      invitedBy?: string;
    },
    session?: ClientSession,
  ) {
    if (session) {
      return UserModel.create([data], { session }).then(([user]) => user);
    }
    return UserModel.create(data);
  }

  findById(id: string, organizationId?: string) {
    return UserModel.findOne({
      _id: id,
      isDeleted: false,
      ...(organizationId ? { organizationId } : {}),
    });
  }

  findByIdWithSecrets(id: string, organizationId?: string) {
    return UserModel.findOne({
      _id: id,
      isDeleted: false,
      ...(organizationId ? { organizationId } : {}),
    }).select(secretFields);
  }

  findByEmail(email: string, includeSecrets = false) {
    const query = UserModel.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    });
    return includeSecrets ? query.select(secretFields) : query;
  }

  findByEmailVerificationToken(tokenHash: string) {
    return UserModel.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select(secretFields);
  }

  findByPasswordResetToken(tokenHash: string) {
    return UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select(secretFields);
  }

  findByInvitationToken(tokenHash: string) {
    return UserModel.findOne({
      invitationTokenHash: tokenHash,
      invitationExpiresAt: { $gt: new Date() },
      isDeleted: false,
    }).select(secretFields);
  }

  async list(organizationId: string | undefined, options: UserListOptions = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const filter: FilterQuery<IUser> = {
      isDeleted: false,
      ...(organizationId ? { organizationId } : {}),
    };

    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }
    if (options.role) filter.role = options.role;
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    if (options.departmentId) {
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { departmentId: options.departmentId },
            { departmentIds: options.departmentId },
          ],
        },
      ];
    }
    if (options.warehouseId) {
      filter.$and = [
        ...(filter.$and ?? []),
        {
          $or: [
            { warehouseId: options.warehouseId },
            { warehouseIds: options.warehouseId },
          ],
        },
      ];
    }
    const scopeConditions: FilterQuery<IUser>[] = [];
    if (options.scopeDepartmentIds?.length) {
      scopeConditions.push(
        { departmentId: { $in: options.scopeDepartmentIds } },
        { departmentIds: { $in: options.scopeDepartmentIds } },
      );
    }
    if (options.scopeWarehouseIds?.length) {
      scopeConditions.push(
        { warehouseId: { $in: options.scopeWarehouseIds } },
        { warehouseIds: { $in: options.scopeWarehouseIds } },
      );
    }
    if (scopeConditions.length) {
      filter.$and = [
        ...(filter.$and ?? []),
        { $or: scopeConditions },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .populate("customRoleId", "name permissions isActive")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  update(
    id: string,
    organizationId: string | undefined,
    data: UpdateQuery<IUser>,
  ) {
    return UserModel.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        ...(organizationId ? { organizationId } : {}),
      },
      data,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  softDelete(id: string, organizationId: string | undefined, actorId: string) {
    return this.update(id, organizationId, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(actorId),
      $unset: {
        emailVerificationTokenHash: 1,
        emailVerificationExpiresAt: 1,
        passwordResetTokenHash: 1,
        passwordResetExpiresAt: 1,
        invitationTokenHash: 1,
        invitationExpiresAt: 1,
      },
    });
  }

  countActiveAdmins(organizationId: string) {
    return UserModel.countDocuments({
      organizationId,
      role: Role.ADMIN,
      isActive: true,
      isDeleted: false,
    });
  }

  countByCustomRole(organizationId: string, customRoleId: string) {
    return UserModel.countDocuments({
      organizationId,
      customRoleId,
      isDeleted: false,
    });
  }

  findUsersForNotification(
    organizationId: string,
    roles: Role[],
    warehouseId?: string,
  ) {
    const filter: FilterQuery<IUser> = {
      organizationId,
      role: { $in: roles },
      isActive: true,
      isDeleted: false,
    };
    if (warehouseId) {
      filter.$or = [
        { role: Role.ADMIN },
        { role: Role.SUPER_ADMIN },
        { warehouseId },
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
