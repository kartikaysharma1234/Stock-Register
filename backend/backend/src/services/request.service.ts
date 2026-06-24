import { ClientSession, HydratedDocument, Types } from "mongoose";
import {
  CounterType,
  NotificationType,
  RequestAction,
  RequestPriority,
  RequestStatus,
  Role,
  StockReferenceType,
} from "../constants";
import { counterRepository } from "../repository/counter.repository";
import { departmentRepository } from "../repository/department.repository";
import { inventoryRepository } from "../repository/inventory.repository";
import {
  RequestLineRecord,
  RequestListFilter,
  requestRepository,
} from "../repository/request.repository";
import { IStockRequest } from "../repository/schemas";
import { userRepository } from "../repository/user.repository";
import { AuthUser } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { runWithOptionalTransaction } from "../utils/mongo-transaction";
import { auditService } from "./audit.service";
import { inventoryService } from "./inventory.service";
import { notificationService } from "./notification.service";

export interface RequestItemInput {
  itemId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
}

export interface RequestCreateInput {
  organizationId?: string;
  departmentId: string;
  warehouseId: string;
  items: RequestItemInput[];
  priority?: RequestPriority;
  requiredByDate?: Date;
  notes?: string;
}

export interface RequestUpdateInput {
  departmentId?: string;
  warehouseId?: string;
  items?: RequestItemInput[];
  priority?: RequestPriority;
  requiredByDate?: Date | null;
  notes?: string | null;
}

export interface RequestApprovalInput {
  items?: Array<{
    itemId: string;
    variantId?: string;
    approvedQuantity: number;
    rejectionReason?: string;
  }>;
  comments?: string;
}

export interface RequestFulfillmentInput {
  items?: Array<{
    itemId: string;
    variantId?: string;
    quantity: number;
    batchNumber?: string;
    serialNumbers?: string[];
  }>;
  comments?: string;
}

type RequestDocument = HydratedDocument<IStockRequest>;

const terminalStatuses = new Set<RequestStatus>([
  RequestStatus.FULFILLED,
  RequestStatus.REJECTED,
  RequestStatus.CANCELLED,
]);

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const lineKey = (itemId: string, variantId?: string) =>
  `${itemId}:${variantId ?? ""}`;

const lineItemId = (line: IStockRequest["lines"][number]) =>
  line.itemId.toString();

const lineVariantId = (line: IStockRequest["lines"][number]) =>
  line.variantId?.toString();

