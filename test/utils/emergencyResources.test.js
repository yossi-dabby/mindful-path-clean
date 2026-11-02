import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_REGION_STORAGE_KEY,
  EMERGENCY_RESOURCES_BY_REGION,
  SUPPORTED_EMERGENCY_REGIONS,
  clearStoredEmergencyRegion,
  getEmergencyResources,
  normalizeEmergencyRegion,
  readStoredEmergencyRegion,
  writeStoredEmergencyRegion,
} from '../../src/lib/emergencyResources.js';

function createStorage(initialValue = null) {
  let value = initialValue;

  return {
    getItem(key) {
      return key === EMERGENCY_REGION_STORAGE_KEY ? value : null;
    },
    setItem(key, nextValue) {
      if (key === EMERGENCY_REGION_STORAGE_KEY) {
        value = nextValue;
      }
    },
    removeItem(key) {
      if (key === EMERGENCY_REGION_STORAGE_KEY) {
        value = null;
      }
    },
  };
}

describe('emergencyResources', () => {
  it('resolves every supported ISO code to its own resource set', () => {
    expect(SUPPORTED_EMERGENCY_REGIONS).toEqual(['US', 'IL', 'ES', 'FR', 'DE', 'IT', 'PT']);

    for (const region of SUPPORTED_EMERGENCY_REGIONS) {
      expect(getEmergencyResources(region)).toBe(EMERGENCY_RESOURCES_BY_REGION[region]);
      expect(getEmergencyResources(region)?.region).toBe(region);
    }
  });

  it('normalizes lowercase region input safely', () => {
    expect(normalizeEmergencyRegion('us')).toBe('US');
    expect(normalizeEmergencyRegion(' il ')).toBe('IL');
    expect(getEmergencyResources('pt')?.region).toBe('PT');
  });

  it('returns null for unknown and malformed region input', () => {
    expect(normalizeEmergencyRegion(null)).toBeNull();
    expect(normalizeEmergencyRegion('')).toBeNull();
    expect(normalizeEmergencyRegion('english')).toBeNull();
    expect(normalizeEmergencyRegion('en')).toBeNull();
    expect(normalizeEmergencyRegion('USA')).toBeNull();
    expect(normalizeEmergencyRegion('u1')).toBeNull();
    expect(getEmergencyResources('he')).toBeNull();
    expect(getEmergencyResources('en-US')).toBeNull();
  });

  it('returns null when storage is missing or unavailable', () => {
    expect(readStoredEmergencyRegion()).toBeNull();
    expect(readStoredEmergencyRegion(null)).toBeNull();
    expect(readStoredEmergencyRegion({})).toBeNull();
  });

  it('returns null when storage access throws', () => {
    const blockedStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };

    expect(readStoredEmergencyRegion(blockedStorage)).toBeNull();
    expect(writeStoredEmergencyRegion(blockedStorage, 'US')).toBeNull();
    expect(clearStoredEmergencyRegion(blockedStorage)).toBeNull();
  });

  it('returns null when the window localStorage getter throws', () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const temporaryWindow = {};

    Object.defineProperty(temporaryWindow, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: temporaryWindow,
      });

      expect(() => readStoredEmergencyRegion()).not.toThrow();
      expect(readStoredEmergencyRegion()).toBeNull();
      expect(() => writeStoredEmergencyRegion('US')).not.toThrow();
      expect(writeStoredEmergencyRegion('US')).toBeNull();
      expect(() => clearStoredEmergencyRegion()).not.toThrow();
      expect(clearStoredEmergencyRegion()).toBeNull();
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
      } else {
        delete globalThis.window;
      }
    }

    expect(Object.getOwnPropertyDescriptor(globalThis, 'window')).toEqual(originalWindowDescriptor);
  });

  it('persists and reloads a valid explicit region selection', () => {
    const storage = createStorage();

    expect(writeStoredEmergencyRegion(storage, 'fr')).toBe('FR');
    expect(storage.getItem(EMERGENCY_REGION_STORAGE_KEY)).toBe('FR');
    expect(readStoredEmergencyRegion(storage)).toBe('FR');
  });

  it('never defaults to a country when stored data is invalid', () => {
    expect(readStoredEmergencyRegion(createStorage('en'))).toBeNull();
    expect(readStoredEmergencyRegion(createStorage('unknown'))).toBeNull();
    expect(readStoredEmergencyRegion(createStorage(''))).toBeNull();
  });

  it('clears the stored region selection', () => {
    const storage = createStorage('IL');

    expect(readStoredEmergencyRegion(storage)).toBe('IL');
    expect(clearStoredEmergencyRegion(storage)).toBeNull();
    expect(storage.getItem(EMERGENCY_REGION_STORAGE_KEY)).toBeNull();
    expect(readStoredEmergencyRegion(storage)).toBeNull();
  });

  it('does not accept language values as region decisions', () => {
    const storage = createStorage();

    expect(writeStoredEmergencyRegion(storage, 'he')).toBeNull();
    expect(storage.getItem(EMERGENCY_REGION_STORAGE_KEY)).toBeNull();
    expect(getEmergencyResources('en')).toBeNull();
    expect(getEmergencyResources('fr-FR')).toBeNull();
  });
});
