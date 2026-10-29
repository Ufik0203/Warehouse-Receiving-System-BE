import type { RequestHandler } from "express";
import type { Role } from "../../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";

export function authorize(...roles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication required."));
      return;
    }
    next(
      roles.includes(request.user.role)
        ? undefined
        : new AppError(403, "FORBIDDEN", "This action is not permitted."),
    );
  };
}
