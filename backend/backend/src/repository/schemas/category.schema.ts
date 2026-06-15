import { Schema, Types, model } from "mongoose";

export interface ICategory {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  parentCategoryId?: Types.ObjectId;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

categorySchema.index({ organizationId: 1, code: 1 }, { unique: true });
categorySchema.index({
  organizationId: 1,
  parentCategoryId: 1,
  isDeleted: 1,
});
categorySchema.index({ organizationId: 1, createdAt: -1 });
categorySchema.index({ name: "text", code: "text", description: "text" });

export const CategoryModel = model<ICategory>("Category", categorySchema);
