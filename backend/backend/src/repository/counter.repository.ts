import { ClientSession } from "mongoose";
import { CounterType } from "../constants";
import { CounterModel } from "./schemas";

const prefixes: Readonly<Record<CounterType, string>> = {
  [CounterType.PURCHASE_ORDER]: "PO",
  [CounterType.GRN]: "GRN",
  [CounterType.STOCK_REQUEST]: "REQ",
  [CounterType.ASSET]: "AST",
};

export const formatCounterNumber = (
  type: CounterType,
  year: number,
  sequence: number,
) =>
  `${prefixes[type]}-${year}-${sequence.toString().padStart(4, "0")}`;

export class CounterRepository {
  async nextNumber(
    organizationId: string,
    type: CounterType,
    session?: ClientSession,
    date = new Date(),
  ) {
    const year = date.getUTCFullYear();
    const counter = await CounterModel.findOneAndUpdate(
      {
        organizationId,
        type,
        year,
        isDeleted: { $ne: true },
      },
      {
        $inc: { sequence: 1 },
        $setOnInsert: {
          organizationId,
          type,
          year,
          isDeleted: false,
        },
      },
      {
        new: true,
        upsert: true,
        session,
        runValidators: true,
      },
    ).orFail();
    return formatCounterNumber(type, year, counter.sequence);
  }
}

export const counterRepository = new CounterRepository();
