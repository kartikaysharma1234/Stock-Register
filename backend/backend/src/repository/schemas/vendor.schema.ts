import { Schema, Types, model } from "mongoose";
import { PaymentTerm } from "../../constants";

export interface IVendorAddress {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface IVendorBankDetails {
  accountNo?: string;
  ifsc?: string;
  bankName?: string;
}

export interface IVendor {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: IVendorAddress;
  taxId?: string;
  gstin?: string;
  panNumber?: string;
  bankDetails?: IVendorBankDetails;
  rating: number;
  totalOrders: number;
  totalAmount: number;
  paymentTerms: PaymentTerm;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorAddressSchema = new Schema<IVendorAddress>(
  {
    line1: { type: String, trim: true, maxlength: 250 },
    city: { type: String, trim: true, maxlength: 120 },
    state: { type: String, trim: true, maxlength: 120 },
    pincode: { type: String, trim: true, maxlength: 20 },
  },
  { _id: false },
);

const vendorBankDetailsSchema = new Schema<IVendorBankDetails>(
  {
    accountNo: { type: String, trim: true, maxlength: 50 },
    ifsc: { type: String, trim: true, uppercase: true, maxlength: 20 },
    bankName: { type: String, trim: true, maxlength: 150 },
  },
  { _id: false },
);

const vendorSchema = new Schema<IVendor>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      alias: "org",
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    contactPerson: { type: String, trim: true, maxlength: 150 },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    phone: { type: String, trim: true, maxlength: 30 },
    address: { type: vendorAddressSchema, default: {} },
    taxId: { type: String, trim: true, maxlength: 80 },
    gstin: { type: String, trim: true, uppercase: true, maxlength: 20 },
    panNumber: { type: String, trim: true, uppercase: true, maxlength: 20 },
    bankDetails: { type: vendorBankDetailsSchema, default: {} },
    rating: { type: Number, default: 0, min: 0, max: 5, index: true },
    totalOrders: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paymentTerms: {
      type: String,
      enum: Object.values(PaymentTerm),
      default: PaymentTerm.NET30,
    },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

vendorSchema.index(
  { organizationId: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
vendorSchema.index({ organizationId: 1, isActive: 1, isDeleted: 1 });
vendorSchema.index({ organizationId: 1, rating: -1, totalOrders: -1 });
vendorSchema.index({ name: "text", code: "text", email: "text" });

export const VendorModel = model<IVendor>("Vendor", vendorSchema);
