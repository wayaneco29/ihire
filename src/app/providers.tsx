"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { DESIGN_TOKENS, THEME_PALETTES } from "@/constants/colors";
import { AuthProvider } from "@/context/AuthContext";
import { AppShellProvider } from "@/context/AppShellContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider>
      <ThemedAppProviders>{children}</ThemedAppProviders>
    </ThemeProvider>
  );
}

function ThemedAppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const { resolvedTheme } = useTheme();
  const palette = THEME_PALETTES[resolvedTheme];
  const theme = useMemo<ThemeConfig>(
    () => ({
      algorithm:
        resolvedTheme === "dark"
          ? antdTheme.darkAlgorithm
          : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: palette.primary,
        colorTextLightSolid: palette.onPrimary,
        colorError: palette.danger,
        colorSuccess: palette.success,
        colorWarning: palette.warning,
        colorInfo: palette.info,
        colorTextBase: palette.ink,
        colorTextSecondary: palette.muted,
        colorBgLayout: palette.canvas,
        colorBgContainer: palette.panel,
        colorBorder: palette.lineStrong,
        colorTextPlaceholder: palette.mutedStrong,
        borderRadius: DESIGN_TOKENS.radius.md,
        controlHeight: DESIGN_TOKENS.controlHeight,
        controlHeightSM: DESIGN_TOKENS.controlHeight,
        controlHeightLG: 48,
        fontSize: DESIGN_TOKENS.fontSize,
        fontSizeSM: DESIGN_TOKENS.fontSizeSmall,
        lineHeight: 1.5,
        motion: false,
        fontFamily: DESIGN_TOKENS.fontFamily,
      },
      components: {
        Button: { primaryShadow: "none", defaultShadow: "none" },
        Table: {
          headerBg: palette.panelMuted,
          headerColor: palette.ink,
          rowHoverBg: palette.panelMuted,
          borderColor: palette.line,
          cellFontSize: 16,
          cellFontSizeMD: 16,
          cellFontSizeSM: 16,
          cellPaddingBlock: 16,
          cellPaddingBlockMD: 16,
          cellPaddingBlockSM: 12,
        },
        Select: { optionHeight: 44, optionFontSize: 16 },
        Dropdown: { paddingBlock: 12 },
        Pagination: { itemSize: 44, itemSizeSM: 44 },
        Modal: { titleFontSize: 20 },
        Tag: { fontSizeSM: 14, lineHeightSM: 1.5 },
        Radio: { radioSize: 20, dotSize: 10 },
      },
    }),
    [palette, resolvedTheme],
  );

  return (
    <ConfigProvider
      theme={theme}
      modal={{
        classNames: { close: "min-h-11 min-w-11", title: "pr-10" },
        closeIcon: <XMarkIcon className="size-6" />,
      }}
    >
      <AuthProvider>
        <NotificationProvider>
          <AppShellProvider>{children}</AppShellProvider>
        </NotificationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
