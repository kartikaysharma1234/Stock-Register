import { Request, Response } from "express";
import {
  GrnListFilter,
  PaymentListFilter,
  PurchaseOrderListFilter,
  VendorListFilter,
} from "../repository/procurement.repository";
import { procurementService } from "../services/procurement.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

interface OrganizationQuery {
  organizationId?: string;
}

export const procurementController = {
  async createVendor(req: Request, res: Response) {
    res.status(201).json(
      await procurementService.createVendor(actorFrom(req), validatedBody(req)),
    );
  },

  async listVendors(req: Request, res: Response) {
    const query = validatedQuery<VendorListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listVendors(
        actorFrom(req),
        query.organizationId,
        query,
      ),
    );
  },

  async getVendor(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(await procurementService.getVendor(actorFrom(req), id, organizationId));
  },

  async updateVendor(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.updateVendor(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async deleteVendor(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    await procurementService.deleteVendor(actorFrom(req), id, organizationId);
    res.status(204).send();
  },

  async vendorOrders(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<PurchaseOrderListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listVendorOrders(
        actorFrom(req),
        id,
        query.organizationId,
        query,
      ),
    );
  },

  async vendorPayments(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const query = validatedQuery<PaymentListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listVendorPayments(
        actorFrom(req),
        id,
        query.organizationId,
        query,
      ),
    );
  },

  async compareVendors(req: Request, res: Response) {
    res.json(
      await procurementService.compareVendors(
        actorFrom(req),
        validatedQuery(req),
      ),
    );
  },

  async createPurchaseOrder(req: Request, res: Response) {
    res.status(201).json(
      await procurementService.createPurchaseOrder(
        actorFrom(req),
        validatedBody(req),
      ),
    );
  },

  async listPurchaseOrders(req: Request, res: Response) {
    const query = validatedQuery<PurchaseOrderListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listPurchaseOrders(
        actorFrom(req),
        query.organizationId,
        query,
      ),
    );
  },

  async getPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.getPurchaseOrder(
        actorFrom(req),
        id,
        organizationId,
      ),
    );
  },

  async updatePurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.updatePurchaseOrder(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async submitPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.submitPurchaseOrder(
        actorFrom(req),
        id,
        organizationId,
      ),
    );
  },

  async approvePurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.approvePurchaseOrder(
        actorFrom(req),
        id,
        organizationId,
      ),
    );
  },

  async rejectPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    const { reason } = validatedBody<{ reason: string }>(req);
    res.json(
      await procurementService.rejectPurchaseOrder(
        actorFrom(req),
        id,
        reason,
        organizationId,
      ),
    );
  },

  async sendPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(
      await procurementService.sendPurchaseOrder(
        actorFrom(req),
        id,
        organizationId,
      ),
    );
  },

  async cancelPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    const { reason } = validatedBody<{ reason?: string }>(req);
    res.json(
      await procurementService.cancelPurchaseOrder(
        actorFrom(req),
        id,
        reason,
        organizationId,
      ),
    );
  },

  async createGrn(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.status(201).json(
      await procurementService.createGrn(
        actorFrom(req),
        id,
        validatedBody(req),
        organizationId,
      ),
    );
  },

  async receiveGoods(req: Request, res: Response) {
    return procurementController.createGrn(req, res);
  },

  async listGrns(req: Request, res: Response) {
    const query = validatedQuery<GrnListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listGrns(
        actorFrom(req),
        query.organizationId,
        query,
      ),
    );
  },

  async getGrn(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { organizationId } = validatedQuery<OrganizationQuery>(req);
    res.json(await procurementService.getGrn(actorFrom(req), id, organizationId));
  },

  async createPayment(req: Request, res: Response) {
    res.status(201).json(
      await procurementService.recordPayment(actorFrom(req), validatedBody(req)),
    );
  },

  async listPayments(req: Request, res: Response) {
    const query = validatedQuery<PaymentListFilter & OrganizationQuery>(req);
    res.json(
      await procurementService.listPayments(
        actorFrom(req),
        query.organizationId,
        query,
      ),
    );
  },
};
