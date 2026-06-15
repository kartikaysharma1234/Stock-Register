import { ClientSession } from "mongoose";
import { PurchaseOrderStatus } from "../constants/status";
import {
  GoodsReceivedNoteModel,
  PurchaseOrderModel,
  VendorModel,
} from "./schemas";

export class ProcurementRepository {
  createVendor(organizationId: string, data: Record<string, unknown>) {
    return VendorModel.create({ ...data, organizationId });
  }

  listVendors(organizationId: string) {
    return VendorModel.find({ organizationId, isActive: true }).sort({ name: 1 });
  }

  updateVendor(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return VendorModel.findOneAndUpdate(
      { _id: id, organizationId },
      data,
      { new: true, runValidators: true },
    );
  }

  createPurchaseOrder(data: Record<string, unknown>) {
    return PurchaseOrderModel.create(data);
  }

  findPurchaseOrder(organizationId: string, id: string) {
    return PurchaseOrderModel.findOne({ _id: id, organizationId })
      .populate("vendorId", "name code email")
      .populate("warehouseId", "name code")
      .populate("lines.itemId", "name sku unit");
  }

  findPurchaseOrderForUpdate(organizationId: string, id: string) {
    return PurchaseOrderModel.findOne({ _id: id, organizationId });
  }

  listPurchaseOrders(
    organizationId: string,
    status?: PurchaseOrderStatus,
    warehouseIds?: string[],
  ) {
    return PurchaseOrderModel.find({
      organizationId,
      ...(status ? { status } : {}),
      ...(warehouseIds ? { warehouseId: { $in: warehouseIds } } : {}),
    })
      .populate("vendorId", "name code")
      .populate("warehouseId", "name code")
      .sort({ createdAt: -1 });
  }

  updatePurchaseOrderStatus(
    organizationId: string,
    id: string,
    currentStatuses: PurchaseOrderStatus[],
    update: Record<string, unknown>,
  ) {
    return PurchaseOrderModel.findOneAndUpdate(
      { _id: id, organizationId, status: { $in: currentStatuses } },
      update,
      { new: true, runValidators: true },
    );
  }

  createGrn(data: Record<string, unknown>, session?: ClientSession) {
    return GoodsReceivedNoteModel.create([data], { session }).then(([grn]) => grn);
  }

  listGrns(
    organizationId: string,
    purchaseOrderId?: string,
    warehouseIds?: string[],
  ) {
    return GoodsReceivedNoteModel.find({
      organizationId,
      ...(purchaseOrderId ? { purchaseOrderId } : {}),
      ...(warehouseIds ? { warehouseId: { $in: warehouseIds } } : {}),
    })
      .populate("purchaseOrderId", "poNumber")
      .populate("warehouseId", "name code")
      .populate("lines.itemId", "name sku unit")
      .sort({ receivedAt: -1 });
  }
}

export const procurementRepository = new ProcurementRepository();
