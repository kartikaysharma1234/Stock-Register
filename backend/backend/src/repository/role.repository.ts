import { UpdateQuery } from "mongoose";
import { Permission } from "../constants";
import { IRole, RoleModel } from "./schemas";

export class RoleRepository {
  create(data: {
    organizationId: string;
    name: string;
    permissions: Permission[];
  }) {
    return RoleModel.create({ ...data, isCustom: true });
  }

  list(organizationId: string) {
    return RoleModel.find({
      organizationId,
      isDeleted: false,
    }).sort({ name: 1 });
  }

  findById(id: string, organizationId: string) {
    return RoleModel.findOne({
      _id: id,
      organizationId,
      isDeleted: false,
    });
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateQuery<IRole>,
  ) {
    return RoleModel.findOneAndUpdate(
      {
        _id: id,
        organizationId,
        isCustom: true,
        isDeleted: false,
      },
      data,
      { new: true, runValidators: true },
    );
  }

  softDelete(id: string, organizationId: string, actorId: string) {
    return this.update(id, organizationId, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: actorId,
    });
  }
}

export const roleRepository = new RoleRepository();
