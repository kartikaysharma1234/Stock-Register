import { Schema, Types, model } from "mongoose";
import { PaymentMode } from "../../constants";

export interface IPaymentAttachment {
  name: string;
  url: string;
}

export interface IPayment {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  attachments: IPaymentAttachment[];
  recordedBy: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAttachmentSchema = new Schema<IPaymentAttachment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      index: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true, index: true },
    paymentMode: {
      type: String,
      enum: Object.values(PaymentMode),
      required: true,
      index: true,
    },
    referenceNumber: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 1000 },
    attachments: { type: [paymentAttachmentSchema], default: [] },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ organizationId: 1, vendorId: 1, paymentDate: -1 });
paymentSchema.index({
  organizationId: 1,
  purchaseOrderId: 1,
  paymentDate: -1,
});
paymentSchema.index(
  { organizationId: 1, referenceNumber: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  },
);

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
