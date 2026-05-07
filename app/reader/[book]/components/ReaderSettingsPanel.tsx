"use client";

import { BookOpen, Palette, Type } from "lucide-react";
import type React from "react";
import type { ReaderPreferences } from "@/lib/reader/types";

export type ReaderToolPanel = "toc" | "typography" | "theme";

type ThemeColors = {
  background: string;
  border: string;
  accent: string;
  muted: string;
  text: string;
};

function ToolButton({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="group relative flex h-11 w-11 items-center justify-center rounded-full border bg-white text-[#1d2524] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md aria-pressed:border-[#4cada9] aria-pressed:text-[#4cada9]"
    >
      {children}
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-[#1d2524] px-3 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function PanelShell({
  title,
  description,
  themeColors,
  children,
}: {
  title: string;
  description: string;
  themeColors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <aside
      className="w-[min(82vw,22rem)] rounded-[1.5rem] border bg-white/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur"
      style={{ borderColor: themeColors.border }}
    >
      <div className="mb-4">
        <div
          className="text-xs uppercase tracking-[0.28em]"
          style={{ color: themeColors.accent }}
        >
          {title}
        </div>
        <div className="mt-1 text-sm" style={{ color: themeColors.muted }}>
          {description}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </aside>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3 border rounded-2xl border-black/6 bg-white/75">
      <span className="text-sm font-medium text-[#1d2524]">{label}</span>
      {children}
    </label>
  );
}

function TypographyPanel({
  preferences,
  themeColors,
  onChange,
}: {
  preferences: ReaderPreferences;
  themeColors: ThemeColors;
  onChange: (
    updater: (current: ReaderPreferences) => ReaderPreferences,
  ) => void;
}) {
  return (
    <PanelShell
      title="Typography"
      description="Text size, width, and reading rhythm"
      themeColors={themeColors}
    >
      <SettingRow label="Font size">
        <input
          type="range"
          min={15}
          max={24}
          step={1}
          value={preferences.fontSizePx}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              fontSizePx: Number(event.target.value),
            }))
          }
        />
      </SettingRow>

      <SettingRow label="Line height">
        <input
          type="range"
          min={1.5}
          max={2.4}
          step={0.05}
          value={preferences.lineHeight}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              lineHeight: Number(event.target.value),
            }))
          }
        />
      </SettingRow>

      <SettingRow label="Paragraph gap">
        <input
          type="range"
          min={0.25}
          max={1.4}
          step={0.05}
          value={preferences.paragraphSpacingEm}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              paragraphSpacingEm: Number(event.target.value),
            }))
          }
        />
      </SettingRow>
    </PanelShell>
  );
}

function ThemePanel({
  preferences,
  themeColors,
  onChange,
}: {
  preferences: ReaderPreferences;
  themeColors: ThemeColors;
  onChange: (
    updater: (current: ReaderPreferences) => ReaderPreferences,
  ) => void;
}) {
  return (
    <PanelShell
      title="Theme"
      description="Background and text color"
      themeColors={themeColors}
    >
      <div className="grid grid-cols-3 gap-2">
        {(["light", "sepia", "dark"] as const).map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => onChange((current) => ({ ...current, theme }))}
            className="rounded-2xl border px-3 py-3 text-xs uppercase tracking-[0.18em] transition hover:opacity-80"
            style={{
              borderColor:
                preferences.theme === theme
                  ? themeColors.accent
                  : themeColors.border,
              color:
                preferences.theme === theme
                  ? themeColors.accent
                  : themeColors.muted,
              background:
                preferences.theme === theme
                  ? "rgba(76,173,169,0.08)"
                  : "transparent",
            }}
          >
            {theme}
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

function TocPanel({
  themeColors,
  tocItems,
  onTocSelect,
}: {
  themeColors: ThemeColors;
  tocItems: Array<{ label: string; index: number; href: string }>;
  onTocSelect: (item: { label: string; index: number; href: string }) => void;
}) {
  return (
    <PanelShell
      title="Contents"
      description="Chapter navigation"
      themeColors={themeColors}
    >
      {tocItems.length ? (
        <div className="max-h-72 space-y-2 overflow-auto pr-1">
          {tocItems.map((item, position) => (
            <button
              key={`${item.index}-${position}`}
              type="button"
              onClick={() => onTocSelect(item)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-black/6 bg-white/75 px-4 py-3 text-left text-sm transition hover:border-[#4cada9] hover:bg-[#f2fbfa]"
            >
              <span className="min-w-0 truncate text-[#1d2524]">{item.label}</span>
              <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-[#6b7280]">
                {item.index + 1}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border border-black/6 bg-white/75 px-4 py-3 text-sm"
          style={{ color: themeColors.muted }}
        >
          This book does not expose a table of contents.
        </div>
      )}
    </PanelShell>
  );
}

export function ReaderSettingsPanel({
  activePanel,
  preferences,
  themeColors,
  tocItems,
  onPanelChange,
  onTocSelect,
  onChange,
}: {
  activePanel: ReaderToolPanel | null;
  preferences: ReaderPreferences;
  themeColors: ThemeColors;
  tocItems: Array<{ label: string; index: number; href: string }>;
  onPanelChange: (panel: ReaderToolPanel | null) => void;
  onTocSelect: (item: { label: string; index: number; href: string }) => void;
  onChange: (
    updater: (current: ReaderPreferences) => ReaderPreferences,
  ) => void;
}) {
  const togglePanel = (panel: ReaderToolPanel) => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  return (
    <>
      {activePanel ? (
        <button
          type="button"
          aria-label="Close reader tools"
          className="fixed inset-0 z-30 bg-transparent cursor-default"
          onClick={() => onPanelChange(null)}
        />
      ) : null}

      <div className="fixed z-40 flex items-end gap-3 bottom-8 right-6">
        {activePanel === "toc" ? (
          <TocPanel themeColors={themeColors} tocItems={tocItems} onTocSelect={onTocSelect} />
        ) : null}
        {activePanel === "typography" ? (
          <TypographyPanel
            preferences={preferences}
            themeColors={themeColors}
            onChange={onChange}
          />
        ) : null}
        {activePanel === "theme" ? (
          <ThemePanel
            preferences={preferences}
            themeColors={themeColors}
            onChange={onChange}
          />
        ) : null}

        <div
          className="flex flex-col gap-2 rounded-full border bg-white/90 p-2 shadow-[0_12px_34px_rgba(0,0,0,0.12)] backdrop-blur"
          style={{ borderColor: themeColors.border }}
        >
          <ToolButton
            active={activePanel === "toc"}
            label="Contents"
            onClick={() => togglePanel("toc")}
          >
            <BookOpen className="w-5 h-5" />
          </ToolButton>
          <ToolButton
            active={activePanel === "typography"}
            label="Typography"
            onClick={() => togglePanel("typography")}
          >
            <Type className="w-5 h-5" />
          </ToolButton>
          <ToolButton
            active={activePanel === "theme"}
            label="Theme"
            onClick={() => togglePanel("theme")}
          >
            <Palette className="w-5 h-5" />
          </ToolButton>
        </div>
      </div>
    </>
  );
}
