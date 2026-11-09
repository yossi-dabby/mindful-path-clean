import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  WorksheetFileResolutionError,
  classifyWorksheetFileReference,
  resolveWorksheetFileUrl,
} from '../../src/components/chat/utils/worksheetFileResolver.js';

const ROOT = path.resolve(process.cwd());

describe('worksheetFileResolver classification', () => {
  it('classifies /forms paths as static public forms', () => {
    expect(classifyWorksheetFileReference('/forms/en/adolescents/cbt-core/stage-01/01-01.pdf')).toBe('static_public_form_path');
  });

  it('classifies full HTTPS links as full public URLs', () => {
    expect(classifyWorksheetFileReference('https://cdn.example.com/forms/worksheet.pdf')).toBe('full_public_url');
  });

  it('classifies private file_uri values', () => {
    expect(classifyWorksheetFileReference('private/uploads/u1/worksheet.pdf')).toBe('base44_private_file_uri');
  });

  it('classifies bare UUID values as raw UUID references', () => {
    expect(classifyWorksheetFileReference('2edc7577-3efa-4fa3-b098-571854be76cb')).toBe('raw_uuid');
  });
});

describe('resolveWorksheetFileUrl', () => {
  it('resolves static /forms path without mutation', async () => {
    const result = await resolveWorksheetFileUrl('/forms/en/adolescents/cbt-core/stage-01/01-01.pdf');
    expect(result.url).toBe('/forms/en/adolescents/cbt-core/stage-01/01-01.pdf');
    expect(result.classification).toBe('static_public_form_path');
  });

  it('resolves direct HTTPS PDF URL as-is', async () => {
    const result = await resolveWorksheetFileUrl('https://cdn.example.com/files/worksheet.pdf');
    expect(result.url).toBe('https://cdn.example.com/files/worksheet.pdf');
    expect(result.classification).toBe('full_public_url');
  });

  it('rejects raw private URIs instead of signing them without ownership checks', async () => {
    const sign = vi.fn();
    await expect(resolveWorksheetFileUrl('private/uploads/u1/worksheet.pdf', {
      coreIntegration: { CreateFileSignedUrl: sign },
    })).rejects.toMatchObject({ name: 'WorksheetFileResolutionError' });
    expect(sign).not.toHaveBeenCalled();
  });

  it('resolves UUID through an owned reference and never signs a raw URI on the client', async () => {
    const file_ref = 'mp-private:a12345678901234567890123';
    const invoke = vi.fn().mockResolvedValue({ data: { file_ref, file_url: 'https://files.example.com/signed/from-uuid.pdf' } });
    const getGeneratedFile = vi.fn().mockResolvedValue({
      id: '2edc7577-3efa-4fa3-b098-571854be76cb', file_url: file_ref,
    });
    const result = await resolveWorksheetFileUrl('2edc7577-3efa-4fa3-b098-571854be76cb', {
      functions: { invoke }, entities: { GeneratedFile: { get: getGeneratedFile } },
    });
    expect(getGeneratedFile).toHaveBeenCalledWith('2edc7577-3efa-4fa3-b098-571854be76cb');
    expect(invoke).toHaveBeenCalledWith('uploadAttachment', { action: 'resolve', file_ref });
    expect(result.url).toBe('https://files.example.com/signed/from-uuid.pdf');
  });

  it('throws a clear user-facing error when UUID cannot be resolved', async () => {
    const getGeneratedFile = vi.fn().mockRejectedValue(new Error('not found'));

    await expect(
      resolveWorksheetFileUrl('2edc7577-3efa-4fa3-b098-571854be76cb', {
        coreIntegration: { CreateFileSignedUrl: vi.fn() },
        entities: { GeneratedFile: { get: getGeneratedFile } },
      })
    ).rejects.toMatchObject({
      name: 'WorksheetFileResolutionError',
      userMessage: 'This worksheet file could not be opened. Please try again or contact support.',
    });
  });

  it('rejects non-file HTTPS links (entity/page URLs)', async () => {
    await expect(resolveWorksheetFileUrl('https://app.mindful-path.me/Chat'))
      .rejects.toBeInstanceOf(WorksheetFileResolutionError);
  });
});

describe('worksheet open/download source contracts', () => {
  const resolverSrc = fs.readFileSync(`${ROOT}/src/components/chat/utils/worksheetFileResolver.js`, 'utf8');
  const cardSrc = fs.readFileSync(`${ROOT}/src/components/chat/GeneratedFileCard.jsx`, 'utf8');

  it('delegates private references to the owner-checked server resolver', () => {
    expect(resolverSrc).toContain('resolvePrivateAttachment({ functions }, trimmed)');
    expect(resolverSrc).not.toContain('CreateFileSignedUrl');
  });

  it('does not pass raw generated file values directly to open/download helpers', () => {
    expect(cardSrc).not.toContain('openFile(normalized.url)');
    expect(cardSrc).not.toContain('downloadPdfFile(normalized.url');
    expect(cardSrc).toContain('const resolvedUrl = await resolveUrl();');
  });

  it('avoids introducing hardcoded preview/Railway/Base44 URLs in resolver', () => {
    expect(resolverSrc).not.toMatch(/railway\.app/i);
    expect(resolverSrc).not.toMatch(/preview\.base44/i);
    expect(resolverSrc).not.toMatch(/base44\.app\/preview/i);
  });
});

