import { ExportDataPayload } from '../csv';

const STORAGE_KEY = 'loan_tracker_local_state_v1';
const PREFERENCES_KEY = 'loan_tracker_preferences_v1';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: 'INR';
  defaultRepaymentMode: 'REDUCE_TENURE' | 'REDUCE_EMI';
  dateFormat: string;
}

export interface StoredAppState extends ExportDataPayload {
  activeLoanId: string | null;
  lastPersistedAt: string;
}

export const defaultPreferences: UserPreferences = {
  theme: 'system',
  currency: 'INR',
  defaultRepaymentMode: 'REDUCE_TENURE',
  dateFormat: 'YYYY-MM-DD',
};

/**
 * Saves current application data to browser localStorage for recovery.
 */
export function saveToLocalStorage(state: StoredAppState): boolean {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return false;
  }
}

/**
 * Loads cached application data from browser localStorage.
 */
export function loadFromLocalStorage(): StoredAppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAppState;
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
    return null;
  }
}

/**
 * Saves user settings and preferences.
 */
export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

/**
 * Loads user settings and preferences.
 */
export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

/**
 * Clears all locally stored browser data (with safety confirmation in UI).
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

