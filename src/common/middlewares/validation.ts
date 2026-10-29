import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { loginSchema } from "../../modules/auth/auth.schema.js";

export const noQuery: RequestHandler = (request, _response, next) => {
  next(
    Object.keys(request.query).length
      ? new AppError(
          400,
          "VALIDATION_ERROR",
          "Unknown query parameters are not allowed.",
        )
      : undefined,
  );
};
export const validateLogin: RequestHandler = (request, response, next) => {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    next(new AppError(400, "VALIDATION_ERROR", "Invalid login input."));
    return;
  }
  response.locals["login"] = result.data;
  next();
};
