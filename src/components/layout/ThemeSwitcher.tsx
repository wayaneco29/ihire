"use client";

import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
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
  { key: "system", label: "System", icon: <DesktopOutlined /> },
  { key: "light", label: "Light", icon: <SunOutlined /> },
  { key: "dark", label: "Dark", icon: <MoonOutlined /> },
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
        className="!grid !size-11 !place-items-center !p-0 border-0! hover:bg-panel-muted!"
        icon={activeOption.icon}
        title={`Color theme: ${activeOption.label}`}
        variant="unstyled"
      />
    </Dropdown>
  );
}
