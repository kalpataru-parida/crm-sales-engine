import mongoose from "mongoose";

const startTransaction = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
};

const commitTransaction = async (session) => {
  await session.commitTransaction();
};

const abortTransaction = async (session) => {
  if (session.inTransaction()) {
    await session.abortTransaction();
  }
};

export { startTransaction, commitTransaction, abortTransaction };
