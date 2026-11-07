"use client";

import { ConfigProvider } from "antd";
import type { ThemeConfig } from "antd";
import type { ReactNode } from "react";
import { APP_COLORS } from "@/constants/colors";
import { AuthProvider } from "@/context/AuthContext";
import { AppShellProvider } from "@/context/AppShellContext";
import { NotificationProvider } from "@/context/NotificationContext";

const theme: ThemeConfig = {
  token: {
    colorPrimary: APP_COLORS.primary,
    colorError: APP_COLORS.danger,
    colorWarning: APP_COLORS.accent,
    colorTextBase: APP_COLORS.ink,
    colorBgLayout: APP_COLORS.surface,
    borderRadius: 10,
    controlHeight: 42,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  components: {
    Button: { primaryShadow: "none" },
  },
};

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
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
