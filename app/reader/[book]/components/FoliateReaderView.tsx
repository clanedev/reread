"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type ThemeColors = {
  background: string;
  border: string;
  accent: string;
  muted: string;
  text: string;
};

type FoliateRelocateDetail = {
  reason?: string;
  index: number;
  fraction: number;
  size?: number;
  cfi?: string;
};

type FoliateLoadDetail = {
  doc: Document;
  index: number;
};

export type FoliateNavigationTarget = string | number | { fraction: number };

type FoliateViewElement = HTMLElement & {
  open: (book: File) => Promise<void>;
  init: (options: { lastLocation?: FoliateNavigationTarget; showTextStart?: boolean }) => Promise<void>;
  goTo: (target: FoliateNavigationTarget) => Promise<void>;
  prev: () => Promise<void>;
  next: () => Promise<void>;
};

type FoliateViewHost = FoliateViewElement & {
  renderer?: HTMLElement;
};

export type FoliateReaderHandle = {
  goTo: (target: FoliateNavigationTarget) => Promise<void>;
  prev: () => Promise<void>;
  next: () => Promise<void>;
};

function locationKey(target: FoliateNavigationTarget | null | undefined) {
  if (target == null) {
    return "";
  }

  return typeof target === "object" ? JSON.stringify(target) : String(target);
}

export const FoliateReaderView = forwardRef<
  FoliateReaderHandle,
  {
    file: File;
    restoreTargets?: FoliateNavigationTarget[];
    themeColors: ThemeColors;
    onRelocate?: (detail: FoliateRelocateDetail) => void;
  }
>(function FoliateReaderView({ file, restoreTargets = [], themeColors, onRelocate }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewElement | null>(null);
  const appliedLocationRef = useRef("");
  const readyRef = useRef(false);
  const themeColorsRef = useRef(themeColors);

  useImperativeHandle(ref, () => ({
    async goTo(target: FoliateNavigationTarget) {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      appliedLocationRef.current = locationKey(target);
      await view.goTo(target);
    },
    async prev() {
      await viewRef.current?.prev();
    },
    async next() {
      await viewRef.current?.next();
    },
  }), []);

  useEffect(() => {
    themeColorsRef.current = themeColors;
  }, [themeColors]);

  useEffect(() => {
    let active = true;
    let currentView: FoliateViewElement | null = null;
    let handleRelocate: ((event: Event) => void) | null = null;
    let handleLoad: ((event: Event) => void) | null = null;

    void (async () => {
      await import("foliate-js/view.js");

      if (!active || !hostRef.current || viewRef.current) {
        return;
      }

      const view = document.createElement("foliate-view") as FoliateViewHost;
      currentView = view;
      viewRef.current = view;
      view.style.display = "block";
      view.style.width = "100%";
      view.style.height = "100%";

      handleRelocate = (event: Event) => {
        const detail = (event as CustomEvent<FoliateRelocateDetail>).detail;
        onRelocate?.(detail);
      };

      handleLoad = (event: Event) => {
        const detail = (event as CustomEvent<FoliateLoadDetail>).detail;
        const { doc } = detail;
        const { background, border, text } = themeColorsRef.current;
        const navStyle = doc.createElement("style");
        navStyle.textContent = `
          .reader-chapter-nav {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin: 24px 0;
          }

          .reader-chapter-nav button {
            border: 1px solid ${border};
            border-radius: 9999px;
            background: ${background};
            color: ${text};
            font: inherit;
            font-size: 0.875rem;
            font-weight: 500;
            padding: 0.625rem 1rem;
          }
        `;

        const topNav = doc.createElement("div");
        topNav.className = "reader-chapter-nav";
        const prevButton = doc.createElement("button");
        prevButton.type = "button";
        prevButton.textContent = "Previous";
        prevButton.addEventListener("click", () => {
          void view.prev();
        });
        topNav.append(prevButton);

        const bottomNav = doc.createElement("div");
        bottomNav.className = "reader-chapter-nav";
        const nextButton = doc.createElement("button");
        nextButton.type = "button";
        nextButton.textContent = "Next";
        nextButton.addEventListener("click", () => {
          void view.next();
        });
        bottomNav.append(nextButton);

        doc.head.append(navStyle);
        doc.body.prepend(topNav);
        doc.body.append(bottomNav);
      };

      view.addEventListener("relocate", handleRelocate as EventListener);
      view.addEventListener("load", handleLoad as EventListener);
      hostRef.current.replaceChildren(view);

      try {
        await view.open(file);
        const renderer = view.renderer;
        if (!renderer) {
          throw new Error("Foliate renderer is not ready.");
        }
        renderer.setAttribute("flow", "scrolled");
        renderer.setAttribute("max-column-count", "1");
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await view.init({ showTextStart: restoreTargets.length === 0 });
        readyRef.current = true;

        for (const target of restoreTargets) {
          try {
            appliedLocationRef.current = locationKey(target);
            await view.goTo(target);
            break;
          } catch {
            continue;
          }
        }
      } catch (error) {
        console.error(error);
      }

      if (!active) {
        if (handleRelocate) {
          view.removeEventListener("relocate", handleRelocate as EventListener);
        }
        if (handleLoad) {
          view.removeEventListener("load", handleLoad as EventListener);
        }
        view.remove();
        viewRef.current = null;
      }
    })();

    return () => {
      active = false;
      if (currentView && handleRelocate) {
        currentView.removeEventListener("relocate", handleRelocate as EventListener);
      }
      if (currentView && handleLoad) {
        currentView.removeEventListener("load", handleLoad as EventListener);
      }
      if (currentView) {
        currentView.remove();
      }
      viewRef.current = null;
      readyRef.current = false;
    };
  }, [file, onRelocate, restoreTargets]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.style.background = themeColors.background;
    view.style.color = themeColors.text;
  }, [themeColors.background, themeColors.text]);

  useEffect(() => {
    const view = viewRef.current;
    const nextTarget = restoreTargets[0];
    const nextKey = locationKey(nextTarget);

    if (!view || !readyRef.current || !nextTarget || nextKey === appliedLocationRef.current) {
      return;
    }

    appliedLocationRef.current = nextKey;
    void view.goTo(nextTarget);
  }, [restoreTargets]);

  return <div ref={hostRef} className="h-[calc(100vh-6rem)] w-full min-h-[calc(100vh-6rem)]" />;
});
