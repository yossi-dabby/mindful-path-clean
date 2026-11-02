const FILE_ERROR_MESSAGE = 'This worksheet file could not be opened. Please try again or contact support.';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIRECT_FILE_EXTENSION_REGEX = /\.(pdf|txt|csv|doc|docx|xls|xlsx|ppt|pptx|zip)(?:$|[?#])/i;
const URL_PARSE_FALLBACK_BASE = 'https://example.local';
const ENTITY_NAME_FILTER_REGEX = /file|worksheet|form|attachment|upload|document|resource/i;
const PRIORITY_ENTITY_NAMES = ['GeneratedFile', 'Worksheet', 'Form', 'Attachment', 'Resource', 'File'];
const ENTITY_NAME_CACHE = new WeakMap();

const URL_FIELD_CANDIDATES = [
  'file_uri',
  'fileUri',
  'private_file_uri',
  'privateFileUri',
  'file_url',
  'fileUrl',
  'url',
  'pdf_url',
  'pdfUrl',
  'download_url',
  'downloadUrl',
  'signed_url',
  'signedUrl',
];

export class WorksheetFileResolutionError extends Error {
  constructor(reason, details = {}) {
    super(reason || FILE_ERROR_MESSAGE);
    this.name = 'WorksheetFileResolutionError';
    this.userMessage = FILE_ERROR_MESSAGE;
    this.details = details;
  }
}

export function classifyWorksheetFileReference(fileValue) {
  if (typeof fileValue !== 'string') return 'invalid';
  const trimmed = fileValue.trim();
  if (!trimmed) return 'invalid';
  if (trimmed.startsWith('/forms/')) return 'static_public_form_path';
  if (looksLikePrivateFileUri(trimmed)) return 'base44_private_file_uri';
  if (isUuid(trimmed)) return 'raw_uuid';
  if (isHttpUrl(trimmed)) return 'full_public_url';
  return 'invalid';
}

export async function resolveWorksheetFileUrl(fileValue, options = {}) {
  const {
    sourceRecord = null,
    coreIntegration = null,
    entities = null,
    logger = console,
    _visitedValues = new Set(),
  } = options;

  const trimmed = typeof fileValue === 'string' ? fileValue.trim() : '';
  const classification = classifyWorksheetFileReference(trimmed);

  if (!trimmed) {
    throw new WorksheetFileResolutionError('Missing worksheet file reference', { fileValue, classification: 'invalid' });
  }

  if (_visitedValues.has(trimmed)) {
    throw new WorksheetFileResolutionError('Circular worksheet file reference resolution', { fileValue: trimmed, classification });
  }
  _visitedValues.add(trimmed);

  if (classification === 'static_public_form_path') {
    return { url: normalizePublicFormPath(trimmed), classification };
  }

  if (classification === 'full_public_url') {
    if (!isLikelyDirectFileUrl(trimmed)) {
      throw new WorksheetFileResolutionError('URL does not look like a direct file URL', { fileValue: trimmed, classification });
    }
    return { url: trimmed, classification };
  }

  if (classification === 'base44_private_file_uri') {
    if (!coreIntegration?.CreateFileSignedUrl) {
      throw new WorksheetFileResolutionError('CreateFileSignedUrl integration is unavailable', { fileValue: trimmed, classification });
    }
    const signed = await coreIntegration.CreateFileSignedUrl({
      file_uri: normalizePrivateFileUri(trimmed),
      expires_in: 3600,
    });
    const signedUrl = signed?.signed_url || signed?.url || signed?.file_url;
    if (typeof signedUrl !== 'string' || !signedUrl.trim()) {
      throw new WorksheetFileResolutionError('CreateFileSignedUrl returned no signed URL', { fileValue: trimmed, classification });
    }
    return { url: signedUrl.trim(), classification, resolvedFrom: 'file_uri_signed_url' };
  }

  if (classification === 'raw_uuid') {
    const lookedUpRef = await lookupUuidFileReference(trimmed, { sourceRecord, entities, logger });
    if (!lookedUpRef) {
      throw new WorksheetFileResolutionError('Could not map UUID to file URI/URL', { fileValue: trimmed, classification });
    }
    const nested = await resolveWorksheetFileUrl(lookedUpRef, {
      sourceRecord,
      coreIntegration,
      entities,
      logger,
      _visitedValues,
    });
    return { ...nested, classification, resolvedFrom: lookedUpRef };
  }

  throw new WorksheetFileResolutionError('Unsupported worksheet file reference', { fileValue: trimmed, classification });
}

function isUuid(value) {
  return UUID_REGEX.test(value);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function looksLikePrivateFileUri(value) {
  return /^\/?private\//i.test(value);
}

function normalizePrivateFileUri(value) {
  return value.startsWith('/') ? value.slice(1) : value;
}

function normalizePublicFormPath(value) {
  try {
    const parsed = new URL(value, URL_PARSE_FALLBACK_BASE);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
}

function isLikelyDirectFileUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (DIRECT_FILE_EXTENSION_REGEX.test(parsed.pathname)) return true;
    if (DIRECT_FILE_EXTENSION_REGEX.test(parsed.search)) return true;
    if (parsed.searchParams.has('download')) return true;
    if (parsed.searchParams.has('filename')) return true;
    if (parsed.searchParams.has('response-content-disposition')) return true;
    if (parsed.searchParams.has('token') || parsed.searchParams.has('signature')) return true;
    return /\/(files|file|uploads|upload|storage)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function extractCandidateFileReference(record, uuid) {
  if (!record || typeof record !== 'object') return null;
  for (const field of URL_FIELD_CANDIDATES) {
    const value = record[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const trimmed = value.trim();
    if (trimmed === uuid) continue;
    const type = classifyWorksheetFileReference(trimmed);
    if (type !== 'invalid' && type !== 'raw_uuid') return trimmed;
  }
  return null;
}

async function lookupUuidFileReference(uuid, { sourceRecord, entities, logger }) {
  const directSourceRef = extractCandidateFileReference(sourceRecord, uuid);
  if (directSourceRef) return directSourceRef;

  const entityMap = entities && typeof entities === 'object' ? entities : {};
  const names = getCandidateEntityNames(entityMap);

  for (const entityName of names) {
    const entity = entityMap[entityName];
    if (!entity || typeof entity.get !== 'function') continue;
    try {
      const record = await entity.get(uuid);
      const ref = extractCandidateFileReference(record, uuid);
      if (ref) {
        logger?.info?.(`[worksheetFileResolver] Resolved UUID via entity "${entityName}"`);
        return ref;
      }
    } catch {
      // Continue scanning other candidate entities.
    }
  }

  return null;
}

function getCandidateEntityNames(entityMap) {
  if (!entityMap || typeof entityMap !== 'object') return [];
  const cached = ENTITY_NAME_CACHE.get(entityMap);
  if (cached) return cached;

  const allNames = Object.keys(entityMap);
  const prioritized = PRIORITY_ENTITY_NAMES.filter((name) => allNames.includes(name));
  const filtered = allNames.filter((name) => ENTITY_NAME_FILTER_REGEX.test(name) && !prioritized.includes(name));
  const candidates = [...prioritized, ...filtered];
  ENTITY_NAME_CACHE.set(entityMap, candidates);
  return candidates;
}
