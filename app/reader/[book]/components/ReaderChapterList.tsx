"use client";

import type React from "react";
import type { LoadedSection } from "../reader-epub";

export function ReaderChapterList({
  sections,
  preferences,
  themeColors,
  sectionRefs,
}: {
  sections: LoadedSection[];
  preferences: {
    maxWidthPx: number;
    fontSizePx: number;
    lineHeight: number;
    paragraphSpacingEm: number;
    firstLineIndent: boolean;
    justify: boolean;
    pagePaddingPx: number;
  };
  themeColors: { text: string; muted: string; accent: string };
  sectionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
}) {
  return (
    <div className="pb-24">
      {sections.map((section) => (
        <section
          key={section.index}
          ref={(node) => {
            sectionRefs.current[section.index] = node;
          }}
        >
          <div
            className="reader-chapter mx-auto"
            style={{
              '--reader-max-width': `${preferences.maxWidthPx}px`,
              '--reader-font-size': `${preferences.fontSizePx}px`,
              '--reader-line-height': `${preferences.lineHeight}`,
              '--reader-paragraph-spacing': `${preferences.paragraphSpacingEm}em`,
              '--reader-first-indent': preferences.firstLineIndent ? '1.8em' : '0',
              '--reader-text-align': preferences.justify ? 'justify' : 'start',
              '--reader-foreground': themeColors.text,
              '--reader-muted': themeColors.muted,
              '--reader-accent': themeColors.accent,
              paddingLeft: `${preferences.pagePaddingPx}px`,
              paddingRight: `${preferences.pagePaddingPx}px`,
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </section>
      ))}
    </div>
  );
}
