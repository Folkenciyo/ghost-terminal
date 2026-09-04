import '@testing-library/jest-dom/vitest';

// This jsdom build exposes a stub `localStorage` without the Storage methods,
// so tests that exercise persisted preferences get a real in-memory one here.
if (typeof window !== 'undefined' && typeof window.localStorage?.setItem !== 'function') {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(String(key), String(value)),
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}
