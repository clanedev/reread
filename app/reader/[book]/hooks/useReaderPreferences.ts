"use client";

import { useEffect, useRef, useState } from "react";
import { createDefaultReaderPreferences, getReaderPreferences, setReaderPreferences } from "@/lib/reader/db";
import type { ReaderPreferences } from "@/lib/reader/types";

export function useReaderPreferences() {
  const [preferences, setPreferences] = useState<ReaderPreferences>(createDefaultReaderPreferences());
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const savedPreferences = await getReaderPreferences();
        if (!active) return;
        if (savedPreferences) {
          setPreferences(savedPreferences);
        }
      } catch {
        // fall back to defaults
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void setReaderPreferences({
        ...preferences,
        updatedAt: Date.now(),
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [preferences, ready]);

  return { preferences, setPreferences };
}
