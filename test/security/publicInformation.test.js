import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAppServer } from '../../server/index.mjs';
import { INFORMATION_LANGUAGES, PUBLIC_INFORMATION_PATHS, publicLegalUrl } from '../../src/lib/publicLegalUrls.js';
import { getLegalCopy } from '../../src/components/legal/legalContent.js';

describe('public information HTTP access without a session or JavaScript', () => {
  let server, origin;
  const verifyAdmin = vi.fn(async () => ({ status: 401 }));
  beforeAll(async () => {
    server = await createAppServer({ verifyAdmin });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  it.each(INFORMATION_LANGUAGES)('serves all five complete pages in %s without redirecting to login', async (lang) => {
    for (const path of PUBLIC_INFORMATION_PATHS) {
      const response = await fetch(`${origin}${path}?lang=${lang}`, { redirect: 'manual' });
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('content-type')).toContain('text/html');
      const html = await response.text();
      expect(html).toContain(`<html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">`);
      expect(html).toContain('mailto:yosephdabby4@gmail.com');
      expect(html).toContain('<h1>');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('support@mindful-path.app');
      expect(html).not.toMatch(/90 (days|יום|días|jours|Tage|giorni|dias)/);
      if (['/privacy', '/account-deletion', '/data-deletion'].includes(path)) {
        const limits = getLegalCopy(lang).providerLimits;
        expect(limits.paragraphs).toHaveLength(3);
        expect(html).toContain(limits.title);
        for (const paragraph of limits.paragraphs) {
          // The public HTTP page must expose the same provider limitations as
          // the signed-in app, even when JavaScript and cookies are absent.
          const escaped = paragraph.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
          expect(html).toContain(escaped);
        }
      }
      if (['/privacy', '/terms', '/contact'].includes(path)) {
        expect(html).toContain('דבי יוסף ודבי נצחיה');
        expect(html).toContain('558524088');
      }
    }
    expect(verifyAdmin).not.toHaveBeenCalled();
  });
  it('does not turn public information access into private-form access', async () => {
    expect((await fetch(`${origin}/api/hebrew-forms-pilot/catalog`)).status).toBe(401);
    expect((await fetch(`${origin}/server/private/forms/example.pdf`)).status).toBe(404);
    expect((await fetch(`${origin}/base44/entities/PrivateAttachment.jsonc`)).status).toBe(404);
  });
  it('supports HEAD and rejects POST on information routes', async () => {
    const head = await fetch(`${origin}/privacy/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect((await fetch(`${origin}/contact`, { method: 'POST' })).status).toBe(405);
  });
  it('ignores unsupported language and redirect injection and sends restrictive headers', async () => {
    const response = await fetch(`${origin}/privacy?lang=${encodeURIComponent('<script>bad</script>')}&returnTo=https://attacker.example`);
    const html = await response.text();
    expect(html).toContain('<html lang="en"');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('attacker.example');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    for (const lang of ['__proto__', 'constructor', 'toString']) {
      const unusual = await fetch(`${origin}/privacy?lang=${lang}`);
      expect(unusual.status).toBe(200);
      expect(await unusual.text()).toContain('<html lang="en"');
    }
  });
  it('builds links only to known information paths and supported languages', () => {
    expect(publicLegalUrl('/privacy', 'he-IL')).toBe('https://mindful-path-production-7704.up.railway.app/privacy?lang=he');
    expect(publicLegalUrl('/terms', 'unknown')).toMatch(/\/terms\?lang=en$/);
    expect(() => publicLegalUrl('//attacker.example')).toThrow('Unknown');
  });
  it.each(INFORMATION_LANGUAGES)('states 18+ for the whole service and keeps provider limits explicit in %s', (lang) => {
    const copy = getLegalCopy(lang);
    const text = JSON.stringify(copy);
    expect(text).not.toMatch(/13|17/);
    expect(copy.terms.sections[2].paragraphs[0]).toContain('18');
    expect(copy.privacy.sections[4].paragraphs[0]).toContain('Base44');
    expect(copy.privacy.sections[5].paragraphs[1]).toContain('Base44');
    expect(copy.terms.effectiveDate).toBe('2026-11-09');
  });
});
