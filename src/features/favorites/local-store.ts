"use client";

import { useSyncExternalStore } from "react";

/** Anonymous visitors keep favorites and recently viewed listings in localStorage. */
function createLocalIdStore(key: string, limit: number) {
  const listeners = new Set<() => void>();
  let cache: string[] | null = null;
  const EMPTY: string[] = [];

  function read(): string[] {
    if (cache) return cache;
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
      cache = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, limit) : [];
    } catch {
      cache = [];
    }
    return cache;
  }

  function write(ids: string[]) {
    cache = ids.slice(0, limit);
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // Storage can be unavailable in private mode; the in-memory copy still works for this tab.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return {
    read,
    write,
    clear: () => write([]),
    toggle(id: string): boolean {
      const current = read();
      const exists = current.includes(id);
      write(exists ? current.filter((value) => value !== id) : [id, ...current]);
      return !exists;
    },
    pushFront(id: string) {
      write([id, ...read().filter((value) => value !== id)]);
    },
    useIds(): string[] {
      return useSyncExternalStore(subscribe, read, () => EMPTY);
    },
  };
}

export const localFavorites = createLocalIdStore("mobited:favorites", 200);
export const localRecentlyViewed = createLocalIdStore("mobited:recent", 20);
