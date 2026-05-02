export type ReaderTheme = 'light' | 'dark' | 'sepia';

export type ReaderTypography = {
  theme: ReaderTheme;
  fontSizePx: number;
  lineHeight: number;
  paragraphSpacingEm: number;
  pagePaddingPx: number;
  maxWidthPx: number;
  firstLineIndent: boolean;
  justify: boolean;
};

export const DEFAULT_READER_TYPOGRAPHY: ReaderTypography = {
  theme: 'light',
  fontSizePx: 18,
  lineHeight: 1.9,
  paragraphSpacingEm: 0.85,
  pagePaddingPx: 24,
  maxWidthPx: 740,
  firstLineIndent: true,
  justify: true,
};

export function resolveReaderThemeColors(theme: ReaderTheme) {
  switch (theme) {
    case 'dark':
      return {
        background: '#101615',
        surface: '#161d1b',
        text: '#f3f5f2',
        muted: '#9ba9a7',
        accent: '#4cada9',
        border: 'rgba(255,255,255,0.08)',
      };
    case 'sepia':
      return {
        background: '#f3eadb',
        surface: '#fbf3e6',
        text: '#2d241d',
        muted: '#7b6756',
        accent: '#9c6644',
        border: 'rgba(55,39,22,0.10)',
      };
    case 'light':
    default:
      return {
        background: '#f6f7f6',
        surface: '#ffffff',
        text: '#1d2524',
        muted: '#6b7a78',
        accent: '#4cada9',
        border: 'rgba(0,0,0,0.08)',
      };
  }
}
