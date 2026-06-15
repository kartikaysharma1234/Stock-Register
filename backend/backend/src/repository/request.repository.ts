import {
  ClientSession,
  FilterQuery,
  UpdateQuery,
} from "mongoose";
import {
  RequestPriority,
  RequestStatus,
} from "../constants";
import {
  IStockRequest,
  StockRequestModel,
} from "./schemas";

export interface RequestListFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: RequestStatus;
  statuses?: RequestStatus[];
  priority?: RequestPriority;
  departmentId?: string;
  warehouseId?: string;
  requestedBy?: string;
  departmentIds?: string[];
  warehouseIds?: string[];
  scopeRequestedBy?: string;
  requiredFrom?: Date;
  requiredTo?: Date;
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "requestNumber"
    | "priority"
    | "requiredByDate";
  sortOrder?: "asc" | "desc";
}

export interface RequestLineRecord {
  itemId: string;
  variantId?: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  fulfilledQuantity?: number;
  unitCost?: number;
  notes?: string;
  rejectionReason?: string;
}

export interface RequestCreateRecord {
  organizationId: string;
  requestNumber: string;
  departmentId: string;
  warehouseId: string;
  requestedBy: string;
  status?: RequestStatus;
  lines: RequestLineRecord[];
  priority?: RequestPriority;
  requiredByDate?: Date;
  purpose?: string;
  approvalHistory?: IStockRequest["approvalHistory"];
}

export class RequestRepository {
  create(data: RequestCreateRecord, session?: ClientSession) {
    if (session) {
      return StockRequestModel.create([data], { session }).then(
        ([request]) => request,
      );
    }
    return StockRequestModel.create(data);
  }

  findById(organizationId: string, id: string) {
    return StockRequestModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    })
      .populate("lines.itemId", "name sku unit barcode")
      .populate("departmentId", "name code budgetAllocated budgetUsed")
      .populate("warehouseId", "name code")
      .populate(
        "requestedBy approvedBy fulfilledBy rejectedBy cancelledBy",
        "name email role",
      )
      .populate("approvalHistory.performedBy", "name email role");
  }

  findForUpdate(
    organizationId: string,
    id: string,
    session?: ClientSession,
  ) {
    return StockRequestModel.findOne({
      _id: id,
      organizationId,
      isDeleted: { $ne: true },
    }).session(session ?? null);
  }

  async list(
    organizationId: string,
    filter: RequestListFilter = {},
  ) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const query: FilterQuery<IStockRequest> = {
      organizationId,
      isDeleted: { $ne: true },
    };
    if (filter.status) query.status = filter.status;
    if (filter.statuses) query.status = { $in: filter.statuses };
    if (filter.priority) query.priority = filter.priority;
    if (filter.departmentId) query.departmentId = filter.departmentId;
    if (filter.warehouseId) query.warehouseId = filter.warehouseId;
    if (filter.requestedBy) query.requestedBy = filter.requestedBy;
    if (filter.requiredFrom || filter.requiredTo) {
      query.requiredByDate = {
        ...(filter.requiredFrom ? { $gte: filter.requiredFrom } : {}),
        ...(filter.requiredTo ? { $lte: filter.requiredTo } : {}),
      };
    }
    const scope: FilterQuery<IStockRequest>[] = [];
    if (filter.departmentIds?.length) {
      scope.push({ departmentId: { $in: filter.departmentIds } });
    }
    if (filter.warehouseIds?.length) {
      scope.push({ warehouseId: { $in: filter.warehouseIds } });
    }
    if (filter.scopeRequestedBy) {
      scope.push({ requestedBy: filter.scopeRequestedBy });
    }
    if (scope.length) {
      query.$and = [...(query.$and ?? []), { $or: scope }];
    }
    if (filter.search) {
      const search = filter.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$and = [
        ...(query.$and ?? []),
        {
          $or: [
            { requestNumber: { $regex: search, $options: "i" } },
            { purpose: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }
    const sortBy = filter.sortBy ?? "createdAt";
    const direction = filter.sortOrder === "asc" ? 1 : -1;
    const [requests, total] = await Promise.all([
      StockRequestModel.find(query)
        .populate("lines.itemId", "name sku unit barcode")
        .populate("departmentId", "name code")
        .populate("warehouseId", "name code")
        .populate("requestedBy", "name email role")
        .sort({ [sortBy]: direction })
        .skip((page - 1) * limit)
        .limit(limit),
      StockRequestModel.countDocuments(query),
    ]);
    return {
      requests,
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
    data: UpdateQuery<IStockRequest>,
    session?: ClientSession,
  ) {
    return StockRequestModel.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true, session },
    );
  }

  transition(
    organizationId: string,
    id: string,
    currentStatuses: RequestStatus[],
    update: UpdateQuery<IStockRequest>,
    session?: ClientSession,
  ) {
    return StockRequestModel.findOneAndUpdate(
      {
        _id: id,
        organizationId,
        status: { $in: currentStatuses },
        isDeleted: { $ne: true },
      },
      update,
      { new: true, runValidators: true, session },
    );
  }

  updateStatus(
    organizationId: string,
    id: string,
    currentStatuses: RequestStatus[],
    update: UpdateQuery<IStockRequest>,
    session?: ClientSession,
  ) {
    return this.transition(
      organizationId,
      id,
      currentStatuses,
      update,
      session,
    );
  }
}

export const requestRepository = new RequestRepository();
