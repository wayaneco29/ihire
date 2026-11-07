"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";
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
        colorBorder: palette.line,
        borderRadius: DESIGN_TOKENS.radius.md,
        controlHeight: DESIGN_TOKENS.controlHeight,
        fontFamily: DESIGN_TOKENS.fontFamily,
      },
      components: {
        Button: { primaryShadow: "none", defaultShadow: "none" },
      },
    }),
    [palette, resolvedTheme],
  );

  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <AppShellProvider>{children}</AppShellProvider>
        </NotificationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
