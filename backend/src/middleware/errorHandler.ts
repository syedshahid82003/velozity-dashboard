import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global Express error handler.
 * Returns structured JSON — never exposes raw stack traces to clients.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV === 'development';

  console.error('[ErrorHandler]', err.message, isDev ? err.stack : '');

  // Prisma known error codes (e.g. unique constraint violation)
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: `A record with this ${prismaErr.meta?.target?.[0] ?? 'field'} already exists`,
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDev && { detail: err.message }),
  });
}
