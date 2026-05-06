"use client";

import type React from "react";
import type { ReaderPreferences } from "@/lib/reader/types";

function ReaderSettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/6 bg-white/75 px-4 py-3">
      <span className="text-sm font-medium text-[#1d2524]">{label}</span>
      {children}
    </label>
  );
}

export function ReaderSettingsPanel({
  open,
  preferences,
  themeColors,
  onClose,
  onChange,
}: {
  open: boolean;
  preferences: ReaderPreferences;
  themeColors: { background: string; border: string; accent: string; muted: string; text: string };
  onClose: () => void;
  onChange: (updater: (current: ReaderPreferences) => ReaderPreferences) => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed right-4 top-20 z-40 w-[min(92vw,26rem)] rounded-[1.5rem] border bg-white/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur"
      style={{ borderColor: themeColors.border }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em]" style={{ color: themeColors.accent }}>
            Reader settings
          </div>
          <div className="mt-1 text-sm text-[#6b7a78]">Typography and reading mode</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border px-3 py-1 text-sm"
          style={{ borderColor: themeColors.border, color: themeColors.text }}
        >
          Close
        </button>
      </div>

      <div className="space-y-3">
        <ReaderSettingRow label="Theme">
          <div className="flex gap-2">
            {(["light", "sepia", "dark"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => onChange((current) => ({ ...current, theme }))}
                className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                style={{
                  borderColor: preferences.theme === theme ? themeColors.accent : themeColors.border,
                  color: preferences.theme === theme ? themeColors.accent : themeColors.muted,
                  background: preferences.theme === theme ? "rgba(76,173,169,0.08)" : "transparent",
                }}
              >
                {theme}
              </button>
            ))}
          </div>
        </ReaderSettingRow>

        <ReaderSettingRow label="Font size">
          <input
            type="range"
            min={15}
            max={24}
            step={1}
            value={preferences.fontSizePx}
            onChange={(event) => onChange((current) => ({ ...current, fontSizePx: Number(event.target.value) }))}
          />
        </ReaderSettingRow>

        <ReaderSettingRow label="Line height">
          <input
            type="range"
            min={1.5}
            max={2.4}
            step={0.05}
            value={preferences.lineHeight}
            onChange={(event) => onChange((current) => ({ ...current, lineHeight: Number(event.target.value) }))}
          />
        </ReaderSettingRow>

        <ReaderSettingRow label="Paragraph gap">
          <input
            type="range"
            min={0.25}
            max={1.4}
            step={0.05}
            value={preferences.paragraphSpacingEm}
            onChange={(event) => onChange((current) => ({ ...current, paragraphSpacingEm: Number(event.target.value) }))}
          />
        </ReaderSettingRow>

        <ReaderSettingRow label="Page width">
          <input
            type="range"
            min={560}
            max={900}
            step={10}
            value={preferences.maxWidthPx}
            onChange={(event) => onChange((current) => ({ ...current, maxWidthPx: Number(event.target.value) }))}
          />
        </ReaderSettingRow>

        <ReaderSettingRow label="First line indent">
          <button
            type="button"
            onClick={() => onChange((current) => ({ ...current, firstLineIndent: !current.firstLineIndent }))}
            className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
            style={{ borderColor: preferences.firstLineIndent ? themeColors.accent : themeColors.border, color: preferences.firstLineIndent ? themeColors.accent : themeColors.muted }}
          >
            {preferences.firstLineIndent ? "On" : "Off"}
          </button>
        </ReaderSettingRow>

        <ReaderSettingRow label="Justify text">
          <button
            type="button"
            onClick={() => onChange((current) => ({ ...current, justify: !current.justify }))}
            className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
            style={{ borderColor: preferences.justify ? themeColors.accent : themeColors.border, color: preferences.justify ? themeColors.accent : themeColors.muted }}
          >
            {preferences.justify ? "On" : "Off"}
          </button>
        </ReaderSettingRow>
      </div>
    </div>
  );
}
