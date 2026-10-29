import { Prisma } from "../../generated/prisma/client.js";
import { AppError, unavailable } from "./app-error.js";

export async function databaseOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const sqlState = error.meta?.["code"];
      if (
        error.code === "P2034" ||
        sqlState === "40P01" ||
        sqlState === "40001" ||
        sqlState === "55P03"
      ) {
        throw new AppError(
          503,
          "TRANSACTION_RETRY_REQUIRED",
          "Transaction must be retried.",
        );
      }
      throw unavailable();
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    )
      throw unavailable();
    throw error;
  }
}
