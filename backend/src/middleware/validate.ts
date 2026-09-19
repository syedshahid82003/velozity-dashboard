import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Runs after express-validator chains.
 * Returns 422 with structured field errors if validation fails.
 * Must be placed AFTER validation chains in route handler arrays.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const structured = errors.array().map((err) => ({
      field: err.type === 'field' ? (err as { path: string }).path : 'unknown',
      message: err.msg,
    }));
    sendError(res, 'Validation failed', 422, structured);
    return;
  }
  next();
}
