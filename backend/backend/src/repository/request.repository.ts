import { ClientSession, FilterQuery } from "mongoose";
import { RequestStatus } from "../constants/status";
import { IStockRequest, StockRequestModel } from "./schemas";

export class RequestRepository {
  create(data: {
    organizationId: string;
    requestNumber: string;
    departmentId: string;
    warehouseId: string;
    requestedBy: string;
    lines: Array<{
      itemId: string;
      requestedQuantity: number;
      fulfilledQuantity?: number;
      notes?: string;
    }>;
    purpose?: string;
  }) {
    return StockRequestModel.create(data);
  }

  findById(organizationId: string, id: string) {
    return StockRequestModel.findOne({ _id: id, organizationId })
      .populate("lines.itemId", "name sku unit")
      .populate("departmentId", "name code")
      .populate("warehouseId", "name code")
      .populate("requestedBy approvedBy fulfilledBy rejectedBy", "name email role");
  }

  findForUpdate(organizationId: string, id: string) {
    return StockRequestModel.findOne({ _id: id, organizationId });
  }

  list(
    organizationId: string,
    filter: {
      departmentIds?: string[];
      warehouseIds?: string[];
      status?: RequestStatus;
    },
  ) {
    const query: FilterQuery<IStockRequest> = { organizationId };
    if (filter.departmentIds) query.departmentId = { $in: filter.departmentIds };
    if (filter.warehouseIds) query.warehouseId = { $in: filter.warehouseIds };
    if (filter.status) query.status = filter.status;
    return StockRequestModel.find(query)
      .populate("lines.itemId", "name sku unit")
      .populate("departmentId", "name code")
      .populate("warehouseId", "name code")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });
  }

  updateStatus(
    organizationId: string,
    id: string,
    currentStatuses: RequestStatus[],
    update: Record<string, unknown>,
    session?: ClientSession,
  ) {
    return StockRequestModel.findOneAndUpdate(
      { _id: id, organizationId, status: { $in: currentStatuses } },
      update,
      { new: true, runValidators: true, session },
    );
  }
}

export const requestRepository = new RequestRepository();
