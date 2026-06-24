import {
  ClientSession,
  FilterQuery,
  Types,
  UpdateQuery,
} from "mongoose";
import { BudgetPeriod, RequestStatus } from "../constants";
import {
  DepartmentModel,
  IDepartment,
  StockRequestModel,
  UserModel,
} from "./schemas";

export interface DepartmentListFilter {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  budgetPeriod?: BudgetPeriod;
  departmentIds?: string[];
  sortBy?: "createdAt" | "updatedAt" | "name" | "code" | "budgetUsed";
  sortOrder?: "asc" | "desc";
}

export interface DepartmentCreateRecord {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  headUserId?: string;
  budgetAllocated?: number;
  budgetUsed?: number;
  budgetCommitted?: number;
  budgetPeriod?: BudgetPeriod;
  budgetPeriodStartedAt?: Date;
  isActive?: boolean;
}

const pagination = (filter: DepartmentListFilter) => ({
  page: filter.page ?? 1,
  limit: filter.limit ?? 20,
});

export class DepartmentRepository {
  create(data: DepartmentCreateRecord, session?: ClientSession) {
    if (session) {
      return DepartmentModel.create([data], { session }).then(
        ([department]) => department,
      );
    }
    return DepartmentModel.create(data);
  }

  findById(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return DepartmentModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    })
      .populate("headUserId", "name email role isActive")
      .session(session ?? null);
  }

  findDocument(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return DepartmentModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).session(session ?? null);
  }

  async list(
    organizationId: string,
    filter: DepartmentListFilter = {},
  ) {
    const { page, limit } = pagination(filter);
    const query: FilterQuery<IDepartment> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.departmentIds) query._id = { $in: filter.departmentIds };
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.budgetPeriod) query.budgetPeriod = filter.budgetPeriod;
    if (filter.search) {
      const search = filter.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const sortBy = filter.sortBy ?? "createdAt";
    const direction = filter.sortOrder === "asc" ? 1 : -1;
    const [departments, total] = await Promise.all([
      DepartmentModel.find(query)
        .populate("headUserId", "name email role isActive")
        .sort({ [sortBy]: direction })
        .skip((page - 1) * limit)
        .limit(limit),
      DepartmentModel.countDocuments(query),
    ]);
    return {
      departments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  update(
    organizationId: string,
    id: string,
    data: UpdateQuery<IDepartment>,
    session?: ClientSession,
  ) {
    return DepartmentModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true, session },
    ).populate("headUserId", "name email role isActive");
  }

  softDelete(
    organizationId: string,
    id: string,
    actorId: string,
  ) {
    return this.update(organizationId, id, {
      isDeleted: true,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(actorId),
    });
  }

  countAssignedUsers(organizationId: string, departmentId: string) {
    return UserModel.countDocuments({
      organizationId,
      isDeleted: false,
      $or: [
        { departmentId },
        { departmentIds: departmentId },
      ],
    });
  }

  countActiveRequests(organizationId: string, departmentId: string) {
    return StockRequestModel.countDocuments({
      organizationId,
      departmentId,
      isDeleted: { $ne: true },
      status: {
        $nin: [
          RequestStatus.FULFILLED,
          RequestStatus.REJECTED,
          RequestStatus.CANCELLED,
        ],
      },
    });
  }

  reserveBudget(
    organizationId: string,
    departmentId: string,
    amount: number,
    session?: ClientSession,
  ) {
    if (amount <= 0) {
      return this.findDocument(organizationId, departmentId, session);
    }
    return DepartmentModel.findOneAndUpdate(
      {
        _id: departmentId,
        organizationId,
        isActive: true,
        isDeleted: { $ne: true },
        $expr: {
          $or: [
            { $lte: [{ $ifNull: ["$budgetAllocated", 0] }, 0] },
            {
              $lte: [
                {
                  $add: [
                    { $ifNull: ["$budgetUsed", 0] },
                    { $ifNull: ["$budgetCommitted", 0] },
                    amount,
                  ],
                },
                "$budgetAllocated",
              ],
            },
          ],
        },
      },
      { $inc: { budgetCommitted: amount } },
      { new: true, runValidators: true, session },
    );
  }

  consumeBudget(
    organizationId: string,
    departmentId: string,
    committedAmount: number,
    usedAmount: number,
    session?: ClientSession,
  ) {
    return DepartmentModel.findOneAndUpdate(
      {
        _id: departmentId,
        organizationId,
        isDeleted: { $ne: true },
        budgetCommitted: { $gte: committedAmount },
      },
      {
        $inc: {
          budgetCommitted: -committedAmount,
          budgetUsed: usedAmount,
        },
      },
      { new: true, runValidators: true, session },
    );
  }

  recordBudgetUsage(
    organizationId: string,
    departmentId: string,
    amount: number,
    session?: ClientSession,
  ) {
    if (amount <= 0) {
      return this.findDocument(organizationId, departmentId, session);
    }
    return DepartmentModel.findOneAndUpdate(
      {
        _id: departmentId,
        organizationId,
        isDeleted: { $ne: true },
        $expr: {
          $or: [
            { $lte: [{ $ifNull: ["$budgetAllocated", 0] }, 0] },
            {
              $lte: [
                {
                  $add: [
                    { $ifNull: ["$budgetUsed", 0] },
                    { $ifNull: ["$budgetCommitted", 0] },
                    amount,
                  ],
                },
                "$budgetAllocated",
              ],
            },
          ],
        },
      },
      { $inc: { budgetUsed: amount } },
      { new: true, runValidators: true, session },
    );
  }

  releaseBudget(
    organizationId: string,
    departmentId: string,
    amount: number,
    session?: ClientSession,
  ) {
    if (amount <= 0) {
      return this.findDocument(organizationId, departmentId, session);
    }
    return DepartmentModel.findOneAndUpdate(
      {
        _id: departmentId,
        organizationId,
        isDeleted: { $ne: true },
        budgetCommitted: { $gte: amount },
      },
      { $inc: { budgetCommitted: -amount } },
      { new: true, runValidators: true, session },
    );
  }
}

export const departmentRepository = new DepartmentRepository();
