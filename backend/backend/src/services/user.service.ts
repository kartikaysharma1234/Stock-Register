import { Role } from "../constants/roles";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { auditService } from "./audit.service";

export class UserService {
  list(actor: AuthUser, organizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      return userRepository.list(organizationId);
    }
    if (!actor.organizationId) throw new ApiError(400, "Organization is required");
    return userRepository.list(actor.organizationId);
  }

  async update(
    actor: AuthUser,
    id: string,
    data: {
      name?: string;
      role?: Role;
      departmentIds?: string[];
      warehouseIds?: string[];
      isActive?: boolean;
    },
  ) {
    const organizationId =
      actor.role === Role.SUPER_ADMIN ? undefined : actor.organizationId;
    if (actor.role !== Role.SUPER_ADMIN && data.role === Role.SUPER_ADMIN) {
      throw new ApiError(403, "Only super admins can assign that role");
    }
    const before = await userRepository.findById(id);
    if (
      !before ||
      (organizationId &&
        before.organizationId?.toString() !== organizationId)
    ) {
      throw new ApiError(404, "User not found");
    }
    const user = await userRepository.update(id, organizationId, data);
    await auditService.record(
      { actorId: actor.id, organizationId: actor.organizationId },
      {
        action: "user.update",
        entityType: "User",
        entityId: id,
        before: before.toObject(),
        after: user?.toObject(),
      },
    );
    return user;
  }
}

export const userService = new UserService();
