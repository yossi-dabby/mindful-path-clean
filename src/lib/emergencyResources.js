export const EMERGENCY_REGION_STORAGE_KEY = 'mindful_path_emergency_region_v1';

export const SUPPORTED_EMERGENCY_REGIONS = Object.freeze([
  'US',
  'IL',
  'ES',
  'FR',
  'DE',
  'IT',
  'PT',
]);

const SUPPORTED_EMERGENCY_REGION_SET = new Set(SUPPORTED_EMERGENCY_REGIONS);

export const EMERGENCY_RESOURCES_BY_REGION = Object.freeze({
  US: Object.freeze({
    region: 'US',
    hotlineLabel: 'Crisis Hotline',
    hotlineNumber: '988 (US)',
    textLabel: 'Crisis Text Line',
    textNumber: 'Text "HELLO" to 741741',
    emergencyLabel: 'Emergency',
    emergencyNumber: '911 / 112',
  }),
  IL: Object.freeze({
    region: 'IL',
    hotlineLabel: 'קו עזרה למשבר (ערן)',
    hotlineNumber: '1201',
    textLabel: 'קו חירום כללי',
    textNumber: '101 (מד"א) / 100 (משטרה)',
    emergencyLabel: 'חירום',
    emergencyNumber: '101 / 112',
  }),
  ES: Object.freeze({
    region: 'ES',
    hotlineLabel: 'Línea de crisis',
    hotlineNumber: '024 (España)',
    textLabel: 'Emergencias generales',
    textNumber: '112',
    emergencyLabel: 'Emergencia',
    emergencyNumber: '112',
  }),
  FR: Object.freeze({
    region: 'FR',
    hotlineLabel: 'Numéro national de prévention du suicide',
    hotlineNumber: '3114 (France)',
    textLabel: 'Urgences générales',
    textNumber: '15 / 112',
    emergencyLabel: 'Urgence',
    emergencyNumber: '15 / 112',
  }),
  DE: Object.freeze({
    region: 'DE',
    hotlineLabel: 'Telefonseelsorge',
    hotlineNumber: '0800 111 0 111 (Deutschland)',
    textLabel: 'Notruf',
    textNumber: '112',
    emergencyLabel: 'Notruf',
    emergencyNumber: '112',
  }),
  IT: Object.freeze({
    region: 'IT',
    hotlineLabel: 'Telefono Amico',
    hotlineNumber: '800 274 274 (Italia)',
    textLabel: 'Emergenza generale',
    textNumber: '112',
    emergencyLabel: 'Emergenza',
    emergencyNumber: '112',
  }),
  PT: Object.freeze({
    region: 'PT',
    hotlineLabel: 'SOS Voz Amiga',
    hotlineNumber: '213 544 545 (Portugal)',
    textLabel: 'Emergência geral',
    textNumber: '112',
    emergencyLabel: 'Emergência',
    emergencyNumber: '112',
  }),
});

function getDefaultStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function normalizeEmergencyRegion(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null;
  }

  return SUPPORTED_EMERGENCY_REGION_SET.has(normalized) ? normalized : null;
}

export function readStoredEmergencyRegion(storage = getDefaultStorage()) {
  if (!storage || typeof storage.getItem !== 'function') {
    return null;
  }

  try {
    return normalizeEmergencyRegion(storage.getItem(EMERGENCY_REGION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredEmergencyRegion(storageOrRegion = getDefaultStorage(), region) {
  const usesInjectedStorage = arguments.length > 1;
  const storage = usesInjectedStorage ? storageOrRegion : getDefaultStorage();
  const normalized = normalizeEmergencyRegion(usesInjectedStorage ? region : storageOrRegion);
  if (!normalized || !storage || typeof storage.setItem !== 'function') {
    return null;
  }

  try {
    storage.setItem(EMERGENCY_REGION_STORAGE_KEY, normalized);
    return normalized;
  } catch {
    return null;
  }
}

export function clearStoredEmergencyRegion(storage = getDefaultStorage()) {
  if (!storage || typeof storage.removeItem !== 'function') {
    return null;
  }

  try {
    storage.removeItem(EMERGENCY_REGION_STORAGE_KEY);
  } catch {
    return null;
  }

  return null;
}

export function getEmergencyResources(region) {
  const normalized = normalizeEmergencyRegion(region);
  return normalized ? EMERGENCY_RESOURCES_BY_REGION[normalized] ?? null : null;
}
