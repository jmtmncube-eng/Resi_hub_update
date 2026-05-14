import { describe, it, expect, vi } from 'vitest';

// validateDocDataUrl is the security-critical upload gate. It's a pure
// function, but it lives in a module that imports the Prisma client — so
// we stub the database module to keep this a true unit test (no client
// generation, no connection).
vi.mock('../config/database', () => ({ default: {}, prisma: {} }));

import { validateDocDataUrl } from './application.service';

// ── Fixtures: minimal buffers with the right magic bytes ───────
const toDataUrl = (mime: string, buf: Buffer) =>
  `data:${mime};base64,${buf.toString('base64')}`;

const PDF  = toDataUrl('application/pdf', Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n'));
const PNG  = toDataUrl('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]));
const JPEG = toDataUrl('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]));
const GIF  = toDataUrl('image/gif', Buffer.from('GIF89a' + '\0'.repeat(8)));
const WEBP = toDataUrl('image/webp', Buffer.concat([
  Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'),
]));

describe('validateDocDataUrl — happy path', () => {
  it('accepts a valid PDF data URL', () => {
    expect(validateDocDataUrl('Doc', PDF)).toBe(PDF);
  });
  it('accepts a valid PNG data URL', () => {
    expect(validateDocDataUrl('Doc', PNG)).toBe(PNG);
  });
  it('accepts JPEG, GIF and WEBP data URLs', () => {
    expect(validateDocDataUrl('Doc', JPEG)).toBe(JPEG);
    expect(validateDocDataUrl('Doc', GIF)).toBe(GIF);
    expect(validateDocDataUrl('Doc', WEBP)).toBe(WEBP);
  });
  it('trims surrounding whitespace', () => {
    expect(validateDocDataUrl('Doc', `  ${PNG}  `)).toBe(PNG);
  });
});

describe('validateDocDataUrl — rejects bad input', () => {
  it('rejects a missing / empty value', () => {
    expect(() => validateDocDataUrl('Doc', '')).toThrow(/required/i);
    expect(() => validateDocDataUrl('Doc', undefined)).toThrow(/required/i);
    expect(() => validateDocDataUrl('Doc', 123)).toThrow(/required/i);
  });

  it('rejects a non-data-URL string', () => {
    expect(() => validateDocDataUrl('Doc', 'https://evil.com/x.pdf')).toThrow(/uploaded file/i);
  });

  it('rejects a disallowed MIME type', () => {
    const svg = toDataUrl('image/svg+xml', Buffer.from('<svg/>'));
    expect(() => validateDocDataUrl('Doc', svg)).toThrow(/PDF or image/i);
  });

  it('rejects a MIME / magic-byte mismatch (declared PDF, actually PNG bytes)', () => {
    const spoofed = toDataUrl('application/pdf', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
    expect(() => validateDocDataUrl('Doc', spoofed)).toThrow(/not a valid PDF/i);
  });

  it('rejects a MIME / magic-byte mismatch (declared PNG, actually text)', () => {
    const spoofed = toDataUrl('image/png', Buffer.from('this is just text, not an image'));
    expect(() => validateDocDataUrl('Doc', spoofed)).toThrow(/not a valid image/i);
  });

  it('rejects a corrupted / truncated base64 payload', () => {
    // A single stray char makes the base64 fail the re-encode integrity check.
    const corrupt = PNG + '!';
    expect(() => validateDocDataUrl('Doc', corrupt)).toThrow(/uploaded file|truncated|corrupted/i);
  });

  it('rejects a file over the 5 MB cap', () => {
    const huge = toDataUrl('application/pdf', Buffer.concat([
      Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024 + 1),
    ]));
    expect(() => validateDocDataUrl('Doc', huge)).toThrow(/too large/i);
  });

  it('puts the field name in the error message', () => {
    expect(() => validateDocDataUrl('ID document', '')).toThrow(/ID document/);
  });
});
