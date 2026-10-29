import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (response.headersSent) { _next(error); return; }
  let safe = new AppError(500, 'INTERNAL_ERROR', 'An internal error occurred.');
  if (error instanceof AppError) safe = error;
  else if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') safe = new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
    if (error.type === 'entity.too.large') safe = new AppError(413, 'PAYLOAD_TOO_LARGE', 'JSON body exceeds 64 KiB.');
  }
  response.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId: request.requestId } });
};
