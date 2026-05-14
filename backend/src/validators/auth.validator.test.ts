import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, refreshSchema } from './auth.validator';

describe('loginSchema', () => {
  it('accepts a valid email + password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a minimal valid registration', () => {
    const r = registerSchema.safeParse({ name: 'Jane', email: 'j@b.com', password: 'sixchr' });
    expect(r.success).toBe(true);
  });

  it('accepts the optional student fields', () => {
    const r = registerSchema.safeParse({
      name: 'Jane', email: 'j@b.com', password: 'sixchr',
      university: 'UCT', program: 'BSc', year: 2, phone: '0712345678',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    const r = registerSchema.safeParse({ name: 'J', email: 'j@b.com', password: 'sixchr' });
    expect(r.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const r = registerSchema.safeParse({ name: 'Jane', email: 'j@b.com', password: 'five5' });
    expect(r.success).toBe(false);
  });

  it('rejects an out-of-range year', () => {
    const r = registerSchema.safeParse({ name: 'Jane', email: 'j@b.com', password: 'sixchr', year: 9 });
    expect(r.success).toBe(false);
  });
});

describe('refreshSchema', () => {
  it('accepts a non-empty refresh token', () => {
    expect(refreshSchema.safeParse({ refreshToken: 'abc' }).success).toBe(true);
  });

  it('rejects an empty refresh token', () => {
    expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});
