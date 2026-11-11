import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProviders } from "./providers";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
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
    <html lang="en" className={`${publicSans.variable} ${bricolageGrotesque.variable}`}>
      <body>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
