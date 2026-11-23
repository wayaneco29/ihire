import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/constants/roles";
import { isUserRole, ROLE_HOME } from "@/lib/auth/role-routing";
import type { Database } from "@/types/database";

const PROTECTED_AREAS: { prefix: string; role: UserRole }[] = [
  { prefix: "/applicant", role: "APPLICANT" },
  { prefix: "/evaluator", role: "EVALUATOR" },
  { prefix: "/document-reviewer", role: "DOCUMENT_REVIEWER" },
  { prefix: "/hr", role: "HR" },
  { prefix: "/admin", role: "ADMIN" },
];

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });
  return destination;
}

export async function proxy(request: NextRequest) {
  const { url, key } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  if (!url || !key) {
    throw new Error("Supabase public environment variables are required in Proxy.");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Use the same current user metadata as the server page/action guards.
  // Cached JWT roles can otherwise bounce a reviewer between home and sign-in.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const isSignedIn = !authError && Boolean(user);
  const roleClaim = user?.app_metadata?.role;
  const role = isSignedIn && isUserRole(roleClaim) ? roleClaim : null;
  const pathname = request.nextUrl.pathname;
  const protectedArea = PROTECTED_AREAS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (protectedArea && (!isSignedIn || !role)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (protectedArea && role && role !== protectedArea.role) {
    const destination = new URL(ROLE_HOME[role], request.url);
    return copyCookies(response, NextResponse.redirect(destination));
  }

  const isPdsRoute =
    pathname === "/applicant/pds" || pathname.startsWith("/applicant/pds/");
  if (protectedArea?.role === "APPLICANT" && !isPdsRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_submitted_pds")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.has_submitted_pds) {
      const destination = new URL("/applicant/pds", request.url);
      return copyCookies(response, NextResponse.redirect(destination));
    }
  }

  if (role && (pathname === "/" || pathname === "/register")) {
    const destination = new URL(ROLE_HOME[role], request.url);
    return copyCookies(response, NextResponse.redirect(destination));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/register",
    "/applicant/:path*",
    "/evaluator/:path*",
    "/document-reviewer/:path*",
    "/hr/:path*",
    "/admin/:path*",
  ],
};
