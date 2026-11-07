import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";

export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Link
          className="mb-7 flex justify-center"
          href="/"
        >
          <BrandMark />
        </Link>
        {children}
      </div>
    </main>
  );
}