export class RequestService {
  private organizationId(actor: AuthUser, requestedOrganizationId?: string) {
    if (actor.role === Role.SUPER_ADMIN) {
      if (!requestedOrganizationId) {
        throw new ApiError(400, "organizationId is required");
      }
      return requestedOrganizationId;
    }
    if (!actor.organizationId) {
      throw new ApiError(400, "Organization context is required");
    }
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== actor.organizationId
    ) {
      throw new ApiError(403, "Organization context mismatch");
    }
    return actor.organizationId;
  }

  private actorDepartmentIds(actor: AuthUser) {
    return [
      ...new Set([
        ...actor.departmentIds,
        ...(actor.departmentId ? [actor.departmentId] : []),
      ]),
    ];
  }

  private actorWarehouseIds(actor: AuthUser) {
    return [
      ...new Set([
        ...actor.warehouseIds,
        ...(actor.warehouseId ? [actor.warehouseId] : []),
      ]),
    ];
  }

  private isAdmin(actor: AuthUser) {
    return [Role.ADMIN, Role.SUPER_ADMIN].includes(actor.role);
  }

  private canAccess(actor: AuthUser, request: RequestDocument) {
    if (this.isAdmin(actor)) return true;
    if (request.requestedBy.toString() === actor.id) return true;
    const departmentId = request.departmentId.toString();
    const warehouseId = request.warehouseId.toString();
    if (actor.role === Role.DEPARTMENT_HEAD) {
      return this.actorDepartmentIds(actor).includes(departmentId);
    }
    if (actor.role === Role.STORE_MANAGER) {
      return this.actorWarehouseIds(actor).includes(warehouseId);
    }
    if (actor.role === Role.SUB_ADMIN) {
      return (
        this.actorDepartmentIds(actor).includes(departmentId) ||
        this.actorWarehouseIds(actor).includes(warehouseId)
      );
    }
    if (actor.role === Role.VIEWER) {
      return (
        this.actorDepartmentIds(actor).includes(departmentId) ||
        this.actorWarehouseIds(actor).includes(warehouseId)
      );
    }
    return false;
  }

  private assertAccess(actor: AuthUser, request: RequestDocument) {
    if (!this.canAccess(actor, request)) {
      throw new ApiError(403, "Request is outside your assigned scope");
    }
  }

  private assertCreateScope(
    actor: AuthUser,
    departmentId: string,
    warehouseId: string,
  ) {
    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      !this.actorDepartmentIds(actor).includes(departmentId)
    ) {
      throw new ApiError(403, "Department is outside your assigned scope");
    }
    if (
      actor.role === Role.SUB_ADMIN &&
      !this.actorDepartmentIds(actor).includes(departmentId) &&
      !this.actorWarehouseIds(actor).includes(warehouseId)
    ) {
      throw new ApiError(403, "Request is outside your assigned scope");
    }
  }

  private canApproveDepartment(actor: AuthUser, request: RequestDocument) {
    if (this.isAdmin(actor)) return true;
    const departmentId = request.departmentId.toString();
    return (
      [Role.DEPARTMENT_HEAD, Role.SUB_ADMIN].includes(actor.role) &&
      this.actorDepartmentIds(actor).includes(departmentId)
    );
  }

  private canApproveStore(actor: AuthUser, request: RequestDocument) {
    if (this.isAdmin(actor)) return true;
    const warehouseId = request.warehouseId.toString();
    return (
      [Role.STORE_MANAGER, Role.SUB_ADMIN].includes(actor.role) &&
      this.actorWarehouseIds(actor).includes(warehouseId)
    );
  }

  private scopedFilter(
    actor: AuthUser,
    filter: RequestListFilter,
  ): RequestListFilter {
    if (this.isAdmin(actor)) return filter;
    if (actor.role === Role.DEPARTMENT_HEAD) {
      return {
        ...filter,
        departmentIds: this.actorDepartmentIds(actor),
        scopeRequestedBy: actor.id,
      };
    }
    if (actor.role === Role.STORE_MANAGER) {
      return {
        ...filter,
        warehouseIds: this.actorWarehouseIds(actor),
        scopeRequestedBy: actor.id,
      };
    }
    if (actor.role === Role.SUB_ADMIN || actor.role === Role.VIEWER) {
      return {
        ...filter,
        departmentIds: this.actorDepartmentIds(actor),
        warehouseIds: this.actorWarehouseIds(actor),
        scopeRequestedBy: actor.id,
      };
    }
    return { ...filter, scopeRequestedBy: actor.id };
  }

  private history(
    actor: AuthUser,
    action: RequestAction,
    comments?: string,
  ): IStockRequest["approvalHistory"][number] {
    return {
      action,
      performedBy: new Types.ObjectId(actor.id),
      role: actor.role,
      comments,
      timestamp: new Date(),
    };
  }

  private async validateContext(
    organizationId: string,
    departmentId: string,
    warehouseId: string,
    items: RequestItemInput[],
  ) {
    const [department, warehouse] = await Promise.all([
      departmentRepository.findDocument(organizationId, departmentId),
      inventoryRepository.findWarehouse(organizationId, warehouseId),
    ]);
    if (!department?.isActive) {
      throw new ApiError(422, "Department is inactive or unavailable");
    }
    if (!warehouse) {
      throw new ApiError(422, "Warehouse is inactive or unavailable");
    }
    const keys = items.map((item) => lineKey(item.itemId, item.variantId));
    if (new Set(keys).size !== keys.length) {
      throw new ApiError(422, "Request items must be unique");
    }
    const documents = await Promise.all(
      items.map((item) =>
        inventoryRepository.findItemDocument(organizationId, item.itemId),
      ),
    );
    for (let index = 0; index < documents.length; index += 1) {
      const document = documents[index];
      const input = items[index];
      if (!document?.isActive) {
        throw new ApiError(422, `Item ${input.itemId} is inactive or unavailable`);
      }
      if (
        input.variantId &&
        !document.variants.some(
          (variant) => variant._id.toString() === input.variantId,
        )
      ) {
        throw new ApiError(422, `Variant ${input.variantId} is unavailable`);
      }
    }
  }

  private requestLines(items: RequestItemInput[]): RequestLineRecord[] {
    return items.map((item) => ({
      itemId: item.itemId,
      variantId: item.variantId,
      requestedQuantity: item.quantity,
      approvedQuantity: 0,
      fulfilledQuantity: 0,
      unitCost: 0,
      notes: item.notes,
    }));
  }

  async create(actor: AuthUser, data: RequestCreateInput) {
    const organizationId = this.organizationId(actor, data.organizationId);
    this.assertCreateScope(actor, data.departmentId, data.warehouseId);
    await this.validateContext(
      organizationId,
      data.departmentId,
      data.warehouseId,
      data.items,
    );
    const request = await runWithOptionalTransaction(
      async (session) => {
        const requestNumber = await counterRepository.nextNumber(
          organizationId,
          CounterType.STOCK_REQUEST,
          session,
        );
        return requestRepository.create(
          {
            organizationId,
            requestNumber,
            departmentId: data.departmentId,
            warehouseId: data.warehouseId,
            requestedBy: actor.id,
            status: RequestStatus.DRAFT,
            lines: this.requestLines(data.items),
            priority: data.priority,
            requiredByDate: data.requiredByDate,
            purpose: data.notes,
            approvalHistory: [
              this.history(actor, RequestAction.CREATED),
            ],
          },
          session,
        );
      },
    );
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "request.create",
        entityType: "StockRequest",
        entityId: request.id,
        after: request.toObject(),
      },
    );
    return requestRepository.findById(organizationId, request.id);
  }

  list(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: RequestListFilter = {},
  ) {
    return requestRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedFilter(actor, filter),
    );
  }

  async get(
    actor: AuthUser,
    id: string,
    requestedOrganizationId?: string,
  ) {
    const request = await requestRepository.findById(
      this.organizationId(actor, requestedOrganizationId),
      id,
    );
    if (!request) throw new ApiError(404, "Stock request not found");
    this.assertAccess(actor, request);
    return request;
  }

  async update(
    actor: AuthUser,
    id: string,
    data: RequestUpdateInput,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    this.assertAccess(actor, request);
    if (
      request.requestedBy.toString() !== actor.id &&
      !this.isAdmin(actor)
    ) {
      throw new ApiError(403, "Only the requester or an admin can edit a draft");
    }
    if (request.status !== RequestStatus.DRAFT) {
      throw new ApiError(409, "Only draft requests can be edited");
    }
    const departmentId =
      data.departmentId ?? request.departmentId.toString();
    const warehouseId =
      data.warehouseId ?? request.warehouseId.toString();
    const items =
      data.items ??
      request.lines.map((line) => ({
        itemId: line.itemId.toString(),
        variantId: line.variantId?.toString(),
        quantity: line.requestedQuantity,
        notes: line.notes,
      }));
    this.assertCreateScope(actor, departmentId, warehouseId);
    await this.validateContext(
      organizationId,
      departmentId,
      warehouseId,
      items,
    );
    const unset: Record<string, 1> = {};
    if (data.requiredByDate === null) unset.requiredByDate = 1;
    if (data.notes === null) unset.purpose = 1;
    const update: Record<string, unknown> = {
      ...(data.departmentId ? { departmentId } : {}),
      ...(data.warehouseId ? { warehouseId } : {}),
      ...(data.items ? { lines: this.requestLines(items) } : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.requiredByDate !== undefined
        ? data.requiredByDate === null
          ? {}
          : { requiredByDate: data.requiredByDate }
        : {}),
      ...(data.notes !== undefined
        ? data.notes === null
          ? {}
          : { purpose: data.notes }
        : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $push: {
        approvalHistory: this.history(actor, RequestAction.UPDATED),
      },
    };
    const updated = await requestRepository.transition(
      organizationId,
      id,
      [RequestStatus.DRAFT],
      update,
    );
    if (!updated) throw new ApiError(409, "Request changed; retry the update");
    await auditService.record(
      { actorId: actor.id, organizationId },
      {
        action: "request.update",
        entityType: "StockRequest",
        entityId: id,
        before: request.toObject(),
        after: updated.toObject(),
      },
    );
    return requestRepository.findById(organizationId, id);
  }

  async submit(
    actor: AuthUser,
    id: string,
    comments?: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    this.assertAccess(actor, request);
    if (
      request.requestedBy.toString() !== actor.id &&
      !this.isAdmin(actor)
    ) {
      throw new ApiError(403, "Only the requester or an admin can submit");
    }
    const updated = await requestRepository.transition(
      organizationId,
      id,
      [RequestStatus.DRAFT],
      {
        status: RequestStatus.PENDING,
        $push: {
          approvalHistory: this.history(
            actor,
            RequestAction.SUBMITTED,
            comments,
          ),
        },
      },
    );
    if (!updated) throw new ApiError(409, "Only draft requests can be submitted");
    await Promise.all([
      this.notifyStatus(updated.requestedBy.toString(), organizationId, updated),
      this.notifyDepartmentApprovers(
        organizationId,
        updated.departmentId.toString(),
        updated,
      ),
      auditService.record(
        { actorId: actor.id, organizationId },
        {
          action: "request.submit",
          entityType: "StockRequest",
          entityId: id,
          before: request.toObject(),
          after: updated.toObject(),
        },
      ),
    ]);
    return requestRepository.findById(organizationId, id);
  }

  private approvedLines(
    request: RequestDocument,
    approval: RequestApprovalInput,
    maximum: "requested" | "approved",
  ) {
    const supplied = new Map(
      (approval.items ?? []).map((item) => [
        lineKey(item.itemId, item.variantId),
        item,
      ]),
    );
    for (const item of approval.items ?? []) {
      if (
        !request.lines.some(
          (line) =>
            lineKey(lineItemId(line), lineVariantId(line)) ===
            lineKey(item.itemId, item.variantId),
        )
      ) {
        throw new ApiError(422, `Item ${item.itemId} is not in this request`);
      }
    }
    const lines = request.lines.map((line) => {
      const suppliedLine = supplied.get(
        lineKey(lineItemId(line), lineVariantId(line)),
      );
      const upperLimit =
        maximum === "requested"
          ? line.requestedQuantity
          : line.approvedQuantity;
      const approvedQuantity =
        suppliedLine?.approvedQuantity ?? upperLimit;
      if (approvedQuantity < 0 || approvedQuantity > upperLimit) {
        throw new ApiError(
          422,
          `Approved quantity for item ${line.itemId} is invalid`,
        );
      }
      return {
        itemId: line.itemId,
        variantId: line.variantId,
        requestedQuantity: line.requestedQuantity,
        approvedQuantity,
        fulfilledQuantity: line.fulfilledQuantity,
        unitCost: line.unitCost,
        notes: line.notes,
        rejectionReason:
          suppliedLine?.rejectionReason ??
          (approvedQuantity < line.requestedQuantity
            ? line.rejectionReason
            : undefined),
      };
    });
    if (!lines.some((line) => line.approvedQuantity > 0)) {
      throw new ApiError(422, "At least one item must be approved");
    }
    return lines;
  }

  async approve(
    actor: AuthUser,
    id: string,
    approval: RequestApprovalInput = {},
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const initial = await requestRepository.findForUpdate(organizationId, id);
    if (!initial) throw new ApiError(404, "Stock request not found");

    if (initial.status === RequestStatus.PENDING) {
      if (!this.canApproveDepartment(actor, initial)) {
        throw new ApiError(403, "Department approval is outside your scope");
      }
      const lines = this.approvedLines(initial, approval, "requested");
      const updated = await requestRepository.transition(
        organizationId,
        id,
        [RequestStatus.PENDING],
        {
          status: RequestStatus.DEPT_APPROVED,
          lines,
          $push: {
            approvalHistory: this.history(
              actor,
              RequestAction.DEPARTMENT_APPROVED,
              approval.comments,
            ),
          },
        },
      );
      if (!updated) throw new ApiError(409, "Request approval state changed");
      await Promise.all([
        this.notifyStatus(updated.requestedBy.toString(), organizationId, updated),
        this.notifyWarehouseApprovers(
          organizationId,
          updated.warehouseId.toString(),
          updated,
        ),
        auditService.record(
          { actorId: actor.id, organizationId },
          {
            action: "request.department_approve",
            entityType: "StockRequest",
            entityId: id,
            before: initial.toObject(),
            after: updated.toObject(),
          },
        ),
      ]);
      return requestRepository.findById(organizationId, id);
    }

    if (initial.status !== RequestStatus.DEPT_APPROVED) {
      throw new ApiError(409, "Request is not awaiting approval");
    }
    if (!this.canApproveStore(actor, initial)) {
      throw new ApiError(403, "Store approval is outside your scope");
    }

    const updated = await runWithOptionalTransaction(
      async (session) => {
        const request = await requestRepository.findForUpdate(
          organizationId,
          id,
          session,
        );
        if (!request || request.status !== RequestStatus.DEPT_APPROVED) {
          throw new ApiError(409, "Request approval state changed");
        }
        const lines = this.approvedLines(request, approval, "approved");
        let budgetAmount = 0;
        for (const line of lines) {
          if (line.approvedQuantity <= 0) continue;
          const reserved = await inventoryService.reserveStock(
            {
              organizationId,
              itemId: line.itemId.toString(),
              warehouseId: request.warehouseId.toString(),
              quantity: line.approvedQuantity,
            },
            session,
          );
          line.unitCost = reserved.item.averageCost;
          budgetAmount += line.approvedQuantity * line.unitCost;
        }
        budgetAmount = roundMoney(budgetAmount);
        const department = await departmentRepository.reserveBudget(
          organizationId,
          request.departmentId.toString(),
          budgetAmount,
          session,
        );
        if (!department) {
          throw new ApiError(409, "Department budget is insufficient");
        }
        const updated = await requestRepository.transition(
          organizationId,
          id,
          [RequestStatus.DEPT_APPROVED],
          {
            status: RequestStatus.STORE_APPROVED,
            lines,
            approvedBy: actor.id,
            approvedAt: new Date(),
            stockReserved: true,
            budgetCommittedAmount: budgetAmount,
            $push: {
              approvalHistory: this.history(
                actor,
                RequestAction.STORE_APPROVED,
                approval.comments,
              ),
            },
          },
          session,
        );
        if (!updated) throw new ApiError(409, "Request approval state changed");
        return updated;
      },
    );
    await Promise.all([
      this.notifyStatus(
        initial.requestedBy.toString(),
        organizationId,
        updated,
      ),
      auditService.record(
        { actorId: actor.id, organizationId },
        {
          action: "request.store_approve",
          entityType: "StockRequest",
          entityId: id,
          before: initial.toObject(),
          after: updated.toObject(),
        },
      ),
    ]);
    return requestRepository.findById(organizationId, id);
  }

  private async releaseCommitments(
    organizationId: string,
    request: RequestDocument,
    session?: ClientSession,
  ) {
    if (request.stockReserved) {
      for (const line of request.lines) {
        const remaining = Math.max(
          0,
          line.approvedQuantity - line.fulfilledQuantity,
        );
        if (remaining <= 0) continue;
        await inventoryService.releaseReservedStock(
          {
            organizationId,
            itemId: line.itemId.toString(),
            warehouseId: request.warehouseId.toString(),
            quantity: remaining,
          },
          session,
        );
      }
    }
    const department = await departmentRepository.releaseBudget(
      organizationId,
      request.departmentId.toString(),
      request.budgetCommittedAmount ?? 0,
      session,
    );
    if (!department) {
      throw new ApiError(409, "Department budget commitment changed; retry");
    }
  }

  async reject(
    actor: AuthUser,
    id: string,
    reason: string,
    comments?: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const initial = await requestRepository.findForUpdate(organizationId, id);
    if (!initial) throw new ApiError(404, "Stock request not found");
    if (terminalStatuses.has(initial.status)) {
      throw new ApiError(409, "Request is already closed");
    }
    const allowed =
      this.isAdmin(actor) ||
      (initial.status === RequestStatus.PENDING &&
        this.canApproveDepartment(actor, initial)) ||
      (initial.status === RequestStatus.DEPT_APPROVED &&
        this.canApproveStore(actor, initial));
    if (!allowed) throw new ApiError(403, "Request rejection is outside your scope");

    const updated = await runWithOptionalTransaction(
      async (session) => {
        const request = await requestRepository.findForUpdate(
          organizationId,
          id,
          session,
        );
        if (!request || terminalStatuses.has(request.status)) {
          throw new ApiError(409, "Request status changed");
        }
        await this.releaseCommitments(organizationId, request, session);
        const updated = await requestRepository.transition(
          organizationId,
          id,
          [request.status],
          {
            status: RequestStatus.REJECTED,
            rejectedBy: actor.id,
            rejectedAt: new Date(),
            rejectionReason: reason,
            stockReserved: false,
            budgetCommittedAmount: 0,
            $push: {
              approvalHistory: this.history(
                actor,
                RequestAction.REJECTED,
                comments ?? reason,
              ),
            },
          },
          session,
        );
        if (!updated) throw new ApiError(409, "Request status changed");
        return updated;
      },
    );
    await Promise.all([
      this.notifyStatus(initial.requestedBy.toString(), organizationId, updated),
      auditService.record(
        { actorId: actor.id, organizationId },
        {
          action: "request.reject",
          entityType: "StockRequest",
          entityId: id,
          before: initial.toObject(),
          after: updated.toObject(),
          metadata: { reason },
        },
      ),
    ]);
    return requestRepository.findById(organizationId, id);
  }

  async fulfill(
    actor: AuthUser,
    id: string,
    data: RequestFulfillmentInput = {},
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const initial = await requestRepository.findForUpdate(organizationId, id);
    if (!initial) throw new ApiError(404, "Stock request not found");
    if (!this.canApproveStore(actor, initial)) {
      throw new ApiError(403, "Request fulfillment is outside your scope");
    }
    const fulfillableStatuses = [
      RequestStatus.STORE_APPROVED,
      RequestStatus.PARTIALLY_FULFILLED,
      RequestStatus.APPROVED,
    ];
    if (!fulfillableStatuses.includes(initial.status)) {
      throw new ApiError(409, "Request is not ready for fulfillment");
    }

    const updated = await runWithOptionalTransaction(
      async (session) => {
        const request = await requestRepository.findForUpdate(
          organizationId,
          id,
          session,
        );
        if (!request || !fulfillableStatuses.includes(request.status)) {
          throw new ApiError(409, "Request fulfillment state changed");
        }
        const supplied = new Map(
          (data.items ?? []).map((item) => [
            lineKey(item.itemId, item.variantId),
            item,
          ]),
        );
        for (const item of data.items ?? []) {
          if (
            !request.lines.some(
              (line) =>
                lineKey(lineItemId(line), lineVariantId(line)) ===
                lineKey(item.itemId, item.variantId),
            )
          ) {
            throw new ApiError(422, `Item ${item.itemId} is not in this request`);
          }
        }

        let usedAmount = 0;
        let fulfilledAny = false;
        const lines = request.lines.map((line) => ({
          itemId: line.itemId,
          variantId: line.variantId,
          requestedQuantity: line.requestedQuantity,
          approvedQuantity:
            line.approvedQuantity > 0
              ? line.approvedQuantity
              : request.status === RequestStatus.APPROVED
                ? line.requestedQuantity
                : 0,
          fulfilledQuantity: line.fulfilledQuantity,
          unitCost: line.unitCost,
          notes: line.notes,
          rejectionReason: line.rejectionReason,
        }));
        for (const line of lines) {
          const selection = supplied.get(
            lineKey(line.itemId.toString(), line.variantId?.toString()),
          );
          const remaining =
            line.approvedQuantity - line.fulfilledQuantity;
          const quantity =
            selection?.quantity ??
            (data.items ? 0 : remaining);
          if (quantity === 0) continue;
          if (quantity < 0 || quantity > remaining) {
            throw new ApiError(
              422,
              `Fulfillment quantity for item ${line.itemId} is invalid`,
            );
          }
          await inventoryService.stockOut(
            {
              organizationId,
              itemId: line.itemId.toString(),
              warehouseId: request.warehouseId.toString(),
              departmentId: request.departmentId.toString(),
              quantity,
              performedBy: actor.id,
              batchNumber: selection?.batchNumber,
              serialNumbers: selection?.serialNumbers,
              referenceType: StockReferenceType.STOCK_REQUEST,
              referenceId: request.id,
              consumeReservation: request.stockReserved,
            },
            session,
          );
          line.fulfilledQuantity += quantity;
          usedAmount += quantity * line.unitCost;
          fulfilledAny = true;
        }
        if (!fulfilledAny) {
          throw new ApiError(422, "At least one item must be fulfilled");
        }
        usedAmount = roundMoney(usedAmount);
        const allFulfilled = lines.every(
          (line) =>
            line.approvedQuantity <= 0 ||
            line.fulfilledQuantity >= line.approvedQuantity,
        );
        const committedToConsume = request.stockReserved
          ? allFulfilled
            ? request.budgetCommittedAmount
            : usedAmount
          : 0;
        const department = request.stockReserved
          ? await departmentRepository.consumeBudget(
              organizationId,
              request.departmentId.toString(),
              committedToConsume,
              usedAmount,
              session,
            )
          : await departmentRepository.recordBudgetUsage(
              organizationId,
              request.departmentId.toString(),
              usedAmount,
              session,
            );
        if (!department) {
          throw new ApiError(409, "Department budget changed; retry");
        }
        const nextStatus = allFulfilled
          ? RequestStatus.FULFILLED
          : RequestStatus.PARTIALLY_FULFILLED;
        const updated = await requestRepository.transition(
          organizationId,
          id,
          [request.status],
          {
            status: nextStatus,
            lines,
            fulfilledBy: actor.id,
            ...(allFulfilled ? { fulfilledAt: new Date() } : {}),
            stockReserved: request.stockReserved && !allFulfilled,
            budgetCommittedAmount: request.stockReserved
              ? Math.max(
                  0,
                  roundMoney(
                    request.budgetCommittedAmount - committedToConsume,
                  ),
                )
              : 0,
            $push: {
              approvalHistory: this.history(
                actor,
                allFulfilled
                  ? RequestAction.FULFILLED
                  : RequestAction.PARTIALLY_FULFILLED,
                data.comments,
              ),
            },
          },
          session,
        );
        if (!updated) throw new ApiError(409, "Request fulfillment state changed");
        return updated;
      },
    );
    await Promise.all([
      this.notifyStatus(initial.requestedBy.toString(), organizationId, updated),
      inventoryService.alertLowStockForWarehouse(
        organizationId,
        initial.warehouseId.toString(),
      ),
      auditService.record(
        { actorId: actor.id, organizationId },
        {
          action:
            updated.status === RequestStatus.FULFILLED
              ? "request.fulfill"
              : "request.partial_fulfill",
          entityType: "StockRequest",
          entityId: id,
          before: initial.toObject(),
          after: updated.toObject(),
        },
      ),
    ]);
    return requestRepository.findById(organizationId, id);
  }

  async cancel(
    actor: AuthUser,
    id: string,
    comments?: string,
    requestedOrganizationId?: string,
  ) {
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    const initial = await requestRepository.findForUpdate(organizationId, id);
    if (!initial) throw new ApiError(404, "Stock request not found");
    if (
      initial.requestedBy.toString() !== actor.id &&
      !this.isAdmin(actor)
    ) {
      throw new ApiError(403, "Only the requester or an admin can cancel");
    }
    if (terminalStatuses.has(initial.status)) {
      throw new ApiError(409, "Request is already closed");
    }
    const updated = await runWithOptionalTransaction(
      async (session) => {
        const request = await requestRepository.findForUpdate(
          organizationId,
          id,
          session,
        );
        if (!request || terminalStatuses.has(request.status)) {
          throw new ApiError(409, "Request status changed");
        }
        await this.releaseCommitments(organizationId, request, session);
        const updated = await requestRepository.transition(
          organizationId,
          id,
          [request.status],
          {
            status: RequestStatus.CANCELLED,
            cancelledBy: actor.id,
            cancelledAt: new Date(),
            stockReserved: false,
            budgetCommittedAmount: 0,
            $push: {
              approvalHistory: this.history(
                actor,
                RequestAction.CANCELLED,
                comments,
              ),
            },
          },
          session,
        );
        if (!updated) throw new ApiError(409, "Request status changed");
        return updated;
      },
    );
    await Promise.all([
      this.notifyStatus(initial.requestedBy.toString(), organizationId, updated),
      auditService.record(
        { actorId: actor.id, organizationId },
        {
          action: "request.cancel",
          entityType: "StockRequest",
          entityId: id,
          before: initial.toObject(),
          after: updated.toObject(),
        },
      ),
    ]);
    return requestRepository.findById(organizationId, id);
  }

  pending(
    actor: AuthUser,
    requestedOrganizationId: string | undefined,
    filter: RequestListFilter = {},
  ) {
    let statuses: RequestStatus[];
    if (actor.role === Role.DEPARTMENT_HEAD) {
      statuses = [RequestStatus.PENDING];
    } else if (actor.role === Role.STORE_MANAGER) {
      statuses = [RequestStatus.DEPT_APPROVED];
    } else if (actor.role === Role.SUB_ADMIN || this.isAdmin(actor)) {
      statuses = [RequestStatus.PENDING, RequestStatus.DEPT_APPROVED];
    } else {
      statuses = [];
    }
    return requestRepository.list(
      this.organizationId(actor, requestedOrganizationId),
      this.scopedFilter(actor, { ...filter, statuses }),
    );
  }

  async override(
    actor: AuthUser,
    id: string,
    status:
      | RequestStatus.DEPT_APPROVED
      | RequestStatus.STORE_APPROVED
      | RequestStatus.APPROVED
      | RequestStatus.REJECTED
      | RequestStatus.FULFILLED
      | RequestStatus.CANCELLED,
    reason?: string,
    requestedOrganizationId?: string,
  ) {
    if (!this.isAdmin(actor)) {
      throw new ApiError(403, "Only admins can override request status");
    }
    const organizationId = this.organizationId(
      actor,
      requestedOrganizationId,
    );
    if (status === RequestStatus.REJECTED) {
      return this.reject(
        actor,
        id,
        reason ?? "Overridden by administrator",
        reason,
        organizationId,
      );
    }
    if (status === RequestStatus.CANCELLED) {
      return this.cancel(actor, id, reason, organizationId);
    }

    let request = await requestRepository.findForUpdate(organizationId, id);
    if (!request) throw new ApiError(404, "Stock request not found");
    if (request.status === RequestStatus.DRAFT) {
      await this.submit(actor, id, reason, organizationId);
      request = await requestRepository.findForUpdate(organizationId, id);
    }
    if (
      request?.status === RequestStatus.PENDING
    ) {
      await this.approve(actor, id, { comments: reason }, organizationId);
      request = await requestRepository.findForUpdate(organizationId, id);
    }
    if (
      [
        RequestStatus.STORE_APPROVED,
        RequestStatus.APPROVED,
        RequestStatus.FULFILLED,
      ].includes(status) &&
      request?.status === RequestStatus.DEPT_APPROVED
    ) {
      await this.approve(actor, id, { comments: reason }, organizationId);
      request = await requestRepository.findForUpdate(organizationId, id);
    }
    if (status === RequestStatus.FULFILLED) {
      return this.fulfill(actor, id, { comments: reason }, organizationId);
    }
    if (!request) throw new ApiError(409, "Request override failed");
    return requestRepository.findById(organizationId, id);
  }

  private async notifyStatus(
    userId: string,
    organizationId: string,
    request: { requestNumber: string; status: RequestStatus },
  ) {
    return notificationService.notifyUser({
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

  private async notifyDepartmentApprovers(
    organizationId: string,
    departmentId: string,
    request: { requestNumber: string; status: RequestStatus },
  ) {
    const users = await userRepository.findDepartmentApprovers(
      organizationId,
      departmentId,
    );
    return notificationService.notifyMany(
      users.map((user) => user.id),
      {
        organizationId,
        type: NotificationType.REQUEST_UPDATE,
        title: `Approval required: ${request.requestNumber}`,
        message: `${request.requestNumber} is awaiting department approval.`,
        template: "requestApproval",
        variables: {
          requestNumber: request.requestNumber,
          status: request.status,
        },
      },
    );
  }

  private async notifyWarehouseApprovers(
    organizationId: string,
    warehouseId: string,
    request: { requestNumber: string; status: RequestStatus },
  ) {
    const users = await userRepository.findWarehouseApprovers(
      organizationId,
      warehouseId,
    );
    return notificationService.notifyMany(
      users.map((user) => user.id),
      {
        organizationId,
        type: NotificationType.REQUEST_UPDATE,
        title: `Store approval required: ${request.requestNumber}`,
        message: `${request.requestNumber} is awaiting store approval.`,
        template: "requestApproval",
        variables: {
          requestNumber: request.requestNumber,
          status: request.status,
        },
      },
    );
  }
}

export const requestService = new RequestService();
