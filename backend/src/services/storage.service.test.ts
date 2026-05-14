import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  persistIfDataUrl,
  deletePersistedFile,
  isDataUrl,
  isPersistedUrl,
  UPLOADS_DIR,
} from './storage.service';

// Track everything we write so the suite leaves no litter on disk.
const written: string[] = [];
afterEach(() => {
  written.splice(0).forEach(deletePersistedFile);
});

const pngDataUrl = `data:image/png;base64,${Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]).toString('base64')}`;
const pdfDataUrl = `data:application/pdf;base64,${Buffer.from('%PDF-1.4 test').toString('base64')}`;

describe('isDataUrl / isPersistedUrl', () => {
  it('recognises data URLs', () => {
    expect(isDataUrl(pngDataUrl)).toBe(true);
    expect(isDataUrl('/api/uploads/x.png')).toBe(false);
    expect(isDataUrl(null)).toBe(false);
    expect(isDataUrl(42)).toBe(false);
  });

  it('recognises persisted disk URLs', () => {
    expect(isPersistedUrl('/api/uploads/x.png')).toBe(true);
    expect(isPersistedUrl('/uploads/x.png')).toBe(true);
    expect(isPersistedUrl(pngDataUrl)).toBe(false);
    expect(isPersistedUrl('https://example.com/x.png')).toBe(false);
  });
});

describe('persistIfDataUrl', () => {
  it('writes a data URL to disk and returns a public URL', () => {
    const url = persistIfDataUrl(pngDataUrl, 'test') as string;
    written.push(url);
    expect(url).toMatch(/^\/api\/uploads\/test-[\w-]+\.png$/);
    expect(fs.existsSync(path.join(UPLOADS_DIR, path.basename(url)))).toBe(true);
  });

  it('derives the extension from the MIME type', () => {
    const url = persistIfDataUrl(pdfDataUrl, 'test') as string;
    written.push(url);
    expect(url.endsWith('.pdf')).toBe(true);
  });

  it('round-trips the bytes intact', () => {
    const original = Buffer.from('%PDF-1.4 test');
    const url = persistIfDataUrl(pdfDataUrl, 'test') as string;
    written.push(url);
    const onDisk = fs.readFileSync(path.join(UPLOADS_DIR, path.basename(url)));
    expect(onDisk.equals(original)).toBe(true);
  });

  it('passes through an already-persisted URL unchanged', () => {
    expect(persistIfDataUrl('/api/uploads/existing.png', 'test')).toBe('/api/uploads/existing.png');
  });

  it('passes through null / undefined / empty unchanged', () => {
    expect(persistIfDataUrl(null, 'test')).toBe(null);
    expect(persistIfDataUrl(undefined, 'test')).toBe(undefined);
    expect(persistIfDataUrl('', 'test')).toBe('');
  });

  it('rejects an unsupported MIME type', () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`;
    expect(() => persistIfDataUrl(svg, 'test')).toThrow(/Unsupported file type/i);
  });

  it('rejects a malformed data URL', () => {
    expect(() => persistIfDataUrl('data:image/png;base64,', 'test')).toThrow();
  });
});

describe('deletePersistedFile', () => {
  it('removes a persisted file from disk', () => {
    const url = persistIfDataUrl(pngDataUrl, 'test') as string;
    const abs = path.join(UPLOADS_DIR, path.basename(url));
    expect(fs.existsSync(abs)).toBe(true);
    deletePersistedFile(url);
    expect(fs.existsSync(abs)).toBe(false);
  });

  it('is a no-op for data URLs, external URLs and missing files', () => {
    expect(() => deletePersistedFile(pngDataUrl)).not.toThrow();
    expect(() => deletePersistedFile('https://example.com/x.png')).not.toThrow();
    expect(() => deletePersistedFile('/api/uploads/never-existed.png')).not.toThrow();
    expect(() => deletePersistedFile(null)).not.toThrow();
  });

  it('ignores path-traversal attempts in the stored URL', () => {
    // basename() strips the traversal; the file resolves inside UPLOADS_DIR
    // and simply doesn't exist — no throw, nothing outside the dir touched.
    expect(() => deletePersistedFile('/api/uploads/../../etc/passwd')).not.toThrow();
  });
});
