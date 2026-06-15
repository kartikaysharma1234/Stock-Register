import mongoose from "mongoose";
import { Role } from "../constants/roles";
import { NotificationType, RequestStatus } from "../constants/status";
import { requestRepository } from "../repository/request.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { inventoryService } from "./inventory.service";
import { notificationService } from "./notification.service";

export class RequestService {
  private organizationId(actor: AuthUser) {
    if (!actor.organizationId) throw new ApiError(400, "Organization is required");
    return actor.organizationId;
  }

  async create(
    actor: AuthUser,
    data: {
      departmentId: string;
      warehouseId: string;
      lines: Array<{ itemId: string; requestedQuantity: number; notes?: string }>;
      purpose?: string;
    },
  ) {
    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      !actor.departmentIds.includes(data.departmentId)
    ) {
      throw new ApiError(403, "Department is outside your assigned scope");
    }
    return requestRepository.create({
      ...data,
      organizationId: this.organizationId(actor),
      requestNumber: `REQ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      requestedBy: actor.id,
      lines: data.lines.map((line) => ({ ...line, fulfilledQuantity: 0 })),
    });
  }

  list(actor: AuthUser, status?: RequestStatus) {
    const filter: Parameters<typeof requestRepository.list>[1] = { status };
    if (actor.role === Role.DEPARTMENT_HEAD) {
      filter.departmentIds = actor.departmentIds;
    }
    if (actor.role === Role.STORE_MANAGER || actor.role === Role.SUB_ADMIN) {
      filter.warehouseIds = actor.warehouseIds;
    }
    return requestRepository.list(this.organizationId(actor), filter);
  }

  get(actor: AuthUser, id: string) {
    return requestRepository.findById(this.organizationId(actor), id);
  }

  async approve(actor: AuthUser, id: string) {
    const organizationId = this.organizationId(actor);
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      !actor.departmentIds.includes(request.departmentId.toString())
    ) {
      throw new ApiError(403, "Request is outside your department scope");
    }
    if (
      actor.role === Role.SUB_ADMIN &&
      !actor.departmentIds.includes(request.departmentId.toString()) &&
      !actor.warehouseIds.includes(request.warehouseId.toString())
    ) {
      throw new ApiError(403, "Request is outside your assigned scope");
    }
    const updated = await requestRepository.updateStatus(
      organizationId,
      id,
      [RequestStatus.PENDING],
      {
        status: RequestStatus.APPROVED,
        approvedBy: actor.id,
        approvedAt: new Date(),
      },
    );
    if (!updated) throw new ApiError(409, "Request is no longer pending");
    await this.notifyStatus(updated.requestedBy.toString(), organizationId, updated);
    return updated;
  }

  async reject(actor: AuthUser, id: string, reason: string) {
    const organizationId = this.organizationId(actor);
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    const updated = await requestRepository.updateStatus(
      organizationId,
      id,
      [RequestStatus.PENDING, RequestStatus.APPROVED],
      {
        status: RequestStatus.REJECTED,
        rejectedBy: actor.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    );
    if (!updated) throw new ApiError(409, "Request cannot be rejected");
    await this.notifyStatus(updated.requestedBy.toString(), organizationId, updated);
    return updated;
  }

  async fulfill(actor: AuthUser, id: string) {
    const organizationId = this.organizationId(actor);
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    if (
      [Role.STORE_MANAGER, Role.SUB_ADMIN].includes(actor.role) &&
      !actor.warehouseIds.includes(request.warehouseId.toString())
    ) {
      throw new ApiError(403, "Request is outside your warehouse scope");
    }
    const session = await mongoose.startSession();
    let updated;
    try {
      await session.withTransaction(async () => {
        for (const line of request.lines) {
          await inventoryService.stockOut(
            {
              organizationId,
              itemId: line.itemId.toString(),
              warehouseId: request.warehouseId.toString(),
              departmentId: request.departmentId.toString(),
              quantity: line.requestedQuantity,
              performedBy: actor.id,
              referenceType: "StockRequest",
              referenceId: request.id,
            },
            session,
          );
          line.fulfilledQuantity = line.requestedQuantity;
        }
        updated = await requestRepository.updateStatus(
          organizationId,
          id,
          [RequestStatus.APPROVED],
          {
            status: RequestStatus.FULFILLED,
            fulfilledBy: actor.id,
            fulfilledAt: new Date(),
            lines: request.lines,
          },
          session,
        );
        if (!updated) throw new ApiError(409, "Request is no longer approved");
      });
    } finally {
      await session.endSession();
    }
    if (!updated) throw new ApiError(409, "Request could not be fulfilled");
    await this.notifyStatus(
      request.requestedBy.toString(),
      organizationId,
      updated,
    );
    await inventoryService.alertLowStockForWarehouse(
      organizationId,
      request.warehouseId.toString(),
    );
    return updated;
  }

  async override(
    actor: AuthUser,
    id: string,
    status: RequestStatus.APPROVED | RequestStatus.REJECTED | RequestStatus.FULFILLED,
    reason?: string,
  ) {
    if (![Role.ADMIN, Role.SUPER_ADMIN].includes(actor.role)) {
      throw new ApiError(403, "Only admins can override request status");
    }
    const organizationId = this.organizationId(actor);
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    if (request.status === RequestStatus.FULFILLED) {
      throw new ApiError(409, "A fulfilled request cannot be reopened");
    }
    if (status === RequestStatus.FULFILLED) {
      if (request.status !== RequestStatus.APPROVED) {
        await requestRepository.updateStatus(
          organizationId,
          id,
          [request.status],
          {
            status: RequestStatus.APPROVED,
            approvedBy: actor.id,
            approvedAt: new Date(),
            rejectionReason: undefined,
          },
        );
      }
      return this.fulfill(actor, id);
    }
    const updated = await requestRepository.updateStatus(
      organizationId,
      id,
      [request.status],
      status === RequestStatus.APPROVED
        ? {
            status,
            approvedBy: actor.id,
            approvedAt: new Date(),
            rejectionReason: undefined,
          }
        : {
            status,
            rejectedBy: actor.id,
            rejectedAt: new Date(),
            rejectionReason: reason ?? "Overridden by administrator",
          },
    );
    if (!updated) throw new ApiError(409, "Request status changed; retry");
    await this.notifyStatus(
      request.requestedBy.toString(),
      organizationId,
      updated,
    );
    return updated;
  }

  private async notifyStatus(
    userId: string,
    organizationId: string,
    request: { requestNumber: string; status: RequestStatus },
  ) {
    await notificationService.notifyUser({
      organizationId,
      userId,
      type: NotificationType.REQUEST_STATUS,
      title: `Stock request ${request.status}`,
      message: `${request.requestNumber} is now ${request.status}.`,
      template: "requestStatus",
      variables: {
        requestNumber: request.requestNumber,
        status: request.status,
      },
    });
  }
}

export const requestService = new RequestService();
