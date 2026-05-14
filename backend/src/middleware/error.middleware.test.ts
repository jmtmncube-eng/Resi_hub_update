import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from './error.middleware';

// Minimal Response double — captures status() + json() calls.
function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('AppError', () => {
  it('defaults to status 500', () => {
    const err = new AppError('boom');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('boom');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('carries a custom status code and code', () => {
    const err = new AppError('not found', 404, 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('errorHandler', () => {
  // Silence the console.error the handler emits, keep test output clean.
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('maps an AppError to its status code and message', () => {
    const res = mockRes();
    errorHandler(new AppError('bad input', 400), {} as Request, res, (() => {}) as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'bad input', code: undefined });
  });

  it('maps an unknown error to 500', () => {
    const res = mockRes();
    errorHandler(new Error('kaboom'), {} as Request, res, (() => {}) as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('hides the raw message of an unknown error in production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    errorHandler(new Error('leak me'), {} as Request, res, (() => {}) as NextFunction);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
    process.env.NODE_ENV = prev;
  });

  it('exposes the raw message of an unknown error outside production', () => {
    const res = mockRes();
    errorHandler(new Error('dev detail'), {} as Request, res, (() => {}) as NextFunction);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'dev detail' });
  });
});
