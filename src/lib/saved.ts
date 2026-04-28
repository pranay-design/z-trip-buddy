import { useEffect, useState, useCallback } from "react";
import type { SavedItem } from "./types";

const KEY = "japan-buddy-saved-v1";

function read(): SavedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Save failed", e);
    throw e;
  }
}

export function useSaved() {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((item: SavedItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      const next = [item, ...prev];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    write([]);
  }, []);

  const isSaved = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return { items, add, remove, clear, isSaved };
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
