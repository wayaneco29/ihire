import Image from "next/image";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";

export function AuthPageFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-6 sm:px-6 sm:py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-panel shadow-card md:min-h-[600px] md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
          <div className="mb-8 flex items-center gap-3">
            <BrandMark compact />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Education portal
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                Southern Leyte
              </p>
            </div>
          </div>
          {children}
        </div>

        <aside className="relative min-h-64 overflow-hidden md:min-h-full">
          <Image
            alt="Southern Leyte Division office"
            className="object-cover"
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            src="/school.jpg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-slate-950/10" />
          <div className="absolute inset-x-5 bottom-5 rounded-sm border border-white/25 bg-slate-950/40 p-5 text-white shadow-xl backdrop-blur-md sm:inset-x-8 sm:bottom-8 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Southern Leyte Division
            </p>
            <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight sm:text-3xl">
              Empowering learners and staff
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/85">
              Access recruitment, promotion, and school services through one
              secure portal.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
