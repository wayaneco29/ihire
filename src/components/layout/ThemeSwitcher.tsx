"use client";

import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import type { ThemePreference } from "@/constants/colors";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";

const THEME_OPTIONS: {
  key: ThemePreference;
  label: string;
  icon: ReactNode;
}[] = [
  { key: "system", label: "Use device setting", icon: <ComputerDesktopIcon className="size-5" /> },
  { key: "light", label: "Light background", icon: <SunIcon className="size-5" /> },
  { key: "dark", label: "Dark background", icon: <MoonIcon className="size-5" /> },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  const menu: MenuProps = {
    items: THEME_OPTIONS,
    selectedKeys: [preference],
    onClick: ({ key }) => setPreference(key as ThemePreference),
  };
  const activeOption =
    THEME_OPTIONS.find(({ key }) => key === preference) ?? THEME_OPTIONS[0];

  return (
    <Dropdown menu={menu} placement="bottomRight" trigger={["click"]}>
      <Button
        aria-label={`Color theme: ${activeOption.label}`}
        className="text-muted"
        icon={activeOption.icon}
        title={`Color theme: ${activeOption.label}`}
        variant="ghost"
      >
        Appearance
      </Button>
    </Dropdown>
  );
}
