import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt.util';

// JWT_SECRET / JWT_REFRESH_SECRET are injected by vitest.config.ts
const payload = { userId: 'u-123', role: 'ADMIN', email: 'a@b.com' };

describe('jwt.util', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
  });

  it('access and refresh tokens are signed with different secrets', () => {
    const access = signAccessToken(payload);
    // An access token must NOT verify against the refresh secret.
    expect(() => verifyRefreshToken(access)).toThrow();
  });

  it('rejects a token signed with the wrong secret', () => {
    const forged = jwt.sign(payload, 'not-the-real-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -3) + 'xyz';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '-1s',
    });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });
});
