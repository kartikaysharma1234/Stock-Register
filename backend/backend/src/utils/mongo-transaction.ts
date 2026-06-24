import mongoose, { ClientSession } from "mongoose";

let transactionSupport: Promise<boolean> | undefined;

const supportsTransactions = () => {
  transactionSupport ??= (async () => {
    const database = mongoose.connection.db;
    if (!database) return false;

    const hello = await database.admin().command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === "isdbgrid");
  })();

  return transactionSupport;
};

export const runWithOptionalTransaction = async <T>(
  work: (session?: ClientSession) => Promise<T>,
) => {
  if (!(await supportsTransactions())) {
    return work();
  }

  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
};
