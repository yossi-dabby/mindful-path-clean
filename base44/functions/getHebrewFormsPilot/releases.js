// Shared by Workers, Railway and the browser. Only reviewed, pinned catalogs
// are accepted; the original endpoint stays on 0.2 for older deployed clients.
export const EXPANDED_CATALOG_PATH = 'catalog-mood-01';
export const P3_CATALOG_PATH = 'catalog-p3-01';
export const P4A_CATALOG_PATH = 'catalog-p4-01';
export const P4B_CATALOG_PATH = 'catalog-p4-02';
export const SERIES01_CATALOG_PATH = 'catalog-series-01';
export const SERIES02_CATALOG_PATH = 'catalog-series-02';
export const PILOT_RELEASES = Object.freeze({
  catalog: Object.freeze({ version: '0.2', count: 154, sha256: '2c1df7644d778508b37d2a5076d902906b241166e09f93d388295a8a9983d90b' }),
  [EXPANDED_CATALOG_PATH]: Object.freeze({ version: '0.3-mood-01', count: 163, sha256: 'a9da2978a3d29b8c62a50e3ce9219d4b214d3bfd881ba6eb872e6bacab9885cf' }),
  [P3_CATALOG_PATH]: Object.freeze({ version: '0.4-p3-01', count: 217, sha256: '10f62544559448b462f06b0b0dbea342306bc5af85daa4f2ce9fc022531b3c4f' }),
  [P4A_CATALOG_PATH]: Object.freeze({ version: '0.5-p4-01', count: 253, sha256: 'cd5ea0cba02bb8e3f896bfadaecfa439be65bdcc3ef1c6c72fe0c5b6b3a3d104' }),
  [P4B_CATALOG_PATH]: Object.freeze({ version: '0.6-p4-02', count: 289, sha256: '459f0727b598e2e8a5ef7eb31b9b6d5d636f63d223586e4b9029890e0c7652a6' }),
  [SERIES01_CATALOG_PATH]: Object.freeze({ version: '0.7-series-01', count: 370, sha256: '27f8f3255049aaa5a3fe50e6ca4e4c9f0dad45392683c59247d3cb086a29a009' }),
  [SERIES02_CATALOG_PATH]: Object.freeze({ version: '0.8-series-02', count: 460, sha256: 'f3323fdd4ff058bfbc98db5857481383a2bb84b6bc5d99eae5a1313af9f92f1f' }),
});

export function isPilotCatalogPath(path) {
  return typeof path === 'string' && Object.hasOwn(PILOT_RELEASES, path);
}

// Key order is not part of the transport contract; array order is intentional.
export function canonicalCatalog(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalCatalog).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalCatalog(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function validatePilotCatalog(catalog, path) {
  if (!isPilotCatalogPath(path)) return false;
  const release = PILOT_RELEASES[path];
  if (catalog?.language !== 'he' || catalog.version !== release.version ||
      !Array.isArray(catalog.forms) || catalog.forms.length !== release.count) return false;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalCatalog(catalog)));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex === release.sha256;
}
