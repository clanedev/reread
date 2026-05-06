"use client";

import { useEffect, useState } from "react";
import { clearShelfState, getShelfState, setShelfState } from "@/lib/shelf/db";
import { getPathKey, listDirectoryEntries } from "@/lib/shelf/filesystem";
import type { DirectoryEntry, ShelfState } from "@/lib/shelf/types";

function getCurrentHandle(state: ShelfState) {
  return state.handles[getPathKey(state.currentPath)];
}

export function useShelf() {
  const [state, setState] = useState<ShelfState | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadShelf(nextState: ShelfState | null) {
    if (!nextState) {
      setEntries([]);
      return;
    }

    const currentHandle = getCurrentHandle(nextState);
    if (!currentHandle) {
      throw new Error("Missing directory handle.");
    }

    const permission = await currentHandle.queryPermission({ mode: "read" });
    const granted =
      permission === "granted" ||
      (permission === "prompt" && (await currentHandle.requestPermission({ mode: "read" })) === "granted");

    if (!granted) {
      throw new Error("Permission denied.");
    }

    setEntries(await listDirectoryEntries(currentHandle));
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const savedState = await getShelfState();
        if (!active) return;

        if (!savedState) {
          setState(null);
          setEntries([]);
          setLoading(false);
          return;
        }

        setState(savedState);
        await loadShelf(savedState);
      } catch {
        if (!active) return;
        setError("Could not load this folder. Please choose it again from the home page.");
        setEntries([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function enterDirectory(name: string) {
    if (!state) return;

    try {
      setError("");
      const currentHandle = getCurrentHandle(state);
      if (!currentHandle) {
        throw new Error("Missing directory handle.");
      }

      const childHandle = await currentHandle.getDirectoryHandle(name);
      const nextPath = [...state.currentPath, name];
      const nextState: ShelfState = {
        currentPath: nextPath,
        handles: {
          ...state.handles,
          [getPathKey(nextPath)]: childHandle,
        },
      };

      await setShelfState(nextState);
      setState(nextState);
      await loadShelf(nextState);
    } catch {
      setError("Could not open that folder.");
    }
  }

  async function goUp() {
    if (!state || state.currentPath.length <= 1) return;

    const nextPath = state.currentPath.slice(0, -1);
    const nextState: ShelfState = {
      ...state,
      currentPath: nextPath,
    };

    await setShelfState(nextState);
    setState(nextState);
    await loadShelf(nextState);
  }

  async function resetShelf() {
    await clearShelfState();
    setState(null);
    setEntries([]);
  }

  const currentPathLabel = state?.currentPath.slice(1).join(" / ") || "Root";
  const currentPathKey = getPathKey(state?.currentPath ?? []);
  const canGoUp = Boolean(state && state.currentPath.length > 1);

  return {
    state,
    entries,
    loading,
    error,
    currentPathLabel,
    currentPathKey,
    canGoUp,
    enterDirectory,
    goUp,
    resetShelf,
  };
}
