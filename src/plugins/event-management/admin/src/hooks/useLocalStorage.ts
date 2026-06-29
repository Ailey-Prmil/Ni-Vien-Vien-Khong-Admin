import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persist a piece of state to localStorage, keyed by `key`.
 *
 * Behaves like `useState`, but the initial value is hydrated from localStorage
 * (falling back to `defaultValue`) and every change is written back. Reading and
 * writing are wrapped in try/catch so a corrupt entry or a disabled storage
 * (private mode, quota) degrades gracefully to in-memory state.
 *
 * When `key` changes (e.g. switching between activities) the state re-hydrates
 * from the new key so each key keeps its own independent value.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const read = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
    // defaultValue intentionally excluded — we only re-read when the key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [value, setValue] = useState<T>(read);

  // Re-hydrate when the key changes (skip the very first run — already hydrated).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setValue(read());
  }, [key, read]);

  // Persist on every value change.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore write failures (quota / disabled storage) */
    }
  }, [key, value]);

  return [value, setValue];
}
