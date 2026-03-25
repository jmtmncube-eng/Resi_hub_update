import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message:    string,
    public statusCode: number = 500,
    public code?:      string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err:  Error,
  _req: Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error:   err.message,
      code:    err.code,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error:   process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
