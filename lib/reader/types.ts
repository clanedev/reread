import type { ReaderTheme } from './theme';

export type ReaderPreferences = {
  theme: ReaderTheme;
  fontSizePx: number;
  lineHeight: number;
  paragraphSpacingEm: number;
  pagePaddingPx: number;
  maxWidthPx: number;
  firstLineIndent: boolean;
  justify: boolean;
  updatedAt: number;
};

export type BookProgress = {
  bookId: string;
  dirKey: string;
  fileName: string;
  title?: string;
  sectionIndex: number;
  sectionHref?: string;
  inSectionAnchor?: string;
  scrollTop: number;
  scrollHeight: number;
  progressRatio: number;
  updatedAt: number;
};
