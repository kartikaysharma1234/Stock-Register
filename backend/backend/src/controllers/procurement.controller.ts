import { Request, Response } from "express";
import { PurchaseOrderStatus } from "../constants/status";
import { procurementService } from "../services/procurement.service";
import {
  actorFrom,
  validatedBody,
  validatedParams,
  validatedQuery,
} from "./controller.utils";

export const procurementController = {
  async createVendor(req: Request, res: Response) {
    res.status(201).json(
      await procurementService.createVendor(actorFrom(req), validatedBody(req)),
    );
  },
  async listVendors(req: Request, res: Response) {
    res.json(await procurementService.listVendors(actorFrom(req)));
  },
  async updateVendor(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(
      await procurementService.updateVendor(
        actorFrom(req),
        id,
        validatedBody(req),
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
    const { status } = validatedQuery<{ status?: PurchaseOrderStatus }>(req);
    res.json(await procurementService.listPurchaseOrders(actorFrom(req), status));
  },
  async getPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await procurementService.getPurchaseOrder(actorFrom(req), id));
  },
  async submitPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await procurementService.submitPurchaseOrder(actorFrom(req), id));
  },
  async approvePurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.json(await procurementService.approvePurchaseOrder(actorFrom(req), id));
  },
  async rejectPurchaseOrder(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    const { reason } = validatedBody<{ reason: string }>(req);
    res.json(
      await procurementService.rejectPurchaseOrder(actorFrom(req), id, reason),
    );
  },
  async receiveGoods(req: Request, res: Response) {
    const { id } = validatedParams<{ id: string }>(req);
    res.status(201).json(
      await procurementService.receiveGoods(
        actorFrom(req),
        id,
        validatedBody(req),
      ),
    );
  },
  async listGrns(req: Request, res: Response) {
    const { purchaseOrderId } = validatedQuery<{
      purchaseOrderId?: string;
    }>(req);
    res.json(
      await procurementService.listGrns(actorFrom(req), purchaseOrderId),
    );
  },
};
