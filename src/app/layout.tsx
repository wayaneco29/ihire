import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Public_Sans } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProviders } from "./providers";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Recruitment Portal | Division of Southern Leyte",
    template: "%s | Recruitment Portal",
  },
  description:
    "A recruitment workspace for the Division of Southern Leyte.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="text-base leading-relaxed">
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
