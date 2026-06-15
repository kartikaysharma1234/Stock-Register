import { Schema, Types, model } from "mongoose";
import { CounterType } from "../../constants";

export interface ICounter {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  type: CounterType;
  year: number;
  sequence: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(CounterType),
      required: true,
      index: true,
    },
    year: { type: Number, required: true, min: 2000, index: true },
    sequence: { type: Number, default: 0, min: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

counterSchema.index(
  { organizationId: 1, type: 1, year: 1 },
  { unique: true },
);

export const CounterModel = model<ICounter>("Counter", counterSchema);
